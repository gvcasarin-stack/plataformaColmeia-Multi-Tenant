import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserBlockStatus } from '@/lib/services/userBlockService';
import { 
  createApiSuccess, 
  createApiError, 
  handleApiError, 
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';
import logger from '@/lib/utils/logger';

/**
 * API: GET /api/user/block-status
 * 
 * Verifica o status de bloqueio de um usuário
 * Usuários podem verificar seu próprio status
 * Administradores podem verificar qualquer usuário
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('[API-BlockStatus] Verificando status de bloqueio');
    
    // Verificar autenticação
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('[API-BlockStatus] Erro de autenticação:', authError);
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
      logger.error('[API-BlockStatus] Erro ao buscar dados do usuário atual:', userError);
      return createApiError(
        'Erro ao verificar permissões',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }
    
    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    
    // Determinar qual usuário verificar
    let userIdToCheck = user.id; // Por padrão, verificar o próprio usuário
    
    // Se um userId foi especificado, verificar se o usuário atual tem permissão
    if (targetUserId) {
      // Apenas admins podem verificar outros usuários
      if (currentUserData.role !== 'admin' && currentUserData.role !== 'superadmin') {
        logger.error('[API-BlockStatus] Usuário sem permissão para verificar outros usuários');
        return createApiError(
          'Permissões de administrador necessárias para verificar outros usuários',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
      userIdToCheck = targetUserId;
    }
    
    // Verificar status de bloqueio
    const blockStatus = await getUserBlockStatus(userIdToCheck);
    
    logger.info('[API-BlockStatus] Status de bloqueio verificado:', {
      userId: userIdToCheck,
      isBlocked: blockStatus.isBlocked
    });
    
    return createApiSuccess({
      userId: userIdToCheck,
      blockStatus,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('[API-BlockStatus] Erro ao verificar status de bloqueio:', error);
    return handleApiError(
      error,
      'Erro interno ao verificar status de bloqueio',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * API: POST /api/user/block-status
 * 
 * Verifica o status de bloqueio de um usuário via POST
 * Útil para verificações com dados mais complexos
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('[API-BlockStatus] Verificando status de bloqueio via POST');
    
    // Verificar autenticação
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error('[API-BlockStatus] Erro de autenticação:', authError);
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
      logger.error('[API-BlockStatus] Erro ao buscar dados do usuário atual:', userError);
      return createApiError(
        'Erro ao verificar permissões',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }
    
    // Extrair dados da requisição
    const body = await request.json();
    const { userId: targetUserId } = body;
    
    // Determinar qual usuário verificar
    let userIdToCheck = user.id; // Por padrão, verificar o próprio usuário
    
    // Se um userId foi especificado, verificar se o usuário atual tem permissão
    if (targetUserId) {
      // Apenas admins podem verificar outros usuários
      if (currentUserData.role !== 'admin' && currentUserData.role !== 'superadmin') {
        logger.error('[API-BlockStatus] Usuário sem permissão para verificar outros usuários');
        return createApiError(
          'Permissões de administrador necessárias para verificar outros usuários',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }
      userIdToCheck = targetUserId;
    }
    
    // Verificar status de bloqueio
    const blockStatus = await getUserBlockStatus(userIdToCheck);
    
    logger.info('[API-BlockStatus] Status de bloqueio verificado:', {
      userId: userIdToCheck,
      isBlocked: blockStatus.isBlocked
    });
    
    return createApiSuccess({
      userId: userIdToCheck,
      blockStatus,
      checkedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('[API-BlockStatus] Erro ao verificar status de bloqueio:', error);
    return handleApiError(
      error,
      'Erro interno ao verificar status de bloqueio',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
} 