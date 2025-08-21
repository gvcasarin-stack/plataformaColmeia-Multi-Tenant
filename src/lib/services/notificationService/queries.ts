// ✅ SUPABASE - Queries de notificações totalmente migradas
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

import { NotificacaoPadronizada } from './types';
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger';

/**
 * ✅ MIGRADO PARA SUPABASE
 * Todas as funções agora usam Supabase ao invés de Firebase
 */

/**
 * Interface para notificação do Supabase (estrutura da tabela)
 */
interface SupabaseNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  user_id: string;
  project_id?: string;
  project_number?: string;
  read: boolean;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Converte notificação do Supabase para o formato padronizado
 */
function convertSupabaseToStandardFormat(notification: SupabaseNotification): NotificacaoPadronizada {
  // ✅ CORREÇÃO REACT #130: Usar strings ISO ao invés de objetos Date
  const sanitizeDate = (dateField: any): string => {
    if (!dateField) return new Date().toISOString();
    if (typeof dateField === 'string') return new Date(dateField).toISOString();
    if (dateField instanceof Date) return dateField.toISOString();
    return new Date(dateField).toISOString();
  };

  return {
    id: notification.id,
    type: notification.type as any,
    title: notification.title,
    message: notification.message,
    createdAt: sanitizeDate(notification.created_at),
    updatedAt: notification.updated_at ? sanitizeDate(notification.updated_at) : undefined,
    read: notification.read,
    
    // Informações do remetente (extraídas dos dados)
    senderId: notification.data?.senderId || 'system',
    senderName: notification.data?.senderName || 'Sistema',
    senderType: notification.data?.senderType || 'system',
    
    // Destinatário
    userId: notification.user_id,
    isAdminNotification: notification.data?.isAdminNotification || false,
    
    // Referências
    projectId: notification.project_id || undefined,
    projectNumber: notification.project_number || undefined,
    projectName: notification.data?.projectName || undefined,
    link: notification.data?.link || undefined,
    
    // Dados específicos
    data: notification.data || {}
  };
}

/**
 * Busca notificações de um usuário específico
 */
export async function getUserNotifications(
  userId: string, 
  limitCount: number = 20
): Promise<NotificacaoPadronizada[]> {
  try {
    devLog.log('🔍 [URGENT DEBUG getUserNotifications] INÍCIO:', { userId, limitCount });
    logger.info('[getUserNotifications] Buscando notificações do usuário:', { userId, limit: limitCount });
    
    const supabase = createSupabaseServiceRoleClient();
    
    devLog.log('🔍 [URGENT DEBUG getUserNotifications] Executando query no Supabase...');
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limitCount);
    
    devLog.log('🔍 [URGENT DEBUG getUserNotifications] Resultado da query:', {
      dataExists: !!data,
      dataCount: data?.length || 0,
      error: error?.message,
      rawData: data?.slice(0, 2) // Primeiras 2 notificações para debug
    });
    
    if (error) {
      devLog.error('🔍 [URGENT DEBUG getUserNotifications] ERRO na query:', error);
      logger.error('[getUserNotifications] Erro ao buscar notificações:', error);
      return [];
    }
    
    devLog.log('🔍 [URGENT DEBUG getUserNotifications] Convertendo notificações...');
    const notifications = data?.map(convertSupabaseToStandardFormat) || [];
    
    devLog.log('🔍 [URGENT DEBUG getUserNotifications] Notificações convertidas:', {
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length,
      firstNotification: notifications[0] // Primeira notificação convertida
    });
    
    logger.info('[getUserNotifications] Notificações encontradas:', { 
      userId, 
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });
    
    return notifications;
  } catch (error) {
    devLog.error('🔍 [URGENT DEBUG getUserNotifications] EXCEPTION:', error);
    logger.error('[getUserNotifications] Erro:', error);
    return [];
  }
}

/**
 * Busca notificações para todos os administradores
 */
export async function getAdminNotifications(limitCount: number = 50): Promise<NotificacaoPadronizada[]> {
  try {
    logger.info('[getAdminNotifications] Buscando notificações de admins');
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar todos os usuários admin
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);
    
    if (adminError) {
      logger.error('[getAdminNotifications] Erro ao buscar admins:', adminError);
      return [];
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('[getAdminNotifications] Nenhum admin encontrado');
      return [];
    }
    
    const adminIds = adminUsers.map(user => user.id);
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('user_id', adminIds)
      .order('created_at', { ascending: false })
      .limit(limitCount);
    
    if (error) {
      logger.error('[getAdminNotifications] Erro ao buscar notificações:', error);
      return [];
    }
    
    const notifications = data?.map(convertSupabaseToStandardFormat) || [];
    
    logger.info('[getAdminNotifications] Notificações de admins encontradas:', notifications.length);
    
    return notifications;
  } catch (error) {
    logger.error('[getAdminNotifications] Erro:', error);
    return [];
  }
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    logger.info('[markNotificationAsRead] Marcando notificação como lida:', notificationId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
    
    if (error) {
      logger.error('[markNotificationAsRead] Erro ao marcar como lida:', error);
      return false;
    }
    
    logger.info('[markNotificationAsRead] Notificação marcada como lida:', notificationId);
    return true;
  } catch (error) {
    logger.error('[markNotificationAsRead] Erro:', error);
    return false;
  }
}

/**
 * Marca todas as notificações de um usuário como lidas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    logger.info('[markAllNotificationsAsRead] Marcando todas as notificações como lidas:', userId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (error) {
      logger.error('[markAllNotificationsAsRead] Erro ao marcar todas como lidas:', error);
      return false;
    }
    
    logger.info('[markAllNotificationsAsRead] Todas as notificações marcadas como lidas:', userId);
    return true;
  } catch (error) {
    logger.error('[markAllNotificationsAsRead] Erro:', error);
    return false;
  }
}

/**
 * Remove uma notificação
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    logger.info('[deleteNotification] Removendo notificação:', notificationId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    if (error) {
      logger.error('[deleteNotification] Erro ao remover notificação:', error);
      return false;
    }
    
    logger.info('[deleteNotification] Notificação removida:', notificationId);
    return true;
  } catch (error) {
    logger.error('[deleteNotification] Erro:', error);
    return false;
  }
}

/**
 * Conta notificações não lidas de um usuário
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    logger.info('[getUnreadNotificationCount] Contando notificações não lidas:', userId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    
    if (error) {
      logger.error('[getUnreadNotificationCount] Erro ao contar notificações:', error);
      return 0;
    }
    
    const unreadCount = count || 0;
    logger.info('[getUnreadNotificationCount] Notificações não lidas:', { userId, count: unreadCount });
    
    return unreadCount;
  } catch (error) {
    logger.error('[getUnreadNotificationCount] Erro:', error);
    return 0;
  }
}

/**
 * Verifica se um usuário tem notificações não lidas
 */
export async function hasUnreadNotifications(userId: string): Promise<boolean> {
  try {
    const count = await getUnreadNotificationCount(userId);
    return count > 0;
  } catch (error) {
    logger.error('[hasUnreadNotifications] Erro:', error);
    return false;
  }
}

/**
 * ✅ NOVA FUNÇÃO: Busca notificações recentes do sistema (para dashboard admin)
 */
export async function getRecentSystemNotifications(limitCount: number = 10): Promise<NotificacaoPadronizada[]> {
  try {
    logger.info('[getRecentSystemNotifications] Buscando notificações recentes do sistema');
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limitCount);
    
    if (error) {
      logger.error('[getRecentSystemNotifications] Erro ao buscar notificações recentes:', error);
      return [];
    }
    
    const notifications = data?.map(convertSupabaseToStandardFormat) || [];
    
    logger.info('[getRecentSystemNotifications] Notificações recentes encontradas:', notifications.length);
    
    return notifications;
  } catch (error) {
    logger.error('[getRecentSystemNotifications] Erro:', error);
    return [];
  }
}

/**
 * ✅ NOVA FUNÇÃO: Limpa notificações antigas (mais de 30 dias)
 */
export async function cleanupOldNotifications(): Promise<{ deleted: number; error?: string }> {
  try {
    logger.info('[cleanupOldNotifications] Iniciando limpeza de notificações antigas');
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Data de 30 dias atrás
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { count, error } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', thirtyDaysAgo.toISOString());
    
    if (error) {
      logger.error('[cleanupOldNotifications] Erro ao limpar notificações antigas:', error);
      return { deleted: 0, error: error.message };
    }
    
    const deletedCount = count || 0;
    logger.info('[cleanupOldNotifications] Notificações antigas removidas:', deletedCount);
    
    return { deleted: deletedCount };
  } catch (error) {
    logger.error('[cleanupOldNotifications] Erro:', error);
    return { deleted: 0, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
