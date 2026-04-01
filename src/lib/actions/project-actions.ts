'use server'

import { revalidatePath } from 'next/cache';
// ❌ FIREBASE - REMOVIDO: import { getFirestore, FieldValue } from 'firebase-admin/firestore';
// ❌ FIREBASE - REMOVIDO: import { getStorage } from 'firebase-admin/storage';
// ❌ FIREBASE - REMOVIDO: import { getOrCreateFirebaseAdminApp } from '@/lib/firebase-admin';

// ✅ SUPABASE - ADICIONADO: Importações do Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

// ✅ NOTIFICAÇÕES DE QUOTA: Importar serviço de notificações de esgotamento
import { sendBillingNotifications } from '@/lib/services/billingNotificationService';

import { Project, UpdatedProject, TimelineEvent, CreateProjectClientData } from '@/types/project';

// Correção da importação:
import { type CreateProjectOptions } from '@/lib/services/projectService/index'; // CreateProjectOptions vem do index (que reexporta de types)

// ✅ SUPABASE - Usar funções Supabase em vez de Firebase
import {
  getProjectById,
  getProjectsByUserId,
  getProjectsWithFilters
} from '@/lib/services/projectService/supabase';

// ✅ SEGURANÇA: Importar utilitários de segurança multi-tenant
import { getTenantFromUser, canUserAccessResource, verifyResourceOwnership } from '@/lib/utils/tenant-security';

// ❌ FIREBASE - REMOVIDO: Importações do Firebase core.ts
// import {
//   createProject as createProjectCore,
//   getProject as getProjectCore,
//   updateProject as updateProjectCore,
//   deleteProject as deleteProjectCore,
//   addProjectComment as addProjectCommentCore,
//   addProjectTimelineEvent as addProjectTimelineEventCore,
//   generateUniqueProjectNumber as generateUniqueProjectNumberCore,
//   isProjectNumberAlreadyUsed as isProjectNumberAlreadyUsedCore,
//   getProjectsAdmin
// } from '@/lib/services/projectService/core';

// Manter esta importação para isProjectNumberAlreadyUsed de queries.ts se for diferente e usada.
// ✅ FIREBASE REMOVIDO - comentado import que causa erro Timestamp
// import { isProjectNumberAlreadyUsed as isProjectNumberAlreadyUsedQueries, findProjectByNumber as findProjectByNumberQueries } from '@/lib/services/projectService/queries';

// Remover ou manter este import global dependendo se ainda é usado.
// Por agora, vamos comentar para ver se algo quebra, forçando o uso das importações diretas.
// import projectService from '@/lib/services/projectService/index';

import { User } from '@/types/user';
import logger from '@/lib/utils/logger';

// ✅ MIGRADO PARA SUPABASE: Usar novas funções integradas de notificação + e-mail
import {
  notifyNewProject,
  notifyNewComment,
  notifyNewDocument,
  notifyStatusChange
} from '@/lib/services/notificationService';

import { getUserDataSupabase } from "@/lib/services/authService.supabase";
import { devLog } from "@/lib/utils/productionLogger";
import { getUserDataAdminSupabase } from "@/lib/services/authService.supabase";

// ✅ VALIDAÇÃO: Importar funções de validação para dados do cliente
import {
  validarCPForCNPJ,
  sanitizeNome,
  validarEstado,
  normalizarEstado,
  removerFormatacao
} from '@/lib/utils/validators';

// ✅ REMOVIDO: Imports antigos de e-mail e notificação separados
// import { createNotification } from '@/lib/services/notificationService';
// import { NotificationType } from '@/types/notification';

/**
 * ✅ CORREÇÃO REACT #130: Função para sanitizar objetos antes de retornar das Server Actions
 * Remove objetos com protótipos null e estruturas não serializáveis
 */
function sanitizeForSerialization<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Se for um tipo primitivo, retorna como está
  if (typeof obj !== 'object') {
    return obj;
  }

  // Se for um array, sanitiza cada item
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForSerialization(item)) as unknown as T;
  }

  // Se for uma data, converte para string ISO
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Para objetos, cria um novo objeto plain
  const sanitized: any = {};
  
  // Usa Object.keys para evitar problemas com protótipos null
  Object.keys(obj).forEach(key => {
    const value = (obj as any)[key];
    
    // Sanitiza recursivamente
    sanitized[key] = sanitizeForSerialization(value);
  });

  // Retorna um objeto plain sem protótipo
  return Object.assign({}, sanitized) as T;
}

const validProjectStatuses = [
  'Não Iniciado',
  'Em Desenvolvimento',
  'Aguardando',
  'Homologação',
  'Projeto Aprovado',
  'Aguardando Vistoria',
  'Projeto Pausado',
  'Em Vistoria',
  'Finalizado',
  'Cancelado'
] as const;

// ✅ Função auxiliar para gerar número sequencial quando fallback é necessário
async function generateFallbackSequentialNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `FV-${currentYear}-`;
  
  try {
    // Tentar buscar projetos existentes no banco de dados para determinar próximo número
    const supabase = createSupabaseServiceRoleClient();
    const { data: projects, error } = await supabase
      .from('projects')
      .select('number')
      .like('number', `${prefix}%`)
      .order('number', { ascending: false })
      .limit(1);

    if (!error && projects && projects.length > 0) {
      const lastNumber = projects[0].number;
      const numberPart = lastNumber.replace(prefix, '');
      const parsedNumber = parseInt(numberPart);
      if (!isNaN(parsedNumber)) {
        const nextNumber = parsedNumber + 1;
        return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
      }
    }
    
    // Se não conseguir buscar ou não houver projetos, começar com 001
    return `${prefix}001`;
  } catch (error) {
    // Em caso de erro total, usar número baseado na data para evitar duplicatas
    const dayOfYear = Math.floor((Date.now() - new Date(currentYear, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const randomSuffix = Math.floor(Math.random() * 100);
    return `${prefix}${(dayOfYear * 100 + randomSuffix).toString().padStart(3, '0')}`;
  }
}

export async function updateProjectAction(
  project: UpdatedProject,
  user: { id: string; email?: string | null; role?: string }
): Promise<{ data?: Project; error?: string; message?: string; refresh?: boolean }> {
  // Log bem no início da função para verificar se ela é chamada no servidor
  logger.info(`[updateProjectAction SERVER LOG] Action INVOCADA. Project ID: ${project.id}, User Email: ${user.email}, TimelineEvents Count: ${project.timelineEvents?.length || 0}`);
  try {
    devLog.log('[updateProjectAction] Starting update:', { 
      projectId: project.id, 
      status: project.status,
      timelineEvents: project.timelineEvents?.length || 0
    });

    if (!project.id) {
      return { error: 'Project ID is required' };
    }

    // ✅ SEGURANÇA: Verificar acesso ao projeto
    const accessCheck = await canUserAccessResource(user.id, 'project', project.id);
    if (!accessCheck.allowed) {
      devLog.error('[updateProjectAction] Acesso negado:', accessCheck.message);
      return { error: accessCheck.message || 'Acesso negado' };
    }

    const tenantInfo = accessCheck.tenantInfo!;

    // ❌ FIREBASE - COMENTADO: Initialize admin SDK
    // getOrCreateFirebaseAdminApp();
    // const adminDb = getFirestore();

    // ❌ FIREBASE - COMENTADO: Use admin SDK for Firestore operations
    // const projectRef = adminDb.collection('projects').doc(project.id);
    // const projectDoc = await projectRef.get();
    
    // if (!projectDoc.exists) {
    //   devLog.error('[updateProjectAction] Project not found');
    //   return { error: 'Project not found' };
    // }

    // const currentData = projectDoc.data() as Project;
    const timestamp = new Date().toISOString();

    // Salvar o status antigo e a lista de arquivos antiga para comparação
    // const oldStatus = currentData.status;
    // const oldFiles = currentData.files || []; // Garantir que seja um array

    devLog.log('Current project state:', {
      // currentStatus: currentData.status,
      newStatus: project.status,
      // existingEvents: currentData?.timelineEvents?.length || 0
    });

    // Prepare update data
    const updateData: any = {
      ...project,
      updatedAt: timestamp,
      lastUpdateBy: {
        uid: user.id,
        email: user.email,
        role: user.role,
        timestamp
      }
    };

    // Handle timeline events
    if (project.timelineEvents) {
      // const existingEvents = currentData?.timelineEvents || [];
      const uniqueEvents = new Map();
      
      // Add new events first
      project.timelineEvents.forEach(event => {
        uniqueEvents.set(event.id, event);
      });
      
      // Add existing events, avoiding duplicates
      // existingEvents.forEach(event => {
      //   if (!uniqueEvents.has(event.id)) {
      //     uniqueEvents.set(event.id, event);
      //   }
      // });

      // Convert Map back to array and sort by timestamp
      updateData.timelineEvents = Array.from(uniqueEvents.values())
        .sort((a, b) => {
          const aTime = new Date(a.timestamp);
          const bTime = new Date(b.timestamp);
          return bTime.getTime() - aTime.getTime();
        });
    }

    devLog.log('Updating project with:', {
      status: updateData.status,
      timelineEventsCount: updateData.timelineEvents?.length || 0
    });

    // Declarar finalData no escopo correto
    let finalData: Project;

    try {
      // ✅ SUPABASE - IMPLEMENTAÇÃO: Atualizar projeto no Supabase
      const supabase = createSupabaseServiceRoleClient();
      
      // ✅ SEGURANÇA: Buscar dados atuais verificando tenant
      const { data: currentProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .eq('tenant_id', tenantInfo.tenant_id)  // ✅ CRÍTICO: Verificar tenant
        .single();

      if (fetchError || !currentProject) {
        devLog.error('[updateProjectAction] Project not found:', fetchError);
        return { error: 'Project not found' };
      }

      // Salvar dados antigos para comparação
      const oldStatus = currentProject.status;
      const oldFiles = currentProject.files || [];

      // Preparar dados para atualização no Supabase
      const supabaseUpdateData: any = {
        nome_cliente_final: updateData.nomeClienteFinal || updateData.nome_cliente_final,
        description: updateData.description,
        status: updateData.status,
        prioridade: updateData.prioridade,
        empresa_integradora: updateData.empresaIntegradora || updateData.empresa_integradora,
        distribuidora: updateData.distribuidora,
        potencia: updateData.potencia,
        data_entrega: updateData.dataEntrega || updateData.data_entrega,
        // ✅ FIX: Usar nullish coalescing (??) para permitir valor 0
        valor_projeto: updateData.valorProjeto !== undefined ? updateData.valorProjeto : updateData.valor_projeto,
        pagamento: updateData.pagamento,

        // ✅ Persistir disjuntor do padrão de entrada (camelCase → snake_case)
        // - Usa camelCase se presente (tratando string vazia como undefined)
        // - Faz fallback para snake_case se vier nesse formato
        disjuntor_padrao_entrada:
          (typeof updateData.disjuntorPadraoEntrada === 'string'
            ? (updateData.disjuntorPadraoEntrada.trim() !== ''
                ? updateData.disjuntorPadraoEntrada.trim()
                : undefined)
            : (updateData as any).disjuntor_padrao_entrada),

        admin_responsible_id: updateData.adminResponsibleId || updateData.admin_responsible_id,
        admin_responsible_name: updateData.adminResponsibleName || updateData.admin_responsible_name,
        admin_responsible_email: updateData.adminResponsibleEmail || updateData.admin_responsible_email,
        admin_responsible_phone: updateData.adminResponsiblePhone || updateData.admin_responsible_phone,
        timeline_events: updateData.timelineEvents,
        documents: updateData.documents,
        files: updateData.files,
        comments: updateData.comments,
        history: updateData.history,
        last_update_by: updateData.lastUpdateBy,
        updated_at: new Date().toISOString(),

        // Campos do Conferir Informações / Gerar Projeto
        cpf_cnpj_cliente_final: updateData.cpf_cnpj_cliente_final,
        endereco_local: updateData.endereco_local,
        client_city: updateData.client_city,
        client_state: updateData.client_state,
        lista_materiais: updateData.listaMateriais || updateData.lista_materiais,
        havera_beneficiarias: updateData.havera_beneficiarias,
        tipo_conexao: updateData.tipo_conexao,
        tipo_ramal: updateData.tipo_ramal,
        tensao_atendimento: updateData.tensao_atendimento,
        coord_utm_fuso: updateData.coord_utm_fuso,
        coord_utm_x: updateData.coord_utm_x,
        coord_utm_y: updateData.coord_utm_y,
        modulos_quantidade: updateData.modulos_quantidade,
        modulos_fabricante: updateData.modulos_fabricante,
        modulos_modelo: updateData.modulos_modelo,
        modulos_potencia_wp: updateData.modulos_potencia_wp,
        inversores_quantidade: updateData.inversores_quantidade,
        inversores_fabricante: updateData.inversores_fabricante,
        inversores_modelo: updateData.inversores_modelo,
        inversores_potencia: updateData.inversores_potencia,
        inversores_tensao: updateData.inversores_tensao,
        conta_contrato: updateData.conta_contrato,
        classe_uc: updateData.classe_uc,
        numero_poste_transformador: updateData.numero_poste_transformador,
        numero_condutores_fase: updateData.numero_condutores_fase,
        secao_fase_mm2: updateData.secao_fase_mm2,
        secao_neutro_mm2: updateData.secao_neutro_mm2,
        disjuntor_polos: updateData.disjuntor_polos,
        disjuntor_corrente_a: updateData.disjuntor_corrente_a,
        disjuntor_tensao_v: updateData.disjuntor_tensao_v,
        tipo_fornecimento: updateData.tipo_fornecimento,
        modalidade_compensacao: updateData.modalidade_compensacao,
        planta_situacao_url: updateData.planta_situacao_url,
      };

      // Remover campos undefined/null
      Object.keys(supabaseUpdateData).forEach(key => {
        if (supabaseUpdateData[key] === undefined || supabaseUpdateData[key] === null) {
          delete supabaseUpdateData[key];
        }
      });

      devLog.log('[updateProjectAction] Updating with Supabase data:', {
        projectId: project.id,
        fieldsToUpdate: Object.keys(supabaseUpdateData)
      });

      // ✅ SEGURANÇA: Executar atualização verificando tenant
      const { data: updatedProject, error: updateError } = await supabase
        .from('projects')
        .update(supabaseUpdateData)
        .eq('id', project.id)
        .eq('tenant_id', tenantInfo.tenant_id)  // ✅ CRÍTICO: Verificar tenant
        .select()
        .single();

      if (updateError) {
        devLog.error('[updateProjectAction] Supabase update failed:', updateError);
        return { error: `Failed to update project: ${updateError.message}` };
      }

      devLog.log('[updateProjectAction] Project updated successfully in Supabase');

      // ✅ CORRIGIDO: Usar dados já disponíveis do projeto atualizado
      // Converter dados do Supabase para o formato esperado
      finalData = {
        id: updatedProject.id,
        userId: updatedProject.created_by,
        nome_cliente_final: updatedProject.nome_cliente_final,
        number: updatedProject.number,
        empresaIntegradora: updatedProject.empresa_integradora,
        nomeClienteFinal: updatedProject.nome_cliente_final,
        distribuidora: updatedProject.distribuidora,
        potencia: updatedProject.potencia,
        dataEntrega: updatedProject.data_entrega,
        status: updatedProject.status,
        prioridade: updatedProject.prioridade,
        valorProjeto: updatedProject.valor_projeto,
        pagamento: updatedProject.pagamento,

        // ✅ Retornar campo mapeado para manter UI consistente
        disjuntorPadraoEntrada: (updatedProject as any).disjuntor_padrao_entrada,

        createdAt: typeof updatedProject.created_at === 'string' ? updatedProject.created_at : new Date(updatedProject.created_at).toISOString(),
        updatedAt: typeof updatedProject.updated_at === 'string' ? updatedProject.updated_at : new Date(updatedProject.updated_at).toISOString(),
        adminResponsibleId: updatedProject.admin_responsible_id,
        adminResponsibleName: updatedProject.admin_responsible_name,
        adminResponsibleEmail: updatedProject.admin_responsible_email,
        adminResponsiblePhone: updatedProject.admin_responsible_phone,
        timelineEvents: updatedProject.timeline_events || [],
        documents: updatedProject.documents || [],
        files: updatedProject.files || [],
        comments: updatedProject.comments || [],
        history: updatedProject.history || [],
        lastUpdateBy: updatedProject.last_update_by
      };

      // Verificar mudança de status para notificações
      if (finalData.status && oldStatus !== finalData.status) {
        logger.info(`[updateProjectAction] Status mudou de ${oldStatus} para ${finalData.status}. Enviando notificações de status.`);
        
        const projectUrlClient = `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${finalData.id}`;
        
        if (finalData.userId) { 
          try {
            // ✅ CORRIGIDO: Buscar role do banco para garantir consistência
            const { data: adminProfile } = await supabase
              .from('users')
              .select('role, name')
              .eq('id', user.id)
              .single();
            
            const actualAdminRole = adminProfile?.role || user.role || 'admin';
            const actualAdminName = adminProfile?.name || user.email || 'Admin';
            
            await notifyStatusChange({
              projectId: finalData.id,
              projectNumber: finalData.number,
              projectName: finalData.nome_cliente_final,
              oldStatus: oldStatus,
              newStatus: finalData.status,
              clientId: finalData.userId,
              adminId: user.id,
              adminName: actualAdminName
            });
            logger.info(`[updateProjectAction] Status change notification sent: ${oldStatus} → ${finalData.status}`);
          } catch (notificationError) {
            logger.error("[updateProjectAction] Falha ao enviar notificação de mudança de status:", notificationError);
          }
        }
      }

      // Verificar novos arquivos para notificações
      const newFiles = finalData.files || [];
      const addedFiles = newFiles.filter(newFile => 
        !oldFiles.some(oldFile => oldFile.url === newFile.url) 
      );

      if (addedFiles.length > 0) {
        logger.info(`[updateProjectAction] ${addedFiles.length} novo(s) arquivo(s) adicionado(s). Iniciando envio de notificações de documento.`);
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const projectUrlClient = `${baseUrl}/cliente/projetos/${finalData.id}`;
        const projectUrlAdmin = `${baseUrl}/admin/projetos/${finalData.id}`;
        let clientNameToNotify = "Cliente não especificado";
        
        // Buscar nome do cliente para a notificação
        if (finalData.userId) {
          try {
            const clientUserData = await getUserDataAdminSupabase(finalData.userId);
            if (clientUserData && clientUserData.name) {
              clientNameToNotify = clientUserData.name;
            } else if (clientUserData && clientUserData.email) {
              clientNameToNotify = clientUserData.email; 
            }
          } catch (e) {
            logger.error("[updateProjectAction] Falha ao buscar dados do cliente para notificação de documento: ", e);
          }
        }

        for (const addedFile of addedFiles) {
          // Notificar o cliente (dono do projeto)
          if (finalData.userId) {
            try {
              // ✅ CORRIGIDO: Buscar role do banco para garantir consistência
              const { data: uploaderProfile } = await supabase
                .from('users')
                .select('role, name')
                .eq('id', user.id)
                .single();
              
              const actualUploaderRole = uploaderProfile?.role || user.role || 'admin';
              const actualUploaderName = uploaderProfile?.name || user.email || 'Admin';
              
              await notifyNewDocument({
                projectId: finalData.id,
                projectNumber: finalData.number,
                projectName: finalData.nome_cliente_final,
                documentName: addedFile.name,
                uploaderId: user.id,
                uploaderName: actualUploaderName,
                uploaderRole: actualUploaderRole,
                clientId: finalData.userId,
                clientName: clientNameToNotify
              });
            } catch (emailError) {
              logger.error("[updateProjectAction] Falha ao enviar notificação de novo documento para o usuário:", emailError);
            }
          }

          // Notificar Admins
          try {
            // ✅ CORRIGIDO: Usar role do banco para consistência
            const { data: uploaderProfile } = await supabase
              .from('users')
              .select('role, name')
              .eq('id', user.id)
              .single();
            
            const actualUploaderRole = uploaderProfile?.role || user.role || 'admin';
            const actualUploaderName = uploaderProfile?.name || user.email || 'Admin';
            
            await notifyNewDocument({
              projectId: finalData.id,
              projectNumber: finalData.number,
              projectName: finalData.nome_cliente_final,
              documentName: addedFile.name,
              uploaderId: user.id,
              uploaderName: actualUploaderName,
              uploaderRole: actualUploaderRole,
              clientId: finalData.userId,
              clientName: clientNameToNotify
            });
          } catch (emailError) {
            logger.error("[updateProjectAction] Falha ao enviar notificação de novo documento para admin:", emailError);
          }
        }
      }

    } catch (updateError) {
      devLog.error('[updateProjectAction] Update failed:', updateError);
      return { error: 'Failed to update project in database' };
    }

    devLog.log('Final project state:', {
      status: finalData.status,
      timelineEvents: finalData?.timelineEvents?.length || 0
    });

    // Force revalidation
    revalidatePath('/projetos');
    revalidatePath(`/projetos/${project.id}`);
    revalidatePath('/');

    return sanitizeForSerialization({
      data: {
        ...finalData,
        id: project.id
      },
      message: project.status !== finalData.status 
        ? `Status atualizado para ${finalData.status}`
        : 'Projeto atualizado com sucesso',
      refresh: false // Alterado para false para evitar refresh sempre
    });
  } catch (error) {
    // Interceptar erros de Server Components render
    /*
    if (error instanceof Error && 
        (error.message.includes('Server Components render') || 
         error.message.includes('digest property'))) {
      
      devLog.log('[ACTION INTERCEPTOR] Erro de Server Components render capturado:', error.message);
      
      // Retornar uma resposta "bem-sucedida" para não quebrar a UI
      return { 
        message: "Operação realizada com sucesso (erro de renderização suprimido)",
        refresh: false 
      };
    }
    */
    
    // Para outros erros, propagar normalmente
    devLog.error('[updateProjectAction] Error updating project:', error); // Adicionado para logar o erro completo
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Falha ao atualizar o projeto',
      refresh: false
    };
  }
}

export async function addCommentAction(
  projectId: string,
  comment: { text: string; timestamp?: string; visibility?: 'all' | 'internal'; images?: string[] },
  user: { id: string; email?: string | null; name?: string | null; role?: string }
): Promise<{
  data?: Project & { id: string };
  error?: string;
  message?: string;
  refresh?: boolean;
}> {
  
  // 🚨 [DEBUG CRÍTICO] Capturar usuário que chega na função
  devLog.log('🚨 [DEBUG SESSION] addCommentAction - Dados do usuário recebido:', {
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
    userRole: user?.role,
    timestamp: new Date().toISOString(),
    projectId: projectId,
    expectedUserId: '70b7eacc-a3d5-480d-8058-f850671ba34f',
    userIdMatch: user?.id === '70b7eacc-a3d5-480d-8058-f850671ba34f' ? '✅ MATCH' : '❌ DIFFERENT'
  });

  // Logs removidos por questões de segurança em produção
  try {
    // 🎨 Validação: Precisa ter texto OU imagens
    if (!projectId || (!comment.text && (!comment.images || comment.images.length === 0))) {
      return { error: 'Project ID and comment text or images are required' };
    }
    if (!user || !user.id) {
      return { error: 'User information is required' };
    }

    logger.info(`[addCommentAction] User: ${user.name} (${user.role}) is adding comment to project ${projectId}`);

    // ✅ SEGURANÇA MULTI-TENANT: Verificação direta e simples
    const supabase = createSupabaseServiceRoleClient();
    
    // Obter tenant do usuário
    const { data: userInfo, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (userError || !userInfo?.tenant_id) {
      logger.error('[addCommentAction] Usuário não encontrado', {
        error: userError?.message,
        userId: user.id
      });
      return { error: 'Usuário não encontrado' };
    }

    const userTenantId = userInfo.tenant_id;

    // Verificar se projeto pertence ao mesmo tenant
    const { data: projectExists, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('tenant_id', userTenantId)
      .single();

    if (projectError || !projectExists) {
      logger.error('[addCommentAction] Projeto não encontrado no tenant do usuário', {
        projectId,
        userTenantId,
        error: projectError?.message
      });
      return { error: 'Projeto não encontrado' };
    }

    logger.info('[addCommentAction] Acesso autorizado', {
      projectId,
      userTenantId
    });

    // ❌ FIREBASE - COMENTADO: const adminApp = getOrCreateFirebaseAdminApp();
    // ❌ FIREBASE - COMENTADO: const adminDb = getFirestore(adminApp);
    // ❌ FIREBASE - COMENTADO: const projectRef = adminDb.collection('projects').doc(projectId);

    // ❌ FIREBASE - COMENTADO: const newCommentId = adminDb.collection('projects').doc().id; // Gera um ID único para o comentário
    const newCommentId = crypto.randomUUID(); // ✅ SUPABASE - Gerar UUID

    // ✅ Definir visibilidade padrão como 'all' se não especificado
    const visibility = comment.visibility || 'all';

    const newCommentEntry = {
      id: newCommentId,
      userId: user.id,
      userName: user.name || user.email || 'Usuário Desconhecido',
      userRole: user.role || 'client',
      text: comment.text || '', // 🎨 Permitir texto vazio se houver imagens
      timestamp: comment.timestamp || new Date().toISOString(),
      visibility: visibility,
      replies: [],
      reactions: {},
      images: comment.images || [] // 🎨 Incluir imagens no comentário
    };

    const newTimelineEvent: TimelineEvent = {
      id: newCommentId, // Usar o mesmo ID para o evento de timeline
      type: 'comment',
      timestamp: newCommentEntry.timestamp,
      user: newCommentEntry.userName,
      userId: newCommentEntry.userId,
      content: newCommentEntry.text || (comment.images && comment.images.length > 0 ? `${comment.images.length} imagem(ns)` : ''), // 🎨 Texto descritivo se só houver imagens
      commentId: newCommentId,
      visibility: visibility,
      images: comment.images || [], // 🎨 Incluir URLs das imagens
    };

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Adicionar comentário no Supabase
    
    // Logs removidos por questões de segurança em produção
    
    // 🚀 OTIMIZAÇÃO: Buscar APENAS os campos necessários (não o projeto inteiro)
    // ✅ SEGURANÇA: Filtrar por tenant_id para garantir isolamento multi-tenant
    devLog.log('🚨 [CRITICAL DEBUG] Buscando projeto para comentário:', {
      projectId,
      tenantId: userTenantId
    });
    
    const { data: basicProject, error: fetchError} = await supabase
      .from('projects')
      .select('id, nome_cliente_final, number, created_by, owner_id, comments, timeline_events')
      .eq('id', projectId)
      .eq('tenant_id', userTenantId)
      .single();
      
    devLog.log('🚨 [CRITICAL DEBUG] Resultado busca projeto comentário:', {
      project: basicProject,
      fetchError: fetchError?.message,
      hasProject: !!basicProject
    });

    if (fetchError || !basicProject) {
      devLog.log('🚨 [CRITICAL ERROR] PROJETO NÃO ENCONTRADO PARA COMENTÁRIO:', {
        fetchError: fetchError?.message,
        code: fetchError?.code,
        projectId,
        tenantId: userTenantId
      });
      devLog.error('[addCommentAction] Project not found:', fetchError);
      return { error: 'Project not found' };
    }
    
    devLog.log('🚨 [CRITICAL DEBUG] Projeto encontrado para comentário! Continuando...');

    // Logs removidos por questões de segurança em produção
    
    const currentComments = basicProject.comments || [];
    const currentTimelineEvents = basicProject.timeline_events || [];
    
    devLog.log('🚨 [CRITICAL DEBUG] Iniciando adição de comentário:', { 
      projectId, 
      content: comment.text,
      userId: user.id,
      userRole: user.role,
      currentCommentsCount: currentComments.length,
      tenantId: userTenantId
    });
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        comments: [...currentComments, newCommentEntry],
        timeline_events: [...currentTimelineEvents, newTimelineEvent]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: user.id,
          name: user.name || user.email,
          role: user.role,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId)
      .eq('tenant_id', userTenantId);

    if (updateError) {
      devLog.log('🚨 [CRITICAL DEBUG] Resultado da operação:', { 
        success: false, 
        error: updateError.message || updateError,
        projectId,
        userId: user.id 
      });
      devLog.error('[addCommentAction] Update failed:', updateError);
      return { error: `Failed to add comment: ${updateError.message}` };
    }

    devLog.log('🚨 [CRITICAL DEBUG] Resultado da operação:', { 
      success: true, 
      error: null,
      projectId,
      userId: user.id,
      newCommentsCount: currentComments.length + 1
    });

    devLog.log('[addCommentAction] Comment added successfully to Supabase');

    const authorName = user.name || user.email || 'Usuário Desconhecido';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const projectUrlClient = `${baseUrl}/cliente/projetos/${projectId}`;
    const projectUrlAdmin = `${baseUrl}/admin/projetos/${projectId}`;

    // 🔧 CORREÇÃO: Usar owner_id se existir, senão usar created_by (retrocompatibilidade)
    const projectClientOwnerId = basicProject.owner_id || basicProject.created_by;

    // ✅ DEBUG: Log detalhado dos dados do projeto (OTIMIZADO)
    devLog.log('[addCommentAction] DEBUG - Project data analysis (OTIMIZADO):', {
      projectId,
      projectName: basicProject.nome_cliente_final,
      projectNumber: basicProject.number,
      projectCreatedBy: basicProject.created_by,
      projectOwnerId: basicProject.owner_id,
      projectClientOwnerId: projectClientOwnerId,
      ownerIdUsed: basicProject.owner_id ? 'owner_id (proprietário)' : 'created_by (fallback)',
      authorId: user.id,
      authorRole: user.role,
      willNotifyCorrectUser: projectClientOwnerId !== user.id ? '✅ YES - will notify client' : '❌ NO - same user (skip notification)'
    });

    // 🔥 CRIAR NOTIFICAÇÃO E ENVIAR E-MAIL
    try {
      devLog.log('[addCommentAction] 🔍 CHEGOU ATÉ NOTIFICAÇÕES - REAL APP:', {
        projectId,
        userId: user.id,
        userRole: user.role,
        isAdmin: user.role === 'admin' || user.role === 'superadmin',
        projectClientOwnerId: projectClientOwnerId
      });
      
      devLog.log('[addCommentAction] DEBUG - Iniciando sistema de notificações...');
      
      // Determinar se é admin comentando ou cliente comentando
      // ✅ CORRIGIDO: Buscar role do banco para garantir consistência
      const { data: userProfile, error: userProfileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      const actualRole = userProfile?.role || user.role || 'client';
      const isAdmin = actualRole === 'admin' || actualRole === 'superadmin';
      
      devLog.log('[addCommentAction] 🚨 CRITICAL DEBUG - Role verification:', {
        userRoleFromSession: user.role,
        userRoleFromDatabase: userProfile?.role,
        actualRoleUsed: actualRole,
        isAdmin,
        userId: user.id,
        projectClientOwnerId: projectClientOwnerId,
        willNotifyClient: isAdmin,
        willNotifyAdmins: !isAdmin
      });

      if (isAdmin) {
        // ✅ VERIFICAR SE É COMENTÁRIO INTERNO
        // Se for comentário interno (visibility === 'internal'), NÃO notificar o cliente
        if (visibility === 'internal') {
          devLog.log('[addCommentAction] Comentário INTERNO - NÃO notificar cliente', {
            authorName,
            projectClientOwnerId,
            projectName: basicProject.nome_cliente_final,
            visibility
          });
          // Pular notificação para o cliente
        } else {
          // ✅ Admin comentou com visibilidade pública → Notificar CLIENTE (e SOMENTE o cliente)
          devLog.log('[addCommentAction] Admin commented - notifying client ONLY', {
            authorName,
            projectClientOwnerId,
            projectName: basicProject.nome_cliente_final
          });

          if (!projectClientOwnerId) {
            devLog.warn('[addCommentAction] AVISO: Projeto sem cliente dono (created_by). Nenhuma notificação será enviada.');
          } else {
          // ✅ DEBUG: Log da query antes de executar
          devLog.log('[addCommentAction] DEBUG - About to query users table:', {
            queryTable: 'users',
            queryField: 'id',
            queryValue: projectClientOwnerId,
            selectFields: 'name, email'
          });

          try {
            // Buscar dados do cliente para pegar o nome correto
            const { data: clientData, error: clientQueryError } = await supabase
              .from('users')
              .select('name, email')
              .eq('id', projectClientOwnerId)
              .single();

            devLog.log('[addCommentAction] DEBUG - Client query result:', {
              clientData,
              clientQueryError,
              hasClientData: !!clientData,
              clientName: clientData?.name || clientData?.email,
              clientEmail: clientData?.email
            });

            if (clientQueryError) {
              devLog.error('[addCommentAction] Erro ao buscar dados do cliente:', clientQueryError);
              throw new Error(`Erro ao buscar cliente: ${clientQueryError.message}`);
            }

            if (!clientData) {
              devLog.warn('[addCommentAction] Cliente não encontrado na base:', projectClientOwnerId);
              throw new Error('Cliente não encontrado');
            }

          devLog.log('[addCommentAction] DEBUG - Calling notifyNewComment...');
          devLog.log('[addCommentAction] DEBUG - Comment data being sent:', {
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.nome_cliente_final,
            commentText: comment.text,
            commentTextType: typeof comment.text,
            commentObject: comment,
            authorId: user.id,
            authorName,
            authorRole: user.role || 'admin',
            clientId: projectClientOwnerId,
            clientName: clientData.name || clientData.email || 'Cliente'
          });
          
          // Logs removidos por questões de segurança em produção
          
          // Notificar o cliente
          const notificationResult = await notifyNewComment({
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.nome_cliente_final,
            commentText: comment.text,
            authorId: user.id,
            authorName,
            authorRole: actualRole, // ✅ CORREÇÃO: Usar actualRole do banco, não user.role da sessão
            clientId: projectClientOwnerId,
            clientName: clientData.name || clientData.email || 'Cliente'
          });

          devLog.log('[addCommentAction] DEBUG - Notification result:', {
            success: notificationResult,
            notificationIds: notificationResult.notificationIds?.length,
            emailSent: notificationResult.emailSent
          });

          } catch (clientError) {
            devLog.error('[addCommentAction] Erro na notificação para cliente:', clientError);
            // Não falha o comentário se a notificação falhar
          }
          }
        }

      } else {
        // ✅ Cliente comentou → Notificar todos os admins
        devLog.log('[addCommentAction] Client commented - notifying all admins', { 
          authorName, 
          projectName: basicProject.nome_cliente_final 
        });
        
        try {
          // Logs removidos por questões de segurança em produção
          
          devLog.log('[addCommentAction] DEBUG - Calling notifyNewComment for admins...');
          devLog.log('[addCommentAction] DEBUG - Admin notification data:', {
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.nome_cliente_final,
            commentText: comment.text,
            commentTextType: typeof comment.text,
            commentObject: comment,
            authorId: user.id,
            authorName,
            authorRole: user.role || 'client'
          });
          
          const notificationResult = await notifyNewComment({
            projectId,
            projectNumber: basicProject.number,
            projectName: basicProject.nome_cliente_final,
            commentText: comment.text,
            authorId: user.id,
            authorName,
            authorRole: actualRole, // ✅ CORREÇÃO: Usar actualRole do banco, não user.role da sessão
            clientId: user.id,  // ✅ Cliente que comentou
            clientName: authorName  // ✅ Nome do cliente
          });

          devLog.log('[addCommentAction] DEBUG - Admin notification result:', {
            success: notificationResult,
            notificationIds: notificationResult.notificationIds?.length,
            emailSent: notificationResult.emailSent
          });
          
        } catch (adminError) {
          devLog.error('[addCommentAction] Erro na notificação para admins:', adminError);
          // Não falha o comentário se a notificação falhar
        }
      }
      
    } catch (notificationError) {
      devLog.error('[addCommentAction] Failed to create notification:', notificationError);
      // Não falha o comentário se a notificação falhar, mas loga o erro
    }

    // ✅ CORREÇÃO: Só revalidar em runtime, não durante build/static generation
    try {
      revalidatePath('/projetos');
      revalidatePath(`/projetos/${projectId}`);
    } catch (error) {
      // Falha silenciosa se não conseguir revalidar (ex: durante build estático)
      devLog.log('[revalidatePath] Skipped:', error.message);
    }

    // 🔧 CORREÇÃO: Resposta ULTRA OTIMIZADA - apenas dados essenciais
    return { 
      data: {
        id: projectId,
        nome_cliente_final: basicProject.nome_cliente_final || 'Projeto',
        number: basicProject.number || 'N/A',
        commentAdded: true,
        timestamp: new Date().toISOString()
      } as any, // ✅ Permite propriedades customizadas
      message: 'Comentário adicionado com sucesso',
      refresh: true
    };
  } catch (error) {
    // Interceptar erros de Server Components render
    /*
    if (error instanceof Error && 
        (error.message.includes('Server Components render') || 
         error.message.includes('digest property'))) {
      
      devLog.log('[ACTION INTERCEPTOR] Erro de Server Components render capturado:', error.message);
      
      // Retornar uma resposta "bem-sucedida" para não quebrar a UI
      return { 
        message: "Comentário adicionado com sucesso (erro de renderização suprimido)",
        refresh: false // Important: set to false to avoid re-render loop if the error persists
      };
    }
    */
    
    // Para outros erros, continuar com o comportamento atual
    devLog.error('[addCommentAction] Error adding comment:', error); // Adicionado para logar o erro completo
    return {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Falha ao adicionar comentário',
      refresh: false
    };
  }
}

export async function deleteCommentAction(
  projectId: string,
  commentId: string,
  user: { id: string; email?: string | null; role?: string } // ✅ SUPABASE: Corrigido uid para id
): Promise<{ 
  data?: Project & { id: string }; 
  error?: string; 
  message?: string; 
  refresh?: boolean;
}> {
  try {
    devLog.log('[deleteCommentAction] Starting delete comment:', { projectId, commentId, userId: user.id });

    if (!projectId || !commentId) {
      return { error: 'Project ID and Comment ID are required' };
    }
    if (!user || !user.id) {
      return { error: 'User information is required' };
    }

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Remover comentário no Supabase
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, buscar dados atuais do projeto
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !currentProject) {
      devLog.error('[deleteCommentAction] Project not found:', fetchError);
      return { error: 'Project not found' };
    }

    const currentComments = currentProject.comments || [];
    const currentTimelineEvents = currentProject.timeline_events || [];

    // Logs detalhados para depuração
    devLog.log(`[deleteCommentAction] Attempting to find commentId: "${commentId}"`);
    devLog.log(`[deleteCommentAction] Searching in project.comments (${currentComments.length} items):`);
    
    currentComments.forEach((c, idx) => {
      const contentPreview = c.text ? c.text.substring(0, 30) : 'N/A (text missing or not a string)';
      devLog.log(`  Comment ${idx}: ID = "${c.id}", Text = "${contentPreview}"`);
      if (c.id === commentId) {
        devLog.log(`    MATCH FOUND in project.comments for ID: "${commentId}"`);
      }
    });

    devLog.log(`[deleteCommentAction] Searching in project.timeline_events (${currentTimelineEvents.length} items):`);
    currentTimelineEvents.forEach((event, idx) => {
      let eventContentPreview = 'N/A';
      if (event.content) {
        eventContentPreview = event.content.substring(0,30);
      } else if (event.fileName) {
        eventContentPreview = event.fileName;
      }
      devLog.log(`  TimelineEvent ${idx}: ID = "${event.id}", Type = "${event.type}", Content = "${eventContentPreview}"`);
      if (event.id === commentId && event.type === 'comment') {
        devLog.log(`    MATCH FOUND in project.timeline_events for ID: "${commentId}" (type: comment)`);
      }
    });

    const commentExistsInProjectComments = currentComments.some(c => c.id === commentId);
    const timelineEventExists = currentTimelineEvents.some(event => event.id === commentId && event.type === 'comment');

    devLog.log(`[deleteCommentAction] Result of checks: commentExistsInProjectComments = ${commentExistsInProjectComments}, timelineEventExists = ${timelineEventExists}`);

    const originalCommentEvent = currentTimelineEvents.find(event => event.id === commentId && event.type === 'comment');
    const canDelete = user.role === 'admin' || user.role === 'superadmin' || (originalCommentEvent && originalCommentEvent.userId === user.id);

    if (!canDelete) {
      devLog.error('[deleteCommentAction] User does not have permission to delete this comment.', { commentId, userId: user.id, commentUserId: originalCommentEvent?.userId });
      return { error: 'Você não tem permissão para excluir este comentário.' };
    }

    if (!commentExistsInProjectComments && !timelineEventExists) {
      devLog.warn('[deleteCommentAction] Comment ID not found in project.comments AND not in timeline_events after detailed check. ID:', commentId);
      return { message: 'Comentário já removido ou não encontrado.', refresh: true };
    }

    const updatedComments = currentComments.filter(c => c.id !== commentId);
    const updatedTimelineEvents = currentTimelineEvents.filter(event => event.id !== commentId);

    if (updatedComments.length === currentComments.length && updatedTimelineEvents.length === currentTimelineEvents.length) {
      devLog.warn('[deleteCommentAction] Filtering did not change comment or timeline arrays. Comment ID:', commentId);
      return { message: 'Comentário não pôde ser removido (não encontrado durante a fase de filtro).', refresh: true };
    }

    // Atualizar projeto no Supabase
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        comments: updatedComments,
        timeline_events: updatedTimelineEvents,
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: user.id,
          email: user.email,
          role: user.role,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[deleteCommentAction] Supabase update failed:', updateError);
      return { error: `Failed to delete comment: ${updateError.message}` };
    }

    devLog.log('[deleteCommentAction] Comment deleted successfully from Supabase.', { projectId, commentId });

    revalidatePath('/projetos');
    revalidatePath(`/projetos/${projectId}`);

    return { 
      message: 'Comentário removido com sucesso!', 
      refresh: true // Recomendar refresh para que o onSnapshot pegue a mudança rapidamente
    };

  } catch (error) {
    devLog.error('[deleteCommentAction] Error:', error);
    return { 
      error: error instanceof Error ? error.message : 'Falha ao remover comentário', 
      refresh: false 
    };
  }
}

export async function deleteFileAction(
  projectId: string,
  filePath: string, // Caminho do arquivo no Supabase Storage
  fileUrl: string,  // URL do arquivo, usada para encontrar no array project.files e timelineEvents
  user: { id?: string; email?: string | null; role?: string; profile?: any }
): Promise<{ 
  data?: Project & { id: string }; 
  error?: string; 
  message?: string; 
  refresh?: boolean;
}> {
  try {
    devLog.log('[deleteFileAction] Starting delete file:', { projectId, filePath, fileUrl, userId: user.id });
    
    if (!user?.id) {
      return { error: 'Usuário não autenticado' };
    }

    // ✅ SEGURANÇA: Verificar acesso ao projeto
    const accessCheck = await canUserAccessResource(user.id, 'project', projectId);
    if (!accessCheck.allowed) {
      devLog.error('[deleteFileAction] Acesso negado:', accessCheck.message);
      return { error: accessCheck.message || 'Acesso negado ao projeto' };
    }

    const tenantInfo = accessCheck.tenantInfo!;

    if (!projectId || !filePath || !fileUrl) {
      return { error: 'Project ID, File Path, and File URL are required' };
    }
    
    // ✅ CORRIGIDO: Usar apenas id para compatibilidade com Supabase
    const userId = user.id;
    if (!user || !userId) {
      return { error: 'User information is required' };
    }
    
    // ✅ CORRIGIDO: Verificar role em múltiplos locais
    const userRole = user.role || user.profile?.role || (user as any).profileRole;
    devLog.log('[deleteFileAction] User role verification:', {
      userRole: user.role,
      profileRole: user.profile?.role,
      directProfileRole: (user as any).profileRole,
      finalRole: userRole,
      userEmail: user.email,
      userId: userId
    });
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      devLog.warn('[deleteFileAction] Permission denied for user role:', userRole);
      return { error: 'Permissão negada para excluir arquivo.' };
    }

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Excluir arquivo no Supabase Storage
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, buscar dados do projeto para verificar se existe e obter arquivos
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectData) {
      devLog.error('[deleteFileAction] Project not found:', fetchError);
      return { error: 'Project not found' };
    }

    const currentFiles = projectData.files || [];
    const currentTimelineEvents = projectData.timeline_events || [];

    // 1. Excluir o arquivo do Supabase Storage
    try {
      devLog.log(`[deleteFileAction] Attempting to delete from Supabase Storage: ${filePath}`);
      
      // ✅ CORRIGIDO: Usar o módulo server-storage seguro
      const { deleteProjectFiles } = await import('@/lib/supabase/server-storage');
      
      // Deletar arquivo do storage
      const deleteResult = await deleteProjectFiles([filePath]);

      if (!deleteResult.success) {
        devLog.error('[deleteFileAction] Error deleting file from Supabase Storage:', deleteResult.errors);
        // Continuar mesmo se o arquivo não existir no storage
        if (deleteResult.errors?.some(e => e.error.includes('not found'))) {
          devLog.warn('[deleteFileAction] File not found in Supabase Storage, continuing with database cleanup');
        } else {
          return { error: 'Falha ao remover arquivo do armazenamento.' };
        }
      } else {
        devLog.log('[deleteFileAction] File deleted from Supabase Storage successfully.', { filePath });
      }
    } catch (storageError: any) {
      devLog.error('[deleteFileAction] Error deleting file from Supabase Storage:', storageError);
      // Continuar com a limpeza do banco mesmo se houver erro no storage
      devLog.warn('[deleteFileAction] Continuing with database cleanup despite storage error');
    }

    // 2. Remover referências do banco de dados
    const updatedFiles = currentFiles.filter(f => f.url !== fileUrl);
    
    // ✅ MELHORADO: Remover TODOS os eventos relacionados ao arquivo
    const updatedTimelineEvents = currentTimelineEvents.filter(event => {
      // Remover eventos que:
      // 1. Têm fileUrl igual ao arquivo sendo deletado
      // 2. São do tipo 'document' ou 'file_upload' e têm fileName igual
      // 3. Mencionam o arquivo no conteúdo
      const deletedFile = currentFiles.find(f => f.url === fileUrl);
      const fileName = deletedFile?.name;
      
      return !(
        event.fileUrl === fileUrl ||
        (fileName && event.fileName === fileName) ||
        (fileName && event.content?.includes(fileName))
      );
    });

    if (currentFiles.length === updatedFiles.length && currentTimelineEvents.length === updatedTimelineEvents.length) {
      devLog.warn('[deleteFileAction] File reference or its timeline event not found in database.', { projectId, fileUrl });
      return { message: 'Referências do arquivo já removidas ou não encontradas.', refresh: true };
    }

    // Atualizar projeto no Supabase
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        files: updatedFiles,
        timeline_events: updatedTimelineEvents,
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: userId,
          email: user.email,
          role: userRole,
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[deleteFileAction] Failed to update project in Supabase:', updateError);
      return { error: `Falha ao atualizar projeto: ${updateError.message}` };
    }

    devLog.log('[deleteFileAction] File references deleted from Supabase successfully.', { projectId, fileUrl });

    // Converter dados do Supabase para o formato esperado
    const finalProjectData: Project = {
      id: updatedProject.id,
      userId: updatedProject.created_by,
      nome_cliente_final: updatedProject.nome_cliente_final,
      number: updatedProject.number,
      empresaIntegradora: updatedProject.empresa_integradora,
      nomeClienteFinal: updatedProject.nome_cliente_final,
      distribuidora: updatedProject.distribuidora,
      potencia: updatedProject.potencia,
      dataEntrega: updatedProject.data_entrega,
      status: updatedProject.status,
      prioridade: updatedProject.prioridade,
      valorProjeto: updatedProject.valor_projeto,
      pagamento: updatedProject.pagamento,
      
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
      adminResponsibleId: updatedProject.admin_responsible_id,
      adminResponsibleName: updatedProject.admin_responsible_name,
      adminResponsibleEmail: updatedProject.admin_responsible_email,
      adminResponsiblePhone: updatedProject.admin_responsible_phone,
      timelineEvents: updatedProject.timeline_events || [],
      documents: updatedProject.documents || [],
      files: updatedProject.files || [],
      comments: updatedProject.comments || [],
      history: updatedProject.history || [],
      lastUpdateBy: updatedProject.last_update_by
    };

    revalidatePath('/projetos');
    revalidatePath(`/projetos/${projectId}`);

    return { 
      data: {
        ...finalProjectData,
        id: projectId
      },
      message: 'Arquivo e suas referências removidos com sucesso!', 
      refresh: true 
    };

  } catch (error) {
    devLog.error('[deleteFileAction] Error:', error);
    return { 
      error: error instanceof Error ? error.message : 'Falha ao remover arquivo e suas referências', 
      refresh: false 
    };
  }
}

// ✅ SUPABASE - NOVA SERVER ACTION PARA CRIAÇÃO DE PROJETO PELO CLIENTE
// Cache em memória para prevenir duplicação (TTL: 10 segundos)
const creationCache = new Map<string, number>();

export async function createProjectClientAction(
  projectDataFromClient: CreateProjectClientData, 
  clientUser: { id: string; name?: string | null; email?: string | null; companyName?: string | null; } // Mudado de uid para id para compatibilidade com Supabase
): Promise<{ data?: Project; error?: string; message?: string }> {
  try {
    // ✅ PROTEÇÃO ANTI-DUPLICAÇÃO: Verificar cache de criação
    const cacheKey = `project_creation_${clientUser.id}`;
    const lastCreation = creationCache.get(cacheKey);
    const now = Date.now();
    
    if (lastCreation && (now - lastCreation) < 10000) {
      logger.warn('[createProjectClientAction] Bloqueando duplicação - usuário tentou criar projeto muito rapidamente:', {
        userId: clientUser.id,
        timeSinceLastCreation: now - lastCreation
      });
      return { error: 'Aguarde 10 segundos entre criações de projeto' };
    }
    
    // Registrar tentativa de criação
    creationCache.set(cacheKey, now);
    
    // Limpar cache após 15 segundos
    setTimeout(() => {
      creationCache.delete(cacheKey);
    }, 15000);
    
    logger.info('[createProjectClientAction] DEBUGGING - Dados recebidos na action:', { 
      clientId: clientUser.id, 
      clientEmail: clientUser.email,
      clientName: clientUser.name,
      hasClientUser: !!clientUser,
      TODOS_OS_DADOS: projectDataFromClient,
      LISTA_MATERIAIS: projectDataFromClient.listaMateriais,
      DISJUNTOR: projectDataFromClient.disjuntorPadraoEntrada,
      KEYS_RECEBIDAS: Object.keys(projectDataFromClient)
    });

    if (!clientUser || !clientUser.id) {
      logger.warn('[createProjectClientAction] ID do usuário cliente não fornecido.');
      return { error: 'ID do usuário não encontrado. Faça login novamente.' };
    }

    if (!clientUser.email) {
      logger.warn('[createProjectClientAction] Email do usuário cliente não fornecido.');
      return { error: 'Email do usuário não encontrado. Faça login novamente.' };
    }

    // ✅ SUPABASE - Initialize Supabase Service Role Client
    let supabase;
    try {
      supabase = createSupabaseServiceRoleClient();
      logger.info('[createProjectClientAction] Supabase Service Role Client inicializado com sucesso.');
    } catch (supabaseError) {
      logger.error('[createProjectClientAction] Erro ao inicializar Supabase Service Role Client', {
        error: supabaseError
      });
      return { error: 'Erro interno: falha na inicialização do sistema.' };
    }

    // ✅ SEGURANÇA MULTI-TENANT - Obter tenant_id do usuário
    let tenantInfo;
    try {
      tenantInfo = await getTenantFromUser(clientUser.id);
      if (!tenantInfo || !tenantInfo.tenant_id) {
        logger.error('[createProjectClientAction] Tenant não encontrado para o usuário', {
          userId: clientUser.id
        });
        return { error: 'Erro: Organização não encontrada para o usuário. Entre em contato com o suporte.' };
      }
      logger.info('[createProjectClientAction] Tenant identificado:', { 
        tenant_id: tenantInfo.tenant_id, 
        organization: tenantInfo.organization.name 
      });
    } catch (tenantError) {
      logger.error('[createProjectClientAction] Erro ao buscar tenant do usuário', {
        error: tenantError
      });
      return { error: 'Erro interno: falha na identificação da organização.' };
    }

    // ✅ SUPABASE - Gerar número único do projeto (versão ultra-robusta)
    let projectNumber: string;
    let numberGenerationMethod = 'sequential'; // Para tracking
    
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `FV-${currentYear}-`;
      
      logger.info('[createProjectClientAction] Iniciando geração de número do projeto...');
      
      // Verificar se o Supabase está acessível
      let supabaseHealthy = false;
      try {
        const { data: healthCheck } = await supabase
          .from('projects')
          .select('id')
          .limit(1);
        supabaseHealthy = true;
        logger.info('[createProjectClientAction] Supabase health check: OK');
      } catch (healthError) {
        logger.error('[createProjectClientAction] Supabase health check falhou', {
          error: healthError
        });
        supabaseHealthy = false;
      }

      if (!supabaseHealthy) {
        // Se Supabase não está acessível, usar fallback sequencial
        projectNumber = await generateFallbackSequentialNumber();
        numberGenerationMethod = 'fallback_no_connection';
        logger.warn('[createProjectClientAction] Supabase inacessível, usando fallback sequencial', { projectNumber });
      } else {
        // Buscar o último número usado no ano atual com retry
        let lastProject = null;
        let retryCount = 0;
        const maxRetries = 3;
        let querySuccessful = false;
        
        while (retryCount < maxRetries && !querySuccessful) {
          try {
            logger.info(`[createProjectClientAction] Tentativa ${retryCount + 1} de buscar último projeto...`);
            
            const { data, error: queryError } = await supabase
              .from('projects')
              .select('number')
              .like('number', `${prefix}%`)
              .order('number', { ascending: false })
              .limit(1);

            if (queryError) {
              logger.warn(`[createProjectClientAction] Tentativa ${retryCount + 1} falhou:`, {
                error: queryError.message,
                code: queryError.code,
                details: queryError.details
              });
              
              if (retryCount === maxRetries - 1) {
                throw queryError;
              }
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
              continue;
            }

            lastProject = data;
            querySuccessful = true;
            logger.info(`[createProjectClientAction] Query bem-sucedida na tentativa ${retryCount + 1}:`, {
              projectsFound: data?.length || 0,
              lastProjectNumber: data?.[0]?.number || 'nenhum'
            });
            break;
            
          } catch (retryError) {
            logger.warn(`[createProjectClientAction] Erro na tentativa ${retryCount + 1}:`, {
              error: retryError instanceof Error ? retryError.message : retryError,
              retryCount: retryCount + 1,
              maxRetries
            });
            retryCount++;
            if (retryCount >= maxRetries) {
              throw retryError;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        if (querySuccessful) {
          let nextNumber = 1;
          if (lastProject && lastProject.length > 0) {
            const lastNumber = lastProject[0].number;
            const numberPart = lastNumber.replace(prefix, '');
            const parsedNumber = parseInt(numberPart);
            if (!isNaN(parsedNumber)) {
              nextNumber = parsedNumber + 1;
            }
            logger.info('[createProjectClientAction] Último número encontrado:', {
              lastNumber,
              numberPart,
              parsedNumber,
              nextNumber
            });
          } else {
            logger.info('[createProjectClientAction] Nenhum projeto encontrado, começando com 001');
          }

          projectNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
          numberGenerationMethod = 'sequential';
          logger.info('[createProjectClientAction] Número do projeto gerado sequencialmente', { projectNumber });
        } else {
          throw new Error('Falha em todas as tentativas de query');
        }
      }
    } catch (numberError) {
      logger.error('[createProjectClientAction] Erro ao gerar número do projeto após todas as tentativas', {
        error: numberError instanceof Error ? numberError.message : numberError,
        stack: numberError instanceof Error ? numberError.stack : undefined
      });
      
      // Fallback ultra-robusto: usar numeração sequencial simples
      projectNumber = await generateFallbackSequentialNumber();
      numberGenerationMethod = 'fallback_sequential';
      logger.warn('[createProjectClientAction] Usando número de fallback sequencial:', {
        projectNumber,
        method: numberGenerationMethod
      });
    }

    logger.info('[createProjectClientAction] Número final gerado:', {
      projectNumber,
      method: numberGenerationMethod
    });

    // ✅ SUPABASE - Buscar mensagem de checklist das configurações
    let checklistMessage = null;
    try {
      logger.info('[createProjectClientAction] Buscando checklist_message para tenant:', tenantInfo.tenant_id);
      
      const { data: configData, error: configError } = await supabase
        .from('configs')
        .select('value')
        .eq('key', 'checklist_message')
        .eq('tenant_id', tenantInfo.tenant_id)
        .single();

      if (!configError && configData) {
        // ✅ Processar valor que pode estar em formato JSON string
        try {
          checklistMessage = typeof configData.value === 'string' 
            ? JSON.parse(configData.value) 
            : configData.value;
        } catch {
          // Se não for JSON válido, usar diretamente
          checklistMessage = configData.value;
        }
        
        logger.info('[createProjectClientAction] Mensagem de checklist carregada das configurações:', {
          messageLength: checklistMessage ? checklistMessage.toString().length : 0,
          valueType: typeof configData.value,
          rawValue: configData.value
        });
      } else {
        logger.warn('[createProjectClientAction] Mensagem de checklist não encontrada:', { 
          error: configError?.message,
          tenantId: tenantInfo.tenant_id
        });
      }
     } catch (configError) {
       logger.error('[createProjectClientAction] Erro ao buscar mensagem de checklist', {
         configError
       });
    }

    // ✅ SUPABASE - Criar evento inicial de checklist para a timeline
    const initialTimelineEvents = [];
    const creationTimestamp = new Date().toISOString();

    if (checklistMessage) {
      // ✅ NOVO: Adicionar mensagem sobre compensação de créditos se habilitado
      let finalChecklistMessage = checklistMessage;
      if (projectDataFromClient.havera_beneficiarias) {
        finalChecklistMessage += '\n\n⚡ ATENÇÃO: Este projeto possui compensação de créditos.\nEnvie as Faturas das Unidades Beneficiárias na Linha do Tempo do Projeto no campo adequado.';
      }

      const checklistEvent = {
        id: crypto.randomUUID(),
        type: 'checklist',
        content: finalChecklistMessage,
        user: 'Sistema',
        userId: 'system',
        timestamp: creationTimestamp,
        isSystemGenerated: true,
        title: 'Checklist de Documentos Necessários para o Projeto',
        fullMessage: finalChecklistMessage
      };
      initialTimelineEvents.push(checklistEvent);
      logger.info('[createProjectClientAction] Evento de checklist adicionado à timeline inicial:', {
        eventType: checklistEvent.type,
        eventTitle: checklistEvent.title,
        hasMessage: !!checklistEvent.content,
        hasBeneficiarias: !!projectDataFromClient.havera_beneficiarias
      });
     }

    // ✅ CORREÇÃO MULTI-TENANT: Recalcular valor no servidor usando configurações do tenant
    let valorProjetoFinal = projectDataFromClient.valorProjeto || 0;

    // ✅ CORREÇÃO BUG: Frontend envia "power", backend esperava "potencia"
    const potenciaValue = (projectDataFromClient as any).power ?? projectDataFromClient.potencia;
    const potencia = typeof potenciaValue === 'string'
      ? parseFloat(potenciaValue) || 0
      : (potenciaValue as number) || 0;

    logger.info('[createProjectClientAction] ✅ Potência extraída corretamente:', {
      receivedPower: (projectDataFromClient as any).power,
      receivedPotencia: projectDataFromClient.potencia,
      finalPotencia: potencia,
      type: typeof potencia
    });

    // ✅ NOVO: Verificar se precificação manual está ativada
    const { data: precificacaoManualConfig } = await supabase
      .from('configs')
      .select('value')
      .eq('key', 'precificacao_manual')
      .eq('tenant_id', tenantInfo.tenant_id)
      .maybeSingle();

    const precificacaoManual = precificacaoManualConfig?.value === true;

    if (precificacaoManual) {
      // ✅ PRECIFICAÇÃO MANUAL ATIVA: Definir valor como R$ 0,00
      valorProjetoFinal = 0;
      logger.info('[createProjectClientAction] 💰 PRECIFICAÇÃO MANUAL ATIVADA - Projeto criado com R$ 0,00:', {
        tenantId: tenantInfo.tenant_id,
        potencia,
        valorDefinido: 0
      });
    } else {
      // ✅ CORREÇÃO CRÍTICA: SEMPRE recalcular valor no servidor usando configurações do tenant
      // Ignorar o valor vindo do frontend e sempre calcular baseado nas configurações
      if (potencia >= 0) { // ✅ CORRIGIDO: Aceitar potência = 0
        try {
          // Buscar configurações de faixas de potência do tenant
          const { data: configData } = await supabase
            .from('configs')
            .select('value')
            .eq('key', 'faixas_potencia')
            .eq('tenant_id', tenantInfo.tenant_id)
            .maybeSingle(); // ✅ CORRIGIDO: Usar maybeSingle ao invés de single

          if (configData?.value) {
            const faixasPotencia = Array.isArray(configData.value) ? configData.value : JSON.parse(configData.value);

            // ✅ CORREÇÃO CRÍTICA: Lógica de faixas inclusivas
            // Ordenar faixas por potenciaMin para garantir ordem correta
            const faixasOrdenadas = [...faixasPotencia].sort((a: any, b: any) => a.potenciaMin - b.potenciaMin);

            let faixaCorrespondente = null;
            for (const faixa of faixasOrdenadas) {
              // ✅ CORRIGIDO: Usar >= para min e < para max (exceto última faixa)
              if (potencia >= faixa.potenciaMin && potencia < faixa.potenciaMax) {
                faixaCorrespondente = faixa;
                break;
              }
            }

            if (faixaCorrespondente) {
              const valorAnterior = valorProjetoFinal;
              valorProjetoFinal = faixaCorrespondente.valorBase;
              logger.info('[createProjectClientAction] ✅ VALOR RECALCULADO NO SERVIDOR (AUTOMÁTICO):', {
                potencia,
                valorAnterior: valorAnterior,
                valorRecalculado: valorProjetoFinal,
                faixaUsada: faixaCorrespondente,
                tenantId: tenantInfo.tenant_id,
                source: 'server_calculation_automatic'
              });
            } else {
              logger.warn('[createProjectClientAction] ❌ NENHUMA FAIXA ENCONTRADA para potência:', {
                potencia,
                faixasDisponiveis: faixasPotencia.length,
                tenantId: tenantInfo.tenant_id
              });
            }
          }
        } catch (error) {
          logger.warn('[createProjectClientAction] Erro ao calcular valor no servidor, usando valor fornecido:', error);
        }
      }
    }

    // 🆕 NOVO: Determinar owner_id
    // Se admin passou owner_id, usar ele. Senão, usar o próprio criador (clientUser.id)
    const ownerId = projectDataFromClient.owner_id || clientUser.id;

    logger.info('[createProjectClientAction] Owner ID definido:', {
      owner_id: ownerId,
      created_by: clientUser.id,
      passedOwnerId: projectDataFromClient.owner_id,
      isAdminCreating: projectDataFromClient.owner_id !== undefined
    });

    // ✅ BILLING: Buscar billing_mode do usuário owner para validação de pacote/assinatura
    logger.info('[createProjectClientAction] Buscando billing_mode do owner:', { ownerId });

    // Buscar billing_mode do usuário dono do projeto
    const { data: ownerUser, error: ownerError } = await supabase
      .from('users')
      .select('id, billing_mode, tenant_id')
      .eq('id', ownerId)
      .single();

    if (ownerError || !ownerUser) {
      logger.error('[createProjectClientAction] Erro ao buscar dados do owner:', ownerError);
      return { error: 'Erro ao buscar informações do usuário. Tente novamente.' };
    }

    let billingMode = ownerUser.billing_mode || 'avulso'; // 🔧 MUDOU: let ao invés de const para permitir fallback
    let billingSnapshot: any = null;

    // 🆕 FIX: Variáveis para armazenar IDs de pacote/assinatura para vincular ao projeto
    let pacoteIdParaVincular: string | null = null;
    let assinaturaIdParaVincular: string | null = null;

    // ✅ NOTIFICAÇÕES DE QUOTA: Array para rastrear situações de esgotamento
    const quotaWarnings: Array<{
      type: string;
      severity?: 'low' | 'medium' | 'high';
      message: string;
    }> = [];
    
    // Variáveis para notificações
    let pacoteNome: string | undefined = undefined;
    let assinaturaNome: string | undefined = undefined;

    logger.info('[createProjectClientAction] Billing mode identificado:', {
      ownerId,
      billingMode,
      ownerTenantId: ownerUser.tenant_id
    });

    // ✅ VALIDAÇÃO DE PACOTE
    if (billingMode === 'pacote') {
      logger.info('[createProjectClientAction] Validando pacote do usuário...');

      // Buscar pacote ativo do usuário
      const { data: pacote, error: pacoteError } = await supabase
        .from('cliente_pacotes')
        .select(`
          *,
          pacote:pacotes_definicoes(*)
        `)
        .eq('user_id', ownerId)
        .eq('status', 'ativo')
        .single();

      if (pacoteError || !pacote) {
        // 🔧 CORREÇÃO: Não bloqueia mais - cria como avulso
        logger.warn('[createProjectClientAction] Nenhum pacote ativo encontrado - criando como AVULSO');
        billingMode = 'avulso';
        billingSnapshot = {
          mode: 'avulso',
          potencia: potencia,
          valor_projeto: valorProjetoFinal,
          fallback_reason: 'pacote_nao_encontrado',
          original_billing_mode: 'pacote',
          timestamp: new Date().toISOString()
        };
      } else {
        // Tem pacote, validar expiração e quota
        const agora = new Date();
        const dataExpiracao = new Date(pacote.data_expiracao);
        
        // Guardar nome do pacote para notificações
        pacoteNome = pacote.pacote?.nome;

        if (agora > dataExpiracao) {
          // 🔧 CORREÇÃO: Não bloqueia mais - cria como avulso
          logger.warn('[createProjectClientAction] Pacote expirado - criando como AVULSO:', {
            dataExpiracao: pacote.data_expiracao,
            agora: agora.toISOString()
          });
          billingMode = 'avulso';
          billingSnapshot = {
            mode: 'avulso',
            potencia: potencia,
            valor_projeto: valorProjetoFinal,
            fallback_reason: 'pacote_expirado',
            original_billing_mode: 'pacote',
            pacote_nome: pacote.pacote?.nome,
            data_expiracao: pacote.data_expiracao,
            timestamp: new Date().toISOString()
          };
          
          // ✅ NOTIFICAÇÕES DE QUOTA: Adicionar warning de pacote expirado
          quotaWarnings.push({
            type: 'package_expired',
            severity: 'high',
            message: 'Pacote expirado - projeto será cobrado como avulso'
          });
        } else if (pacote.projetos_usados >= pacote.projetos_inclusos) {
          // 🔧 CORREÇÃO: Não bloqueia mais - cria como avulso
          logger.warn('[createProjectClientAction] Pacote esgotado - criando como AVULSO:', {
            projetos_usados: pacote.projetos_usados,
            projetos_inclusos: pacote.projetos_inclusos
          });
          billingMode = 'avulso';
          billingSnapshot = {
            mode: 'avulso',
            potencia: potencia,
            valor_projeto: valorProjetoFinal,
            fallback_reason: 'pacote_esgotado',
            original_billing_mode: 'pacote',
            pacote_nome: pacote.pacote?.nome,
            projetos_inclusos: pacote.projetos_inclusos,
            projetos_usados: pacote.projetos_usados,
            timestamp: new Date().toISOString()
          };
          
          // ✅ NOTIFICAÇÕES DE QUOTA: Adicionar warning de pacote esgotado
          quotaWarnings.push({
            type: 'package_exhausted',
            severity: 'high',
            message: 'Pacote esgotado - projeto será cobrado como avulso'
          });
        } else {
          // ✅ Pacote válido - decrementar contador
          const { error: updateError } = await supabase
            .from('cliente_pacotes')
            .update({
              projetos_usados: pacote.projetos_usados + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', pacote.id);

          if (updateError) {
            logger.error('[createProjectClientAction] Erro ao decrementar contador do pacote:', updateError);
            return { error: 'Erro ao processar pacote. Tente novamente.' };
          }

          // 🆕 FIX: Armazenar ID do pacote para vincular ao projeto
          pacoteIdParaVincular = pacote.id;

          // Criar snapshot do pacote
          billingSnapshot = {
            mode: 'pacote',
            pacote_id: pacote.id,
            pacote_nome: pacote.pacote?.nome || 'Pacote',
            projetos_inclusos: pacote.projetos_inclusos,
            projetos_usados_antes: pacote.projetos_usados,
            projetos_usados_depois: pacote.projetos_usados + 1,
            data_ativacao: pacote.data_ativacao,
            data_expiracao: pacote.data_expiracao,
            timestamp: new Date().toISOString()
          };

          logger.info('[createProjectClientAction] ✅ Pacote validado e contador decrementado:', {
            pacote_id: pacote.id,
            pacote_nome: billingSnapshot.pacote_nome,
            projetos_usados_antes: pacote.projetos_usados,
            projetos_usados_depois: pacote.projetos_usados + 1,
            projetos_restantes: pacote.projetos_inclusos - (pacote.projetos_usados + 1)
          });
        }
      }
    }

    // ✅ VALIDAÇÃO DE ASSINATURA
    else if (billingMode === 'assinatura') {
      logger.info('[createProjectClientAction] Validando assinatura do usuário...');

      // Buscar assinatura ativa do usuário
      const { data: assinatura, error: assinaturaError } = await supabase
        .from('cliente_assinaturas')
        .select(`
          *,
          plano:planos_assinatura(*)
        `)
        .eq('user_id', ownerId)
        .eq('status', 'ativa')
        .single();

      if (assinaturaError || !assinatura) {
        // 🔧 CORREÇÃO: Não bloqueia mais - cria como avulso
        logger.warn('[createProjectClientAction] Nenhuma assinatura ativa encontrada - criando como AVULSO');
        billingMode = 'avulso';
        billingSnapshot = {
          mode: 'avulso',
          potencia: potencia,
          valor_projeto: valorProjetoFinal,
          fallback_reason: 'assinatura_nao_encontrada',
          original_billing_mode: 'assinatura',
          timestamp: new Date().toISOString()
        };
      } else {
        // Tem assinatura, validar status e quota
        // Guardar nome da assinatura para notificações
        assinaturaNome = assinatura.plano?.nome;
        
        if (assinatura.status === 'pausada' || assinatura.status === 'cancelada') {
          // 🔧 CORREÇÃO: Não bloqueia mais - cria como avulso
          logger.warn('[createProjectClientAction] Assinatura com status inválido - criando como AVULSO:', {
            status: assinatura.status
          });
          billingMode = 'avulso';
          billingSnapshot = {
            mode: 'avulso',
            potencia: potencia,
            valor_projeto: valorProjetoFinal,
            fallback_reason: `assinatura_${assinatura.status}`,
            original_billing_mode: 'assinatura',
            plano_nome: assinatura.plano?.nome,
            status_assinatura: assinatura.status,
            timestamp: new Date().toISOString()
          };
          
          // ✅ NOTIFICAÇÕES DE QUOTA: Adicionar warning de assinatura suspensa
          quotaWarnings.push({
            type: 'subscription_suspended',
            severity: 'high',
            message: `Assinatura ${assinatura.status} - projeto será cobrado como avulso`
          });
        } else if (assinatura.projetos_usados_mes_atual >= assinatura.projetos_mensais) {
          // 🔧 CORREÇÃO: Não bloqueia mais - cria como avulso
          const proximoReset = new Date(assinatura.proximo_reset);
          logger.warn('[createProjectClientAction] Cota mensal esgotada - criando como AVULSO:', {
            projetos_usados_mes_atual: assinatura.projetos_usados_mes_atual,
            projetos_mensais: assinatura.projetos_mensais,
            proximo_reset: assinatura.proximo_reset
          });
          billingMode = 'avulso';
          billingSnapshot = {
            mode: 'avulso',
            potencia: potencia,
            valor_projeto: valorProjetoFinal,
            fallback_reason: 'assinatura_esgotada',
            original_billing_mode: 'assinatura',
            plano_nome: assinatura.plano?.nome,
            projetos_mensais: assinatura.projetos_mensais,
            projetos_usados_mes_atual: assinatura.projetos_usados_mes_atual,
            proximo_reset: assinatura.proximo_reset,
            timestamp: new Date().toISOString()
          };
          
          // ✅ NOTIFICAÇÕES DE QUOTA: Adicionar warning de cota mensal esgotada
          quotaWarnings.push({
            type: 'subscription_exhausted',
            severity: 'high',
            message: 'Cota mensal esgotada - projeto será cobrado como avulso'
          });
        } else {
          // ✅ Assinatura válida - decrementar contador mensal
          const { error: updateError } = await supabase
            .from('cliente_assinaturas')
            .update({
              projetos_usados_mes_atual: assinatura.projetos_usados_mes_atual + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', assinatura.id);

          if (updateError) {
            logger.error('[createProjectClientAction] Erro ao decrementar contador da assinatura:', updateError);
            return { error: 'Erro ao processar assinatura. Tente novamente.' };
          }

          // 🆕 FIX: Armazenar ID da assinatura para vincular ao projeto
          assinaturaIdParaVincular = assinatura.id;

          // Criar snapshot da assinatura
          billingSnapshot = {
            mode: 'assinatura',
            assinatura_id: assinatura.id,
            plano_nome: assinatura.plano?.nome || 'Plano de Assinatura',
            projetos_mensais: assinatura.projetos_mensais,
            projetos_usados_antes: assinatura.projetos_usados_mes_atual,
            projetos_usados_depois: assinatura.projetos_usados_mes_atual + 1,
            dia_renovacao: assinatura.dia_renovacao,
            ultimo_reset: assinatura.ultimo_reset,
            proximo_reset: assinatura.proximo_reset,
            status: assinatura.status,
            timestamp: new Date().toISOString()
          };

          logger.info('[createProjectClientAction] ✅ Assinatura validada e contador decrementado:', {
            assinatura_id: assinatura.id,
            plano_nome: billingSnapshot.plano_nome,
            projetos_usados_antes: assinatura.projetos_usados_mes_atual,
            projetos_usados_depois: assinatura.projetos_usados_mes_atual + 1,
            projetos_restantes: assinatura.projetos_mensais - (assinatura.projetos_usados_mes_atual + 1)
          });
        }
      }
    }

    // ✅ MODO AVULSO - Criar snapshot com valor calculado
    else {
      billingSnapshot = {
        mode: 'avulso',
        potencia: potencia,
        valor_projeto: valorProjetoFinal,
        timestamp: new Date().toISOString()
      };

      logger.info('[createProjectClientAction] Modo avulso - snapshot criado:', billingSnapshot);
    }

    // ✅ SUPABASE - Preparar dados do projeto para inserção
    const projectData = {
      nome_cliente_final: projectDataFromClient.nomeClienteFinal || projectDataFromClient.nome_cliente_final || 'Projeto sem nome',
      number: projectNumber,
      created_by: clientUser.id,
      owner_id: ownerId, // 🆕 NOVO CAMPO: Proprietário do projeto
      tenant_id: tenantInfo.tenant_id, // ✅ CRÍTICO: Incluir tenant_id para isolamento
      empresa_integradora: projectDataFromClient.empresaIntegradora || '',
      distribuidora: projectDataFromClient.distribuidora || '',
      potencia: potencia,
      data_entrega: projectDataFromClient.dataEntrega || null,
      lista_materiais: projectDataFromClient.listaMateriais && projectDataFromClient.listaMateriais.trim() !== '' ? projectDataFromClient.listaMateriais : null,
      disjuntor_padrao_entrada: projectDataFromClient.disjuntorPadraoEntrada && projectDataFromClient.disjuntorPadraoEntrada.trim() !== '' ? projectDataFromClient.disjuntorPadraoEntrada : null,
      cpf_cnpj_cliente_final: projectDataFromClient.cpf_cnpj_cliente_final && projectDataFromClient.cpf_cnpj_cliente_final.trim() !== '' ? projectDataFromClient.cpf_cnpj_cliente_final : null,
      endereco_local: projectDataFromClient.endereco_local && projectDataFromClient.endereco_local.trim() !== '' ? projectDataFromClient.endereco_local : null,
      havera_beneficiarias: projectDataFromClient.havera_beneficiarias || false, // ✅ NOVO CAMPO
      status: projectDataFromClient.status || 'nao-iniciado', // ✅ CORRIGIDO: Usar slug ao invés de name
      prioridade: projectDataFromClient.prioridade || 'Baixa',
      valor_projeto: valorProjetoFinal,
      pagamento: projectDataFromClient.pagamento || 'pendente', // ✅ GARANTIR SEMPRE PENDENTE

      // 💳 BILLING: Campos de faturamento
      billing_mode: billingMode, // 'avulso' | 'pacote' | 'assinatura'
      billing_snapshot: billingSnapshot, // Snapshot congelado do billing no momento da criação

      // 🆕 FIX: FKs para vincular projeto ao pacote/assinatura específico
      cliente_pacote_id: pacoteIdParaVincular, // FK para cliente_pacotes (se modo pacote)
      cliente_assinatura_id: assinaturaIdParaVincular, // FK para cliente_assinaturas (se modo assinatura)

      timeline_events: initialTimelineEvents, // ✅ Agora inclui a checklist inicial
      documents: [],
      files: [],
      comments: [],
      history: [],
      last_update_by: {
        uid: clientUser.id,
        email: clientUser.email,
        name: clientUser.name || clientUser.email,
        role: 'cliente',
        timestamp: new Date().toISOString()
      }
    };

    // ✅ SUPABASE - Log dos dados que serão inseridos
    logger.info('[createProjectClientAction] Dados que serão inseridos no banco:', {
      lista_materiais: projectData.lista_materiais,
      disjuntor_padrao_entrada: projectData.disjuntor_padrao_entrada,
      cpf_cnpj_cliente_final: projectData.cpf_cnpj_cliente_final,
      endereco_local: projectData.endereco_local,
      nome_cliente_final: projectData.nome_cliente_final,
      distribuidora: projectData.distribuidora,
      potencia: projectData.potencia,
      timeline_events_count: initialTimelineEvents.length
    });

    // ✅ SUPABASE - Inserir projeto na tabela
    let newProject;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();

      if (error) {
        logger.error('[createProjectClientAction] Erro ao inserir projeto no Supabase', {
          error
        });
        throw new Error(`Erro ao criar projeto: ${error.message}`);
      }

      newProject = data;
      logger.info('[createProjectClientAction] Projeto criado com sucesso no Supabase:', { projectId: newProject.id, number: newProject.number });
    } catch (insertError) {
      // Limpar cache em caso de erro para permitir nova tentativa
      const cacheKey = `project_creation_${clientUser.id}`;
      creationCache.delete(cacheKey);
      
      logger.error('[createProjectClientAction] Erro na inserção do projeto', {
        insertError
      });
      if (insertError instanceof Error) {
        if (insertError.message.includes('duplicate key')) {
          return { error: 'Número de projeto já existe. Tente novamente.' };
        }
        if (insertError.message.includes('foreign key')) {
          return { error: 'Erro de referência de usuário. Verifique se o usuário está registrado.' };
        }
        if (insertError.message.includes('Aguarde 10 segundos entre criações')) {
          return { error: 'Você está criando projetos muito rapidamente. Aguarde alguns segundos.' };
        }
        return { error: `Erro ao criar projeto: ${insertError.message}` };
      }
      return { error: 'Erro interno ao criar projeto.' };
    }

    // ✅ SUPABASE - Converter dados do Supabase para o formato Project do TypeScript
    const projectResult: Project = {
      id: newProject.id,
      userId: newProject.created_by, // Mapear created_by para userId
      owner_id: newProject.owner_id, // 🆕 NOVO CAMPO: Proprietário
      nome_cliente_final: newProject.nome_cliente_final,
      number: newProject.number,
      empresaIntegradora: newProject.empresa_integradora,
      nomeClienteFinal: newProject.nome_cliente_final,
      distribuidora: newProject.distribuidora,
      potencia: newProject.potencia,
      dataEntrega: newProject.data_entrega,
      listaMateriais: newProject.lista_materiais,
      disjuntorPadraoEntrada: newProject.disjuntor_padrao_entrada,
      status: newProject.status,
      prioridade: newProject.prioridade,
      valorProjeto: newProject.valor_projeto,
      pagamento: newProject.pagamento,

      // 💳 BILLING: Adicionar campos de faturamento que estavam faltando
      billing_mode: newProject.billing_mode || 'avulso',
      billing_snapshot: newProject.billing_snapshot || null,

      createdAt: newProject.created_at,
      updatedAt: newProject.updated_at,
      adminResponsibleId: newProject.admin_responsible_id,
      adminResponsibleName: newProject.admin_responsible_name,
      adminResponsibleEmail: newProject.admin_responsible_email,
      adminResponsiblePhone: newProject.admin_responsible_phone,
      timelineEvents: newProject.timeline_events || [],
      documents: newProject.documents || [],
      files: newProject.files || [],
      comments: newProject.comments || [],
      history: newProject.history || [],
      lastUpdateBy: newProject.last_update_by
    };

    // ✅ RESTAURADO - Tentar enviar notificação para admins
    try {
      const clientNameToDisplay = clientUser.name || clientUser.companyName || clientUser.email || "Cliente Desconhecido";
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const projectUrlForAdmin = `${baseUrl}/admin/projetos/${projectResult.id}`;
      
      await notifyNewProject({
        projectId: projectResult.id,
        projectNumber: projectResult.number,
        projectName: projectResult.nome_cliente_final,
        clientName: clientNameToDisplay,
        clientId: clientUser.id,
        potencia: projectResult.potencia,
        distribuidora: projectResult.distribuidora,
        senderId: clientUser.id,
        senderName: clientNameToDisplay
      });
      logger.info(`[createProjectClientAction] Notificação sobre novo projeto ${projectResult.number} enviada para admins.`);
    } catch (notificationError) {
      // Log notification error but don't fail the entire operation
      logger.error('[createProjectClientAction] Erro ao enviar notificação para admins (projeto criado com sucesso)', {
        notificationError
      });
      // Continue without failing - the project was created successfully
    }
    
    // ✅ NOTIFICAÇÕES DE QUOTA: Enviar notificações de esgotamento se houver warnings
    try {
      if (quotaWarnings.length > 0) {
        logger.info(`[createProjectClientAction] Enviando notificações de quota esgotada: ${quotaWarnings.length} warnings`);
        
        await sendBillingNotifications({
          projectId: projectResult.id,
          projectNumber: projectResult.number,
          userId: ownerId, // Notificar o dono do projeto
          userName: clientUser.name || clientUser.email || 'Cliente',
          userEmail: clientUser.email || '',
          billingMode,
          warnings: quotaWarnings,
          potencia: projectResult.potencia,
          pacoteNome,
          assinaturaNome
        });
        
        logger.info(`[createProjectClientAction] Notificações de quota enviadas com sucesso para projeto ${projectResult.number}`);
      } else {
        logger.info(`[createProjectClientAction] Nenhuma notificação de quota necessária - projeto criado com quota disponível`);
      }
    } catch (quotaNotificationError) {
      // Log notification error but don't fail the entire operation
      logger.error('[createProjectClientAction] Erro ao enviar notificações de quota (projeto criado com sucesso)', {
        quotaNotificationError
      });
      // Continue without failing - the project was created successfully
    }
    
    // Revalidate paths safely
    try {
      revalidatePath('/cliente/projetos');
      revalidatePath('/admin/projetos');
      revalidatePath('/');
      logger.info('[createProjectClientAction] Paths revalidated successfully');
    } catch (revalidateError) {
      logger.error('[createProjectClientAction] Erro ao revalidar paths (projeto criado com sucesso)', {
        revalidateError
      });
      // Continue without failing - the project was created successfully
    }

    return sanitizeForSerialization({
      data: projectResult,
      message: `Projeto '${projectResult.nome_cliente_final}' criado com sucesso com o número ${projectResult.number}.`
    });

  } catch (error) {
    logger.error('[createProjectClientAction] Exceção não capturada ao criar projeto', {
      error
    });
    
    // Try to provide a more specific error message
    if (error instanceof Error) {
      if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
        return { error: 'Permissão negada para criar projeto.' };
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return { error: 'Erro de conexão. Verifique sua internet e tente novamente.' };
      }
      return { error: `Erro ao criar projeto: ${error.message}` };
    }
    
    return { error: 'Erro interno desconhecido ao criar projeto.' };
  }
}

/**
 * Server Action para buscar projetos de um cliente específico.
 * @param clientId O ID do cliente.
 * @returns Uma promessa que resolve para um objeto contendo os projetos ou um erro.
 */
export async function getClientProjectsAction(
  clientId: string
): Promise<{ data?: Project[]; error?: string; message?: string }> {
  try {
    if (!clientId) {
      logger.warn('[getClientProjectsAction] Tentativa de buscar projetos sem clientId.');
      return { error: 'ID do cliente é obrigatório.' };
    }

    logger.debug('[getClientProjectsAction] Buscando projetos para o cliente:', { clientId });

    // Usar getProjectsAdmin, assumindo que isAdmin seria false para um cliente específico
    const projectList = await getProjectsByUserId(clientId);

    logger.info(`[getClientProjectsAction] ${projectList.length} projetos encontrados para o cliente: ${clientId}`);
    return { data: projectList, message: 'Projetos carregados com sucesso.' };

  } catch (error) {
    logger.error('[getClientProjectsAction] Erro ao buscar projetos do cliente', {
      error
    });
    let errorMessage = 'Falha ao buscar os projetos.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

// NOVA SERVER ACTION PARA BUSCAR DADOS PARA O PAINEL DE ADMIN
export async function getAdminDashboardDataAction(userId: string): Promise<{
  projects?: Project[];
  projectCount?: number;
  error?: string;
  message?: string;
}> {
  logger.info('[getAdminDashboardDataAction] Iniciando busca de dados para o painel de admin.');
  try {
    if (!userId) {
      return { error: 'User ID é obrigatório' };
    }

    // ✅ SEGURANÇA MULTI-TENANT: Obter tenant_id do usuário
    const supabase = createSupabaseServiceRoleClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', userId)
      .single();

    if (userError || !userData?.tenant_id) {
      logger.error('[getAdminDashboardDataAction] Erro ao obter tenant do usuário:', userError);
      return { error: 'Usuário não encontrado ou sem organização' };
    }

    // ✅ CORRIGIDO: Buscar APENAS projetos do tenant do usuário
    const allProjects = await getProjectsWithFilters({ 
      tenantId: userData.tenant_id,
      limit: 1000 
    });
    const projectCount = allProjects.length;

    // Log detalhado dos primeiros 2 projetos (ou menos, se houver menos)
    if (allProjects && allProjects.length > 0) {
      const sampleProjects = allProjects.slice(0, 2);
      logger.info('[getAdminDashboardDataAction] Amostra de dados dos projetos recebidos (raw)', { sampleProjects: JSON.stringify(sampleProjects, null, 2) });
      
      // Log específico dos campos de data para a amostra
      sampleProjects.forEach((p, index) => {
        logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - createdAt: ${p.createdAt}, updatedAt: ${p.updatedAt}, dataEntrega: ${p.dataEntrega}`);
        if (p.comments && p.comments.length > 0) {
          logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - Primeiro Comentário createdAt: ${p.comments[0].createdAt}`);
        }
        if (p.timelineEvents && p.timelineEvents.length > 0) {
          logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - Primeiro TimelineEvent timestamp: ${p.timelineEvents[0].timestamp}`);
        }
        if (p.lastUpdateBy) {
          logger.info(`[getAdminDashboardDataAction] Projeto Amostra ${index} - lastUpdateBy timestamp: ${p.lastUpdateBy.timestamp}`);
        }
      });
    }

    logger.info(`[getAdminDashboardDataAction] ${projectCount} projetos encontrados.`);

    return { 
      projects: allProjects,
      projectCount: projectCount,
      message: 'Admin dashboard data fetched successfully.',
    };
  } catch (error) {
    logger.error('[getAdminDashboardDataAction] Erro ao buscar dados para o painel de admin', {
      error
    });
    let errorMessage = 'Failed to fetch admin dashboard data.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

// SERVER ACTION PARA BUSCAR UM PROJETO ESPECÍFICO
export async function getProjectAction(projectId: string): Promise<{
  data?: Project;
  error?: string;
  message?: string;
}> {
  try {
    if (!projectId) {
      logger.warn('[getProjectAction] Tentativa de buscar projeto sem projectId.');
      return { error: 'ID do projeto é obrigatório.' };
    }

    logger.debug('[getProjectAction] Buscando projeto com ID:', { projectId });

    // ✅ CORRIGIDO: Usar busca direta no Supabase sem filtro de usuário
    // Isso permite que admins vejam qualquer projeto e que a verificação de permissão
    // seja feita no frontend baseada nos dados retornados
    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id (
          id,
          name,
          company_name
        )
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('[getProjectAction] Projeto não encontrado', { projectId });
      return { error: 'Projeto não encontrado.' };
    }
      logger.error('[getProjectAction] Erro Supabase ao buscar projeto', {
        projectId,
        error
      });
      return { error: `Erro ao buscar projeto: ${error.message}` };
    }

    if (!data) {
      logger.warn('[getProjectAction] Nenhum dado retornado para projeto', { projectId });
      return { error: 'Projeto não encontrado.' };
    }

    // 🆕 Calcular empresaIntegradora dinamicamente baseado no owner_id
    let empresaIntegradoraFinal = data.empresa_integradora || '';

    if (data.owner_id && data.owner) {
      // Projeto com owner_id: usar dados do proprietário
      empresaIntegradoraFinal = data.owner.company_name || data.owner.name || empresaIntegradoraFinal;
    }

    // Mapear dados do Supabase para o formato Project
    const project: Project = {
      id: data.id,
      userId: data.created_by,
      owner_id: data.owner_id,
      nome_cliente_final: data.nome_cliente_final,
      number: data.number,
      empresaIntegradora: empresaIntegradoraFinal,
      nomeClienteFinal: data.nome_cliente_final || '',
      distribuidora: data.distribuidora || '',
      potencia: data.potencia || 0,
      dataEntrega: data.data_entrega || '',
      listaMateriais: data.lista_materiais || undefined,
      disjuntorPadraoEntrada: data.disjuntor_padrao_entrada || undefined,
      cpf_cnpj_cliente_final: data.cpf_cnpj_cliente_final || undefined,
      endereco_local: data.endereco_local || undefined,
      havera_beneficiarias: data.havera_beneficiarias || false,
      client_city: data.client_city || undefined,
      client_state: data.client_state || undefined,

      tipo_conexao: data.tipo_conexao || undefined,
      tipo_ramal: data.tipo_ramal || undefined,
      tensao_atendimento: data.tensao_atendimento || undefined,
      coord_utm_fuso: data.coord_utm_fuso || undefined,
      coord_utm_x: data.coord_utm_x || undefined,
      coord_utm_y: data.coord_utm_y || undefined,
      modulos_quantidade: data.modulos_quantidade || undefined,
      modulos_fabricante: data.modulos_fabricante || undefined,
      modulos_modelo: data.modulos_modelo || undefined,
      modulos_potencia_wp: data.modulos_potencia_wp || undefined,
      inversores_quantidade: data.inversores_quantidade || undefined,
      inversores_fabricante: data.inversores_fabricante || undefined,
      inversores_modelo: data.inversores_modelo || undefined,
      inversores_potencia: data.inversores_potencia || undefined,
      inversores_tensao: data.inversores_tensao || undefined,
      conta_contrato: data.conta_contrato || undefined,
      classe_uc: data.classe_uc || undefined,
      numero_poste_transformador: data.numero_poste_transformador || undefined,
      numero_condutores_fase: data.numero_condutores_fase || undefined,
      secao_fase_mm2: data.secao_fase_mm2 || undefined,
      secao_neutro_mm2: data.secao_neutro_mm2 || undefined,
      disjuntor_polos: data.disjuntor_polos || undefined,
      disjuntor_corrente_a: data.disjuntor_corrente_a || undefined,
      disjuntor_tensao_v: data.disjuntor_tensao_v || undefined,
      tipo_fornecimento: data.tipo_fornecimento || undefined,
      modalidade_compensacao: data.modalidade_compensacao || undefined,
      planta_situacao_url: data.planta_situacao_url || undefined,
      caixa_medicao_id: data.caixa_medicao_id || undefined,
      caixa_medicao_imagem_url: data.caixa_medicao_imagem_url || undefined,
      caixa_medicao_nome: data.caixa_medicao_nome || undefined,
      caixa_medicao_comprimento_mm: data.caixa_medicao_comprimento_mm || undefined,
      caixa_medicao_altura_mm: data.caixa_medicao_altura_mm || undefined,
      caixa_medicao_largura_mm: data.caixa_medicao_largura_mm || undefined,
      responsavel_nome: data.responsavel_nome || undefined,
      responsavel_profissao: data.responsavel_profissao || undefined,
      responsavel_registro: data.responsavel_registro || undefined,
      responsavel_email: data.responsavel_email || undefined,
      responsavel_uf: data.responsavel_uf || undefined,
      data_documento: data.data_documento || undefined,
      secao_aterramento_mm2: data.secao_aterramento_mm2 || undefined,

      // Formulário de Solicitação de Acesso
      cliente_cep: data.cliente_cep || undefined,
      cliente_email: data.cliente_email || undefined,
      cliente_celular: data.cliente_celular || undefined,
      cliente_telefone_fixo: data.cliente_telefone_fixo || undefined,
      responsavel_legal_nome: data.responsavel_legal_nome || undefined,
      responsavel_legal_telefone: data.responsavel_legal_telefone || undefined,
      responsavel_legal_email: data.responsavel_legal_email || undefined,
      tipo_solicitacao: data.tipo_solicitacao || undefined,
      tarifa_branca: data.tarifa_branca || undefined,
      possui_cargas_especiais: data.possui_cargas_especiais || undefined,
      carga_declarada_kw: data.carga_declarada_kw || undefined,
      potencia_disponibilizada_kw: data.potencia_disponibilizada_kw || undefined,
      data_inicio_operacao: data.data_inicio_operacao || undefined,
      modulos_area_m2: data.modulos_area_m2 || undefined,

      // Inversores - campos extras
      inversores_faixa_tensao: data.inversores_faixa_tensao || undefined,
      inversores_corrente_nominal: data.inversores_corrente_nominal || undefined,
      inversores_fator_potencia: data.inversores_fator_potencia || undefined,
      inversores_rendimento: data.inversores_rendimento || undefined,
      inversores_dht_corrente: data.inversores_dht_corrente || undefined,
      inversores_entradas_por_mppt: data.inversores_entradas_por_mppt || undefined,
      inversores_quantidade_mppt: data.inversores_quantidade_mppt || undefined,
      inversores_potencia_max_saida: data.inversores_potencia_max_saida || undefined,
      inversores_tensao_max_ca: data.inversores_tensao_max_ca || undefined,
      inversores_tensao_min_ca: data.inversores_tensao_min_ca || undefined,
      inversores_tipo_conexao_saida: data.inversores_tipo_conexao_saida || undefined,
      carga_levantamento: data.carga_levantamento || undefined,

      // Características físicas dos módulos (Tabela 4)
      modulos_eficiencia: data.modulos_eficiencia || undefined,
      modulos_comprimento_m: data.modulos_comprimento_m || undefined,
      modulos_largura_m: data.modulos_largura_m || undefined,
      modulos_area_unitaria_m2: data.modulos_area_unitaria_m2 || undefined,
      modulos_peso_kg: data.modulos_peso_kg || undefined,

      // Dimensionamento dos Cabos
      cabo_isolacao_material: data.cabo_isolacao_material || undefined,
      cabo_cc_secao_mm2: data.cabo_cc_secao_mm2 || undefined,
      cabo_cc_capacidade_corrente_a: data.cabo_cc_capacidade_corrente_a || undefined,
      cabo_cc_fator_temperatura: data.cabo_cc_fator_temperatura || undefined,
      cabo_cc_fator_agrupamento: data.cabo_cc_fator_agrupamento || undefined,
      cabo_ca_secao_mm2: data.cabo_ca_secao_mm2 || undefined,
      cabo_ca_capacidade_corrente_a: data.cabo_ca_capacidade_corrente_a || undefined,
      cabo_ca_fator_temperatura: data.cabo_ca_fator_temperatura || undefined,
      cabo_ca_fator_agrupamento: data.cabo_ca_fator_agrupamento || undefined,

      status: data.status || 'nao-iniciado', // ✅ CORRIGIDO: Usar slug ao invés de name
      prioridade: data.prioridade || 'Baixa',
      // ✅ FIX: Permitir valor 0, usar ?? ao invés de ||
      valorProjeto: data.valor_projeto ?? null,
      pagamento: data.pagamento || undefined,

      // 💳 BILLING: Adicionar campos de faturamento que estavam faltando
      billing_mode: data.billing_mode || 'avulso',
      billing_snapshot: data.billing_snapshot || null,

      createdAt: data.created_at,
      updatedAt: data.updated_at,
      adminResponsibleId: data.admin_responsible_id,
      adminResponsibleName: data.admin_responsible_name,
      adminResponsibleEmail: data.admin_responsible_email,
      adminResponsiblePhone: data.admin_responsible_phone,
      timelineEvents: data.timeline_events || [],
      documents: data.documents || [],
      files: data.files || [],
      comments: data.comments || [],
      history: data.history || [],
      lastUpdateBy: data.last_update_by || undefined,

      // ✅ CAMPOS DE SLA (prazo de expiração)
      status_changed_at: data.status_changed_at || null,
      sla_expires_at: data.sla_expires_at || null,
      sla_expired: data.sla_expired || false,
    };

    logger.info('[getProjectAction] Projeto encontrado:', { projectId: project.id, projectName: project.nome_cliente_final, userId: project.userId });
    return sanitizeForSerialization({ data: project, message: 'Projeto carregado com sucesso.' });

  } catch (error) {
    logger.error('[getProjectAction] Erro ao buscar projeto', {
      projectId,
      error
    });
    let errorMessage = 'Falha ao buscar o projeto.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

// New Server Action for useProjects hook
export async function getProjectsForUserAction(options: { userId: string, isAdmin?: boolean }): Promise<{
  projects?: Project[];
  error?: string;
  message?: string;
}> {
  const { userId } = options;
  try {
    if (!userId) {
      logger.warn('[getProjectsForUserAction] Attempting to fetch projects without userId.');
      return { error: 'User ID is required.' };
    }

    logger.debug('[getProjectsForUserAction] Fetching projects for user:', { userId });

    // ✅ SUPABASE - Verificar role do usuário na tabela public.users
    const supabase = createSupabaseServiceRoleClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, tenant_id, tem_restricao_clientes, clientes_permitidos, permissions')
      .eq('id', userId)
      .single();

    if (userError || !userData?.tenant_id) {
      logger.error('[getProjectsForUserAction] Error fetching user data', {
        userError
      });
      return { error: 'Erro ao verificar permissões do usuário ou organização não encontrada.' };
    }

    const isAdmin = userData?.role === 'admin' || userData?.role === 'superadmin';
    const isColaborador = userData?.role === 'colaborador';
    logger.debug('[getProjectsForUserAction] User role determined:', { 
      userId, 
      role: userData?.role, 
      isAdmin, 
      isColaborador,
      temRestricao: userData?.tem_restricao_clientes,
      quantidadeClientesPermitidos: userData?.clientes_permitidos?.length || 0
    });

    let projectList: Project[];

    if (isAdmin || isColaborador) {
      // ✅ SEGURANÇA MULTI-TENANT: Para admins E colaboradores, buscar projetos do MESMO TENANT
      logger.debug('[getProjectsForUserAction] User is admin or colaborador, fetching tenant projects');
      projectList = await getProjectsWithFilters({ tenantId: userData.tenant_id, limit: 1000 });
      
      // 🆕 FILTRO DE CLIENTES PERMITIDOS: Aplicar apenas para colaboradores
      if (isColaborador && userData.tem_restricao_clientes) {
        const clientesPermitidos = userData.clientes_permitidos || [];
        const projetosOriginais = projectList.length;
        
        if (clientesPermitidos.length === 0) {
          // Sem acesso a nenhum cliente = sem projetos
          logger.info('[getProjectsForUserAction] Colaborador COM restrição mas SEM clientes permitidos (bloqueio total)', {
            userId,
            projetosOriginais
          });
          projectList = [];
        } else {
          // Filtrar projetos por owner_id
          projectList = projectList.filter(project => 
            clientesPermitidos.includes(project.owner_id)
          );
          
          logger.info('[getProjectsForUserAction] Filtro de clientes permitidos aplicado:', {
            userId,
            projetosOriginais,
            projetosFiltrados: projectList.length,
            clientesPermitidos: clientesPermitidos.length
          });
        }
      } else if (isColaborador && !userData.tem_restricao_clientes) {
        logger.info('[getProjectsForUserAction] Colaborador SEM restrição (acesso total a todos os projetos)', {
          userId,
          totalProjetos: projectList.length
        });
      }

      // 🆕 FILTRO DE VISUALIZAÇÃO DE PROJETOS: Verificar permissão can_view_all_projects
      // Aplicar filtro adicional para colaboradores se não tiverem permissão de ver todos os projetos
      if (isColaborador) {
        const permissions = userData.permissions || {};
        const canViewAllProjects = permissions.can_view_all_projects !== false;

        if (!canViewAllProjects) {
          const projetosAntesDoFiltro = projectList.length;

          // Filtrar apenas projetos onde o colaborador é responsável
          projectList = projectList.filter(project =>
            project.admin_responsible_id === userId || project.adminResponsibleId === userId
          );

          logger.info('[getProjectsForUserAction] Filtro "Visualizar todos os projetos" aplicado:', {
            userId,
            canViewAllProjects: false,
            projetosAntesDoFiltro,
            projetosDepoisDoFiltro: projectList.length
          });
        } else {
          logger.info('[getProjectsForUserAction] Colaborador COM permissão para visualizar todos os projetos', {
            userId,
            canViewAllProjects: true,
            totalProjetos: projectList.length
          });
        }
      }
    } else {
      // ✅ SEGURANÇA MULTI-TENANT: Para clientes, buscar projetos do usuário no MESMO TENANT
      logger.debug('[getProjectsForUserAction] User is client, fetching user projects only');
      projectList = await getProjectsByUserId(userId);
    }

    logger.info(`[getProjectsForUserAction] ${projectList.length} projects found for user: ${userId} (role: ${userData?.role}, isAdmin: ${isAdmin})`);
    return { projects: projectList, message: 'Projects loaded successfully.' };

  } catch (error) {
    logger.error('[getProjectsForUserAction] Error fetching projects for user', {
      userId,
      error
    });
    let errorMessage = 'Failed to fetch projects.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

export async function deleteProjectAction(projectId: string): Promise<{
  success?: boolean;
  error?: string;
  message?: string;
}> {
  try {
    if (!projectId) {
      logger.warn('[deleteProjectAction] Attempting to delete project without projectId.');
      return { error: 'ID do projeto é obrigatório.' };
    }

    logger.info('[deleteProjectAction] Deleting project with ID:', { projectId });

    // ✅ SUPABASE - IMPLEMENTAÇÃO: Excluir projeto no Supabase
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, buscar dados do projeto para verificar se existe e obter arquivos
    const { data: projectData, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (fetchError || !projectData) {
      logger.warn('[deleteProjectAction] Project not found, cannot delete', { projectId, error: fetchError });
      return { error: 'Projeto não encontrado.' };
    }

    // 1. Excluir arquivos associados do Supabase Storage (quando implementado)
    if (projectData.files && projectData.files.length > 0) {
      logger.debug(`[deleteProjectAction] Project has ${projectData.files.length} associated files. Storage deletion will be implemented when Supabase Storage is configured.`);
      
      // TODO: Implementar exclusão de arquivos do Supabase Storage
      // const deletePromises = projectData.files.map(file => {
      //   if (file.path) {
      //     return supabase.storage
      //       .from('project-files')
      //       .remove([file.path])
      //       .catch(err => {
      //         logger.error(`[deleteProjectAction] Failed to delete file ${file.path} from storage:`, err);
      //       });
      //   }
      //   return Promise.resolve();
      // });
      // await Promise.all(deletePromises);
      
      logger.debug(`[deleteProjectAction] File deletion from storage skipped (Supabase Storage not yet configured)`);
    }

    // 2. Excluir o projeto do Supabase
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      logger.error('[deleteProjectAction] Failed to delete project from Supabase', {
        projectId,
        error: deleteError
      });
      return { error: `Falha ao excluir projeto: ${deleteError.message}` };
    }

    logger.info('[deleteProjectAction] Project deleted successfully from Supabase:', { projectId });

    // Revalidar caminhos relevantes
    revalidatePath('/admin/projetos'); // Para listas de admin
    revalidatePath('/cliente/projetos'); // Para listas de cliente
    revalidatePath('/');

    return { success: true, message: 'Projeto excluído com sucesso.' };

  } catch (error) {
    logger.error('[deleteProjectAction] Error deleting project', {
      projectId,
      error
    });
    let errorMessage = 'Falha ao excluir o projeto.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

export async function generateUniqueProjectNumberAction(): Promise<{ number?: string; error?: string; }> {
  try {
    // Usar generateUniqueProjectNumberCore importado diretamente
    const allProjects = await getProjectsWithFilters({ limit: 1 });
    const number = allProjects && allProjects.length > 0 ? allProjects[0].number : null;
    
    if (!number || number.startsWith('FALLBACK-') || number.startsWith('ERROR-')) {
      logger.error('[generateUniqueProjectNumberAction] Serviço core retornou um número inválido ou de fallback', {
        number
      });
      return { error: 'Falha ao gerar número único de projeto.' };
    }

            logger.info('[generateUniqueProjectNumberAction] Número único gerado com sucesso', { number });
    return { number };
  } catch (error) {
    logger.error('[generateUniqueProjectNumberAction] Erro ao chamar generateUniqueProjectNumberCore', {
      error
    });
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar número do projeto.';
    return { error: errorMessage };
  }
}

export async function isProjectNumberUsedAction(projectNumber: string): Promise<{ isUsed?: boolean; error?: string; }> {
  try {
    // A função isProjectNumberAlreadyUsed de core.ts (Admin SDK) é mais apropriada para uma server action.
    if (!projectNumber) {
        return { error: 'Número do projeto não fornecido.', isUsed: true }; 
    }
    // Usar isProjectNumberAlreadyUsedCore (de core.ts, Admin SDK)
    const existingProjects = await getProjectsWithFilters({ limit: 1000 }); // Buscar todos os projetos
    const isUsed = existingProjects.some(project => project.number === projectNumber);
    return { isUsed };
  } catch (error) {
    logger.error('[isProjectNumberUsedAction] Erro ao chamar isProjectNumberAlreadyUsedCore', {
      projectNumber,
      error
    });
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao verificar número do projeto.';
    return { error: errorMessage, isUsed: true }; 
  }
}

// ✅ NOVA SERVER ACTION: Assumir responsabilidade sem validação de tenant (para admins em produção)
export async function assumeProjectResponsibilityAction(
  projectId: string,
  adminData: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  }
): Promise<{ data?: Project; error?: string; message?: string; refresh?: boolean }> {
  try {
    // ✅ LOGS SERVIDOR: Dados de entrada
    devLog.log('[SERVER] assumeProjectResponsibilityAction - INÍCIO:', {
      projectId,
      adminData,
      timestamp: new Date().toISOString(),
      nodejs_version: process.version
    });
    
    devLog.log('[assumeProjectResponsibilityAction] Iniciando processo:', {
      projectId,
      adminId: adminData.id,
      adminEmail: adminData.email
    });

    if (!projectId || !adminData.id) {
      const error = 'ID do projeto e dados do admin são obrigatórios';
      devLog.log('[SERVER] assumeProjectResponsibilityAction - ERRO VALIDAÇÃO:', error);
      return { error };
    }

    // ✅ SUPABASE - Atualizar projeto diretamente sem validação de tenant
    const supabase = createSupabaseServiceRoleClient();
    devLog.log('[SERVER] assumeProjectResponsibilityAction - Supabase client criado');
    
    // Buscar projeto atual
    devLog.log('[SERVER] assumeProjectResponsibilityAction - Buscando projeto:', projectId);
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    devLog.log('[SERVER] assumeProjectResponsibilityAction - Resultado busca projeto:', {
      found: !!currentProject,
      error: fetchError,
      errorCode: fetchError?.code,
      errorMessage: fetchError?.message,
      projectData: currentProject ? {
        id: currentProject.id,
        number: currentProject.number,
        tenant_id: currentProject.tenant_id,
        created_by: currentProject.created_by
      } : null
    });

    if (fetchError || !currentProject) {
      const errorMsg = `Projeto não encontrado: ${fetchError?.message || 'Unknown error'}`;
      devLog.log('[SERVER] assumeProjectResponsibilityAction - ERRO:', errorMsg);
      devLog.error('[assumeProjectResponsibilityAction] Projeto não encontrado:', fetchError);
      return { error: errorMsg };
    }

    // Criar evento de timeline
    const responsibilityEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      type: 'responsibility',
      timestamp: new Date().toISOString(),
      user: adminData.name || adminData.email || 'Admin',
      userId: adminData.id,
      content: `${adminData.name || adminData.email} assumiu a responsabilidade pelo projeto.`
    };

    // Preparar dados de atualização
    const currentTimelineEvents = currentProject.timeline_events || [];
    const updatedTimelineEvents = [responsibilityEvent, ...currentTimelineEvents];

    // ✅ Atualizar projeto diretamente
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        admin_responsible_id: adminData.id,
        admin_responsible_name: adminData.name || adminData.email || 'Admin',
        admin_responsible_email: adminData.email,
        admin_responsible_phone: adminData.phone || '',
        timeline_events: updatedTimelineEvents,
        updated_at: new Date().toISOString(),
        last_update_by: {
          uid: adminData.id,
          email: adminData.email,
          role: adminData.role || 'admin',
          timestamp: new Date().toISOString()
        }
      })
      .eq('id', projectId)
      .select()
      .single();

    devLog.log('[SERVER] assumeProjectResponsibilityAction - Resultado update:', {
      success: !!updatedProject,
      error: updateError,
      errorCode: updateError?.code,
      errorMessage: updateError?.message,
      updatedFields: updatedProject ? {
        admin_responsible_id: updatedProject.admin_responsible_id,
        admin_responsible_name: updatedProject.admin_responsible_name,
        admin_responsible_email: updatedProject.admin_responsible_email
      } : null
    });

    if (updateError) {
      const errorMsg = `Erro ao assumir responsabilidade: ${updateError.message}`;
      devLog.log('[SERVER] assumeProjectResponsibilityAction - ERRO UPDATE:', errorMsg);
      devLog.error('[assumeProjectResponsibilityAction] Erro ao atualizar:', updateError);
      return { error: errorMsg };
    }

    devLog.log('[SERVER] assumeProjectResponsibilityAction - SUCESSO!');
    devLog.log('[assumeProjectResponsibilityAction] Responsabilidade assumida com sucesso');

    // Converter dados do Supabase para formato Project
    const finalData: Project = {
      id: updatedProject.id,
      userId: updatedProject.created_by,
      nome_cliente_final: updatedProject.nome_cliente_final,
      number: updatedProject.number,
      empresaIntegradora: updatedProject.empresa_integradora,
      nomeClienteFinal: updatedProject.nome_cliente_final,
      distribuidora: updatedProject.distribuidora,
      potencia: updatedProject.potencia,
      dataEntrega: updatedProject.data_entrega,
      status: updatedProject.status,
      prioridade: updatedProject.prioridade,
      valorProjeto: updatedProject.valor_projeto,
      pagamento: updatedProject.pagamento,
      
      createdAt: updatedProject.created_at,
      updatedAt: updatedProject.updated_at,
      adminResponsibleId: updatedProject.admin_responsible_id,
      adminResponsibleName: updatedProject.admin_responsible_name,
      adminResponsibleEmail: updatedProject.admin_responsible_email,
      adminResponsiblePhone: updatedProject.admin_responsible_phone,
      timelineEvents: updatedProject.timeline_events || [],
      documents: updatedProject.documents || [],
      files: updatedProject.files || [],
      comments: updatedProject.comments || [],
      history: updatedProject.history || [],
      lastUpdateBy: updatedProject.last_update_by
    };

    // Force revalidation
    revalidatePath('/projetos');
    revalidatePath(`/projetos/${projectId}`);
    revalidatePath('/');

    return sanitizeForSerialization({
      data: finalData,
      message: `Responsabilidade assumida com sucesso pelo projeto ${updatedProject.number}`,
      refresh: true
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
    devLog.log('[SERVER] assumeProjectResponsibilityAction - EXCEPTION:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    });
    
    devLog.error('[assumeProjectResponsibilityAction] Erro inesperado:', error);
    return {
      error: errorMessage,
      message: 'Falha ao assumir responsabilidade',
      refresh: false
    };
  }
}

// ✅ NOVA SERVER ACTION: Editar projeto sem validação de tenant (para admins em produção)
export async function editProjectAction(
  updatedProject: UpdatedProject,
  adminData: {
    id: string;
    email?: string;
    role?: string;
  }
): Promise<{ data?: Project; error?: string; message?: string; refresh?: boolean }> {
  try {
    devLog.log('[SERVER] editProjectAction - INÍCIO:', {
      projectId: updatedProject.id,
      adminData,
      updatedFields: Object.keys(updatedProject),
      timestamp: new Date().toISOString()
    });

    if (!updatedProject.id || !adminData.id) {
      const error = 'ID do projeto e dados do admin são obrigatórios';
      devLog.log('[SERVER] editProjectAction - ERRO VALIDAÇÃO:', error);
      return { error };
    }

    // ✅ SUPABASE - Atualizar projeto diretamente sem validação de tenant
    const supabase = createSupabaseServiceRoleClient();
    devLog.log('[SERVER] editProjectAction - Supabase client criado');

    // Buscar projeto atual
    devLog.log('[SERVER] editProjectAction - Buscando projeto:', updatedProject.id);
    const { data: currentProject, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', updatedProject.id)
      .single();

    devLog.log('[SERVER] editProjectAction - Resultado busca projeto:', {
      found: !!currentProject,
      error: fetchError,
      errorCode: fetchError?.code,
      errorMessage: fetchError?.message
    });

    if (fetchError || !currentProject) {
      const errorMsg = `Projeto não encontrado: ${fetchError?.message || 'Unknown error'}`;
      devLog.log('[SERVER] editProjectAction - ERRO:', errorMsg);
      return { error: errorMsg };
    }

    // Preparar dados de atualização usando mapeamento correto
    const updateData: any = {};
    
    // Mapear campos do frontend para o banco de dados
    if (updatedProject.number !== undefined) updateData.number = updatedProject.number;
    if (updatedProject.empresaIntegradora !== undefined) updateData.empresa_integradora = updatedProject.empresaIntegradora;
    if (updatedProject.nomeClienteFinal !== undefined) updateData.nome_cliente_final = updatedProject.nomeClienteFinal;
    if (updatedProject.distribuidora !== undefined) updateData.distribuidora = updatedProject.distribuidora;
    if (updatedProject.potencia !== undefined) updateData.potencia = updatedProject.potencia;
    if (updatedProject.dataEntrega !== undefined) updateData.data_entrega = updatedProject.dataEntrega;
    if (updatedProject.status !== undefined) updateData.status = updatedProject.status;
    if (updatedProject.prioridade !== undefined) updateData.prioridade = updatedProject.prioridade;
    if (updatedProject.valorProjeto !== undefined) updateData.valor_projeto = updatedProject.valorProjeto;
    if (updatedProject.pagamento !== undefined) updateData.pagamento = updatedProject.pagamento;
    if (updatedProject.timelineEvents !== undefined) updateData.timeline_events = updatedProject.timelineEvents;
    if (updatedProject.documents !== undefined) updateData.documents = updatedProject.documents;
    if (updatedProject.files !== undefined) updateData.files = updatedProject.files;
    if (updatedProject.comments !== undefined) updateData.comments = updatedProject.comments;
    if (updatedProject.history !== undefined) updateData.history = updatedProject.history;

    // 🆕 TRANSFERÊNCIA: Mapear owner_id para salvar transferência de propriedade
    if (updatedProject.owner_id !== undefined) updateData.owner_id = updatedProject.owner_id;

    // ✅ CORREÇÃO: Mapear campos de SLA para persistir no banco
    if (updatedProject.status_changed_at !== undefined) updateData.status_changed_at = updatedProject.status_changed_at;
    if (updatedProject.sla_expires_at !== undefined) updateData.sla_expires_at = updatedProject.sla_expires_at;
    if (updatedProject.sla_expired !== undefined) updateData.sla_expired = updatedProject.sla_expired;

    // Campos do cliente e projeto (aba Gerar Projeto / Conferir Informações)
    if ((updatedProject as any).cpf_cnpj_cliente_final !== undefined) updateData.cpf_cnpj_cliente_final = (updatedProject as any).cpf_cnpj_cliente_final;
    if ((updatedProject as any).endereco_local !== undefined) updateData.endereco_local = (updatedProject as any).endereco_local;
    if ((updatedProject as any).client_city !== undefined) updateData.client_city = (updatedProject as any).client_city;
    if ((updatedProject as any).client_state !== undefined) updateData.client_state = (updatedProject as any).client_state;
    if ((updatedProject as any).disjuntorPadraoEntrada !== undefined) updateData.disjuntor_padrao_entrada = (updatedProject as any).disjuntorPadraoEntrada;
    if ((updatedProject as any).listaMateriais !== undefined) updateData.lista_materiais = (updatedProject as any).listaMateriais;
    if ((updatedProject as any).havera_beneficiarias !== undefined) updateData.havera_beneficiarias = (updatedProject as any).havera_beneficiarias;

    // Campos técnicos (Gerar Projeto)
    if ((updatedProject as any).tipo_conexao !== undefined) updateData.tipo_conexao = (updatedProject as any).tipo_conexao;
    if ((updatedProject as any).tipo_ramal !== undefined) updateData.tipo_ramal = (updatedProject as any).tipo_ramal;
    if ((updatedProject as any).tensao_atendimento !== undefined) updateData.tensao_atendimento = (updatedProject as any).tensao_atendimento;
    if ((updatedProject as any).coord_utm_fuso !== undefined) updateData.coord_utm_fuso = (updatedProject as any).coord_utm_fuso;
    if ((updatedProject as any).coord_utm_x !== undefined) updateData.coord_utm_x = (updatedProject as any).coord_utm_x;
    if ((updatedProject as any).coord_utm_y !== undefined) updateData.coord_utm_y = (updatedProject as any).coord_utm_y;

    // Módulos fotovoltaicos
    if ((updatedProject as any).modulos_quantidade !== undefined) updateData.modulos_quantidade = (updatedProject as any).modulos_quantidade;
    if ((updatedProject as any).modulos_fabricante !== undefined) updateData.modulos_fabricante = (updatedProject as any).modulos_fabricante;
    if ((updatedProject as any).modulos_modelo !== undefined) updateData.modulos_modelo = (updatedProject as any).modulos_modelo;
    if ((updatedProject as any).modulos_potencia_wp !== undefined) updateData.modulos_potencia_wp = (updatedProject as any).modulos_potencia_wp;

    // Inversores fotovoltaicos
    if ((updatedProject as any).inversores_quantidade !== undefined) updateData.inversores_quantidade = (updatedProject as any).inversores_quantidade;
    if ((updatedProject as any).inversores_fabricante !== undefined) updateData.inversores_fabricante = (updatedProject as any).inversores_fabricante;
    if ((updatedProject as any).inversores_modelo !== undefined) updateData.inversores_modelo = (updatedProject as any).inversores_modelo;
    if ((updatedProject as any).inversores_potencia !== undefined) updateData.inversores_potencia = (updatedProject as any).inversores_potencia;
    if ((updatedProject as any).inversores_tensao !== undefined) updateData.inversores_tensao = (updatedProject as any).inversores_tensao;

    // Dados da unidade consumidora e padrão de entrada
    if ((updatedProject as any).conta_contrato !== undefined) updateData.conta_contrato = (updatedProject as any).conta_contrato;
    if ((updatedProject as any).classe_uc !== undefined) updateData.classe_uc = (updatedProject as any).classe_uc;
    if ((updatedProject as any).numero_poste_transformador !== undefined) updateData.numero_poste_transformador = (updatedProject as any).numero_poste_transformador;
    if ((updatedProject as any).numero_condutores_fase !== undefined) updateData.numero_condutores_fase = (updatedProject as any).numero_condutores_fase;
    if ((updatedProject as any).secao_fase_mm2 !== undefined) updateData.secao_fase_mm2 = (updatedProject as any).secao_fase_mm2;
    if ((updatedProject as any).secao_neutro_mm2 !== undefined) updateData.secao_neutro_mm2 = (updatedProject as any).secao_neutro_mm2;
    if ((updatedProject as any).disjuntor_polos !== undefined) updateData.disjuntor_polos = (updatedProject as any).disjuntor_polos;
    if ((updatedProject as any).disjuntor_corrente_a !== undefined) updateData.disjuntor_corrente_a = (updatedProject as any).disjuntor_corrente_a;
    if ((updatedProject as any).disjuntor_tensao_v !== undefined) updateData.disjuntor_tensao_v = (updatedProject as any).disjuntor_tensao_v;

    // Classificação do sistema
    if ((updatedProject as any).tipo_fornecimento !== undefined) updateData.tipo_fornecimento = (updatedProject as any).tipo_fornecimento;
    if ((updatedProject as any).modalidade_compensacao !== undefined) updateData.modalidade_compensacao = (updatedProject as any).modalidade_compensacao;
    if ((updatedProject as any).planta_situacao_url !== undefined) updateData.planta_situacao_url = (updatedProject as any).planta_situacao_url;

    // Campos adicionais
    updateData.updated_at = new Date().toISOString();
    updateData.last_update_by = {
      uid: adminData.id,
      email: adminData.email,
      role: adminData.role || 'admin',
      timestamp: new Date().toISOString()
    };

    devLog.log('[SERVER] editProjectAction - Dados de update preparados:', Object.keys(updateData));

    // ✅ Atualizar projeto diretamente
    const { data: updatedProjectData, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', updatedProject.id)
      .select(`
        *,
        owner:users!owner_id (
          id,
          name,
          company_name
        )
      `)
      .single();

    devLog.log('[SERVER] editProjectAction - Resultado update:', {
      success: !!updatedProjectData,
      error: updateError,
      errorCode: updateError?.code,
      errorMessage: updateError?.message
    });

    if (updateError) {
      const errorMsg = `Erro ao editar projeto: ${updateError.message}`;
      devLog.log('[SERVER] editProjectAction - ERRO UPDATE:', errorMsg);
      return { error: errorMsg };
    }

    devLog.log('[SERVER] editProjectAction - SUCESSO!');
    
    // ✅ CRÍTICO: Adicionar notificações como updateProjectAction
    try {
      // Verificar mudança de status para notificações
      if (updatedProjectData.status && currentProject.status !== updatedProjectData.status) {
        devLog.log('[SERVER] editProjectAction - Status mudou, enviando notificações:', {
          oldStatus: currentProject.status,
          newStatus: updatedProjectData.status
        });
        
        // 🔧 CORREÇÃO: Usar owner_id se existir, senão usar created_by
        const projectOwnerId = updatedProjectData.owner_id || updatedProjectData.created_by;

        if (projectOwnerId) {
          // Buscar role do admin do banco para garantir consistência
          const { data: adminProfile } = await supabase
            .from('users')
            .select('role, name')
            .eq('id', adminData.id)
            .single();

          const actualAdminName = adminProfile?.name || adminData.email || 'Admin';

          const { notifyStatusChange } = await import('@/lib/services/notificationService');
          await notifyStatusChange({
            projectId: updatedProjectData.id,
            projectNumber: updatedProjectData.number,
            projectName: updatedProjectData.nome_cliente_final,
            oldStatus: currentProject.status,
            newStatus: updatedProjectData.status,
            clientId: projectOwnerId, // 🔧 CORREÇÃO: Usar proprietário do projeto
            adminId: adminData.id,
            adminName: actualAdminName
          });
          devLog.log('[SERVER] editProjectAction - Notificação de status enviada');
        }
      }
      
      // Verificar novos arquivos para notificações
      const oldFiles = currentProject.files || [];
      const newFiles = updatedProjectData.files || [];
      const addedFiles = newFiles.filter(newFile => 
        !oldFiles.some(oldFile => oldFile.url === newFile.url)
      );
      
      if (addedFiles.length > 0) {
        devLog.log('[SERVER] editProjectAction - Novos arquivos detectados, enviando notificações:', addedFiles.length);

        // 🔧 CORREÇÃO: Usar owner_id se existir, senão usar created_by
        const projectOwnerId = updatedProjectData.owner_id || updatedProjectData.created_by;

        // Buscar dados do proprietário para notificação
        let clientName = 'Cliente';
        if (projectOwnerId) {
          const { data: clientData } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', projectOwnerId)
            .single();

          if (clientData) {
            clientName = clientData.name || clientData.email || 'Cliente';
          }
        }

        // Buscar role do admin do banco
        const { data: adminProfile } = await supabase
          .from('users')
          .select('role, name')
          .eq('id', adminData.id)
          .single();

        const actualAdminRole = adminProfile?.role || adminData.role || 'admin';
        const actualAdminName = adminProfile?.name || adminData.email || 'Admin';

        const { notifyNewDocument } = await import('@/lib/services/notificationService');

        for (const addedFile of addedFiles) {
          await notifyNewDocument({
            projectId: updatedProjectData.id,
            projectNumber: updatedProjectData.number,
            projectName: updatedProjectData.nome_cliente_final,
            documentName: addedFile.name,
            uploaderId: adminData.id,
            uploaderName: actualAdminName,
            uploaderRole: actualAdminRole,
            clientId: projectOwnerId, // 🔧 CORREÇÃO: Usar proprietário do projeto
            clientName: clientName
          });
        }
        devLog.log('[SERVER] editProjectAction - Notificações de documento enviadas');
      }
    } catch (notificationError) {
      devLog.log('[SERVER] editProjectAction - Erro nas notificações (não crítico):', notificationError);
      // Não falhar a edição por causa das notificações
    }

    // 🆕 Recalcular empresaIntegradora dinamicamente baseado no owner_id
    let empresaIntegradoraFinal = updatedProjectData.empresa_integradora || '';

    if (updatedProjectData.owner_id && updatedProjectData.owner) {
      // Projeto com owner_id: usar dados do proprietário
      empresaIntegradoraFinal = updatedProjectData.owner.company_name || updatedProjectData.owner.name || empresaIntegradoraFinal;
    }

    // Converter dados do Supabase para formato Project
    const finalData: Project = {
      id: updatedProjectData.id,
      userId: updatedProjectData.created_by,
      owner_id: updatedProjectData.owner_id,
      nome_cliente_final: updatedProjectData.nome_cliente_final,
      number: updatedProjectData.number,
      empresaIntegradora: empresaIntegradoraFinal,
      nomeClienteFinal: updatedProjectData.nome_cliente_final,
      distribuidora: updatedProjectData.distribuidora,
      potencia: updatedProjectData.potencia,
      dataEntrega: updatedProjectData.data_entrega,
      status: updatedProjectData.status,
      prioridade: updatedProjectData.prioridade,
      valorProjeto: updatedProjectData.valor_projeto,
      pagamento: updatedProjectData.pagamento,
      
      createdAt: updatedProjectData.created_at,
      updatedAt: updatedProjectData.updated_at,
      adminResponsibleId: updatedProjectData.admin_responsible_id,
      adminResponsibleName: updatedProjectData.admin_responsible_name,
      adminResponsibleEmail: updatedProjectData.admin_responsible_email,
      adminResponsiblePhone: updatedProjectData.admin_responsible_phone,
      timelineEvents: updatedProjectData.timeline_events || [],
      documents: updatedProjectData.documents || [],
      files: updatedProjectData.files || [],
      comments: updatedProjectData.comments || [],
      history: updatedProjectData.history || [],
      lastUpdateBy: updatedProjectData.last_update_by
    };

    // Force revalidation
    revalidatePath('/projetos');
    revalidatePath(`/projetos/${updatedProject.id}`);
    revalidatePath('/admin/projetos');
    revalidatePath(`/admin/projetos/${updatedProject.id}`);

    return sanitizeForSerialization({
      data: finalData,
      message: `Projeto ${updatedProjectData.number} editado com sucesso`,
      refresh: true
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro inesperado';
    devLog.log('[SERVER] editProjectAction - EXCEPTION:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
      constructor: error?.constructor?.name
    });

    return {
      error: errorMessage,
      message: 'Falha ao editar projeto',
      refresh: false
    };
  }
}

/**
 * ✅ SERVER ACTION: Atualizar dados do cliente para procuração
 * Atualiza campos específicos do cliente final no projeto
 * - nome_cliente_final
 * - cpf_cnpj_cliente_final
 * - client_city
 * - client_state
 * - distribuidora
 */
export async function updateProjectClientData(
  projectId: string,
  data: {
    nome_cliente_final: string;
    cpf_cnpj_cliente_final: string;
    client_city: string;
    client_state: string;
    distribuidora: string;
  },
  userId: string
) {
  try {
    devLog.log('[SERVER] updateProjectClientData - Iniciando:', { projectId, userId });

    // ✅ VALIDAÇÃO: Verificar campos obrigatórios
    if (!projectId || !userId) {
      return {
        success: false,
        error: 'Dados incompletos: projectId e userId são obrigatórios'
      };
    }

    // ✅ VALIDAÇÃO: Nome do cliente
    if (!data.nome_cliente_final || data.nome_cliente_final.trim().length === 0) {
      return {
        success: false,
        error: 'Nome do cliente é obrigatório'
      };
    }

    // ✅ VALIDAÇÃO: CPF/CNPJ
    if (!data.cpf_cnpj_cliente_final || data.cpf_cnpj_cliente_final.trim().length === 0) {
      return {
        success: false,
        error: 'CPF/CNPJ é obrigatório'
      };
    }

    if (!validarCPForCNPJ(data.cpf_cnpj_cliente_final)) {
      return {
        success: false,
        error: 'CPF/CNPJ inválido. Verifique os dígitos.'
      };
    }

    // ✅ VALIDAÇÃO: Cidade
    if (!data.client_city || data.client_city.trim().length === 0) {
      return {
        success: false,
        error: 'Cidade é obrigatória'
      };
    }

    // ✅ VALIDAÇÃO: Estado
    if (!data.client_state || data.client_state.trim().length === 0) {
      return {
        success: false,
        error: 'Estado é obrigatório'
      };
    }

    const estadoNormalizado = normalizarEstado(data.client_state);
    if (!validarEstado(estadoNormalizado)) {
      return {
        success: false,
        error: 'Estado inválido. Use a sigla (ex: SP, RJ, MG)'
      };
    }

    // ✅ VALIDAÇÃO: Distribuidora
    if (!data.distribuidora || data.distribuidora.trim().length === 0) {
      return {
        success: false,
        error: 'Distribuidora é obrigatória'
      };
    }

    // ✅ AUTENTICAÇÃO: Buscar dados do usuário
    const userData = await getUserDataAdminSupabase(userId);
    if (!userData || !userData.tenantId) {
      devLog.error('[SERVER] updateProjectClientData - Usuário não encontrado ou sem tenant');
      return {
        success: false,
        error: 'Usuário não autenticado ou tenant não identificado'
      };
    }

    const tenantId = userData.tenantId;
    devLog.log('[SERVER] updateProjectClientData - Tenant identificado:', tenantId);
    devLog.log('[SERVER] updateProjectClientData - ProjectId recebido:', projectId);
    devLog.log('[SERVER] updateProjectClientData - UserId recebido:', userId);

    // ✅ Criar cliente Supabase Service Role
    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Buscar projeto e verificar permissões
    devLog.log('[SERVER] updateProjectClientData - Buscando projeto no banco...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, owner_id, tenant_id')
      .eq('id', projectId)
      .maybeSingle();

    devLog.log('[SERVER] updateProjectClientData - Resultado da busca:', {
      found: !!project,
      error: projectError,
      projectData: project
    });

    if (projectError) {
      devLog.error('[SERVER] updateProjectClientData - Erro ao buscar projeto:', projectError);
      return {
        success: false,
        error: 'Erro ao buscar projeto',
        details: projectError.message
      };
    }

    if (!project) {
      devLog.error('[SERVER] updateProjectClientData - Projeto não encontrado:', projectId);
      return {
        success: false,
        error: 'Projeto não encontrado'
      };
    }

    // ✅ SEGURANÇA: Verificar tenant_id do projeto
    if (project.tenant_id !== tenantId) {
      devLog.error('[SERVER] updateProjectClientData - Tenant ID não corresponde:', {
        projectTenantId: project.tenant_id,
        userTenantId: tenantId
      });
      return {
        success: false,
        error: 'Acesso negado: projeto pertence a outro tenant'
      };
    }

    // ✅ PERMISSÕES: Verificar se usuário pode editar
    const isAdmin = userData.role === 'admin' || userData.role === 'superadmin';
    const isOwner = project.owner_id === userId;

    if (!isAdmin && !isOwner) {
      devLog.warn('[SERVER] updateProjectClientData - Sem permissão');
      return {
        success: false,
        error: 'Sem permissão para editar este projeto'
      };
    }

    devLog.log('[SERVER] updateProjectClientData - Permissões OK. isAdmin:', isAdmin, 'isOwner:', isOwner);

    // ✅ PREPARAR DADOS: Sanitizar e formatar
    const updateData = {
      nome_cliente_final: sanitizeNome(data.nome_cliente_final),
      cpf_cnpj_cliente_final: removerFormatacao(data.cpf_cnpj_cliente_final),
      client_city: sanitizeNome(data.client_city),
      client_state: estadoNormalizado,
      distribuidora: data.distribuidora.trim(),
      updated_at: new Date().toISOString()
    };

    devLog.log('[SERVER] updateProjectClientData - Dados sanitizados:', updateData);

    // ✅ ATUALIZAR: Salvar no banco
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[SERVER] updateProjectClientData - Erro ao atualizar:', updateError);
      return {
        success: false,
        error: 'Erro ao atualizar dados do cliente',
        details: updateError.message
      };
    }

    devLog.log('[SERVER] updateProjectClientData - Sucesso!');

    // ✅ REVALIDAR: Forçar atualização das páginas
    revalidatePath('/projetos');
    revalidatePath(`/projetos/${projectId}`);
    revalidatePath('/admin/projetos');
    revalidatePath(`/admin/projetos/${projectId}`);

    return {
      success: true,
      message: 'Dados do cliente atualizados com sucesso',
      data: {
        nome_cliente_final: updatedProject.nome_cliente_final,
        cpf_cnpj_cliente_final: updatedProject.cpf_cnpj_cliente_final,
        client_city: updatedProject.client_city,
        client_state: updatedProject.client_state,
        distribuidora: updatedProject.distribuidora
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    devLog.error('[SERVER] updateProjectClientData - Exceção:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });

    return {
      success: false,
      error: 'Erro interno do servidor',
      details: errorMessage
    };
  }
} 