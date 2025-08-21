import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
 * Desbloqueia um usuário cliente
 * Apenas administradores podem usar esta API
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[API-UnblockUser] Iniciando processo de desbloqueio de usuário');
    
    // Verificar autenticação
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('[API-UnblockUser] Erro de autenticação:', authError);
      return createApiError(
        'Autenticação necessária',
        ApiErrorCode.UNAUTHORIZED,
        401
      );
    }
    
    // Buscar dados do usuário atual
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (userError || !currentUserData) {
      logger.error('[API-UnblockUser] Erro ao buscar dados do usuário atual:', userError);
      return createApiError(
        'Erro ao verificar permissões',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }
    
    // Verificar se é admin
    if (currentUserData.role !== 'admin' && currentUserData.role !== 'superadmin') {
      logger.error('[API-UnblockUser] Usuário sem permissão:', currentUserData.role);
      return createApiError(
        'Permissões de administrador necessárias',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }
    
    // Extrair dados da requisição
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return createApiError(
        'ID do usuário é obrigatório',
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        400
      );
    }
    
    // Verificar se o usuário a ser desbloqueado existe
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_blocked')
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
    
    // Verificar se está bloqueado
    if (!targetUser.is_blocked) {
      return createApiError(
        'Usuário já está desbloqueado',
        ApiErrorCode.CONFLICT,
        409
      );
    }
    
    // Desbloquear o usuário
    await unblockUser(userId, user.id);
    
    logger.info('[API-UnblockUser] Usuário desbloqueado com sucesso:', {
      userId,
      unblockedBy: user.id
    });
    
    return createApiSuccess({
      message: 'Usuário desbloqueado com sucesso',
      userId,
      unblockedBy: user.id,
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
