import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { 
  createApiSuccess, 
  handleApiError,
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { isBuildTime, createBuildTimeResponse } from '@/lib/utils/buildUtils';

/**
 * Endpoint para obter informações da sessão atual do usuário
 * Usado principalmente pelo cliente para verificar o estado de autenticação
 */
export async function GET(request: NextRequest) {
  // ✅ CORRIGIDO: Evitar execução durante build
  if (isBuildTime()) {
    return createBuildTimeResponse('/api/auth/session');
  }

  try {
    const session = await getServerSession(authOptions)
    return createApiSuccess({ 
      session: session ?? null
    });
  } catch (error) {
    devLog.error("Session Error:", error)
    return handleApiError(
      error,
      'Erro ao obter dados da sessão',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
} 