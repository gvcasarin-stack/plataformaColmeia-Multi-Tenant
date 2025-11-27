// ❌ FIREBASE - COMENTADO PARA RESOLVER ERRO DE BUILD
// import { db, auth } from '@/lib/firebase/index';
// import { doc, getDoc } from 'firebase/firestore';

// ✅ SUPABASE - TODO: Implementar notificações com Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

import { NotificationType, NotificationResult, BatchNotificationResult } from './types';
import { createNotification, createNotificationForAllAdmins, getOrCreateSenderInfo } from './core';
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger';

// ✅ Mapa de slugs para nomes legíveis
const statusSlugToName: Record<string, string> = {
  'nao-iniciado': 'Não Iniciado',
  'em-desenvolvimento': 'Em Desenvolvimento',
  'aguardando-assinaturas': 'Aguardando Assinaturas',
  'em-homologacao': 'Em Homologação',
  'projeto-aprovado': 'Projeto Aprovado',
  'aguardando-solicitar-vistoria': 'Aguardando Solicitar Vistoria',
  'projeto-pausado': 'Projeto Pausado',
  'em-vistoria': 'Em Vistoria',
  'finalizado': 'Finalizado',
  'cancelado': 'Cancelado',
};

// ✅ Função para converter slug em nome legível
const getStatusDisplayName = (slug: string): string => {
  return statusSlugToName[slug] || slug;
};

/**
 * ✅ FUNÇÃO HELPER PARA E-MAILS usando Server Actions
 * Chama server actions específicas para evitar problema server-only
 */
async function sendEmailNotification(type: string, params: any): Promise<boolean> {
  try {
    // Logs removidos por questões de segurança em produção
    
    // Só executar no servidor
    if (typeof window !== 'undefined') {
      return false;
    }
    
    // Usar server actions ao invés de importação direta
    const { 
      sendNewProjectEmail,
      sendAdminCommentEmail, 
      sendClientCommentEmail,
      sendAdminDocumentEmail,
      sendClientDocumentEmail,
      sendStatusChangeEmail
    } = await import('@/lib/actions/notification-email-actions');
    
    switch (type) {
      case 'new_project':
        return await sendNewProjectEmail({
          clientName: params.clientName,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          potencia: params.potencia,
          distribuidora: params.distribuidora,
          projectUrl: params.projectUrl,
          projectId: params.projectId  // ✅ CORRIGIDO: Adicionar projectId para identificar tenant correto
        });
        
      case 'admin_comment':
        return await sendAdminCommentEmail({
          clientId: params.clientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          authorName: params.authorName,
          commentText: params.commentText,
          projectUrl: params.projectUrl,
          projectId: params.projectId
        });
        
      case 'client_comment':
        return await sendClientCommentEmail({
          commentText: params.commentText,
          clientName: params.clientName || params.authorName,
          authorName: params.authorName,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          projectUrl: params.projectUrl,
          projectId: params.projectId,
          authorId: params.authorId // ✅ Passar authorId para filtrar
        });
        
      case 'admin_document':
        return await sendAdminDocumentEmail({
          clientId: params.clientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          documentName: params.documentName,
          projectUrl: params.projectUrl,
          projectId: params.projectId  // ✅ CORRIGIDO: Passar projectId para cooldown
        });
        
      case 'client_document':
        return await sendClientDocumentEmail({
          documentName: params.documentName,
          clientName: params.clientName || params.uploaderName,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          projectUrl: params.projectUrl,
          projectId: params.projectId  // ✅ CORRIGIDO: Passar projectId para cooldown
        });
        
      case 'status_change':
        return await sendStatusChangeEmail({
          clientId: params.clientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          oldStatus: getStatusDisplayName(params.oldStatus),
          newStatus: getStatusDisplayName(params.newStatus),
          projectUrl: params.projectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}`
        });
        
      default:
        return false;
    }
  } catch (error) {
    logger.error('[sendEmailNotification] Erro ao enviar e-mail:', error);
    return false;
  }
}

/**
 * Interface para dados de notificação estendida com e-mail
 */
interface NotificationWithEmailParams {
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
  link?: string;
  data?: Record<string, any>;
  senderId?: string;
  senderName?: string;
  senderType?: 'admin' | 'client' | 'system';
  
  // Configurações de e-mail
  sendEmail?: boolean;
  emailType?: 'status' | 'comment' | 'document' | 'project';
  emailData?: Record<string, any>;
}

/**
 * Cria notificação para o cliente de um projeto (Supabase)
 */
export async function createNotificationForProjectClient(
  projectId: string,
  projectNumber: string,
  type: string,
  title: string,
  message: string,
  data: Record<string, any> = {}
): Promise<NotificationResult> {
  try {
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] INÍCIO:', {
      projectId,
      projectNumber,
      type,
      title,
      message,
      data
    });
    
    logger.info('[createNotificationForProjectClient] Criando notificação para cliente do projeto:', projectId);
    
    // 1. Buscar projeto e cliente
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Buscando projeto...');
    const supabase = createSupabaseServiceRoleClient();
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, nome_cliente_final, created_by, owner_id, tenant_id') // ✅ CORRIGIDO: incluir owner_id
      .eq('id', projectId)
      .single();

    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Resultado da busca do projeto:', {
      project,
      projectError: projectError?.message,
      hasProject: !!project
    });

    if (projectError || !project) {
      devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] ERRO: Projeto não encontrado:', projectError?.message);
      logger.error('[createNotificationForProjectClient] Projeto não encontrado:', { projectError });
      return { success: false, error: 'Projeto não encontrado' };
    }

    // 🔧 CORREÇÃO: Usar owner_id se existir, senão usar created_by (retrocompatibilidade)
    const clientId = project.owner_id || project.created_by;
    if (!clientId) {
      devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] ERRO: Projeto sem cliente!');
      logger.error('[createNotificationForProjectClient] Projeto sem cliente:', { projectId });
      return { success: false, error: 'Projeto sem cliente associado' };
    }
    
    // ✅ VERIFICAÇÃO MULTI-TENANT: Garantir que cliente pertence ao mesmo tenant do projeto
    const { data: clientData, error: clientError } = await supabase
      .from('users')
      .select('id, name, email, tenant_id')
      .eq('id', clientId)
      .single();
    
    if (clientError || !clientData) {
      devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] ERRO: Cliente não encontrado!', clientError?.message);
      return { success: false, error: 'Cliente não encontrado' };
    }
    
    if (clientData.tenant_id !== project.tenant_id) {
      devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] ERRO: VIOLAÇÃO MULTI-TENANT!', {
        clientTenant: clientData.tenant_id,
        projectTenant: project.tenant_id
      });
      return { success: false, error: 'Violação de isolamento multi-tenant' };
    }
    
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Cliente identificado e verificado:', {
      clientId,
      clientName: clientData.name || clientData.email,
      clientTenant: clientData.tenant_id,
      projectTenant: project.tenant_id
    });
    logger.info('[createNotificationForProjectClient] Criando notificação para cliente:', { clientId });
    
    // 2. Criar notificação usando função do core
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Chamando createNotification...');
    
    const notificationParams = {
      type: type as any, // ✅ TEMPORÁRIO: usar any para resolver conflito de tipos
      title,
      message,
      userId: clientId,
      projectId,
      projectNumber,
      projectName: data.projectName || project.nome_cliente_final || title,
      link: data.link || `/cliente/projetos/${projectId}`, // ✅ URL padrão para cliente
      data: {
        ...data,
        projectNumber,
        notificationType: 'client_notification',
        clientNotification: true
      }
    };
    
    devLog.log('🔍 [DEBUG-CLIENT-NOTIFICATION] Parâmetros da notificação:', {
      type: notificationParams.type,
      userId: notificationParams.userId,
      projectId: notificationParams.projectId,
      title: notificationParams.title,
      clientTenant: clientData.tenant_id,
      projectTenant: project.tenant_id
    });
    
    const result = await createNotification(notificationParams);
    
    devLog.log('🔍 [DEBUG-CLIENT-NOTIFICATION] Resultado createNotification:', {
      success: result.success,
      id: result.id,
      error: result.error,
      fullResult: result
    });
    
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Resultado createNotification:', {
      success: result.success,
      id: result.id,
      error: result.error
    });

    if (result.success) {
      logger.info('[createNotificationForProjectClient] Notificação criada com sucesso:', result.id);
      return { success: true, id: result.id };
    } else {
      devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] ERRO no createNotification:', result.error);
      logger.error('[createNotificationForProjectClient] Erro ao criar notificação:', result.error);
      return { success: false, error: result.error };
    }
    
  } catch (error: any) {
    devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] EXCEPTION:', error);
    logger.error('[createNotificationForProjectClient] Erro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ✅ NOVO SISTEMA DE NOTIFICAÇÕES
 * Notifica sobre novo projeto (in-app + e-mail)
 * REGRA: Notifica APENAS admins + superadmin (NÃO colaboradores)
 */
export async function notifyNewProject(params: {
  projectId: string;
  projectNumber: string;
  projectName: string;
  clientName: string;
  clientId: string;
  potencia?: string | number;
  distribuidora?: string;
  senderId?: string;
  senderName?: string;
}): Promise<{ notificationIds: string[]; emailSent: boolean }> {
  try {
    console.log('🔍 [DEBUG notifyNewProject] INÍCIO - Parâmetros:', params);
    logger.info('[notifyNewProject] ✅ NOVO SISTEMA: Notificando apenas admins+superadmin (excluir colaboradores)');

    const supabase = createSupabaseServiceRoleClient();

    console.log('🔍 [DEBUG notifyNewProject] Buscando tenant_id do projeto:', params.projectId);

    // Buscar tenant_id do projeto
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('tenant_id')
      .eq('id', params.projectId)
      .single();

    console.log('🔍 [DEBUG notifyNewProject] Resultado busca projeto:', {
      projectData,
      projectError: projectError?.message,
      hasTenantId: !!projectData?.tenant_id
    });

    if (projectError || !projectData?.tenant_id) {
      console.error('❌ [DEBUG notifyNewProject] ERRO: Não encontrou tenant_id', projectError);
      logger.error('[notifyNewProject] Erro ao buscar tenant do projeto:', projectError);
      return { notificationIds: [], emailSent: false };
    }

    const tenantId = projectData.tenant_id;
    console.log('✅ [DEBUG notifyNewProject] Tenant encontrado:', tenantId);

    // ✅ NOVO: Buscar APENAS admins + superadmin (excluir colaboradores)
    console.log('🔍 [DEBUG notifyNewProject] Buscando admins do tenant...');
    const { getAdminsAndSuperadminsByTenant } = await import('@/lib/services/userService/core');
    const adminUsers = await getAdminsAndSuperadminsByTenant(tenantId);

    console.log('🔍 [DEBUG notifyNewProject] Admins encontrados:', {
      count: adminUsers.length,
      admins: adminUsers.map(a => ({ id: a.uid, email: a.email, role: a.role }))
    });

    if (adminUsers.length === 0) {
      console.warn('⚠️ [DEBUG notifyNewProject] AVISO: Nenhum admin encontrado!');
      logger.warn('[notifyNewProject] Nenhum admin/superadmin encontrado');
      return { notificationIds: [], emailSent: false };
    }

    console.log(`✅ [DEBUG notifyNewProject] Vai notificar ${adminUsers.length} admins/superadmins`);
    logger.info(`[notifyNewProject] Notificando ${adminUsers.length} admins/superadmins`);

    // Obter informações do remetente
    const senderInfo = await getOrCreateSenderInfo(
      params.senderId || params.clientId,
      params.senderName || params.clientName,
      'client'
    );

    const mappedType = { type: 'info', category: 'project' };

    // Criar notificações (excluir autor)
    console.log('🔍 [DEBUG notifyNewProject] Filtrando autor:', params.senderId || params.clientId);
    const notifications = adminUsers
      .filter(admin => admin.uid !== (params.senderId || params.clientId))
      .map(admin => ({
        type: mappedType.type,
        category: mappedType.category,
        priority: 'normal',
        title: `Novo projeto: ${params.projectName}`,
        message: `${params.clientName} criou o projeto "${params.projectName}" (${params.projectNumber})`,
        user_id: admin.uid,
        tenant_id: tenantId,
        read: false,
        data: {
          projectId: params.projectId,
          projectNumber: params.projectNumber,
          projectName: params.projectName,
          senderId: senderInfo.id,
          senderName: senderInfo.name,
          senderType: senderInfo.type,
          link: `/admin/projetos/${params.projectId}`,
          originalType: 'new_project',
          isAdminNotification: true,
          clientName: params.clientName,
          clientId: params.clientId,
          potencia: params.potencia,
          distribuidora: params.distribuidora
        }
      }));

    console.log('🔍 [DEBUG notifyNewProject] Notificações a inserir:', {
      count: notifications.length,
      notifications: notifications.map(n => ({ user_id: n.user_id, title: n.title }))
    });

    let notificationIds: string[] = [];

    if (notifications.length > 0) {
      console.log('🔍 [DEBUG notifyNewProject] Inserindo notificações no banco...');
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('id');

      console.log('🔍 [DEBUG notifyNewProject] Resultado inserção:', {
        success: !error,
        error: error?.message,
        insertedCount: data?.length || 0
      });

      if (error) {
        console.error('❌ [DEBUG notifyNewProject] ERRO ao inserir notificações:', error);
        logger.error('[notifyNewProject] Erro ao criar notificações:', error);
      } else {
        notificationIds = data?.map(n => n.id) || [];
        console.log('✅ [DEBUG notifyNewProject] Notificações inseridas:', notificationIds);
      }
    } else {
      console.warn('⚠️ [DEBUG notifyNewProject] AVISO: Nenhuma notificação para inserir (todos filtrados?)');
    }

    // 2. Enviar e-mail para admins
    console.log('🔍 [DEBUG notifyNewProject] Enviando e-mails...');
    const emailSent = await sendEmailNotification('new_project', {
      ...params,
      projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}`
    });

    console.log('✅ [DEBUG notifyNewProject] FIM - Resultado:', {
      notificationIds: notificationIds.length,
      emailSent
    });
    logger.info('[notifyNewProject] Resultado:', { notificationIds: notificationIds.length, emailSent });

    return { notificationIds, emailSent };
  } catch (error) {
    console.error('❌ [DEBUG notifyNewProject] EXCEPTION:', error);
    logger.error('[notifyNewProject] Erro:', error);
    return { notificationIds: [], emailSent: false };
  }
}

/**
 * ✅ NOVO SISTEMA DE NOTIFICAÇÕES
 * Notifica sobre novo comentário (in-app + e-mail)
 * REGRAS:
 * - Admin comenta: notifica cliente
 * - Cliente comenta SEM responsável: notifica apenas admins + superadmin (NÃO colaboradores)
 * - Cliente comenta COM responsável: notifica APENAS o responsável
 * - Outro admin comenta: notifica responsável + cliente
 */
export async function notifyNewComment(params: {
  projectId: string;
  projectNumber: string;
  projectName: string;
  commentText: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  clientId?: string;
  clientName?: string;
}): Promise<{ notificationIds: string[]; emailSent: boolean }> {
  try {
    logger.info('[notifyNewComment] ✅ NOVO SISTEMA: Verificando responsável do projeto');

    const supabase = createSupabaseServiceRoleClient();

    // Buscar informações do projeto (tenant_id e responsável)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('tenant_id, admin_responsible_id, created_by, owner_id')
      .eq('id', params.projectId)
      .single();

    if (projectError || !projectData) {
      logger.error('[notifyNewComment] Erro ao buscar projeto:', projectError);
      return { notificationIds: [], emailSent: false };
    }

    const tenantId = projectData.tenant_id;
    const responsibleId = projectData.admin_responsible_id;
    // 🔧 CORREÇÃO: Usar owner_id se existir, senão usar created_by (retrocompatibilidade)
    const projectClientId = projectData.owner_id || projectData.created_by;
    const hasResponsible = !!responsibleId;

    logger.info('[notifyNewComment] Project owner resolution:', {
      owner_id: projectData.owner_id,
      created_by: projectData.created_by,
      projectClientId,
      usedField: projectData.owner_id ? 'owner_id' : 'created_by'
    });

    const isAdminComment = ['admin', 'superadmin', 'colaborador'].includes(params.authorRole);
    let notificationIds: string[] = [];
    let emailSent = false;

    logger.info(`[notifyNewComment] Projeto ${hasResponsible ? 'TEM' : 'NÃO TEM'} responsável`, { responsibleId });

    if (isAdminComment) {
      // ═══════════════════════════════════════════════════════════════
      // ADMIN/COLABORADOR COMENTOU
      // ═══════════════════════════════════════════════════════════════

      // Verificar se quem comentou é o responsável ou outro admin
      const isResponsible = hasResponsible && params.authorId === responsibleId;

      if (isResponsible) {
        // RESPONSÁVEL comentou → notificar APENAS cliente
        logger.info('[notifyNewComment] Responsável comentou → notificar apenas cliente');

        const clientResult = await createNotificationForProjectClient(
          params.projectId,
          params.projectNumber,
          'new_comment',
          `Novo comentário no projeto ${params.projectNumber}`,
          `${params.authorName} comentou: "${params.commentText.substring(0, 50)}..."`,
          {
            commentText: params.commentText,
            authorId: params.authorId,
            authorName: params.authorName,
            isFromAdmin: true,
            link: `/cliente/projetos/${params.projectId}?tab=comments`
          }
        );

        if (clientResult.success && clientResult.id) {
          notificationIds.push(clientResult.id);
        }

        emailSent = await sendEmailNotification('admin_comment', {
          clientId: projectClientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          authorName: params.authorName,
          commentText: params.commentText,
          projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}?tab=comments`,
          projectId: params.projectId
        });

      } else {
        // OUTRO admin comentou → notificar responsável + cliente
        logger.info('[notifyNewComment] Outro admin comentou → notificar responsável + cliente');

        // Notificar cliente
        const clientResult = await createNotificationForProjectClient(
          params.projectId,
          params.projectNumber,
          'new_comment',
          `Novo comentário no projeto ${params.projectNumber}`,
          `${params.authorName} comentou: "${params.commentText.substring(0, 50)}..."`,
          {
            commentText: params.commentText,
            authorId: params.authorId,
            authorName: params.authorName,
            isFromAdmin: true,
            link: `/cliente/projetos/${params.projectId}?tab=comments`
          }
        );

        if (clientResult.success && clientResult.id) {
          notificationIds.push(clientResult.id);
        }

        // Se tem responsável, notificá-lo também
        if (hasResponsible && responsibleId !== params.authorId) {
          const responsibleResult = await createNotification({
            type: 'new_comment',
            title: `Comentário no seu projeto: ${params.projectName}`,
            message: `${params.authorName} comentou no projeto ${params.projectNumber}: "${params.commentText.substring(0, 50)}..."`,
            userId: responsibleId,
            projectId: params.projectId,
            projectNumber: params.projectNumber,
            projectName: params.projectName,
            senderId: params.authorId,
            senderName: params.authorName,
            senderType: 'admin',
            link: `/admin/projetos/${params.projectId}?tab=comments`,
            data: {
              commentText: params.commentText,
              authorId: params.authorId,
              authorName: params.authorName,
              isCollaborationComment: true
            }
          });

          if (responsibleResult.success && responsibleResult.id) {
            notificationIds.push(responsibleResult.id);
          }
        }

        emailSent = await sendEmailNotification('admin_comment', {
          clientId: projectClientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          authorName: params.authorName,
          commentText: params.commentText,
          projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}?tab=comments`,
          projectId: params.projectId
        });
      }

    } else {
      // ═══════════════════════════════════════════════════════════════
      // CLIENTE COMENTOU
      // ═══════════════════════════════════════════════════════════════

      if (hasResponsible) {
        // TEM responsável → notificar APENAS o responsável
        logger.info('[notifyNewComment] Cliente comentou COM responsável → notificar apenas responsável');

        const responsibleResult = await createNotification({
          type: 'new_comment',
          title: `Novo comentário do cliente: ${params.projectName}`,
          message: `${params.authorName} comentou no projeto ${params.projectNumber}: "${params.commentText.substring(0, 50)}..."`,
          userId: responsibleId,
          projectId: params.projectId,
          projectNumber: params.projectNumber,
          projectName: params.projectName,
          senderId: params.authorId,
          senderName: params.authorName,
          senderType: 'client',
          link: `/admin/projetos/${params.projectId}?tab=comments`,
          data: {
            commentText: params.commentText,
            commentFull: params.commentText,
            commentSnippet: params.commentText.substring(0, 150) + (params.commentText.length > 150 ? "..." : ""),
            authorId: params.authorId,
            authorName: params.authorName,
            isFromClient: true
          }
        });

        if (responsibleResult.success && responsibleResult.id) {
          notificationIds.push(responsibleResult.id);
        }

      } else {
        // NÃO tem responsável → notificar apenas admins + superadmin (NÃO colaboradores)
        logger.info('[notifyNewComment] Cliente comentou SEM responsável → notificar apenas admins + superadmin');

        const { getAdminsAndSuperadminsByTenant } = await import('@/lib/services/userService/core');
        const allAdmins = await getAdminsAndSuperadminsByTenant(tenantId);

        if (allAdmins.length > 0) {
          const senderInfo = await getOrCreateSenderInfo(params.authorId, params.authorName, 'client');
          const mappedType = { type: 'info', category: 'project' };

          const notifications = allAdmins
            .filter(admin => admin.uid !== params.authorId)
            .map(admin => ({
              type: mappedType.type,
              category: mappedType.category,
              priority: 'normal',
              title: `Novo comentário do cliente: ${params.projectName}`,
              message: `${params.authorName} comentou no projeto ${params.projectNumber}: "${params.commentText.substring(0, 50)}..."`,
              user_id: admin.uid,
              tenant_id: tenantId,
              read: false,
              data: {
                projectId: params.projectId,
                projectNumber: params.projectNumber,
                projectName: params.projectName,
                senderId: senderInfo.id,
                senderName: senderInfo.name,
                senderType: senderInfo.type,
                link: `/admin/projetos/${params.projectId}?tab=comments`,
                originalType: 'new_comment',
                isAdminNotification: true,
                commentText: params.commentText,
                commentFull: params.commentText,
                commentSnippet: params.commentText.substring(0, 150) + (params.commentText.length > 150 ? "..." : ""),
                authorId: params.authorId,
                authorName: params.authorName,
                isFromClient: true
              }
            }));

          if (notifications.length > 0) {
            const { data, error } = await supabase
              .from('notifications')
              .insert(notifications)
              .select('id');

            if (!error && data) {
              notificationIds = data.map(n => n.id);
            }
          }
        }
      }

      // E-mail para admins
      emailSent = await sendEmailNotification('client_comment', {
        commentText: params.commentText,
        clientName: params.clientName || params.authorName,
        authorName: params.authorName,
        projectName: params.projectName,
        projectNumber: params.projectNumber,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}?tab=comments`,
        projectId: params.projectId,
        authorId: params.authorId
      });
    }

    logger.info('[notifyNewComment] Resultado:', { notificationIds: notificationIds.length, emailSent });

    return { notificationIds, emailSent };
  } catch (error) {
    logger.error('[notifyNewComment] Erro:', error);
    return { notificationIds: [], emailSent: false };
  }
}

/**
 * ✅ NOVO SISTEMA DE NOTIFICAÇÕES
 * Notifica sobre novo documento (in-app + e-mail)
 * REGRAS:
 * - Admin envia: notifica cliente
 * - Cliente envia SEM responsável: notifica apenas admins + superadmin (NÃO colaboradores)
 * - Cliente envia COM responsável: notifica APENAS o responsável
 * - Outro admin envia: notifica responsável + cliente
 */
export async function notifyNewDocument(params: {
  projectId: string;
  projectNumber: string;
  projectName: string;
  documentName: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: string;
  clientId?: string;
  clientName?: string;
}): Promise<{ notificationIds: string[]; emailSent: boolean }> {
  try {
    logger.info('[notifyNewDocument] ✅ NOVO SISTEMA: Verificando responsável do projeto');

    const supabase = createSupabaseServiceRoleClient();

    // Buscar informações do projeto (tenant_id e responsável)
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('tenant_id, admin_responsible_id, created_by, owner_id')
      .eq('id', params.projectId)
      .single();

    if (projectError || !projectData) {
      logger.error('[notifyNewDocument] Erro ao buscar projeto:', projectError);
      return { notificationIds: [], emailSent: false };
    }

    const tenantId = projectData.tenant_id;
    const responsibleId = projectData.admin_responsible_id;
    // 🔧 CORREÇÃO: Usar owner_id se existir, senão usar created_by (retrocompatibilidade)
    const projectClientId = projectData.owner_id || projectData.created_by;
    const hasResponsible = !!responsibleId;

    const isAdminUpload = ['admin', 'superadmin', 'colaborador'].includes(params.uploaderRole);
    let notificationIds: string[] = [];
    let emailSent = false;

    logger.info(`[notifyNewDocument] Projeto ${hasResponsible ? 'TEM' : 'NÃO TEM'} responsável`, { responsibleId });

    if (isAdminUpload) {
      // ═══════════════════════════════════════════════════════════════
      // ADMIN/COLABORADOR FEZ UPLOAD
      // ═══════════════════════════════════════════════════════════════

      // Verificar se quem fez upload é o responsável ou outro admin
      const isResponsible = hasResponsible && params.uploaderId === responsibleId;

      if (isResponsible) {
        // RESPONSÁVEL fez upload → notificar APENAS cliente
        logger.info('[notifyNewDocument] Responsável fez upload → notificar apenas cliente');

        const clientResult = await createNotificationForProjectClient(
          params.projectId,
          params.projectNumber,
          'document_upload',
          `Novo documento: ${params.documentName}`,
          `${params.uploaderName} adicionou "${params.documentName}" ao projeto ${params.projectNumber}`,
          {
            documentName: params.documentName,
            uploaderId: params.uploaderId,
            uploaderName: params.uploaderName,
            isFromAdmin: true,
            link: `/cliente/projetos/${params.projectId}?tab=documents`
          }
        );

        if (clientResult.success && clientResult.id) {
          notificationIds.push(clientResult.id);
        }

        emailSent = await sendEmailNotification('admin_document', {
          clientId: projectClientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          documentName: params.documentName,
          projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}?tab=documents`,
          projectId: params.projectId
        });

      } else {
        // OUTRO admin fez upload → notificar responsável + cliente
        logger.info('[notifyNewDocument] Outro admin fez upload → notificar responsável + cliente');

        // Notificar cliente
        const clientResult = await createNotificationForProjectClient(
          params.projectId,
          params.projectNumber,
          'document_upload',
          `Novo documento: ${params.documentName}`,
          `${params.uploaderName} adicionou "${params.documentName}" ao projeto ${params.projectNumber}`,
          {
            documentName: params.documentName,
            uploaderId: params.uploaderId,
            uploaderName: params.uploaderName,
            isFromAdmin: true,
            link: `/cliente/projetos/${params.projectId}?tab=documents`
          }
        );

        if (clientResult.success && clientResult.id) {
          notificationIds.push(clientResult.id);
        }

        // Se tem responsável, notificá-lo também
        if (hasResponsible && responsibleId !== params.uploaderId) {
          const responsibleResult = await createNotification({
            type: 'document_upload',
            title: `Documento no seu projeto: ${params.projectName}`,
            message: `${params.uploaderName} adicionou "${params.documentName}" ao projeto ${params.projectNumber}`,
            userId: responsibleId,
            projectId: params.projectId,
            projectNumber: params.projectNumber,
            projectName: params.projectName,
            senderId: params.uploaderId,
            senderName: params.uploaderName,
            senderType: 'admin',
            link: `/admin/projetos/${params.projectId}?tab=documents`,
            data: {
              documentName: params.documentName,
              uploaderId: params.uploaderId,
              uploaderName: params.uploaderName,
              isCollaborationDocument: true
            }
          });

          if (responsibleResult.success && responsibleResult.id) {
            notificationIds.push(responsibleResult.id);
          }
        }

        emailSent = await sendEmailNotification('admin_document', {
          clientId: projectClientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          documentName: params.documentName,
          projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}?tab=documents`,
          projectId: params.projectId
        });
      }

    } else {
      // ═══════════════════════════════════════════════════════════════
      // CLIENTE FEZ UPLOAD
      // ═══════════════════════════════════════════════════════════════

      if (hasResponsible) {
        // TEM responsável → notificar APENAS o responsável
        logger.info('[notifyNewDocument] Cliente fez upload COM responsável → notificar apenas responsável');

        const responsibleResult = await createNotification({
          type: 'document_upload',
          title: `Novo documento do cliente: ${params.documentName}`,
          message: `${params.uploaderName} adicionou "${params.documentName}" ao projeto ${params.projectNumber}`,
          userId: responsibleId,
          projectId: params.projectId,
          projectNumber: params.projectNumber,
          projectName: params.projectName,
          senderId: params.uploaderId,
          senderName: params.uploaderName,
          senderType: 'client',
          link: `/admin/projetos/${params.projectId}?tab=documents`,
          data: {
            documentName: params.documentName,
            uploaderId: params.uploaderId,
            uploaderName: params.uploaderName,
            isFromClient: true
          }
        });

        if (responsibleResult.success && responsibleResult.id) {
          notificationIds.push(responsibleResult.id);
        }

      } else {
        // NÃO tem responsável → notificar apenas admins + superadmin (NÃO colaboradores)
        logger.info('[notifyNewDocument] Cliente fez upload SEM responsável → notificar apenas admins + superadmin');

        const { getAdminsAndSuperadminsByTenant } = await import('@/lib/services/userService/core');
        const allAdmins = await getAdminsAndSuperadminsByTenant(tenantId);

        if (allAdmins.length > 0) {
          const senderInfo = await getOrCreateSenderInfo(params.uploaderId, params.uploaderName, 'client');
          const mappedType = { type: 'info', category: 'project' };

          const notifications = allAdmins
            .filter(admin => admin.uid !== params.uploaderId)
            .map(admin => ({
              type: mappedType.type,
              category: mappedType.category,
              priority: 'normal',
              title: `Novo documento do cliente: ${params.documentName}`,
              message: `${params.uploaderName} adicionou "${params.documentName}" ao projeto ${params.projectNumber}`,
              user_id: admin.uid,
              tenant_id: tenantId,
              read: false,
              data: {
                projectId: params.projectId,
                projectNumber: params.projectNumber,
                projectName: params.projectName,
                senderId: senderInfo.id,
                senderName: senderInfo.name,
                senderType: senderInfo.type,
                link: `/admin/projetos/${params.projectId}?tab=documents`,
                originalType: 'document_upload',
                isAdminNotification: true,
                documentName: params.documentName,
                uploaderId: params.uploaderId,
                uploaderName: params.uploaderName,
                isFromClient: true
              }
            }));

          if (notifications.length > 0) {
            const { data, error } = await supabase
              .from('notifications')
              .insert(notifications)
              .select('id');

            if (!error && data) {
              notificationIds = data.map(n => n.id);
            }
          }
        }
      }

      // E-mail para admins
      emailSent = await sendEmailNotification('client_document', {
        documentName: params.documentName,
        clientName: params.clientName || params.uploaderName,
        projectName: params.projectName,
        projectNumber: params.projectNumber,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}?tab=documents`,
        projectId: params.projectId
      });
    }

    logger.info('[notifyNewDocument] Resultado:', { notificationIds: notificationIds.length, emailSent });

    return { notificationIds, emailSent };
  } catch (error) {
    logger.error('[notifyNewDocument] Erro:', error);
    return { notificationIds: [], emailSent: false };
  }
}

/**
 * ✅ NOVA FUNÇÃO: Notifica sobre mudança de status (in-app + e-mail)
 * IMPORTANTE: Os parâmetros oldStatus e newStatus devem ser SLUGS
 * Esta função busca os nomes reais (name) da tabela project_statuses
 */
export async function notifyStatusChange(params: {
  projectId: string;
  projectNumber: string;
  projectName: string;
  oldStatus: string;  // SLUG do status antigo
  newStatus: string;  // SLUG do status novo
  clientId: string;
  adminId?: string;
  adminName?: string;
}): Promise<{ notificationIds: string[]; emailSent: boolean }> {
  try {
    logger.info('[notifyStatusChange] Notificando mudança de status:', params.projectId);

    // ✅ CORREÇÃO: Buscar nomes reais dos status do tenant ao invés de usar mapa estático
    const supabase = createSupabaseServiceRoleClient();

    // Buscar tenant_id do projeto
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('tenant_id')
      .eq('id', params.projectId)
      .single();

    if (projectError || !projectData?.tenant_id) {
      logger.error('[notifyStatusChange] Erro ao buscar tenant do projeto:', projectError);
      // Fallback para mapa estático em caso de erro
      const oldStatusName = getStatusDisplayName(params.oldStatus);
      const newStatusName = getStatusDisplayName(params.newStatus);

      const clientResult = await createNotificationForProjectClient(
        params.projectId,
        params.projectNumber,
        'status_change',
        `Status atualizado: ${newStatusName}`,
        `O projeto ${params.projectNumber} mudou de "${oldStatusName}" para "${newStatusName}"`,
        {
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
          updatedBy: params.adminName || 'Administração',
          link: `/cliente/projetos/${params.projectId}`
        }
      );

      const notificationIds = clientResult.success && clientResult.id ? [clientResult.id] : [];
      const emailSent = await sendEmailNotification('status_change', {
        clientId: params.clientId,
        projectName: params.projectName,
        projectNumber: params.projectNumber,
        oldStatus: oldStatusName,
        newStatus: newStatusName,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}`,
        projectId: params.projectId
      });

      return { notificationIds, emailSent };
    }

    // Buscar os status reais do tenant
    const { data: statusesData } = await supabase
      .from('project_statuses')
      .select('slug, name')
      .eq('tenant_id', projectData.tenant_id)
      .in('slug', [params.oldStatus, params.newStatus]);

    // Mapear slugs para nomes
    const oldStatusObj = statusesData?.find(s => s.slug === params.oldStatus);
    const newStatusObj = statusesData?.find(s => s.slug === params.newStatus);

    const oldStatusName = oldStatusObj?.name || getStatusDisplayName(params.oldStatus);
    const newStatusName = newStatusObj?.name || getStatusDisplayName(params.newStatus);

    logger.info('[notifyStatusChange] Status mapeados:', {
      oldSlug: params.oldStatus,
      oldName: oldStatusName,
      newSlug: params.newStatus,
      newName: newStatusName
    });

    // 1. Criar notificação in-app para o cliente
    const clientResult = await createNotificationForProjectClient(
      params.projectId,
      params.projectNumber,
      'status_change',
      `Status atualizado: ${newStatusName}`,
      `O projeto ${params.projectNumber} mudou de "${oldStatusName}" para "${newStatusName}"`,
      {
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        oldStatusName,
        newStatusName,
        updatedBy: params.adminName || 'Administração',
        link: `/cliente/projetos/${params.projectId}` // ✅ URL correta para cliente
      }
    );

    const notificationIds = clientResult.success && clientResult.id ? [clientResult.id] : [];

    // 2. Enviar e-mail para o cliente com nomes reais
    const emailSent = await sendEmailNotification('status_change', {
      clientId: params.clientId,
      projectName: params.projectName,
      projectNumber: params.projectNumber,
      oldStatus: oldStatusName,  // ✅ Nome real do status
      newStatus: newStatusName,  // ✅ Nome real do status
      projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}`,
      projectId: params.projectId  // ✅ ADICIONADO COOLDOWN
    });

    logger.info('[notifyStatusChange] Resultado:', { notificationIds: notificationIds.length, emailSent });

    return { notificationIds, emailSent };
  } catch (error) {
    logger.error('[notifyStatusChange] Erro:', error);
    return { notificationIds: [], emailSent: false };
  }
}

/**
 * Função para notificações projeto atualizadas (depreciada - usar funções específicas)
 * @deprecated Use as funções específicas: notifyNewProject, notifyNewComment, notifyNewDocument, notifyStatusChange
 */
export async function notifyProjectUpdate(
  projectId: string,
  projectNumber: string,
  adminTitle: string,
  adminMessage: string,
  clientTitle: string,
  clientMessage: string,
  type: string,
  data: Record<string, any> = {},
  excludeAdminId?: string
): Promise<BatchNotificationResult> {
  try {
    logger.warn('[notifyProjectUpdate] DEPRECATED - Use funções específicas');
    
    // 1. Criar notificações para administradores
    const adminIds = await createNotificationForAllAdmins({
      type: type as any,
      title: adminTitle,
      message: adminMessage,
      projectId,
      projectNumber,
      data: {
        ...data,
        notificationType: 'admin_notification',
        adminNotification: true
      }
    });
    
    // 2. Criar notificação para o cliente
    const clientResult = await createNotificationForProjectClient(
      projectId,
      projectNumber,
      type,
      clientTitle,
      clientMessage,
      data
    );
    
    const clientId = clientResult.success ? clientResult.id || null : null;
    
    return { adminIds, clientId };
  } catch (error: any) {
    logger.error('[notifyProjectUpdate] Erro:', error);
    return { adminIds: [], clientId: null };
  }
} 