import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { unblockUser } from '@/lib/services/userBlockService';
import {
  createApiSuccess,
  createApiError,
  handleApiError,
  ApiErrorCode
} from '@/lib/utils/apiErrorHandler';
import logger from '@/lib/utils/logger';

/**
 * API: POST /api/admin/unblock-user
 *
 * Desbloqueia um usuário cliente.
 * Usa service role client (sem dependência de sessão — padrão do projeto).
 * O adminUserId vem do body e é verificado no banco via service role.
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[API-UnblockUser] Iniciando processo de desbloqueio de usuário');

    const supabase = createSupabaseServiceRoleClient();

    const body = await request.json();
    const { userId, adminUserId } = body;

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

    // Verificar se o solicitante é admin (via service role — bypassa RLS)
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (userError || !currentUserData) {
      logger.error('[API-UnblockUser] Erro ao buscar dados do administrador:', userError);
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
      logger.error('[API-UnblockUser] Usuário sem permissão:', currentUserData.role);
      return createApiError(
        'Permissões de administrador necessárias',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // Verificar se o usuário alvo existe e está bloqueado
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, email, name, role, is_blocked')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      logger.error('[API-UnblockUser] Usuário alvo não encontrado:', targetUserError);
      return createApiError(
        'Usuário não encontrado',
        ApiErrorCode.NOT_FOUND,
        404
      );
    }

    if (!targetUser.is_blocked) {
      return createApiError(
        'Usuário já está desbloqueado',
        ApiErrorCode.CONFLICT,
        409
      );
    }

    await unblockUser(userId, adminUserId);

    logger.info('[API-UnblockUser] Usuário desbloqueado com sucesso:', {
      userId,
      unblockedBy: adminUserId
    });

    return createApiSuccess({
      message: 'Usuário desbloqueado com sucesso',
      userId,
      unblockedBy: adminUserId,
      unblockedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[API-UnblockUser] Erro no processo de desbloqueio:', error);
    return handleApiError(
      error,
      'Erro interno ao desbloquear usuário',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
