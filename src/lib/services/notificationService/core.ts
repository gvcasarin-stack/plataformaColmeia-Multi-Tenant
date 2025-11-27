// ✅ SUPABASE - Core de notificações migrado para Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { getUserById, getAllAdminUsers, getAllAdminUsersByTenant } from '@/lib/services/userService/core';

import { CreateNotificationParams, NotificationResult, BatchNotificationResult } from './types';
import logger from '@/lib/utils/logger';
import { devLog } from '@/lib/utils/productionLogger'; // ✅ CORRIGIDO: Import adicionado para usar nos logs de debug

/**
 * ✅ MIGRADO PARA SUPABASE
 * Todas as funções agora usam Supabase ao invés de Firebase
 */

/**
 * Cria uma notificação diretamente no Supabase
 */
export async function createNotificationDirectly(
  notificationData: CreateNotificationParams
): Promise<NotificationResult> {
  try {
    logger.info('[createNotificationDirectly] Criando notificação no Supabase:', {
      type: notificationData.type,
      userId: notificationData.userId,
      projectId: notificationData.projectId
    });

    const supabase = createSupabaseServiceRoleClient();
    
    // Obter informações do remetente se não fornecidas
    const senderInfo = await getOrCreateSenderInfo(
      notificationData.senderId || 'system',
      notificationData.senderName,
      notificationData.senderType
    );

    // Mapear tipos de notificação para os tipos válidos da constraint
    const typeMapping: Record<string, { type: string; category: string }> = {
      'new_project': { type: 'info', category: 'project' },
      'new_comment': { type: 'info', category: 'project' },
      'document_upload': { type: 'info', category: 'project' },
      'status_change': { type: 'success', category: 'project' },
      'system_message': { type: 'info', category: 'system' },
      'test_smart_analysis': { type: 'info', category: 'system' },
      'info': { type: 'info', category: 'system' },
      'success': { type: 'success', category: 'system' },
      'warning': { type: 'warning', category: 'system' },
      'error': { type: 'error', category: 'system' }
    };
    
    const mappedType = typeMapping[notificationData.type] || { type: 'info', category: 'system' };
    
    // Buscar tenant_id do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', notificationData.userId)
      .single();
    
    if (userError || !userData?.tenant_id) {
      devLog.log('❌ [DEBUG-NOTIFICATION] ERRO ao buscar tenant_id:', {
        userId: notificationData.userId,
        userError: userError?.message,
        userData,
        hasTenantId: !!userData?.tenant_id
      });
      logger.error('[createNotificationDirectly] Erro ao obter tenant_id do usuário:', userError);
      return {
        success: false,
        error: 'Usuário não encontrado ou sem tenant_id'
      };
    }
    
    devLog.log('✅ [DEBUG-NOTIFICATION] Tenant_id obtido:', {
      userId: notificationData.userId,
      tenantId: userData.tenant_id
    });

    const notificationToInsert = {
      type: mappedType.type,
      category: mappedType.category,
      priority: 'normal',
      title: notificationData.title,
      message: notificationData.message,
      user_id: notificationData.userId,
      tenant_id: userData.tenant_id,
      read: false,
      data: {
        ...notificationData.data,
        // Armazenar dados do projeto no campo data (JSONB)
        projectId: notificationData.projectId,
        projectNumber: notificationData.projectNumber,
        projectName: notificationData.projectName,
        // Dados do remetente
        senderId: senderInfo.id,
        senderName: senderInfo.name,
        senderType: senderInfo.type,
        link: notificationData.link,
        // Tipo original para referência
        originalType: notificationData.type
      }
    };

    devLog.log('🔍 [DEBUG-NOTIFICATION] Tentando inserir notificação:', {
      type: notificationToInsert.type,
      category: notificationToInsert.category,
      userId: notificationToInsert.user_id,
      tenantId: notificationToInsert.tenant_id,
      title: notificationToInsert.title
    });
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationToInsert])
      .select()
      .single();

    if (error) {
      devLog.log('❌ [DEBUG-NOTIFICATION] ERRO ao inserir notificação:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        notificationData: notificationToInsert
      });
      logger.error('[createNotificationDirectly] Erro ao criar notificação:', error);
      return { success: false, error: error.message };
    }
    
    devLog.log('✅ [DEBUG-NOTIFICATION] Notificação criada com sucesso:', {
      id: data.id,
      type: data.type,
      category: data.category,
      userId: data.user_id,
      tenantId: data.tenant_id
    });

    logger.info('[createNotificationDirectly] Notificação criada com sucesso:', data.id);
    return { success: true, id: data.id };
    
  } catch (error) {
    logger.error('[createNotificationDirectly] Erro:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Função principal para criar notificações
 */
export async function createNotification(
  notificationData: CreateNotificationParams
): Promise<NotificationResult> {
  try {
    logger.info('[createNotification] Processando notificação:', { type: notificationData.type });
    
    // Se userId for 'all_admins', criar para todos os admins
    if (notificationData.userId === 'all_admins') {
      const adminIds = await createNotificationForAllAdmins({
        ...notificationData,
        // Remove userId para a função createNotificationForAllAdmins
      });
      return { success: true, id: adminIds.join(',') };
    }
    
    // Criar notificação individual
    return await createNotificationDirectly(notificationData);
    
  } catch (error) {
    logger.error('[createNotification] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Cria notificação para todos os administradores
 */
export async function createNotificationForAllAdmins(
  notificationData: Omit<CreateNotificationParams, 'userId'>
): Promise<string[]> {
  try {
    logger.info('[createNotificationForAllAdmins] Criando notificações para todos os admins');
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Primeiro, obter o tenant_id do projeto ou do remetente
    let tenantId: string | null = null;
    
    if (notificationData.projectId) {
      // Se tem projeto, pegar o tenant_id do projeto
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('tenant_id')
        .eq('id', notificationData.projectId)
        .single();
        
      if (!projectError && projectData) {
        tenantId = projectData.tenant_id;
        logger.info('[createNotificationForAllAdmins] Tenant obtido do projeto:', { tenantId });
      }
    }
    
    if (!tenantId && notificationData.senderId && notificationData.senderId !== 'system') {
      // Se não tem tenant do projeto, pegar do remetente
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', notificationData.senderId)
        .single();
        
      if (!userError && userData) {
        tenantId = userData.tenant_id;
        logger.info('[createNotificationForAllAdmins] Tenant obtido do remetente:', { tenantId });
      }
    }
    
    // Buscar administradores - filtrar por tenant se disponível
    let adminUsers: any[] = [];
    
    if (tenantId) {
      // USAR NOVA FUNÇÃO COM FILTRO POR TENANT
      const adminUsersWithTenant = await getAllAdminUsersByTenant(tenantId);
      adminUsers = adminUsersWithTenant.map(u => ({ id: u.uid }));
      logger.info('[createNotificationForAllAdmins] Admins encontrados para tenant:', { adminCount: adminUsers.length, tenantId });
    } else {
      // ✅ CORREÇÃO MULTI-TENANT: Remover fallback perigoso que viola isolamento
      logger.error('[createNotificationForAllAdmins] ERRO CRÍTICO: tenant_id é obrigatório para proteger isolamento entre organizações. Cancelando criação de notificações.');
      return [];
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('[createNotificationForAllAdmins] Nenhum admin encontrado');
      return [];
    }

    // Obter informações do remetente
    const senderInfo = await getOrCreateSenderInfo(
      notificationData.senderId || 'system',
      notificationData.senderName,
      notificationData.senderType
    );

    // Mapear tipos de notificação para os tipos válidos da constraint
    const typeMapping: Record<string, { type: string; category: string }> = {
      'new_project': { type: 'info', category: 'project' },
      'new_comment': { type: 'info', category: 'project' },
      'document_upload': { type: 'info', category: 'project' },
      'status_change': { type: 'success', category: 'project' },
      'system_message': { type: 'info', category: 'system' },
      'test_smart_analysis': { type: 'info', category: 'system' },
      'info': { type: 'info', category: 'system' },
      'success': { type: 'success', category: 'system' },
      'warning': { type: 'warning', category: 'system' },
      'error': { type: 'error', category: 'system' }
    };
    
    const mappedType = typeMapping[notificationData.type] || { type: 'info', category: 'system' };

    // ✅ CORREÇÃO: Filtrar o autor para não notificar ele mesmo
    const adminsToNotify = adminUsers.filter(admin => {
      // Se há senderId, excluir o autor da notificação
      if (notificationData.senderId && notificationData.senderId !== 'system') {
        return admin.id !== notificationData.senderId;
      }
      return true; // Se não há senderId, notificar todos
    });

    logger.info('[createNotificationForAllAdmins] Admins após filtrar autor:', {
      totalAdmins: adminUsers.length,
      adminsToNotify: adminsToNotify.length,
      senderId: notificationData.senderId,
      filtered: adminUsers.length - adminsToNotify.length
    });

    // Criar notificações para cada admin (exceto o autor)
    const notifications = adminsToNotify.map(admin => ({
      type: mappedType.type,
      category: mappedType.category,
      priority: 'normal',
      title: notificationData.title,
      message: notificationData.message,
      user_id: admin.id,
      tenant_id: tenantId,
      read: false,
      data: {
        ...notificationData.data,
        // Armazenar dados do projeto no campo data (JSONB)
        projectId: notificationData.projectId,
        projectNumber: notificationData.projectNumber,
        projectName: notificationData.projectName,
        // Dados do remetente
        senderId: senderInfo.id,
        senderName: senderInfo.name,
        senderType: senderInfo.type,
        link: notificationData.link,
        // Tipo original para referência
        originalType: notificationData.type,
        isAdminNotification: true
      }
    }));

    devLog.log('🔍 [DEBUG-ADMIN-NOTIFICATION] Tentando inserir notificações para admins:', {
      count: notifications.length,
      tenantId,
      firstNotification: notifications[0]
    });
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (error) {
      devLog.log('❌ [DEBUG-ADMIN-NOTIFICATION] ERRO ao inserir notificações:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        notificationsData: notifications
      });
      logger.error('[createNotificationForAllAdmins] Erro ao criar notificações:', error);
      return [];
    }
    
    devLog.log('✅ [DEBUG-ADMIN-NOTIFICATION] Notificações criadas com sucesso:', {
      count: data?.length || 0,
      ids: data?.map(n => n.id) || []
    });

    const ids = data?.map(n => n.id) || [];
    logger.info('[createNotificationForAllAdmins] Notificações criadas:', { count: ids.length });
    return ids;
    
  } catch (error) {
    logger.error('[createNotificationForAllAdmins] Error:', error);
    return [];
  }
}

/**
 * Obtém informações do remetente
 */
export async function getOrCreateSenderInfo(
  senderId: string,
  senderName?: string,
  senderType?: 'admin' | 'client' | 'system'
): Promise<{ id: string; name: string; type: 'admin' | 'client' | 'system' }> {
  try {
    // Se for system, retornar imediatamente
    if (senderId === 'system') {
      return { id: 'system', name: senderName || 'Sistema', type: 'system' };
    }

    // Se já temos todas as informações, usar elas
    if (senderName && senderType) {
      return { id: senderId, name: senderName, type: senderType };
    }

    // Buscar informações do usuário
    const user = await getUserById(senderId);
    if (user) {
      return {
        id: senderId,
        name: user.name || 'Usuário',
        type: ['admin', 'superadmin'].includes(user.role) ? 'admin' : 'client'
      };
    }

    // Fallback para system
    logger.warn('[getOrCreateSenderInfo] Usuário não encontrado, usando system:', { senderId });
    return { id: 'system', name: 'Sistema', type: 'system' };
    
  } catch (error) {
    logger.error('[getOrCreateSenderInfo] Error:', error);
    return { id: 'system', name: 'Sistema', type: 'system' };
  }
} 