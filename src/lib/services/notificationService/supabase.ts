// ✅ SUPABASE - Sistema de notificações definitivo
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import logger from '@/lib/utils/logger';

/**
 * SISTEMA DE NOTIFICAÇÕES SUPABASE
 * 
 * Implementação completa e otimizada do sistema de notificações
 * usando Supabase como banco de dados principal.
 */

export interface SupabaseNotification {
  id?: string;
  type: string;
  title: string;
  message: string;
  user_id: string;
  project_id?: string;
  project_number?: string;
  read: boolean;
  created_at?: string;
  updated_at?: string;
  data?: Record<string, any>;
}

/**
 * Cria uma notificação no Supabase
 */
export async function createSupabaseNotification(
  notification: Omit<SupabaseNotification, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    logger.info('[SupabaseNotifications] Criando notificação:', {
      type: notification.type,
      userId: notification.user_id,
      projectId: notification.project_id
    });

    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        ...notification,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao criar notificação:', error);
      return { success: false, error: error.message };
    }

    logger.info('[SupabaseNotifications] Notificação criada com sucesso:', data.id);
    return { success: true, id: data.id };

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao criar notificação:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Busca notificações de um usuário
 */
export async function getUserSupabaseNotifications(
  userId: string,
  limit: number = 20
): Promise<SupabaseNotification[]> {
  try {
    logger.info('[SupabaseNotifications] Buscando notificações para usuário:', userId);

    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao buscar notificações:', error);
      return [];
    }

    logger.info('[SupabaseNotifications] Notificações encontradas:', data?.length || 0);
    return data || [];

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao buscar notificações:', error);
    return [];
  }
}

/**
 * Conta notificações não lidas de um usuário
 */
export async function getUnreadSupabaseNotificationCount(userId: string): Promise<number> {
  try {
    logger.info('[SupabaseNotifications] Contando notificações não lidas para:', userId);

    const supabase = createSupabaseServiceRoleClient();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao contar notificações:', error);
      return 0;
    }

    logger.info('[SupabaseNotifications] Notificações não lidas:', count || 0);
    return count || 0;

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao contar notificações:', error);
    return 0;
  }
}

/**
 * Marca uma notificação como lida
 */
export async function markSupabaseNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    logger.info('[SupabaseNotifications] Marcando notificação como lida:', notificationId);

    const supabase = createSupabaseServiceRoleClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', notificationId);

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao marcar como lida:', error);
      return false;
    }

    logger.info('[SupabaseNotifications] Notificação marcada como lida com sucesso');
    return true;

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao marcar como lida:', error);
    return false;
  }
}

/**
 * Marca todas as notificações de um usuário como lidas
 */
export async function markAllSupabaseNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    logger.info('[SupabaseNotifications] Marcando todas as notificações como lidas para:', userId);

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
      logger.error('[SupabaseNotifications] Erro ao marcar todas como lidas:', error);
      return false;
    }

    logger.info('[SupabaseNotifications] Todas as notificações marcadas como lidas com sucesso');
    return true;

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao marcar todas como lidas:', error);
    return false;
  }
}

/**
 * Remove uma notificação
 */
export async function deleteSupabaseNotification(notificationId: string): Promise<boolean> {
  try {
    logger.info('[SupabaseNotifications] Removendo notificação:', notificationId);

    const supabase = createSupabaseServiceRoleClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao remover notificação:', error);
      return false;
    }

    logger.info('[SupabaseNotifications] Notificação removida com sucesso');
    return true;

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao remover notificação:', error);
    return false;
  }
}

/**
 * Busca notificações administrativas para o painel admin (Client-side)
 * Versão otimizada para uso em componentes client-side
 */
export async function getAdminNotificationsClientSide(
  limit: number = 50
): Promise<SupabaseNotification[]> {
  try {
    logger.info('[SupabaseNotifications] [CLIENT] Buscando notificações administrativas, limite:', limit);

    const supabase = createSupabaseBrowserClient();
    
    // Buscar usuários admin para filtrar suas notificações
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);

    if (adminError) {
      logger.error('[SupabaseNotifications] [CLIENT] Erro ao buscar admins:', adminError);
      return [];
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('[SupabaseNotifications] [CLIENT] Nenhum admin encontrado');
      return [];
    }

    const adminIds = adminUsers.map(admin => admin.id);

    // Buscar notificações dos admins, ordenadas por data mais recente
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('user_id', adminIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[SupabaseNotifications] [CLIENT] Erro ao buscar notificações administrativas:', error);
      return [];
    }

    logger.info('[SupabaseNotifications] [CLIENT] Notificações administrativas encontradas:', data?.length || 0);
    return data || [];

  } catch (error) {
    logger.error('[SupabaseNotifications] [CLIENT] Exceção ao buscar notificações administrativas:', error);
    return [];
  }
}

/**
 * Busca notificações administrativas para o painel admin
 * Retorna notificações de todos os tipos relevantes para admins
 */
export async function getAdminSupabaseNotifications(
  limit: number = 50
): Promise<SupabaseNotification[]> {
  try {
    logger.info('[SupabaseNotifications] Buscando notificações administrativas, limite:', limit);

    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar usuários admin para filtrar suas notificações
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);

    if (adminError) {
      logger.error('[SupabaseNotifications] Erro ao buscar admins:', adminError);
      return [];
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('[SupabaseNotifications] Nenhum admin encontrado');
      return [];
    }

    const adminIds = adminUsers.map(admin => admin.id);

    // Buscar notificações dos admins, ordenadas por data mais recente
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('user_id', adminIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao buscar notificações administrativas:', error);
      return [];
    }

    logger.info('[SupabaseNotifications] Notificações administrativas encontradas:', data?.length || 0);
    return data || [];

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao buscar notificações administrativas:', error);
    return [];
  }
}

/**
 * Cria notificação para todos os administradores
 */
export async function createNotificationForAllAdmins(
  notification: Omit<SupabaseNotification, 'id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<{ success: boolean; ids?: string[]; error?: string }> {
  try {
    logger.info('[SupabaseNotifications] Criando notificação para todos os admins:', notification.type);

    const supabase = createSupabaseServiceRoleClient();
    
    // Buscar todos os usuários admin
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);

    if (adminError) {
      logger.error('[SupabaseNotifications] Erro ao buscar admins:', adminError);
      return { success: false, error: adminError.message };
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.warn('[SupabaseNotifications] Nenhum admin encontrado');
      return { success: true, ids: [] };
    }

    // Criar notificação para cada admin
    const notifications = adminUsers.map(admin => ({
      ...notification,
      user_id: admin.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select('id');

    if (error) {
      logger.error('[SupabaseNotifications] Erro ao criar notificações para admins:', error);
      return { success: false, error: error.message };
    }

    const ids = data?.map(n => n.id) || [];
    logger.info('[SupabaseNotifications] Notificações criadas para admins:', ids.length);
    return { success: true, ids };

  } catch (error) {
    logger.error('[SupabaseNotifications] Exceção ao criar notificações para admins:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
} 