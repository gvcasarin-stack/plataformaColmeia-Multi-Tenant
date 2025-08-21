/**
 * SISTEMA DE NOTIFICAÇÕES - VERSÃO LEGADA - EM TRANSIÇÃO
 * -------------------------------------------------------
 * 
 * AVISO IMPORTANTE: Este arquivo está sendo gradualmente substituído pelo 
 * novo serviço de notificações em src/lib/services/notificationService/.
 * 
 * NOVAS IMPLEMENTAÇÕES DEVEM UTILIZAR:
 * - import { createNotification } from '@/lib/services/notificationService'
 * 
 * As seguintes funções deste arquivo já foram migradas:
 * - notifyStatusChange
 * - notifyNewComment
 * - notifyDocumentUpload 
 * - notifyAdminOfNewProject
 * - createProjectUpdateNotification
 * - createNotificationForProjectClient
 * 
 * Para compatibilidade temporária, createBaseNotification agora
 * utiliza o serviço central em um processo assíncrono.
 * 
 * Data de início da migração: 08/05/2024
 * 
 * @deprecated Este arquivo será completamente substituído pelo serviço central.
 */

// ⚠️ TODO: MIGRAR PARA SUPABASE
// Firebase imports removidos
import { 
  NotificacaoPadrao, 
  NotificationType,
  LegacyNotificationType,
  Notification,
  StatusChangeNotification,
  PaymentNotification,
  ClientApprovalNotification,
  CommentNotification,
  DocumentUploadNotification,
  ReminderNotification,
  SystemMessageNotification
} from '@/types/notification';
// Importar o serviço centralizado de notificações
import { createNotification as createNotificationCentral } from '@/lib/services/notificationService';
import { devLog } from '@/lib/utils/productionLogger';

// Interface para a estrutura de dados enviada à API de notificações
interface NotificationAPIRequest {
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  projectNumber?: string;
  userId?: string;
  data?: Record<string, any>;
  options?: {
    notifyAllAdmins?: boolean;
    skipCreator?: boolean;
  };
}

/**
 * Cria uma notificação usando o serviço central
 * Esta função é um substituto moderno para createBaseNotification
 */
export async function createNotificationDirectly(
  type: NotificationType,
  title: string,
  message: string,
  userId: string,
  projectId?: string,
  projectNumber?: string,
  data: Record<string, any> = {}
): Promise<string | null> {
  try {
    // Obter informações do usuário atual para o remetente
    const currentUser = auth.currentUser;
    let senderName = 'Sistema';
    let senderType: 'admin' | 'client' | 'system' = 'system';
    let senderId = 'system';
    
    if (currentUser) {
      senderId = currentUser.uid;
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        senderName = userData.name || userData.displayName || currentUser.displayName || 'Usuário';
        
        // Determinar o tipo de remetente
        const isAdmin = 
          userData.role === 'admin' || 
          userData.role === 'superadmin' || 
          userData.userType === 'admin' || 
          userData.userType === 'superadmin' ||
          userData.isAdmin === true;
        
        senderType = isAdmin ? 'admin' : 'client';
      } else {
        senderName = currentUser.displayName || 'Usuário';
        senderType = 'client'; // assumir cliente por padrão
      }
    }
    
    // Usar o serviço central para criar a notificação
    const result = await createNotificationCentral({
    type,
    title,
    message,
    userId,
    projectId,
    projectNumber,
      senderId,
      senderName,
      senderType,
      data
    });
    
    return result.success ? result.id || null : null;
  } catch (error) {
    devLog.error(`[NotificationHelper] Erro ao criar notificação:`, error);
    return null;
  }
}

/**
 * Cria uma notificação base
 * @deprecated Use createNotificationCentral do serviço de notificações 
 */
export const createBaseNotification = (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  projectId?: string,
  projectNumber?: string,
): Omit<NotificacaoPadrao, 'id'> => {
  devLog.warn('[NotificationHelper] DEPRECATED: createBaseNotification - Use o serviço central de notificações');
  
  // Obter informações do usuário atual para o remetente
  const currentUser = auth.currentUser;
  
  // Chamar o serviço central em segundo plano (assíncrono)
  // Não aguardamos o resultado para manter a API síncrona original
  createNotificationDirectly(type, title, message, userId, projectId, projectNumber)
    .then(id => {
      if (id) {
        devLog.log(`[NotificationHelper] Notificação criada via serviço central: ${id}`);
      }
    })
    .catch(error => {
      devLog.error('[NotificationHelper] Erro ao criar notificação via serviço central:', error);
    });
  
  // Retornar o objeto no formato NotificacaoPadrao para compatibilidade com código existente
  return {
    type,
    title,
    message,
    userId,
    projectId: projectId || '',
    projectNumber: projectNumber || '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    read: false,
    senderId: currentUser?.uid || 'system',
    senderName: currentUser?.displayName || 'Sistema',
    senderType: 'system',
    data: {}
  };
};

/**
 * Cria uma notificação de mudança de status de projeto
 */
export function createStatusChangeNotification(
  userId: string,
  projectId: string,
  projectNumber: string,
  oldStatus: string,
  newStatus: string,
  options?: {
    systemMessage?: string;
    title?: string;
    message?: string;
  }
): Omit<StatusChangeNotification, 'id'> {
  const title = options?.title || `Status do projeto alterado: ${newStatus}`;
  const message = options?.message || 
    `O projeto ${projectNumber} mudou de "${oldStatus}" para "${newStatus}".`;

  const notification = createBaseNotification(
    userId,
    'status_change',
    title,
    message,
    projectId,
    projectNumber
  ) as Omit<StatusChangeNotification, 'id'>;

  notification.data = {
    oldStatus,
    newStatus,
    systemMessage: options?.systemMessage
  };

  return notification;
}

/**
 * Cria uma notificação de pagamento
 */
export function createPaymentNotification(
  userId: string,
  projectId: string,
  projectNumber: string,
  amount: number,
  status: 'pending' | 'paid' | 'partial_paid' | 'overdue',
  options?: {
    installment?: 1 | 2;
    dueDate?: Date;
    method?: string;
    invoiceId?: string;
    title?: string;
    message?: string;
  }
): Omit<PaymentNotification, 'id'> {
  let title = options?.title;
  let message = options?.message;
  const installmentText = options?.installment ? `${options.installment}ª parcela` : '';

  // Gera títulos e mensagens padrão baseados no status
  if (!title) {
    switch (status) {
      case 'pending':
        title = `Pagamento ${installmentText ? `(${installmentText}) ` : ''}pendente: R$ ${amount.toFixed(2)}`;
        break;
      case 'paid':
        title = `Pagamento ${installmentText ? `(${installmentText}) ` : ''}recebido: R$ ${amount.toFixed(2)}`;
        break;
      case 'partial_paid':
        title = `Pagamento parcial (${installmentText}) recebido: R$ ${amount.toFixed(2)}`;
        break;
      case 'overdue':
        title = `Pagamento ${installmentText ? `(${installmentText}) ` : ''}atrasado: R$ ${amount.toFixed(2)}`;
        break;
    }
  }

  if (!message) {
    switch (status) {
      case 'pending':
        message = `Há um pagamento ${installmentText ? `(${installmentText}) ` : ''}pendente no valor de R$ ${amount.toFixed(2)} para o projeto ${projectNumber}.`;
        break;
      case 'paid':
        message = `O pagamento ${installmentText ? `(${installmentText}) ` : ''}de R$ ${amount.toFixed(2)} para o projeto ${projectNumber} foi confirmado.`;
        break;
      case 'partial_paid':
        message = `O pagamento parcial (${installmentText}) de R$ ${amount.toFixed(2)} para o projeto ${projectNumber} foi confirmado.`;
        break;
      case 'overdue':
        message = `O pagamento ${installmentText ? `(${installmentText}) ` : ''}de R$ ${amount.toFixed(2)} para o projeto ${projectNumber} está atrasado.`;
        break;
    }
  }

  const notification = createBaseNotification(
    userId,
    'payment',
    title,
    message,
    projectId,
    projectNumber
  ) as Omit<PaymentNotification, 'id'>;

  notification.data = {
    amount,
    status,
    installment: options?.installment,
    dueDate: options?.dueDate ? Timestamp.fromDate(options.dueDate) : undefined,
    method: options?.method,
    invoiceId: options?.invoiceId
  };

  return notification;
}

/**
 * Cria uma notificação de aprovação de cliente
 */
export function createClientApprovalNotification(
  userId: string,
  clientId: string,
  clientName: string,
  status: 'approved' | 'rejected',
  options?: {
    isCompany?: boolean;
    companyName?: string;
    approvedBy?: string;
    rejectionReason?: string;
    title?: string;
    message?: string;
  }
): Omit<ClientApprovalNotification, 'id'> {
  const title = options?.title || 
    status === 'approved' 
      ? 'Cadastro aprovado' 
      : 'Cadastro rejeitado';

  const message = options?.message || 
    status === 'approved'
      ? `Seu cadastro como cliente foi aprovado na plataforma.`
      : `Seu cadastro como cliente foi rejeitado na plataforma.${options?.rejectionReason ? ' Motivo: ' + options.rejectionReason : ''}`;

  const notification = createBaseNotification(
    userId,
    'client_approval',
    title,
    message
  ) as Omit<ClientApprovalNotification, 'id'>;

  notification.data = {
    status,
    clientId,
    clientName,
    isCompany: options?.isCompany,
    companyName: options?.companyName,
    approvedBy: options?.approvedBy,
    rejectionReason: options?.rejectionReason
  };

  return notification;
}

/**
 * Cria uma notificação de upload de documento
 */
export function createDocumentUploadNotification(
  userId: string,
  projectId: string,
  projectNumber: string,
  documentId: string,
  documentName: string,
  documentType: string,
  uploadedBy: string,
  uploadedByName: string,
  options?: {
    fileSize?: number;
    title?: string;
    message?: string;
  }
): Omit<DocumentUploadNotification, 'id'> {
  const title = options?.title || `Novo documento: ${documentName}`;
  const message = options?.message || 
    `${uploadedByName} adicionou um documento "${documentName}" ao projeto ${projectNumber}.`;

  const notification = createBaseNotification(
    userId,
    'document_upload',
    title,
    message,
    projectId,
    projectNumber
  ) as Omit<DocumentUploadNotification, 'id'>;

  notification.data = {
    documentId,
    documentName,
    documentType,
    uploadedBy,
    uploadedByName,
    fileSize: options?.fileSize
  };

  return notification;
}

/**
 * Cria uma notificação de lembrete
 */
export function createReminderNotification(
  userId: string,
  dueDate: Date,
  category: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  projectId?: string,
  projectNumber?: string,
  options?: {
    title?: string;
    message?: string;
  }
): Omit<ReminderNotification, 'id'> {
  const title = options?.title || `Lembrete: ${category}`;
  const message = options?.message || 
    `Você tem um lembrete para ${category} com vencimento em ${dueDate.toLocaleDateString()}.`;

  const notification = createBaseNotification(
    userId,
    'reminder',
    title,
    message,
    projectId,
    projectNumber
  ) as Omit<ReminderNotification, 'id'>;

  notification.data = {
    dueDate: Timestamp.fromDate(dueDate),
    category,
    priority
  };

  return notification;
}

/**
 * Cria uma notificação de mensagem do sistema
 */
export function createSystemMessageNotification(
  userId: string,
  category: string,
  severity: 'info' | 'warning' | 'error' | 'success' = 'info',
  options?: {
    title?: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
  }
): Omit<SystemMessageNotification, 'id'> {
  const severityPrefix = getSystemSeverityPrefix(severity);
  const title = options?.title || `${severityPrefix}${category}`;
  const message = options?.message || `Mensagem do sistema: ${category}`;

  const notification = createBaseNotification(
    userId,
    'system_message',
    title,
    message
  ) as Omit<SystemMessageNotification, 'id'>;

  notification.data = {
    category,
    severity,
    actionUrl: options?.actionUrl,
    actionLabel: options?.actionLabel
  };

  return notification;
}

function getSystemSeverityPrefix(severity: 'info' | 'warning' | 'error' | 'success'): string {
  switch (severity) {
    case 'info': return 'Informação: ';
    case 'warning': return 'Aviso: ';
    case 'error': return 'Erro: ';
    case 'success': return 'Sucesso: ';
    default: return '';
  }
}

/**
 * Adapta uma notificação legada para o formato padronizado
 */
export function adaptLegacyNotification(oldNotification: any): NotificacaoPadrao {
  const { id, type, title, message, projectId, projectNumber, userId, read, createdAt, data, metadata, adminId,
          senderId: oldSenderId, senderName: oldSenderName, senderType: oldSenderType
        } = oldNotification;
  
  // Mapeia o tipo legado para o novo formato
  const newType = mapLegacyType(type as LegacyNotificationType);
  
  // Tratamento de datas
  let normalizedCreatedAt;
  if (!createdAt) {
    normalizedCreatedAt = Timestamp.now();
  } else if (typeof createdAt === 'string') {
    normalizedCreatedAt = Timestamp.fromDate(new Date(createdAt));
  } else if (createdAt instanceof Date) {
    normalizedCreatedAt = Timestamp.fromDate(createdAt);
  } else if (typeof createdAt.toDate === 'function') {
    normalizedCreatedAt = createdAt; // Já é um Timestamp do Firestore
  } else {
    normalizedCreatedAt = Timestamp.now();
  }
  
  // Cria a notificação padronizada
  const standardNotification: NotificacaoPadrao = {
    id,
    type: newType,
    title: title || 'Notificação',
    message: message || '',
    userId: userId || adminId || 'system',
    projectId: projectId || undefined,
    projectNumber: projectNumber || undefined,
    createdAt: normalizedCreatedAt,
    updatedAt: normalizedCreatedAt,
    read: Boolean(read),
    senderId: oldSenderId || data?.authorId || data?.senderId || metadata?.senderId || 'system',
    senderName: oldSenderName || data?.authorName || data?.senderName || metadata?.senderName || 'Sistema',
    senderType: oldSenderType || data?.authorType || data?.senderType || metadata?.senderType || 'system',
    data: {}
  };
  
  // Processa campos de dados específicos
  if (data) {
    standardNotification.data = { ...data };
  } else if (metadata) {
    // Migra metadados legados para o campo data
    standardNotification.data = { ...metadata };
  }
  
  return standardNotification;
}

/**
 * Mapeia tipos legados para os novos tipos padronizados
 */
function mapLegacyType(oldType: LegacyNotificationType): NotificationType {
  switch (oldType) {
    case 'new_project': return 'new_project';
    case 'new_document': return 'document_upload';
    case 'new_comment': return 'new_comment';
    case 'system': return 'system_message';
    default: return oldType as NotificationType;
  }
}

/**
 * Adapta uma notificação padronizada para o formato legado (para compatibilidade reversa)
 */
export function adaptToLegacyFormat(notification: NotificacaoPadrao): Notification {
  // Converte o Timestamp para string se for necessário para compatibilidade com código legado
  const createdAtString = notification.createdAt instanceof Timestamp 
    ? notification.createdAt.toDate().toISOString() 
    : typeof notification.createdAt === 'string'
      ? notification.createdAt
      : new Date().toISOString();
      
  return {
    id: notification.id,
    type: notification.type as LegacyNotificationType,
    title: notification.title,
    message: notification.message,
    projectId: notification.projectId || '',
    projectNumber: notification.projectNumber || '',
    userId: notification.userId,
    read: notification.read,
    createdAt: notification.createdAt, // Mantém o Timestamp original conforme definido na interface
    data: notification.data || {}
  };
}

/**
 * Cria notificações para todos os administradores do sistema
 * @param notification - A notificação a ser enviada para todos os administradores
 * @param excludeUserId - ID do usuário que deve ser excluído das notificações (ex: o próprio autor da ação)
 */
export async function createNotificationForAllAdmins(
  notification: Omit<NotificacaoPadrao, 'id' | 'userId'> | Partial<NotificacaoPadrao>,
  excludeUserId?: string
): Promise<string[]> {
  try {
      devLog.log('[NOTIFICATION_DEBUG] ==================== INÍCIO ====================');
  devLog.log('[NOTIFICATION_DEBUG] Iniciando createNotificationForAllAdmins com dados:', {
      type: notification.type,
      title: notification.title,
      projectId: notification.projectId,
      projectNumber: notification.projectNumber,
      message: notification.message,
      excludeUserId: excludeUserId // Log do ID do usuário excluído
    });
    
    // Verificar se o autor já está definido nos dados da notificação
    const authorId = notification.data?.authorId || notification.data?.createdBy || notification.data?.uploadedBy || excludeUserId;
    if (authorId) {
      devLog.log(`[NOTIFICATION_DEBUG] Autor identificado nos dados: ${authorId}`);
      // Atualizar excludeUserId se não estiver definido
      if (!excludeUserId) {
        excludeUserId = authorId;
        devLog.log(`[NOTIFICATION_DEBUG] Atualizando excludeUserId para o autor: ${excludeUserId}`);
      }
    }
    
    // Log adicional para depuração
    devLog.log('[NOTIFICATION_DEBUG] Verificando dados da notificação completa:', JSON.stringify(notification, null, 2));
    
    // Criar várias consultas para encontrar administradores por diferentes propriedades/valores
    const usersRef = collection(db, 'users');
    const adminsQueryByRole = query(usersRef, where('role', 'in', ['admin', 'superadmin']));
    const adminsQueryByUserType = query(usersRef, where('userType', 'in', ['admin', 'superadmin']));
    const adminQueryByAdminFlag = query(usersRef, where('isAdmin', '==', true));
    const superAdminQueryByFlag = query(usersRef, where('isSuperAdmin', '==', true));
    
    // Executar consultas em paralelo
    devLog.log('[NOTIFICATION_DEBUG] Buscando administradores no banco de dados...');
    try {
      const [
        adminsSnapshotByRole, 
        adminsSnapshotByUserType,
        adminsSnapshotByAdminFlag,
        adminsSnapshotBySuperAdminFlag
      ] = await Promise.all([
        getDocs(adminsQueryByRole),
        getDocs(adminsQueryByUserType),
        getDocs(adminQueryByAdminFlag),
        getDocs(superAdminQueryByFlag)
      ]);
      
      // Log dos resultados de cada consulta
      devLog.log(`[NOTIFICATION_DEBUG] Admins encontrados por role: ${adminsSnapshotByRole.size}`);
      devLog.log(`[NOTIFICATION_DEBUG] Admins encontrados por userType: ${adminsSnapshotByUserType.size}`);
      devLog.log(`[NOTIFICATION_DEBUG] Admins encontrados por isAdmin flag: ${adminsSnapshotByAdminFlag.size}`);
      devLog.log(`[NOTIFICATION_DEBUG] Admins encontrados por isSuperAdmin flag: ${adminsSnapshotBySuperAdminFlag.size}`);
      
      // Combinar os resultados, removendo duplicatas pelo ID
      const adminIds = new Set<string>();
      
      // Verificar explicitamente para garantir que excludeUserId não é undefined
      // Isso é importante para garantir comparações corretas
      const userIdToExclude = excludeUserId || '';
      if (userIdToExclude) {
        devLog.log(`[NOTIFICATION_DEBUG] Excluindo notificação para o usuário: ${userIdToExclude}`);
      }
      
      // Adicionar admins encontrados pelo campo 'role', excluindo o autor
      adminsSnapshotByRole.forEach(doc => {
        if (doc.id !== userIdToExclude) {
          adminIds.add(doc.id);
          devLog.log(`[NOTIFICATION_DEBUG] Admin com role: ${doc.id}, role: ${doc.data().role}`);
        } else {
          devLog.log(`[NOTIFICATION_DEBUG] Excluindo admin ${doc.id} (criador da notificação)`);
        }
      });
      
      // Adicionar admins encontrados pelo campo 'userType', excluindo o autor
      adminsSnapshotByUserType.forEach(doc => {
        if (doc.id !== userIdToExclude) {
          adminIds.add(doc.id);
          devLog.log(`[NOTIFICATION_DEBUG] Admin com userType: ${doc.id}, userType: ${doc.data().userType}`);
        } else {
          devLog.log(`[NOTIFICATION_DEBUG] Excluindo admin ${doc.id} (criador da notificação)`);
        }
      });
      
      // Adicionar admins encontrados pelo campo 'isAdmin', excluindo o autor
      adminsSnapshotByAdminFlag.forEach(doc => {
        if (doc.id !== userIdToExclude) {
          adminIds.add(doc.id);
          devLog.log(`[NOTIFICATION_DEBUG] Admin com isAdmin flag: ${doc.id}`);
        } else {
          devLog.log(`[NOTIFICATION_DEBUG] Excluindo admin ${doc.id} (criador da notificação)`);
        }
      });
      
      // Adicionar admins encontrados pelo campo 'isSuperAdmin', excluindo o autor
      adminsSnapshotBySuperAdminFlag.forEach(doc => {
        if (doc.id !== userIdToExclude) {
          adminIds.add(doc.id);
          devLog.log(`[NOTIFICATION_DEBUG] Admin com isSuperAdmin flag: ${doc.id}`);
        } else {
          devLog.log(`[NOTIFICATION_DEBUG] Excluindo admin ${doc.id} (criador da notificação)`);
        }
      });
      
      devLog.log(`[NOTIFICATION_DEBUG] Total de admins após exclusão: ${adminIds.size}`);
      
      // Verificação final para garantir que o autor não receberá notificação
      if (userIdToExclude && adminIds.has(userIdToExclude)) {
        adminIds.delete(userIdToExclude);
        devLog.log(`[NOTIFICATION_DEBUG] Excluindo manualmente o admin ${userIdToExclude} (autor da ação)`);
      }
      
      const notificationIds: string[] = [];
      const notificationsCollection = collection(db, 'notifications');
      
      // Cria a notificação para cada administrador
      for (const adminId of Array.from(adminIds)) {
        try {
          // Verificação adicional para garantir que não estamos criando para o autor
          if (adminId === userIdToExclude) {
            devLog.log(`[NOTIFICATION_DEBUG] Pulando criação para admin ${adminId} (autor da notificação)`);
            continue;
          }
          
          const adminNotification = {
            ...notification,
            userId: adminId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            read: false
          };
          
          // Garantir que o campo data existe
          if (!adminNotification.data) {
            adminNotification.data = {};
          }
          
          // Adicionar/atualizar campos importantes para rastreamento
          if (userIdToExclude) {
            // Garantir que authorId está presente para possibilitar filtragem futura
            adminNotification.data.authorId = userIdToExclude;
            adminNotification.data.createdBy = userIdToExclude;
          }
          
          // Identificar explicitamente se é uma notificação de cliente
          const isClientNotification = notification.data?.isClientComment === true || 
                                     notification.data?.fromClient === true ||
                                     notification.data?.isClientUpload === true ||
                                     (notification.type === 'new_comment' && 
                                      notification.data?.clientName) ||
                                     (notification.type === 'document_upload' && 
                                      notification.data?.uploadedBy !== userIdToExclude) ||
                                     notification.data?.notificationOrigin === 'client_comment' ||
                                     notification.data?.notificationOrigin === 'client_document_upload';

          if (isClientNotification) {
            adminNotification.data.isClientComment = notification.type === 'new_comment' ? true : adminNotification.data.isClientComment;
            adminNotification.data.isClientUpload = (notification.type === 'document_upload' || notification.type === 'new_document') ? true : adminNotification.data.isClientUpload;
            adminNotification.data.fromClient = true;
            adminNotification.data.notificationOrigin = adminNotification.data.notificationOrigin || 
                                                       (notification.type === 'new_comment' ? 'client_comment' : 
                                                       (notification.type === 'document_upload' || notification.type === 'new_document') ? 'client_document_upload' : 
                                                       'client_notification');
            
            // Garantir que a renderização tenha informações sobre o cliente
            if (!adminNotification.data.clientName && adminNotification.data.authorName) {
              adminNotification.data.clientName = adminNotification.data.authorName;
            }
            
            devLog.log('[NOTIFICATION_DEBUG] Notificação de cliente identificada e flags definidas:', {
              type: notification.type,
              fromClient: adminNotification.data.fromClient,
              isClientComment: adminNotification.data.isClientComment,
              isClientUpload: adminNotification.data.isClientUpload,
              origin: adminNotification.data.notificationOrigin
            });
          }
          
          // Garantir que data.isExcludedFromAuthor está presente para facilitar depuração
          adminNotification.data.isExcludedFromAuthor = true;

          // Sanitização: remover valores undefined ou null
          Object.keys(adminNotification).forEach(key => {
            if (adminNotification[key] === undefined || adminNotification[key] === null) {
              // Usar valor padrão apropriado baseado no tipo de campo
              if (key === 'type') adminNotification[key] = 'system_message';
              else if (key === 'projectId' || key === 'projectNumber') adminNotification[key] = '';
              else if (key === 'read') adminNotification[key] = false;
              else adminNotification[key] = ''; // Default para campos string
            }
          });
          
          // Sanitizar também campos dentro do objeto data
          Object.keys(adminNotification.data).forEach(dataKey => {
            if (adminNotification.data[dataKey] === undefined || adminNotification.data[dataKey] === null) {
              // Usar valor padrão apropriado baseado no tipo esperado
              if (typeof adminNotification.data[dataKey] === 'number') {
                adminNotification.data[dataKey] = 0;
              } else {
                adminNotification.data[dataKey] = '';
              }
            }
          });
          
          devLog.log(`[NOTIFICATION_DEBUG] Criando notificação para admin: ${adminId} com dados:`, {
            type: adminNotification.type,
            title: adminNotification.title,
            projectId: adminNotification.projectId,
            authorId: adminNotification.data.authorId
          });
          
          // Criar o documento de notificação
          try {
            // Definir explicitamente o userId como all_admins para garantir que seja exibido para todos os admins
            adminNotification.userId = 'all_admins';
            
            devLog.log(`[NOTIFICATION_DEBUG] Inserindo notificação all_admins para o administrador ${adminId}:`, {
              type: adminNotification.type,
              title: adminNotification.title?.substring(0, 30),
              userId: adminNotification.userId, // Verificar que realmente está como 'all_admins'
              isClientComment: adminNotification.data?.isClientComment
            });
            
            const notificationRef = await addDoc(collection(db, 'notifications'), adminNotification);
            const notificationId = notificationRef.id;
            
            devLog.log(`[NOTIFICATION_DEBUG] Notificação criada com sucesso: ${notificationId}`);
            notificationIds.push(notificationId);
          } catch (error) {
            devLog.error(`[NOTIFICATION_DEBUG] Erro ao criar notificação para o administrador ${adminId}:`, error);
          }
        } catch (addError) {
          devLog.error(`[NOTIFICATION_DEBUG] Erro ao criar notificação para admin ${adminId}:`, addError);
        }
      }
      
      devLog.log(`[NOTIFICATION_DEBUG] Finalizando createNotificationForAllAdmins. Criadas ${notificationIds.length} notificações`);
      devLog.log('[NOTIFICATION_DEBUG] ==================== FIM ====================');
      return notificationIds;
    } catch (queryError) {
      devLog.error('[NOTIFICATION_DEBUG] Erro ao buscar administradores:', queryError);
      // Como fallback, tentar criar pelo menos para um admin fixo
      const fixedAdminId = 'gSf0Md8w0dbiTDLUoUbUX7yATg92'; // ID de um superadmin conhecido
      const adminNotification = {
        ...notification,
        userId: fixedAdminId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        read: false
      };
      
      // Sanitização: remover valores undefined ou null
      Object.keys(adminNotification).forEach(key => {
        if (adminNotification[key] === undefined || adminNotification[key] === null) {
          // Usar valor padrão apropriado baseado no tipo de campo
          if (key === 'type') adminNotification[key] = 'system_message';
          else if (key === 'projectId' || key === 'projectNumber') adminNotification[key] = '';
          else if (key === 'read') adminNotification[key] = false;
          else adminNotification[key] = ''; // Default para campos string
        }
      });
      
      // Sanitizar também campos dentro do objeto data
      if (adminNotification.data) {
        Object.keys(adminNotification.data).forEach(dataKey => {
          if (adminNotification.data[dataKey] === undefined || adminNotification.data[dataKey] === null) {
            // Usar valor padrão apropriado baseado no tipo esperado
            if (typeof adminNotification.data[dataKey] === 'number') {
              adminNotification.data[dataKey] = 0;
            } else {
              adminNotification.data[dataKey] = '';
            }
          }
        });
      } else {
        adminNotification.data = {}; // Garantir que data sempre existe
      }
      
      try {
        const notificationsCollection = collection(db, 'notifications');
        const docRef = await addDoc(notificationsCollection, adminNotification);
        devLog.log(`[NOTIFICATION_DEBUG] Notificação de fallback ${docRef.id} criada para admin fixo: ${fixedAdminId}`);
        return [docRef.id];
      } catch (fallbackError) {
        devLog.error('[NOTIFICATION_DEBUG] Erro ao criar notificação de fallback:', fallbackError);
        return [];
      }
    }
  } catch (error) {
    devLog.error('[NOTIFICATION_DEBUG] Erro crítico ao criar notificações para administradores:', error);
    return [];
  }
}

/**
 * Cria uma notificação para o cliente de um projeto
 * @returns Um objeto indicando o sucesso ou falha da operação, incluindo o ID da notificação criada e o ID do cliente
 */
export async function createNotificationForProjectClient(
  projectId: string,
  projectNumber: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any
): Promise<{ 
  success: boolean; 
  notificationId?: string; 
  error?: string;
  clientId?: string;
}> {
  try {
    // Buscar o cliente associado ao projeto
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      devLog.error('[NotificationHelper] Projeto não encontrado ao tentar notificar cliente:', projectId);
      return { success: false, error: 'Projeto não encontrado' };
    }
    
    const projectData = projectSnap.data();
    const clientId = projectData.clientId || projectData.userId; // Priorizar clientId se existir
    const projectName = projectData.name || projectData.nome || projectNumber || 'Projeto não especificado'; // Obter nome do projeto
    
    if (!clientId) {
      devLog.error('[NotificationHelper] Cliente (clientId ou userId) não encontrado no projeto:', projectId);
      return { success: false, error: 'Cliente não encontrado para este projeto' };
    }
    
    // Obter o usuário atual (admin que está enviando a notificação)
    const currentUser = auth.currentUser;
    let senderIdToUse = 'system';
    let senderNameToUse = 'Sistema';
    let senderTypeToUse: 'admin' | 'client' | 'system' = 'system';
    let isAdminSender = false;

    if (currentUser) {
      senderIdToUse = currentUser.uid;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          senderNameToUse = userData.name || userData.displayName || currentUser.displayName || 'Usuário Autenticado';
          isAdminSender = userData.role === 'admin' || userData.role === 'superadmin' || userData.userType === 'admin' || userData.userType === 'superadmin' || userData.isAdmin === true;
          senderTypeToUse = isAdminSender ? 'admin' : 'client';
        } else {
          senderNameToUse = currentUser.displayName || 'Usuário Autenticado (sem perfil DB)';
          // Não podemos determinar role sem perfil, assumir client ou system se necessário, mas aqui é o remetente
          // Se o sistema chama isso, deve ser um admin logado.
          senderTypeToUse = 'admin'; // Assumindo que esta função é chamada por um admin logado
          isAdminSender = true; // Assumindo que esta função é chamada por um admin logado
        }
      } catch (userError) {
        devLog.error('[NotificationHelper] Erro ao buscar dados do remetente (admin):', userError);
        // Continuar com o nome padrão, mas registrar o erro
        senderNameToUse = 'Administração Colmeia';
        senderTypeToUse = 'admin';
        isAdminSender = true;
      }
    }
    
    devLog.log(`[NotificationHelper] Remetente da notificação para cliente: ${senderNameToUse} (ID: ${senderIdToUse}, Tipo: ${senderTypeToUse})`);
    
    // Usar o serviço central para criar a notificação
    const result = await createNotificationCentral({
      type,
      title,
      message,
      userId: clientId, // Notificação é para o cliente do projeto
      projectId,
      projectNumber,
      projectName,    // Nome do projeto adicionado
      senderId: senderIdToUse,
      senderName: senderNameToUse,
      senderType: senderTypeToUse, // Tipo do remetente (deve ser admin)
      data: {
        ...(data || {}),
        fromAdmin: isAdminSender, // Se o remetente é admin
        receivedAsClient: true, // Marcador de que o destinatário é o cliente
      }
    });
    
    if (result.success) {
      devLog.log(`[NotificationHelper] Notificação para cliente ${clientId} criada com sucesso: ${result.id}`);
    }
    
    return { 
      success: result.success, 
      notificationId: result.id,
      clientId,
      error: result.error
    };
  } catch (error: any) {
    devLog.error('[NotificationHelper] Erro grave em createNotificationForProjectClient:', error);
    return { success: false, error: error.message || 'Erro ao criar notificação para cliente' };
  }
}

/**
 * Cria notificações para administradores e clientes sobre atualizações em projetos
 * @param projectId ID do projeto
 * @param projectNumber Número do projeto
 * @param type Tipo de notificação
 * @param adminTitle Título da notificação para administradores
 * @param adminMessage Conteúdo da notificação para administradores
 * @param clientTitle Título da notificação para o cliente
 * @param clientMessage Conteúdo da notificação para o cliente
 * @param data Dados adicionais a serem incluídos na notificação
 * @param excludeAdminId ID do admin a ser excluído (geralmente o que fez a alteração)
 * @returns IDs das notificações criadas para admins e cliente
 */
/*
export async function createProjectUpdateNotification(
  projectId: string,
  projectNumber: string,
  type: NotificationType,
  adminTitle: string,
  adminMessage: string,
  clientTitle: string,
  clientMessage: string,
  data: Record<string, any> = {},
  excludeAdminId?: string
): Promise<{ adminIds: string[], clientId: string | null }> {
  try {
    devLog.log(`[NotificationHelper] Criando notificações de atualização para projeto ${projectId}`);
    
    // Verificar autenticação do usuário atual
    const currentUser = auth.currentUser;
    if (!currentUser && !excludeAdminId) {
      devLog.error('[NotificationHelper] Erro: usuário não autenticado e nenhum excludeAdminId fornecido');
      return { adminIds: [], clientId: null };
    }
    
    // Definir o ID do usuário a ser excluído (quem fez a alteração)
    const updatingUserId = excludeAdminId || currentUser?.uid;
    
    if (updatingUserId) {
      devLog.log(`[NotificationHelper] Excluindo notificações para o usuário ${updatingUserId}`);
    }
    
    // Obter informações do usuário que fez a alteração
    const userDoc = await getDoc(doc(db, 'users', updatingUserId || 'system'));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Obter nome do usuário com fallbacks
    const userName = userData.name || userData.displayName || currentUser?.displayName || 'Sistema';
    
    // Verificar se o usuário é admin
    const isAdmin = 
      userData.role === 'admin' || 
      userData.role === 'superadmin' || 
      userData.userType === 'admin' || 
      userData.userType === 'superadmin' ||
      userData.isAdmin === true;
    
    // Buscar informações do projeto, incluindo o clientId
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      devLog.error('[NotificationHelper] Erro: Projeto não encontrado', projectId);
      return { adminIds: [], clientId: null };
    }
    
    const projectData = projectDoc.data();
    const clientId = projectData.clientId || projectData.userId;
    
    // Se não encontrou um clientId, não pode notificar o cliente
    if (!clientId) {
      devLog.warn('[NotificationHelper] ClientId não encontrado para o projeto', projectId);
    }
    
    // Dados comuns para todas as notificações
    const commonData = {
      ...data,
      updatedBy: updatingUserId,
      updatedByName: userName,
      updatedAt: new Date().toISOString(),
      isAdmin
    };
    
    // 1. Notificações para administradores
    const adminIds: string[] = [];
    
    try {
      // Usar o serviço central diretamente
      // Obter todos os usuários admin
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminDocs = await getDocs(adminsQuery);
      
      // Para cada admin, criar uma notificação (exceto para o que fez a alteração)
      for (const adminDoc of adminDocs.docs) {
        const adminId = adminDoc.id;
        
        // Não notificar o próprio admin que fez a alteração
        if (adminId === updatingUserId) continue;
        
        const result = await createNotificationCentral({
          type,
          title: adminTitle,
          message: adminMessage,
          userId: adminId,
          projectId,
          projectNumber,
          // Definir explicitamente o remetente
          senderId: updatingUserId || 'system',
          senderName: userName,
          senderType: isAdmin ? 'admin' : 'client',
          data: {
            ...commonData,
            forAdmin: true,
            fromClient: !isAdmin
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
      
      // Também notificar superadmins
      const superAdminsQuery = query(collection(db, 'users'), where('role', '==', 'superadmin'));
      const superAdminDocs = await getDocs(superAdminsQuery);
      
      for (const superAdminDoc of superAdminDocs.docs) {
        const superAdminId = superAdminDoc.id;
        
        // Não notificar o próprio superadmin que fez a alteração
        if (superAdminId === updatingUserId) continue;
        
        // Não enviar duplicata se o usuário já é admin e superadmin
        if (adminIds.includes(superAdminId)) continue;
        
        const result = await createNotificationCentral({
          type,
          title: adminTitle,
          message: adminMessage,
          userId: superAdminId,
      projectId,
      projectNumber,
          // Definir explicitamente o remetente
          senderId: updatingUserId || 'system',
          senderName: userName,
          senderType: isAdmin ? 'admin' : 'client',
          data: {
            ...commonData,
            forAdmin: true,
            fromClient: !isAdmin
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
      
      // Como fallback, também criar uma notificação para todos os admins
      if (adminIds.length === 0) {
        const result = await createNotificationCentral({
          type,
          title: adminTitle,
          message: adminMessage,
          userId: 'all_admins',
          projectId,
          projectNumber,
          // Definir explicitamente o remetente
          senderId: updatingUserId || 'system',
          senderName: userName,
          senderType: isAdmin ? 'admin' : 'client',
          data: {
            ...commonData,
            isAdminBroadcast: true,
            forAdmin: true,
            fromClient: !isAdmin
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
    }
    
    // 2. Notificação para o cliente do projeto
    let clientNotificationId: string | null = null;
    
    // Apenas criar notificação para o cliente se existir um clientId
    if (clientId) {
      try {
        const result = await createNotificationCentral({
          type,
          title: clientTitle,
          message: clientMessage,
          userId: clientId,
          projectId,
          projectNumber,
          // Definir explicitamente o remetente
          senderId: updatingUserId || 'system',
          senderName: userName,
          senderType: isAdmin ? 'admin' : 'client',
          data: {
            ...commonData,
            fromAdmin: isAdmin,
            receivedAsClient: true
          }
        });
        
        if (result.success && result.id) {
          clientNotificationId = result.id;
        }
      } catch (error) {
        devLog.error('[NotificationHelper] Erro ao criar notificação para cliente:', error);
      }
    }
    
    return { adminIds, clientId: clientNotificationId };
  } catch (error: any) {
    devLog.error('[NotificationHelper] Erro ao criar notificações de atualização:', error);
    return { adminIds: [], clientId: null };
  }
}
*/

/**
 * Cria uma notificação de novo projeto
 */
/*
export function createNewProjectNotification(
  userId: string,
  projectId: string,
  projectNumber: string,
  clientName: string,
  companyName: string,
  options?: {
    potencia?: number;
    valorProjeto?: number;
    title?: string;
    message?: string;
  }
): Omit<NotificacaoPadrao, 'id'> {
  const title = options?.title || `Novo Projeto Criado: ${projectNumber}`;
  const message = options?.message || 
    `Novo projeto #${projectNumber} criado por ${companyName || 'Cliente'} para cliente ${clientName || 'não especificado'}.`;

  const notification = createBaseNotification(
    userId,
    'new_project',
    title,
    message,
    projectId,
    projectNumber
  );

  notification.data = {
    clientName: clientName || '',
    companyName: companyName || '',
    potencia: options?.potencia || 0,
    valorProjeto: options?.valorProjeto || 0
  };

  return notification;
}
*/

/**
 * Notifica admins sobre um novo projeto criado por cliente
 * @param projectId ID do projeto
 * @param projectNumber Número do projeto
 * @param clientName Nome do cliente
 * @param clientId ID do cliente
 * @param potencia Potência do projeto (opcional)
 * @returns IDs das notificações criadas para admins
 */
export async function notifyAdminOfNewProject(
  projectId: string,
  projectNumber: string,
  clientName: string,
  clientId: string,
  potencia?: number | string
): Promise<string[]> {
  try {
    devLog.log(`[NotificationHelper] Notificando admins sobre novo projeto ${projectNumber} do cliente ${clientName}`);
    
    // Obter usuário atual (deve ser o cliente que criou o projeto)
    const currentUser = auth.currentUser;
    
    // Criar título e mensagem
    const title = `Novo Projeto Criado: ${projectNumber}`;
    const message = `O cliente ${clientName} criou um novo projeto: ${projectNumber}`;
    
    // Dados específicos
    const data = {
      clientName,
      clientId,
      potencia: potencia || 0,
      createdBy: currentUser?.uid || clientId,
      timestamp: new Date().toISOString(),
      // Flags importantes para notificações cliente → admin
      fromClient: true,
      isClientCreated: true
    };

    // Usar o serviço centralizado diretamente
    const adminIds: string[] = [];
    
    try {
      // Obter todos os usuários admin
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminDocs = await getDocs(adminsQuery);
      
      // Para cada admin, criar uma notificação
      for (const adminDoc of adminDocs.docs) {
        const adminId = adminDoc.id;
        const result = await createNotificationCentral({
      type: 'new_project',
          title,
          message,
          userId: adminId,
      projectId,
      projectNumber,
          // Importante: Definir explicitamente o remetente como cliente
          senderId: currentUser?.uid || clientId,
          senderName: clientName,
          senderType: 'client',
          data
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
      
      // Também criar uma notificação para superadmins
      const superAdminsQuery = query(collection(db, 'users'), where('role', '==', 'superadmin'));
      const superAdminDocs = await getDocs(superAdminsQuery);
      
      for (const superAdminDoc of superAdminDocs.docs) {
        const superAdminId = superAdminDoc.id;
        
        // Não enviar duplicata se o usuário já é admin e superadmin
        if (adminIds.includes(superAdminId)) continue;
        
        const result = await createNotificationCentral({
          type: 'new_project',
          title,
          message,
          userId: superAdminId,
          projectId,
          projectNumber,
          // Importante: Definir explicitamente o remetente como cliente
          senderId: currentUser?.uid || clientId,
          senderName: clientName,
          senderType: 'client',
          data
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
      
      // Como fallback, também criar uma notificação para todos os admins
      if (adminIds.length === 0) {
        const result = await createNotificationCentral({
          type: 'new_project',
          title,
          message,
          userId: 'all_admins',
          projectId,
          projectNumber,
          // Importante: Definir explicitamente o remetente como cliente
          senderId: currentUser?.uid || clientId,
          senderName: clientName,
          senderType: 'client',
      data: {
            ...data,
            isAdminBroadcast: true
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
    } catch (error) {
      devLog.error('[NotificationHelper] Erro ao notificar admins sobre novo projeto:', error);
    }
    
    return adminIds;
  } catch (error: any) {
    devLog.error('[NotificationHelper] Erro ao notificar admins sobre novo projeto:', error);
    return [];
  }
}

/**
 * Notifica sobre mudança de status em um projeto
 * @param projectId ID do projeto
 * @param projectNumber Número do projeto
 * @param oldStatus Status anterior
 * @param newStatus Novo status
 * @param clientId ID do cliente (opcional, será buscado no projeto se não fornecido)
 * @returns Resultado da operação com IDs das notificações criadas
 */
export async function notifyStatusChange(
  projectId: string,
  projectNumber: string,
  oldStatus: string,
  newStatus: string,
  clientId?: string
): Promise<{ adminIds: string[], clientId: string | null }> {
  try {
    // Verificar autenticação do usuário atual (admin)
    const currentUser = auth.currentUser;
    if (!currentUser) {
      devLog.error('[NotificationHelper] Erro ao notificar mudança de status: usuário não autenticado');
      return { adminIds: [], clientId: null };
    }
    
    // Obter informações do usuário que fez a alteração
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Obter nome do usuário com fallbacks
    const userName = userData.name || userData.displayName || currentUser.displayName || 'Administrador';
    
    // Verificar se o usuário é admin
    const isAdmin = 
      userData.role === 'admin' || 
      userData.role === 'superadmin' || 
      userData.userType === 'admin' || 
      userData.userType === 'superadmin' ||
      userData.isAdmin === true;
    
    // Buscar o projeto para obter o clientId se não foi fornecido
    if (!clientId) {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const projectData = projectDoc.data();
        clientId = projectData.clientId || projectData.userId;
      }
    }
    
    // Se não encontrou um clientId, não pode notificar o cliente
    if (!clientId) {
      devLog.warn('[NotificationHelper] ClientId não encontrado para o projeto', projectId);
    }
    
    // Dados comuns para as notificações
    const commonData = {
      oldStatus,
      newStatus,
      updatedBy: currentUser.uid,
      updatedByName: userName,
      updatedAt: new Date().toISOString(),
      statusChangeEvent: true
    };
    
    // 1. Notificações para administradores
    const adminTitle = `Status do projeto ${projectNumber} alterado: ${newStatus}`;
    const adminMessage = `${userName} alterou o status do projeto ${projectNumber} de "${oldStatus}" para "${newStatus}".`;
    
    // Criar notificações para todos os administradores (exceto o atual)
    let adminIds: string[] = [];
    
    try {
      // Usar o serviço central diretamente
      // Obter todos os usuários admin
      const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminDocs = await getDocs(adminsQuery);
      
      // Para cada admin, criar uma notificação (exceto para o que fez a alteração)
      for (const adminDoc of adminDocs.docs) {
        const adminId = adminDoc.id;
        
        // Não notificar o próprio admin que fez a alteração
        if (adminId === currentUser.uid) continue;
        
        const result = await createNotificationCentral({
          type: 'status_change',
          title: adminTitle,
          message: adminMessage,
          userId: adminId,
          projectId,
          projectNumber,
          // Importante: Definir explicitamente o remetente como admin
          senderId: currentUser.uid,
          senderName: userName,
          senderType: 'admin',
          data: {
            ...commonData,
            forAdmin: true
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
      
      // Também criar uma notificação para superadmins (exceto para o que fez a alteração)
      const superAdminsQuery = query(collection(db, 'users'), where('role', '==', 'superadmin'));
      const superAdminDocs = await getDocs(superAdminsQuery);
      
      for (const superAdminDoc of superAdminDocs.docs) {
        const superAdminId = superAdminDoc.id;
        
        // Não notificar o próprio superadmin que fez a alteração
        if (superAdminId === currentUser.uid) continue;
        
        // Não enviar duplicata se o usuário já é admin e superadmin
        if (adminIds.includes(superAdminId)) continue;
        
        const result = await createNotificationCentral({
          type: 'status_change',
          title: adminTitle,
          message: adminMessage,
          userId: superAdminId,
          projectId,
          projectNumber,
          // Importante: Definir explicitamente o remetente como admin
          senderId: currentUser.uid,
          senderName: userName,
          senderType: 'admin',
          data: {
            ...commonData,
            forAdmin: true
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
      
      // Como fallback, também criar uma notificação para todos os admins
      if (adminIds.length === 0) {
        const result = await createNotificationCentral({
          type: 'status_change',
          title: adminTitle,
          message: adminMessage,
          userId: 'all_admins',
          projectId,
          projectNumber,
          // Importante: Definir explicitamente o remetente como admin
          senderId: currentUser.uid,
          senderName: userName,
          senderType: 'admin',
          data: {
            ...commonData,
            isAdminBroadcast: true,
            forAdmin: true
          }
        });
        
        if (result.success && result.id) {
          adminIds.push(result.id);
        }
      }
    } catch (error) {
      devLog.error('[NotificationHelper] Erro ao notificar admins sobre mudança de status:', error);
    }
    
    // 2. Notificação para o cliente do projeto
    let clientNotificationId: string | null = null;
    
    if (clientId) {
      const clientTitle = `Status do seu projeto ${projectNumber} foi alterado`;
      const clientMessage = `${userName} alterou o status do seu projeto ${projectNumber} de "${oldStatus}" para "${newStatus}".`;
      
      try {
        const result = await createNotificationCentral({
          type: 'status_change',
          title: clientTitle,
          message: clientMessage,
          userId: clientId,
          projectId,
          projectNumber,
          // Importante: Definir explicitamente o remetente como admin
          senderId: currentUser.uid,
          senderName: userName,
          senderType: 'admin',
          data: {
            ...commonData,
            fromAdmin: true,
            receivedAsClient: true
          }
        });
        
        if (result.success && result.id) {
          clientNotificationId = result.id;
        }
      } catch (error) {
        devLog.error('[NotificationHelper] Erro ao notificar cliente sobre mudança de status:', error);
      }
    }
    
    return { 
      adminIds, 
      clientId: clientNotificationId 
    };
  } catch (error: any) {
    devLog.error('[NotificationHelper] Erro ao notificar mudança de status:', error);
    return { adminIds: [], clientId: null };
  }
}

/**
 * Notifica sobre upload de documento em um projeto
 * @param projectId ID do projeto
 * @param projectNumber Número do projeto
 * @param documentName Nome do documento
 * @param documentId ID do documento
 * @param documentType Tipo do documento
 * @param fileSize Tamanho do arquivo em bytes (opcional)
 * @returns Resultado da operação com IDs das notificações criadas
 */
export async function notifyDocumentUpload(
  projectId: string,
  projectNumber: string,
  documentName: string,
  documentId: string,
  documentType: string,
  fileSize?: number
): Promise<{ adminIds: string[], clientId: string | null }> {
  try {
    // Verificar autenticação do usuário atual
    const currentUser = auth.currentUser;
      if (!currentUser) {
      devLog.error('[NotificationHelper] Erro ao notificar upload de documento: usuário não autenticado');
      return { adminIds: [], clientId: null };
    }
    
    // Obter informações do usuário que fez o upload
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    
    // Obter nome do usuário com fallbacks
    const userName = userData.name || userData.displayName || currentUser.displayName || 'Usuário';
    
    // Verificar se o usuário é admin
    const isAdmin = 
      userData.role === 'admin' || 
      userData.role === 'superadmin' || 
      userData.userType === 'admin' || 
      userData.userType === 'superadmin' ||
      userData.isAdmin === true;
    
    // Buscar informações do projeto, incluindo o clientId
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      devLog.error('[NotificationHelper] Erro: Projeto não encontrado', projectId);
      return { adminIds: [], clientId: null };
    }
    
    const projectData = projectDoc.data();
    const clientId = projectData.clientId || projectData.userId;
    const projectName = projectData.name || projectData.nome || projectNumber || 'Nome do Projeto não Especificado'; // Obter nome do projeto
    
    // Se não encontrou um clientId, não pode notificar o cliente
    if (!clientId) {
      devLog.warn('[NotificationHelper] ClientId não encontrado para o projeto', projectId);
    }
    
    // Dados comuns para as notificações
    const commonData = {
      documentId,
      documentName,
      documentType,
      fileSize,
      uploadedBy: currentUser.uid,
      uploadedByName: userName,
      isAdmin,
      uploadedAt: new Date().toISOString()
    };
    
    // Preparar textos baseados em quem fez o upload
    let adminTitle, adminMessage, clientTitle, clientMessage;
    
    if (isAdmin) {
      // Admin fazendo upload
      adminTitle = `Novo documento adicionado ao projeto ${projectNumber}`;
      adminMessage = `${userName} adicionou o documento "${documentName}" ao projeto ${projectNumber}`;
      
      clientTitle = `Novo documento em seu projeto ${projectNumber}`;
      clientMessage = `${userName} adicionou o documento "${documentName}" ao seu projeto ${projectNumber}`;
      } else {
      // Cliente fazendo upload
      adminTitle = `Cliente enviou documento para o projeto ${projectNumber}`;
      adminMessage = `${userName} enviou o documento "${documentName}" para o projeto ${projectNumber}`;
      
      clientTitle = `Seu documento foi adicionado ao projeto ${projectNumber}`;
      clientMessage = `Seu documento "${documentName}" foi adicionado ao projeto ${projectNumber}`;
    }
    
    // 1. Notificações para administradores
    let adminIds: string[] = [];
    
    // Se for um documento de cliente, notificar todos os admins
    // Se for um documento de admin, notificar outros admins (exceto o autor)
    if (!isAdmin || (isAdmin && adminIds.length === 0)) {
      try {
        // Usar o serviço central diretamente
        // Obter todos os usuários admin
        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
        const adminDocs = await getDocs(adminsQuery);
        
        // Para cada admin, criar uma notificação
        for (const adminDoc of adminDocs.docs) {
          const adminId = adminDoc.id;
          
          // Se for admin fazendo upload, não notificar o próprio admin
          if (isAdmin && adminId === currentUser.uid) continue;
          
          const result = await createNotificationCentral({
            type: 'document_upload',
            title: adminTitle,
            message: adminMessage,
            userId: adminId,
          projectId,
          projectNumber,
            projectName, // Passar nome do projeto
            // Definir explicitamente o remetente
            senderId: currentUser.uid,
            senderName: userName,
            senderType: isAdmin ? 'admin' : 'client',
          data: {
              ...commonData,
              forAdmin: true,
              fromClient: !isAdmin,
              isClientUpload: !isAdmin
            }
          });
          
          if (result.success && result.id) {
            adminIds.push(result.id);
          }
        }
        
        // Também notificar superadmins
        const superAdminsQuery = query(collection(db, 'users'), where('role', '==', 'superadmin'));
        const superAdminDocs = await getDocs(superAdminsQuery);
        
        for (const superAdminDoc of superAdminDocs.docs) {
          const superAdminId = superAdminDoc.id;
          
          // Se for admin fazendo upload, não notificar o próprio superadmin
          if (isAdmin && superAdminId === currentUser.uid) continue;
          
          // Não enviar duplicata se o usuário já é admin e superadmin
          if (adminIds.includes(superAdminId)) continue;
          
          const result = await createNotificationCentral({
            type: 'document_upload',
            title: adminTitle,
            message: adminMessage,
            userId: superAdminId,
          projectId,
          projectNumber,
            projectName, // Passar nome do projeto
            // Definir explicitamente o remetente
            senderId: currentUser.uid,
            senderName: userName,
            senderType: isAdmin ? 'admin' : 'client',
          data: {
              ...commonData,
              forAdmin: true,
              fromClient: !isAdmin,
              isClientUpload: !isAdmin
            }
          });
          
          if (result.success && result.id) {
            adminIds.push(result.id);
          }
        }
        
        // Como fallback, também criar uma notificação para todos os admins
        if (adminIds.length === 0) {
          const result = await createNotificationCentral({
            type: 'document_upload',
            title: adminTitle,
            message: adminMessage,
            userId: 'all_admins',
            projectId,
            projectNumber,
            projectName, // Passar nome do projeto
            // Definir explicitamente o remetente
            senderId: currentUser.uid,
            senderName: userName,
            senderType: isAdmin ? 'admin' : 'client',
            data: {
              ...commonData,
              isAdminBroadcast: true,
              forAdmin: true,
              fromClient: !isAdmin,
              isClientUpload: !isAdmin
            }
          });
          
          if (result.success && result.id) {
            adminIds.push(result.id);
          }
    }
  } catch (error) {
        devLog.error('[NotificationHelper] Erro ao notificar admins sobre upload de documento:', error);
      }
    }
    
    // 2. Notificação para o cliente do projeto
    let clientNotificationId: string | null = null;
    
    // Apenas notificar o cliente se:
    // - O upload foi feito por um admin (notificar o cliente)
    // - O upload foi feito pelo próprio cliente (confirmar recebimento)
    if (clientId && (isAdmin || (!isAdmin && currentUser.uid === clientId))) {
      try {
        const result = await createNotificationCentral({
          type: 'document_upload',
          title: clientTitle,
          message: clientMessage,
          userId: clientId,
          projectId,
          projectNumber,
          projectName, // Passar nome do projeto
          // Definir explicitamente o remetente
          senderId: currentUser.uid,
          senderName: userName,
          senderType: isAdmin ? 'admin' : 'client',
          data: {
            ...commonData,
            fromAdmin: isAdmin,
            receivedAsClient: true
          }
        });
        
        if (result.success && result.id) {
          clientNotificationId = result.id;
        }
      } catch (error) {
        devLog.error('[NotificationHelper] Erro ao notificar cliente sobre upload de documento:', error);
      }
    }
    
    return { 
      adminIds, 
      clientId: clientNotificationId 
    };
  } catch (error: any) {
    devLog.error('[NotificationHelper] Erro ao notificar upload de documento:', error);
    return { adminIds: [], clientId: null };
  }
}
