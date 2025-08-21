// ✅ PRODUÇÃO - Serviço de bloqueio de usuários para Supabase
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { BlockStatus, UserWithBlockStatus } from '@/types/user';
import logger from '@/lib/utils/logger';

/**
 * SERVIÇO DE BLOQUEIO DE USUÁRIOS - PRODUÇÃO READY
 * 
 * Funcionalidades:
 * - Bloquear usuário com motivo
 * - Desbloquear usuário
 * - Verificar status de bloqueio
 * - Buscar usuários bloqueados
 */

/**
 * ✅ PRODUÇÃO - Bloquear usuário
 * @param userId ID do usuário a ser bloqueado
 * @param reason Motivo do bloqueio
 * @param blockedBy ID do administrador que está bloqueando
 * @returns Promise<void>
 */
export async function blockUser(
  userId: string, 
  reason: string, 
  blockedBy: string
): Promise<void> {
  try {
    logger.info('[UserBlockService] Bloqueando usuário:', { userId, reason, blockedBy });
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Atualizar usuário com informações de bloqueio
    const { error } = await supabase
      .from('users')
      .update({
        is_blocked: true,
        blocked_reason: reason,
        blocked_at: new Date().toISOString(),
        blocked_by: blockedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      logger.error('[UserBlockService] Erro ao bloquear usuário:', error);
      throw new Error(`Erro ao bloquear usuário: ${error.message}`);
    }
    
    logger.info('[UserBlockService] Usuário bloqueado com sucesso:', userId);
    
  } catch (error) {
    logger.error('[UserBlockService] Erro em blockUser:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Desbloquear usuário
 * @param userId ID do usuário a ser desbloqueado
 * @param unblockedBy ID do administrador que está desbloqueando
 * @returns Promise<void>
 */
export async function unblockUser(
  userId: string, 
  unblockedBy: string
): Promise<void> {
  try {
    logger.info('[UserBlockService] Desbloqueando usuário:', { userId, unblockedBy });
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Remover informações de bloqueio
    const { error } = await supabase
      .from('users')
      .update({
        is_blocked: false,
        blocked_reason: null,
        blocked_at: null,
        blocked_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      logger.error('[UserBlockService] Erro ao desbloquear usuário:', error);
      throw new Error(`Erro ao desbloquear usuário: ${error.message}`);
    }
    
    logger.info('[UserBlockService] Usuário desbloqueado com sucesso:', userId);
    
  } catch (error) {
    logger.error('[UserBlockService] Erro em unblockUser:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Verificar status de bloqueio de usuário
 * @param userId ID do usuário
 * @returns Promise<BlockStatus>
 */
export async function getUserBlockStatus(userId: string): Promise<BlockStatus> {
  try {
    logger.debug('[UserBlockService] Verificando status de bloqueio:', userId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('is_blocked, blocked_reason, blocked_at, blocked_by')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.error('[UserBlockService] Erro ao verificar status de bloqueio:', error);
      throw new Error(`Erro ao verificar status de bloqueio: ${error.message}`);
    }
    
    if (!data) {
      logger.warn('[UserBlockService] Usuário não encontrado:', userId);
      return { isBlocked: false };
    }
    
    const blockStatus: BlockStatus = {
      isBlocked: data.is_blocked || false,
      reason: data.blocked_reason || undefined,
      blockedAt: data.blocked_at || undefined,
      blockedBy: data.blocked_by || undefined
    };
    
    logger.debug('[UserBlockService] Status de bloqueio obtido:', blockStatus);
    return blockStatus;
    
  } catch (error) {
    logger.error('[UserBlockService] Erro em getUserBlockStatus:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Buscar usuários bloqueados
 * @returns Promise<UserWithBlockStatus[]>
 */
export async function getBlockedUsers(): Promise<UserWithBlockStatus[]> {
  try {
    logger.debug('[UserBlockService] Buscando usuários bloqueados');
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_blocked', true)
      .order('blocked_at', { ascending: false });
    
    if (error) {
      logger.error('[UserBlockService] Erro ao buscar usuários bloqueados:', error);
      throw new Error(`Erro ao buscar usuários bloqueados: ${error.message}`);
    }
    
    const blockedUsers: UserWithBlockStatus[] = (data || []).map(user => ({
      uid: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      isBlocked: user.is_blocked,
      blockedReason: user.blocked_reason,
      blockedAt: user.blocked_at,
      blockedBy: user.blocked_by,
      blockStatus: {
        isBlocked: user.is_blocked,
        reason: user.blocked_reason,
        blockedAt: user.blocked_at,
        blockedBy: user.blocked_by
      }
    }));
    
    logger.info('[UserBlockService] Usuários bloqueados encontrados:', blockedUsers.length);
    return blockedUsers;
    
  } catch (error) {
    logger.error('[UserBlockService] Erro em getBlockedUsers:', error);
    throw error;
  }
}

/**
 * ✅ PRODUÇÃO - Verificar se usuário está bloqueado (para middleware)
 * @param userId ID do usuário
 * @returns Promise<boolean>
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const blockStatus = await getUserBlockStatus(userId);
    return blockStatus.isBlocked;
  } catch (error) {
    logger.error('[UserBlockService] Erro ao verificar se usuário está bloqueado:', error);
    // Em caso de erro, assumir que não está bloqueado para não impedir acesso
    return false;
  }
}

/**
 * ✅ PRODUÇÃO - Verificar se usuário pode realizar ações (para APIs)
 * @param userId ID do usuário
 * @param action Ação que o usuário está tentando realizar
 * @returns Promise<{ allowed: boolean; reason?: string }>
 */
export async function canUserPerformAction(
  userId: string, 
  action: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const blockStatus = await getUserBlockStatus(userId);
    
    if (blockStatus.isBlocked) {
      return {
        allowed: false,
        reason: `Usuário bloqueado: ${blockStatus.reason || 'Motivo não especificado'}`
      };
    }
    
    return { allowed: true };
    
  } catch (error) {
    logger.error('[UserBlockService] Erro ao verificar permissão para ação:', error);
    // Em caso de erro, assumir que é permitido para não impedir acesso
    return { allowed: true };
  }
}
