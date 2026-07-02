import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import {
  createApiSuccess,
  createApiError,
  handleApiError,
  ApiErrorCode,
} from '@/lib/utils/apiErrorHandler';
import logger from '@/lib/utils/logger';

/**
 * API: POST /api/admin/delete-client
 *
 * Remove um cliente do banco de dados e do Supabase Auth.
 * Usado como "desfazer cadastro" após criação pelo admin.
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[API-DeleteClient] Iniciando remoção de cliente');

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    const { userId, adminUserId } = body;

    if (!userId || !adminUserId) {
      return createApiError(
        'userId e adminUserId são obrigatórios',
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        400
      );
    }

    // Verificar se o solicitante é admin
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminData) {
      logger.error('[API-DeleteClient] Erro ao buscar admin:', adminError);
      return createApiError(
        'Erro ao verificar permissões',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    if (!['admin', 'superadmin', 'owner'].includes(adminData.role)) {
      return createApiError(
        'Permissões de administrador necessárias',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // Remover da tabela users primeiro
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserError) {
      logger.warn('[API-DeleteClient] Aviso ao deletar users record:', deleteUserError);
    }

    // Remover do Supabase Auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      logger.error('[API-DeleteClient] Erro ao deletar auth user:', deleteAuthError);
      return createApiError(
        'Erro ao remover usuário do sistema de autenticação',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    logger.info('[API-DeleteClient] Cliente removido com sucesso:', { userId });

    return createApiSuccess({
      message: 'Cliente removido com sucesso',
      userId,
    });
  } catch (error) {
    logger.error('[API-DeleteClient] Erro interno:', error);
    return handleApiError(
      error,
      'Erro interno ao remover cliente',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
