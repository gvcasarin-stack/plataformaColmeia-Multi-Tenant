import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { 
  createApiSuccess, 
  createApiError, 
  handleApiError,
  ApiErrorCode
} from "@/lib/utils/apiErrorHandler";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';
import { devLog } from "@/lib/utils/productionLogger";
import { canUserPerformAction } from '@/lib/services/userBlockService';

// ✅ CORRIGIDO: Forçar runtime dinâmico
export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * 
 * Obtém lista de projetos do usuário autenticado
 */
export async function GET(request: NextRequest) {
  // ✅ CORRIGIDO: Evitar execução durante build
  if (isBuildTime()) {
    return createBuildTimeResponse('/api/projects');
  }

  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions) as any;

    if (!session || !session.user) {
      return createApiError(
        'Não autorizado', 
        ApiErrorCode.UNAUTHORIZED, 
        401
      );
    }

    // ✅ PRODUÇÃO - Verificar se usuário está bloqueado
    const { allowed, reason } = await canUserPerformAction(session.user.id, 'acessar_projetos');
    if (!allowed) {
      return createApiError(
        reason || 'Acesso negado - usuário bloqueado',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // Apenas um endpoint base para mostrar que a API está funcionando
    return createApiSuccess(
      { userId: session.user.id }, 
      'API de projetos está funcionando - usuário autorizado'
    );
  } catch (error) {
    devLog.error('Erro na API de projetos:', error);
    return handleApiError(
      error, 
      'Erro interno do servidor',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
}
