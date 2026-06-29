import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { blockUser } from '@/lib/services/userBlockService';
import {
  createApiSuccess,
  createApiError,
  handleApiError,
  ApiErrorCode
} from '@/lib/utils/apiErrorHandler';
import logger from '@/lib/utils/logger';

/**
 * API: POST /api/admin/block-user
 *
 * Bloqueia um usuário cliente.
 * Usa service role client (sem dependência de sessão — padrão do projeto).
 * O adminUserId vem do body e é verificado no banco via service role.
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[API-BlockUser] Iniciando processo de bloqueio de usuário');

    const supabase = createSupabaseServiceRoleClient();

    const body = await request.json();
    const { userId, reason, adminUserId } = body;

    if (!adminUserId) {
      return createApiError(
        'ID do administrador é obrigatório',
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        400
      );
    }

    if (!userId) {
      return createApiError(
        'ID do usuário é obrigatório',
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        400
      );
    }

    if (!reason || reason.trim().length === 0) {
      return createApiError(
        'Motivo do bloqueio é obrigatório',
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        400
      );
    }

    // Verificar se o solicitante é admin (via service role — bypassa RLS)
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (userError || !currentUserData) {
      logger.error('[API-BlockUser] Erro ao buscar dados do administrador:', userError);
      return createApiError(
        'Erro ao verificar permissões',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    if (
      currentUserData.role !== 'admin' &&
      currentUserData.role !== 'superadmin' &&
      currentUserData.role !== 'owner'
    ) {
      logger.error('[API-BlockUser] Usuário sem permissão:', currentUserData.role);
      return createApiError(
        'Permissões de administrador necessárias',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // Verificar se o usuário alvo existe
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, email, name, role, is_blocked')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      logger.error('[API-BlockUser] Usuário alvo não encontrado:', targetUserError);
      return createApiError(
        'Usuário não encontrado',
        ApiErrorCode.NOT_FOUND,
        404
      );
    }

    if (targetUser.role === 'admin' || targetUser.role === 'superadmin') {
      logger.error('[API-BlockUser] Tentativa de bloquear outro administrador');
      return createApiError(
        'Não é possível bloquear administradores',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    if (targetUser.is_blocked) {
      return createApiError(
        'Usuário já está bloqueado',
        ApiErrorCode.CONFLICT,
        409
      );
    }

    await blockUser(userId, reason.trim(), adminUserId);

    logger.info('[API-BlockUser] Usuário bloqueado com sucesso:', {
      userId,
      reason: reason.trim(),
      blockedBy: adminUserId
    });

    return createApiSuccess({
      message: 'Usuário bloqueado com sucesso',
      userId,
      reason: reason.trim(),
      blockedBy: adminUserId,
      blockedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[API-BlockUser] Erro no processo de bloqueio:', error);
    return handleApiError(
      error,
      'Erro interno ao bloquear usuário',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
