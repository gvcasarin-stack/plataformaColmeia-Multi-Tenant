// ✅ SUPABASE - Core de notificações migrado para Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { getUserById, getAllAdminUsers } from '@/lib/services/userService/core';

import { CreateNotificationParams, NotificationResult, BatchNotificationResult } from './types';
import logger from '@/lib/utils/logger';

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

    const notificationToInsert = {
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user_id: notificationData.userId,
      project_id: notificationData.projectId || null,
      project_number: notificationData.projectNumber || null,
      read: false,
      data: {
        ...notificationData.data,
        senderId: senderInfo.id,
        senderName: senderInfo.name,
        senderType: senderInfo.type,
        link: notificationData.link,
        projectName: notificationData.projectName
      }
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationToInsert])
      .select()
      .single();

    if (error) {
      logger.error('[createNotificationDirectly] Erro ao criar notificação:', error);
      return { success: false, error: error.message };
    }

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
    logger.info('[createNotification] Processando notificação:', notificationData.type);
    
    // Se userId for 'all_admins', criar para todos os admins
    if (notificationData.userId === 'all_admins') {
      const adminIds = await createNotificationForAllAdmins({
        ...notificationData,
        userId: undefined as any // Remove userId temporariamente
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
    
    // Buscar todos os administradores
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);

    if (adminError) {
      logger.error('[createNotificationForAllAdmins] Erro ao buscar admins:', adminError);
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

    // Criar notificações para cada admin
    const notifications = adminUsers.map(admin => ({
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      user_id: admin.id,
      project_id: notificationData.projectId || null,
      project_number: notificationData.projectNumber || null,
      read: false,
      data: {
        ...notificationData.data,
        senderId: senderInfo.id,
        senderName: senderInfo.name,
        senderType: senderInfo.type,
        link: notificationData.link,
        projectName: notificationData.projectName,
        isAdminNotification: true
      }
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (error) {
      logger.error('[createNotificationForAllAdmins] Erro ao criar notificações:', error);
      return [];
    }

    const ids = data?.map(n => n.id) || [];
    logger.info('[createNotificationForAllAdmins] Notificações criadas:', ids.length);
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
        name: user.name || user.displayName || 'Usuário',
        type: ['admin', 'superadmin'].includes(user.role) ? 'admin' : 'client'
      };
    }

    // Fallback para system
    logger.warn('[getOrCreateSenderInfo] Usuário não encontrado, usando system:', senderId);
    return { id: 'system', name: 'Sistema', type: 'system' };
    
  } catch (error) {
    logger.error('[getOrCreateSenderInfo] Error:', error);
    return { id: 'system', name: 'Sistema', type: 'system' };
  }
} 