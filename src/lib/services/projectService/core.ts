/**
 * @file core.ts
 * @description Funções nucleares para o serviço de projetos.
 */

// ⚠️ TODO: MIGRAR PARA SUPABASE
// Admin SDK Imports - REMOVIDO

// ⚠️ TODO: MIGRAR PARA SUPABASE  
// Client SDK Imports - REMOVIDO

// Project-specific Types and Utilities
import { Project, UpdatedProject, TimelineEvent } from '@/types/project';
import { Comment as CommentType } from '@/types/comment'; // Renamed to avoid conflict
// ⚠️ TODO: MIGRAR PARA SUPABASE - clientDb removido
import { v4 as uuidv4 } from 'uuid';
import { createNotificationDirectly, NotificationResult } from '../notificationService';
import { 
  FirestoreData, 
  CommentData, 
  CreateProjectOptions, 
  UpdateProjectOptions,
  GetProjectsOptions // Adicionar este tipo se existir, ou definir um novo
} from './types';
import logger from '@/lib/utils/logger';
import { mapTimelineEvent, mapComment, normalizeStatus, sanitizeObject } from '@/lib/services/projectService/helpers';
import { sendEmailNotificationForComment } from '../emailService'; // Nova importação
import { User } from '@/types/user'; // Importar User

// ⚠️ TODO: MIGRAR PARA SUPABASE
// Initialize Firebase Admin - REMOVIDO
// const adminApp = getOrCreateFirebaseAdminApp();
// const adminDb = getAdminFirestoreInstance(adminApp);

// STUB funcional para permitir build
const adminDb = {
  collection: (path: string) => ({
    doc: (id?: string) => ({
      get: async () => ({ exists: false, data: () => null }),
      set: async () => {},
      update: async () => {},
      delete: async () => {}
    }),
    where: () => ({ get: async () => ({ docs: [], empty: true }) }),
    orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [], empty: true }) }) }),
    add: async () => ({ id: 'stub-' + Date.now() }),
    get: async () => ({ docs: [], empty: true })
  })
};

// Nova função auxiliar para serializar dados do projeto
const serializeProjectData = (projectId: string, projectData: any): Project => {
  if (!projectData) {
    // Retornar um tipo compatível ou lançar erro, dependendo da preferência.
    // Por enquanto, vamos assumir que projectData sempre existe se esta função for chamada internamente.
    // Ou podemos ajustar para retornar Project | null e tratar no chamador.
    throw new Error("Project data is null in serializeProjectData");
  }

  return {
    id: projectId,
    ...projectData,
    createdAt: projectData.createdAt instanceof AdminTimestamp 
      ? projectData.createdAt.toDate().toISOString() 
      : typeof projectData.createdAt === 'string' ? projectData.createdAt : undefined,
    updatedAt: projectData.updatedAt instanceof AdminTimestamp 
      ? projectData.updatedAt.toDate().toISOString() 
      : typeof projectData.updatedAt === 'string' ? projectData.updatedAt : undefined,
    dataConclusaoPrevista: projectData.dataConclusaoPrevista instanceof AdminTimestamp
      ? projectData.dataConclusaoPrevista.toDate().toISOString().split('T')[0] // Formato YYYY-MM-DD
      : typeof projectData.dataConclusaoPrevista === 'string' ? projectData.dataConclusaoPrevista : undefined,
    timelineEvents: (projectData.timelineEvents || []).map((event: any) => ({
      ...event,
      timestamp: event.timestamp instanceof AdminTimestamp 
        ? event.timestamp.toDate().toISOString() 
        : typeof event.timestamp === 'string' ? event.timestamp : new Date().toISOString(), // Fallback para string ou data atual
    })).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    comments: (projectData.comments || []).map((comment: any) => ({
      ...comment,
      createdAt: comment.createdAt instanceof AdminTimestamp 
        ? comment.createdAt.toDate().toISOString() 
        : typeof comment.createdAt === 'string' ? comment.createdAt : undefined,
      updatedAt: comment.updatedAt instanceof AdminTimestamp 
        ? comment.updatedAt.toDate().toISOString() 
        : typeof comment.updatedAt === 'string' ? comment.updatedAt : undefined,
    })).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    // Serializar outros campos de data se houver (ex: projectData.someOtherDate)
  } as Project;
};

/**
 * Gera um número único para o projeto no formato FV-ANO-SEQUENCIAL
 * Ex: FV-2025-101
 * 
 * @returns Número único do projeto.
 */
export const generateUniqueProjectNumber = async (): Promise<string> => {
  logger.debug('Iniciando geração de número de projeto no formato FV-ANO-SEQUENCIAL...');
  
  const currentYear = new Date().getFullYear();
  const prefix = `FV-${currentYear}-`;

  if (typeof (global as any).isGeneratingProjectNumber === 'undefined') {
    (global as any).isGeneratingProjectNumber = false;
  }
  if ((global as any).isGeneratingProjectNumber) {
    logger.warn('generateUniqueProjectNumber: Geração de número já em andamento, aguardando...');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500)); 
    if ((global as any).isGeneratingProjectNumber) { 
        logger.error('generateUniqueProjectNumber: Timeout esperando a liberação da trava de geração de número.');
        return `ERROR-${currentYear}-${Date.now().toString().slice(-6)}`;
    }
  }

  try {
    (global as any).isGeneratingProjectNumber = true;
    logger.debug(`Gerando número de projeto para o ano: ${currentYear}`);

    const projectsAdminCollection = adminDb.collection('projects');

    let attempts = 0;
    const maxAttempts = 10; 

    while (attempts < maxAttempts) {
      attempts++;
      
      let highestSequential = 100; 

      try {
        const querySnapshot = await projectsAdminCollection
          .where('number', '>=', prefix)
          .where('number', '<', prefix + '\uf8ff')
          .orderBy('number', 'desc')
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const lastProjectDoc = querySnapshot.docs[0];
          const projectData = lastProjectDoc.data() as Partial<Project>; 
          const projectNumber = projectData.number; 

          if (projectNumber && projectNumber.startsWith(prefix)) {
            const parts = projectNumber.split('-');
            if (parts.length === 3) {
              const sequentialPart = parseInt(parts[2], 10);
              if (!isNaN(sequentialPart) && sequentialPart > highestSequential) {
                highestSequential = sequentialPart;
              }
            }
          }
        }
      } catch (queryError) {
        logger.error(`Erro na consulta de projetos (tentativa ${attempts}):`, queryError);
        // Continue with default highestSequential value
      }
      
      const nextSequential = highestSequential + 1;
      const newProjectNumber = `${prefix}${String(nextSequential).padStart(3, '0')}`;
      
      logger.debug(`Tentativa ${attempts}: Próximo número sequencial proposto: ${newProjectNumber} (baseado em ${highestSequential})`);

      try {
        const existingProjectSnapshot = await projectsAdminCollection
          .where('number', '==', newProjectNumber)
          .limit(1)
          .get();

        if (existingProjectSnapshot.empty) {
          logger.info(`Número de projeto único gerado: ${newProjectNumber}`);
          return newProjectNumber;
        } else {
          logger.warn(`Tentativa ${attempts}: Número ${newProjectNumber} já existe, tentando próximo sequencial.`);
          const collidedSequential = parseInt(newProjectNumber.split('-')[2], 10);
          if (!isNaN(collidedSequential) && collidedSequential > highestSequential) {
              highestSequential = collidedSequential;
          }
          await new Promise(resolve => setTimeout(resolve, 50 * attempts)); 
        }
      } catch (existingCheckError) {
        logger.error(`Erro ao verificar número existente (tentativa ${attempts}):`, existingCheckError);
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
        continue;
      }
    }

    logger.error(`Não foi possível gerar número de projeto único no formato FV-ANO-SEQUENCIAL após ${maxAttempts} tentativas.`);
    return `FALLBACK-${currentYear}-${Date.now().toString().slice(-6)}`;

  } catch (error) {
    logger.error('Erro crítico ao gerar número de projeto FV-ANO-SEQUENCIAL:', error);
    if (error instanceof Error) {
        throw new Error(`Falha ao gerar número de projeto: ${error.message}`);
    }
    throw new Error('Falha ao gerar número de projeto: erro desconhecido.');
  } finally {
    (global as any).isGeneratingProjectNumber = false; 
  }
};

/**
 * Verifica se um número de projeto já está em uso
 * 
 * @param projectNumber Número do projeto para verificar
 * @returns true se o número já estiver em uso, false caso contrário
 */
export const isProjectNumberAlreadyUsed = async (projectNumber: string): Promise<boolean> => {
  try {
    const projectsAdminCollection = adminDb.collection('projects');
    const snapshot = await projectsAdminCollection.where('number', '==', projectNumber).limit(1).get();
    
    logger.debug(`[isProjectNumberAlreadyUsed] Verificando número "${projectNumber}". Existe: ${!snapshot.empty}`);
    return !snapshot.empty;
  } catch (error) {
    logger.error('Erro ao verificar número de projeto:', error);
    return false;
  }
};

/**
 * Cria um novo projeto no Firestore
 * 
 * @param projectData Dados do projeto a ser criado
 * @param options Opções de criação (notificações, geração de número, etc)
 * @returns O projeto criado com id
 */
export const createProject = async (
  projectData: Project, 
  options: CreateProjectOptions = {}
): Promise<Project> => {
  try {
    logger.debug('Criando novo projeto', { number: projectData.number });
    
    let checklistMessageFromConfig: string | null = null;
    try {
      const configDocRef = adminDb.collection('configs').doc('geral');
      const configDoc = await configDocRef.get();

      if (configDoc.exists) {
        const configData = configDoc.data();
        if (configData && typeof configData.mensagemChecklist === 'string') {
          checklistMessageFromConfig = configData.mensagemChecklist;
          logger.debug('Mensagem de checklist lida das configurações:', checklistMessageFromConfig);
        } else {
          logger.warn('Campo mensagemChecklist não encontrado ou não é uma string em configs/geral.');
        }
      } else {
        logger.warn('Documento configs/geral não encontrado para ler mensagem de checklist.');
      }
    } catch (error) {
      logger.error('Erro ao ler configuração da mensagem de checklist:', error);
    }

    const initialTimelineEvents: TimelineEvent[] = [];
    const creationTimestamp = new Date().toISOString();

    if (checklistMessageFromConfig) {
      const checklistEvent: TimelineEvent = {
        id: uuidv4(),
        type: 'checklist',
        content: checklistMessageFromConfig,
        user: 'Sistema',
        userId: 'system',
        timestamp: creationTimestamp,
        isSystemGenerated: true,
      };
      initialTimelineEvents.push(checklistEvent);
    }

    const firestoreData: FirestoreData = {
      ...sanitizeObject(projectData),
      createdAt: AdminFieldValue.serverTimestamp(),
      updatedAt: AdminFieldValue.serverTimestamp(),
      timelineEvents: initialTimelineEvents,
      comments: projectData.comments || [],
      files: projectData.files || [],
      documents: projectData.documents || [],
    };
    
    if (options.generateNumber === true && !projectData.number) {
      const uniqueProjectNumber = await generateUniqueProjectNumber();
      firestoreData.number = uniqueProjectNumber;
      logger.debug('Número gerado automaticamente', { number: uniqueProjectNumber });
    }
    
    const projectsCollectionForCreation = adminDb.collection('projects');
    const docRef = await projectsCollectionForCreation.add(firestoreData);
    
    const newProject: Project = { 
      ...projectData, 
      id: docRef.id,
      createdAt: creationTimestamp, 
      updatedAt: creationTimestamp,
      timelineEvents: initialTimelineEvents,
      number: firestoreData.number || projectData.number, 
    };
    
    logger.info('Projeto criado com sucesso', { id: docRef.id, number: newProject.number });
    
    if (options.notifyAdmins === true) {
      try {
        const createdByName = options.createdByName || 'Cliente';
        await createNotificationDirectly({
          type: 'new_project',
          title: `Novo Projeto Criado: ${newProject.number || newProject.name}`,
          message: `Um novo projeto foi criado por ${createdByName}. Nome: ${newProject.name}, Número: ${newProject.number}.`,
          notifyAllAdmins: true,
          link: `/admin/projetos/${newProject.id}`,
          projectId: newProject.id,
          projectNumber: newProject.number
        });
      } catch (notifyError) {
        logger.error('Erro ao enviar notificação sobre novo projeto:', notifyError);
      }
    }
    
    return newProject;
  } catch (error: any) {
    logger.error('Erro ao criar projeto:', error);
    throw new Error(`Falha ao criar projeto: ${error.message}`);
  }
};

/**
 * Obtém um projeto pelo ID
 * 
 * @param projectId ID do projeto para buscar
 * @returns O projeto completo ou null se não encontrado
 */
export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    logger.debug('Buscando projeto', { projectId });
    const projectRef = adminDb.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      logger.warn('Projeto não encontrado', { projectId });
      return null;
    }

    const projectData = projectDoc.data();
    if (!projectData) { // Checagem extra, embora .data() em um doc existente raramente seja undefined
        logger.warn('Dados do projeto não encontrados após a leitura do documento', { projectId });
        return null;
    }
    
    // Usar a nova função de serialização
    return serializeProjectData(projectDoc.id, projectData);

  } catch (error: any) {
    logger.error('Erro ao buscar projeto:', error);
    throw new Error(`Falha ao buscar projeto ${projectId}: ${error.message}`);
  }
};

/**
 * Atualiza um projeto existente
 * 
 * @param projectId ID do projeto a ser atualizado
 * @param updateData Dados a serem atualizados
 * @param options Opções adicionais (notificações, eventos de timeline, etc)
 * @returns O projeto atualizado
 */
export const updateProject = async (
  projectId: string,
  updateData: Partial<Project>,
  options: UpdateProjectOptions = {}
): Promise<UpdatedProject> => {
  try {
    logger.debug('Atualizando projeto', { id: projectId, fields: Object.keys(updateData) });
    const projectRef = adminDb.collection('projects').doc(projectId);
    
    let oldStatus: string | undefined;
    let currentProjectNumberForNotif: string | undefined = updateData.number; // Initial fallback

    // Fetch current project data if needed for status change or for notification info
    if (updateData.status || (options.addTimelineEvent && options.timelineEventType) || options.notifyClient) {
        const currentDoc = await projectRef.get();
        if (currentDoc.exists) {
            const currentData = currentDoc.data() as Partial<Project>;
            oldStatus = currentData?.status;
            if (!currentProjectNumberForNotif) { // Prioritize number from current doc if not in updateData
                currentProjectNumberForNotif = currentData?.number;
            }
        }
    }
    if (!currentProjectNumberForNotif) { // Final fallback to projectId if number still not found
        currentProjectNumberForNotif = projectId;
    }

    const sanitizedUpdateData = sanitizeObject(updateData);
    const updateFields: Record<string, any> = {
      ...sanitizedUpdateData,
      updatedAt: AdminFieldValue.serverTimestamp()
    };
    
    if (options.user) {
      updateFields.lastUpdateBy = {
        uid: options.user.uid,
        email: options.user.email,
        role: options.user.role,
        timestamp: AdminFieldValue.serverTimestamp()
      };
    }
    
    let timelineEvent: TimelineEvent | null = null;
    const newStatus = updateData.status;

    if (newStatus && oldStatus && newStatus !== oldStatus) {
      logger.debug('Mudança de status detectada', { oldStatus, newStatus });
      // Priorizar nome do usuário, depois email, e por último "Sistema"
      const userName = options.user?.name || options.user?.email || 'Sistema';
      
      timelineEvent = {
        id: uuidv4(),
        type: 'status_change',
        content: `Status alterado de "${oldStatus}" para "${newStatus}"`,
        user: userName, // Manter o campo user com o nome também
        userId: options.user?.uid || 'system',
        timestamp: new Date().toISOString(),
        // Se foi um usuário que fez a alteração (tem UID), não é gerado pelo sistema.
        isSystemGenerated: !options.user?.uid, 
      };
    } else if (options.addTimelineEvent && options.timelineEventType && options.timelineEventContent) {
      // Para outros tipos de evento, manter a lógica original de atribuição de usuário,
      // mas também garantir que isSystemGenerated seja definido corretamente.
      const userName = options.user?.name || options.user?.email || 'Sistema';
      timelineEvent = {
        id: uuidv4(),
        type: options.timelineEventType,
        content: options.timelineEventContent, // Para outros eventos, o conteúdo pode já incluir o usuário ou não ser relevante
        user: userName,
        userId: options.user?.uid || 'system',
        timestamp: new Date().toISOString(),
        isSystemGenerated: options.timelineEventType === 'system_message' || !options.user?.uid,
      };
    }
    
    if (timelineEvent) {
      logger.debug('Adicionando evento à timeline', { eventType: timelineEvent.type });
      updateFields.timelineEvents = AdminFieldValue.arrayUnion(timelineEvent);
    }
    
    await projectRef.update(updateFields);
    
    logger.info('Projeto atualizado com sucesso', { id: projectId });
    
    if (options.notifyClient && updateData.userId) { 
      try {
        await createNotificationDirectly({
          type: 'project_updated',
          title: `Projeto Atualizado: ${updateData.name || projectId}`,
          message: `O projeto ${updateData.name || projectId} foi atualizado.`,
          userId: updateData.userId, 
          link: `/cliente/projetos/${projectId}`,
          projectId: projectId,
          projectNumber: currentProjectNumberForNotif // Use pre-fetched or updateData number
        });
      } catch (notifyError) {
        logger.error('Erro ao enviar notificação ao cliente:', notifyError);
      }
    }
    
    const updatedSnapshot = await projectRef.get();
    const updatedDocData = updatedSnapshot.data();

    if (!updatedDocData) {
        throw new Error('Falha ao buscar dados atualizados do projeto.');
    }

    const timelineEventsResult = Array.isArray(updatedDocData.timelineEvents)
      ? updatedDocData.timelineEvents.map(event => mapTimelineEvent(event))
      : [];

    const result: UpdatedProject = {
      id: projectId,
      changes: updateFields,
      updatedAt: (updatedDocData.updatedAt as AdminTimestamp)?.toDate().toISOString() || new Date().toISOString(),
      timelineEvents: timelineEventsResult,
    };
    return result;
  } catch (error: any) {
    logger.error('Erro ao atualizar projeto:', error);
    throw new Error(`Falha ao atualizar projeto: ${error.message}`);
  }
};

/**
 * Exclui um projeto do Firestore
 * 
 * @param projectId ID do projeto a ser excluído
 * @returns true se projeto foi excluído com sucesso
 */
export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    logger.debug('Excluindo projeto', { id: projectId });
    
    const projectRef = adminDb.collection('projects').doc(projectId);
    await projectRef.delete();
    
    logger.info('Projeto excluído com sucesso', { id: projectId });
    return true;
  } catch (error: any) {
    logger.error('Erro ao excluir projeto:', error);
    throw new Error(`Falha ao excluir projeto: ${error.message}`);
  }
};

/**
 * Adiciona um comentário a um projeto
 * 
 * @param projectId ID do projeto onde adicionar o comentário
 * @param commentData Dados do comentário a ser adicionado
 * @param user Informações do usuário que está comentando
 * @returns O comentário adicionado com ID
 */
export const addProjectComment = async (
  projectId: string,
  commentData: CommentData,
  user?: User 
): Promise<CommentType> => {
  try {
    logger.debug('Adicionando comentário ao projeto', { projectId });
    
    const projectRef = adminDb.collection('projects').doc(projectId);
    
    const newComment: CommentType = {
      id: uuidv4(),
      text: commentData.text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user?.uid || 'system',
      userEmail: user?.email || 'unknown',
      userName: user?.name || user?.email || 'Usuário Desconhecido',
      userRole: user?.role || 'user',
    };
    
    const timelineEvent: TimelineEvent = {
      id: uuidv4(),
      type: 'comment',
      content: commentData.text,
      user: user?.name || user?.email || 'Usuário Desconhecido',
      userId: user?.uid || 'system',
      timestamp: newComment.createdAt,
      commentId: newComment.id,
      isSystemGenerated: false,
    };
    
    await projectRef.update({
      comments: AdminFieldValue.arrayUnion(newComment),
      timelineEvents: AdminFieldValue.arrayUnion(timelineEvent),
      updatedAt: AdminFieldValue.serverTimestamp()
    });
    
    logger.info('Comentário adicionado com sucesso', { projectId, commentId: newComment.id });

    if (user) { 
      try {
        const projectDoc = await projectRef.get();
        const projectDataForNotif = projectDoc.data() as Partial<Project> | undefined;
        const projectOwnerUserId = projectDataForNotif?.userId;
        const projectNumberForNotif = projectDataForNotif?.number || projectId;

        const isClientComment = user.role === 'client' || user.role === 'user';
        
        let notificationOutcome: NotificationResult | { success: boolean, ids?: string[] } | undefined;
        const notificationIdsCollected: string[] = []; // Para coletar IDs de notificação

        if (isClientComment) {
          notificationOutcome = await createNotificationDirectly({
            type: 'new_comment',
            title: `Novo Comentário no Projeto ${projectNumberForNotif}`,
            message: `${user.name || 'Cliente'} comentou: "${commentData.text.substring(0, 50)}..."`,
            notifyAllAdmins: true,
            link: `/admin/projetos/${projectId}?tab=comments&commentId=${newComment.id}`,
            projectId: projectId,
            projectNumber: projectNumberForNotif,
            data: { 
              commentId: newComment.id, 
              authorId: user.uid,
              commentFull: commentData.text,
              commentSnippet: commentData.text.substring(0, 150) + (commentData.text.length > 150 ? "..." : ""),
              authorName: user.name || user.email || 'Cliente'
            }
          });
        } else if (projectOwnerUserId && user.uid !== projectOwnerUserId) {
          notificationOutcome = await createNotificationDirectly({
            type: 'new_comment',
            title: `Novo Comentário no Seu Projeto ${projectNumberForNotif}`,
            message: `${user.name || 'Admin'} comentou: "${commentData.text.substring(0, 50)}..."`,
            userId: projectOwnerUserId,
            link: `/cliente/projetos/${projectId}?tab=comments&commentId=${newComment.id}`,
            projectId: projectId,
            projectNumber: projectNumberForNotif,
            data: { 
              commentId: newComment.id, 
              authorId: user.uid,
              commentFull: commentData.text,
              commentSnippet: commentData.text.substring(0, 150) + (commentData.text.length > 150 ? "..." : ""),
              authorName: user.name || user.email || 'Admin'
            }
          });
        }

        if (notificationOutcome?.success) {
          if ('id' in notificationOutcome && notificationOutcome.id) {
            notificationIdsCollected.push(notificationOutcome.id);
          } else if ('ids' in notificationOutcome && Array.isArray(notificationOutcome.ids)) {
            notificationIdsCollected.push(...notificationOutcome.ids);
          }
          // logger.info('IDs de notificação in-app coletados:', notificationIdsCollected);
        }

        // Envio de E-mail
        await sendEmailNotificationForComment(
          projectId,
          newComment.id,
          newComment.text,
          user, 
          projectOwnerUserId
        );

      } catch (notifyError) {
        logger.error('Erro ao enviar notificação in-app ou e-mail sobre novo comentário:', notifyError);
      }
    }
    
    return newComment;
  } catch (error: any) {
    logger.error('Erro ao adicionar comentário:', error);
    throw new Error(`Falha ao adicionar comentário: ${error.message}`);
  }
};

/**
 * Adiciona um evento à timeline do projeto
 * 
 * @param projectId ID do projeto onde adicionar o evento
 * @param eventData Dados do evento a ser adicionado
 * @returns O evento adicionado com ID
 */
export const addProjectTimelineEvent = async (
  projectId: string,
  eventData: Partial<TimelineEvent> & { userTriggered?: { uid: string; name?: string; email?: string }}
): Promise<TimelineEvent> => {
  try {
    logger.debug('Adicionando evento à timeline do projeto', { projectId, eventType: eventData.type });
    
    const projectRef = adminDb.collection('projects').doc(projectId);
    
    const newEvent: TimelineEvent = {
      id: eventData.id || uuidv4(),
      type: eventData.type || 'general',
      content: eventData.content || '',
      user: eventData.userTriggered?.name || eventData.userTriggered?.email || eventData.user || 'Sistema',
      userId: eventData.userTriggered?.uid || eventData.userId || 'system',
      timestamp: eventData.timestamp || new Date().toISOString(),
      fileUrl: eventData.fileUrl,
      fileName: eventData.fileName,
      isSystemGenerated: eventData.isSystemGenerated === undefined ? true : eventData.isSystemGenerated,
      ...(eventData.metadata && { metadata: eventData.metadata }),
      ...(eventData.commentId && { commentId: eventData.commentId }),
    };
    
    await projectRef.update({
      timelineEvents: AdminFieldValue.arrayUnion(newEvent),
      updatedAt: AdminFieldValue.serverTimestamp()
    });
    
    logger.debug('Evento adicionado com sucesso à timeline', { projectId, eventId: newEvent.id });
    return newEvent;
  } catch (error: any) {
    logger.error('Erro ao adicionar evento à timeline:', error);
    throw new Error(`Falha ao adicionar evento à timeline: ${error.message}`);
  }
};

/**
 * Busca projetos usando o Supabase.
 * Pode buscar todos os projetos (para admins) ou filtrar por userId.
 * 
 * @param options Opções de busca, incluindo userId e isAdmin.
 * @returns Uma Promise que resolve para um array de projetos.
 */
export const getProjectsAdmin = async (
  options: GetProjectsOptions = {}
): Promise<Project[]> => {
  const { userId, isAdmin, status, priority, sortBy, sortOrder = 'desc', limit, offset } = options;
  logger.debug('[getProjectsAdmin] Buscando projetos com Supabase:', { userId, isAdmin, status, priority, sortBy, sortOrder, limit, offset });

  try {
    // ✅ SUPABASE - Usar Supabase Service Role Client
    const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/service');
    const supabase = createSupabaseServiceRoleClient();

    let query = supabase
      .from('projects')
      .select('*');

    // Filtrar por usuário se não for admin
    if (!isAdmin) {
      if (userId) {
        logger.debug(`[getProjectsAdmin] Aplicando filtro para userId: ${userId} (não admin)`);
        query = query.eq('created_by', userId);
      } else {
        logger.warn('[getProjectsAdmin] Tentativa de busca não admin sem userId. Retornando vazio.');
        return [];
      }
    }

    // Filtros adicionais
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('prioridade', priority);
    }

    // Ordenação
    const orderField = sortBy || 'updated_at';
    query = query.order(orderField, { ascending: sortOrder === 'asc' });
    
    // Limite
    if (limit) {
      query = query.limit(limit);
    }
    
    // Offset (range no Supabase)
    if (offset) {
      query = query.range(offset, offset + (limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[getProjectsAdmin] Erro na consulta Supabase:', error);
      throw new Error(`Erro ao buscar projetos: ${error.message}`);
    }

    if (!data || data.length === 0) {
      logger.debug('[getProjectsAdmin] Nenhum projeto encontrado com os filtros aplicados.');
      return [];
    }

    // Mapear dados do Supabase para o formato Project
    const projects: Project[] = data.map(item => {
      const safeToDateISO = (field: any): string | null => {
        if (!field) return null;
        try {
          if (typeof field === 'string') {
            const d = new Date(field);
            if (!isNaN(d.getTime())) return d.toISOString();
            return null;
          }
          if (field instanceof Date) {
            if (!isNaN(field.getTime())) return field.toISOString();
            return null;
          }
          if (typeof field === 'number') {
            const d = new Date(field);
            if (!isNaN(d.getTime())) return d.toISOString();
            return null;
          }
          return null;
        } catch (error) {
          logger.warn(`[getProjectsAdmin] Erro ao converter data:`, { field, error });
          return null;
        }
      };

      const safeToDateShortISO = (field: any): string | null => {
        if (!field) return null;
        try {
          let d: Date | null = null;
          if (typeof field === 'string') {
            const parsedDate = new Date(field);
            if (!isNaN(parsedDate.getTime())) d = parsedDate;
          } else if (field instanceof Date) {
            if (!isNaN(field.getTime())) d = field;
          } else if (typeof field === 'number') {
            const parsedDate = new Date(field);
            if (!isNaN(parsedDate.getTime())) d = parsedDate;
          }
          
          if (d) return d.toISOString().split('T')[0];
          return null;
        } catch (error) {
          logger.warn(`[getProjectsAdmin] Erro ao converter data curta:`, { field, error });
          return null;
        }
      };

      // Mapear comentários
      const mappedComments = (item.comments || []).map((comment: any) => ({
        ...comment,
        createdAt: safeToDateISO(comment.createdAt),
        updatedAt: safeToDateISO(comment.updatedAt),
      }));

      // Mapear eventos da timeline
      const mappedTimelineEvents = (item.timeline_events || []).map((event: any) => ({
        ...event,
        timestamp: safeToDateISO(event.timestamp),
      }));
      
      // Mapear lastUpdateBy
      const mappedLastUpdateBy = item.last_update_by ? {
        ...item.last_update_by,
        timestamp: safeToDateISO(item.last_update_by.timestamp),
      } : undefined;

      const project: Project = {
        id: item.id,
        userId: item.created_by || '',
        name: item.name || '',
        number: item.number || '',
        empresaIntegradora: item.empresa_integradora || '',
        nomeClienteFinal: item.nome_cliente_final || '',
        distribuidora: item.distribuidora || '',
        potencia: item.potencia || 0,
        listaMateriais: item.lista_materiais || undefined,
        disjuntorPadraoEntrada: item.disjuntor_padrao_entrada || undefined,
        status: item.status || 'Não Iniciado', 
        prioridade: item.prioridade || 'Baixa', 
        valorProjeto: item.valor_projeto !== undefined ? item.valor_projeto : null,
        pagamento: item.pagamento,
   
        adminResponsibleId: item.admin_responsible_id,
        adminResponsibleName: item.admin_responsible_name,
        adminResponsibleEmail: item.admin_responsible_email,
        adminResponsiblePhone: item.admin_responsible_phone,
        documents: item.documents || [], 
        files: item.files || [], 
        history: item.history || [], 
        createdAt: safeToDateISO(item.created_at),
        updatedAt: safeToDateISO(item.updated_at),
        dataEntrega: safeToDateShortISO(item.data_entrega),
        comments: mappedComments,
        timelineEvents: mappedTimelineEvents,
        lastUpdateBy: mappedLastUpdateBy,
      };
      return project;
    });

    logger.info(`[getProjectsAdmin] ${projects.length} projetos encontrados no Supabase.`);
    return projects;

  } catch (error) {
    logger.error('[getProjectsAdmin] Erro ao buscar projetos com Supabase:', error);
    if (error instanceof Error) {
      throw new Error(`Falha ao buscar projetos (Supabase): ${error.message}`);
    }
    throw new Error('Falha desconhecida ao buscar projetos (Supabase).');
  }
}; 