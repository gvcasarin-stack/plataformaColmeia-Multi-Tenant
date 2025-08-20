// ❌ FIREBASE - COMENTADO PARA RESOLVER ERRO DE BUILD
// import { db, auth } from '@/lib/firebase/index';
// import { doc, getDoc } from 'firebase/firestore';

// ✅ SUPABASE - TODO: Implementar notificações com Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

import { NotificationType, NotificationResult, BatchNotificationResult } from './types';
import { createNotification, createNotificationForAllAdmins } from './core';
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger';

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
          projectUrl: params.projectUrl
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
          projectId: params.projectId
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
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
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
      .select('id, name, created_by')
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
    
    const clientId = project.created_by;
    if (!clientId) {
      devLog.error('🔍 [URGENT DEBUG createNotificationForProjectClient] ERRO: Projeto sem cliente!');
      logger.error('[createNotificationForProjectClient] Projeto sem cliente:', { projectId });
      return { success: false, error: 'Projeto sem cliente associado' };
    }
    
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Cliente identificado:', clientId);
    logger.info('[createNotificationForProjectClient] Criando notificação para cliente:', { clientId });
    
    // 2. Criar notificação usando função do core
    devLog.log('🔍 [URGENT DEBUG createNotificationForProjectClient] Chamando createNotification...');
    const result = await createNotification({
      type: type as any, // ✅ TEMPORÁRIO: usar any para resolver conflito de tipos
      title,
      message,
      userId: clientId,
      projectId,
      data: {
        ...data,
        projectNumber,
        notificationType: 'client_notification',
        clientNotification: true
      }
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
 * ✅ NOVA FUNÇÃO: Notifica sobre novo projeto (in-app + e-mail)
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
    logger.info('[notifyNewProject] Notificando novo projeto:', params.projectId);
    
    // 1. Criar notificação in-app para todos os admins
    const notificationIds = await createNotificationForAllAdmins({
      type: 'new_project',
      title: `Novo projeto: ${params.projectName}`,
      message: `${params.clientName} criou o projeto "${params.projectName}" (${params.projectNumber})`,
      projectId: params.projectId,
      projectNumber: params.projectNumber,
      projectName: params.projectName,
      senderId: params.senderId || params.clientId,
      senderName: params.senderName || params.clientName,
      senderType: 'client',
      link: `/admin/projetos/${params.projectId}`,
      data: {
        clientName: params.clientName,
        clientId: params.clientId,
        potencia: params.potencia,
        distribuidora: params.distribuidora
      }
    });
    
    // 2. Enviar e-mail para admins
    const emailSent = await sendEmailNotification('new_project', {
      ...params,
      projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}`
    });
    
    logger.info('[notifyNewProject] Resultado:', { notificationIds: notificationIds.length, emailSent });
    
    return { notificationIds, emailSent };
  } catch (error) {
    logger.error('[notifyNewProject] Erro:', error);
    return { notificationIds: [], emailSent: false };
  }
}

/**
 * ✅ NOVA FUNÇÃO: Notifica sobre novo comentário (in-app + e-mail)
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
    // 🔍 DEBUG CRÍTICO: Log entrada da função
    // Logs removidos por questões de segurança em produção
    
    logger.info('[notifyNewComment] Notificando novo comentário:', params.projectId);
    
    const isAdminComment = ['admin', 'superadmin'].includes(params.authorRole);
    let notificationIds: string[] = [];
    let emailSent = false;
    
    if (isAdminComment) {
      // Admin comentou - notificar cliente
      if (params.clientId) {
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
            isFromAdmin: true
          }
        );
        
        if (clientResult.success && clientResult.id) {
          notificationIds.push(clientResult.id);
        }
        
        // Logs removidos por questões de segurança em produção
        
        // Enviar e-mail para cliente
        emailSent = await sendEmailNotification('admin_comment', {
          clientId: params.clientId,
          projectName: params.projectName,
          projectNumber: params.projectNumber,
          authorName: params.authorName,
          commentText: params.commentText,
          projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}?tab=comments`,
          projectId: params.projectId
        });
      }
    } else {
      // Cliente comentou - notificar admins
      const adminIds = await createNotificationForAllAdmins({
        type: 'new_comment',
        title: `Novo comentário do cliente: ${params.projectName}`,
        message: `${params.authorName} comentou no projeto ${params.projectNumber}: "${params.commentText.substring(0, 50)}..."`,
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
      
      notificationIds = adminIds;
      
      // Logs removidos por questões de segurança em produção
      
      // Enviar e-mail para admins
      emailSent = await sendEmailNotification('client_comment', {
        commentText: params.commentText,
        clientName: params.clientName || params.authorName,
        authorName: params.authorName,
        projectName: params.projectName,
        projectNumber: params.projectNumber,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}?tab=comments`,
        projectId: params.projectId
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
 * ✅ NOVA FUNÇÃO: Notifica sobre novo documento (in-app + e-mail)
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
    logger.info('[notifyNewDocument] Notificando novo documento:', params.projectId);
    
    // 🔍 DEBUG DETALHADO: Log dos parâmetros recebidos
    devLog.log('🔍 [DEBUG notifyNewDocument] Parâmetros recebidos:', {
      projectId: params.projectId,
      documentName: params.documentName,
      uploaderId: params.uploaderId,
      uploaderName: params.uploaderName,
      uploaderRole: params.uploaderRole,
      clientId: params.clientId,
      clientName: params.clientName,
      hasClientId: !!params.clientId
    });
    
    const isAdminUpload = ['admin', 'superadmin'].includes(params.uploaderRole);
    let notificationIds: string[] = [];
    let emailSent = false;
    
    // 🔍 DEBUG: Log da decisão de fluxo
    devLog.log('🔍 [DEBUG notifyNewDocument] Decisão de fluxo:', {
      uploaderRole: params.uploaderRole,
      isAdminUpload,
      hasClientId: !!params.clientId,
      willNotifyClient: isAdminUpload && !!params.clientId,
      willNotifyAdmins: !isAdminUpload
    });
    
    if (isAdminUpload) {
      // Admin fez upload - notificar cliente
      if (params.clientId) {
        devLog.log('🔍 [DEBUG notifyNewDocument] FLUXO: Admin fez upload → Notificando cliente:', params.clientId);
        
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
            isFromAdmin: true
          }
        );
        
        if (clientResult.success && clientResult.id) {
          notificationIds.push(clientResult.id);
        }
        
              // Enviar e-mail para cliente
      devLog.log('🔍 [DEBUG notifyNewDocument] Enviando email para cliente...');
      emailSent = await sendEmailNotification('admin_document', {
        clientId: params.clientId,
        projectName: params.projectName,
        projectNumber: params.projectNumber,
        documentName: params.documentName,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/projetos/${params.projectId}?tab=documents`,
        projectId: params.projectId  // ✅ ADICIONADO COOLDOWN
      });
        devLog.log('🔍 [DEBUG notifyNewDocument] Email para cliente enviado:', emailSent);
      } else {
        devLog.log('🔍 [DEBUG notifyNewDocument] ERRO: Admin fez upload mas não tem clientId!');
      }
    } else {
      // Cliente fez upload - notificar admins
      devLog.log('🔍 [DEBUG notifyNewDocument] FLUXO: Cliente fez upload → Notificando admins');
      
      const adminIds = await createNotificationForAllAdmins({
        type: 'document_upload',
        title: `Novo documento do cliente: ${params.documentName}`,
        message: `${params.uploaderName} adicionou "${params.documentName}" ao projeto ${params.projectNumber}`,
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
      
      notificationIds = adminIds;
      
      // Enviar e-mail para admins
      devLog.log('🔍 [DEBUG notifyNewDocument] Enviando email para admins...');
      emailSent = await sendEmailNotification('client_document', {
        documentName: params.documentName,
        clientName: params.clientName || params.uploaderName,
        projectName: params.projectName,
        projectNumber: params.projectNumber,
        projectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${params.projectId}?tab=documents`,
        projectId: params.projectId  // ✅ ADICIONADO COOLDOWN
      });
      devLog.log('🔍 [DEBUG notifyNewDocument] Email para admins enviado:', emailSent);
    }
    
    devLog.log('🔍 [DEBUG notifyNewDocument] Resultado final:', { 
      notificationIds: notificationIds.length, 
      emailSent,
      isAdminUpload,
      clientId: params.clientId
    });
    
    logger.info('[notifyNewDocument] Resultado:', { notificationIds: notificationIds.length, emailSent });
    
    return { notificationIds, emailSent };
  } catch (error) {
    logger.error('[notifyNewDocument] Erro:', error);
    return { notificationIds: [], emailSent: false };
  }
}

/**
 * ✅ NOVA FUNÇÃO: Notifica sobre mudança de status (in-app + e-mail)
 */
export async function notifyStatusChange(params: {
  projectId: string;
  projectNumber: string;
  projectName: string;
  oldStatus: string;
  newStatus: string;
  clientId: string;
  adminId?: string;
  adminName?: string;
}): Promise<{ notificationIds: string[]; emailSent: boolean }> {
  try {
    logger.info('[notifyStatusChange] Notificando mudança de status:', params.projectId);
    
    // 1. Criar notificação in-app para o cliente
    const clientResult = await createNotificationForProjectClient(
      params.projectId,
      params.projectNumber,
      'status_change',
      `Status atualizado: ${params.newStatus}`,
      `O projeto ${params.projectNumber} mudou de "${params.oldStatus}" para "${params.newStatus}"`,
      {
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
        updatedBy: params.adminName || 'Administração'
      }
    );
    
    const notificationIds = clientResult.success && clientResult.id ? [clientResult.id] : [];
    
    // 2. Enviar e-mail para o cliente
    const emailSent = await sendEmailNotification('status_change', {
      clientId: params.clientId,
      projectName: params.projectName,
      projectNumber: params.projectNumber,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
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