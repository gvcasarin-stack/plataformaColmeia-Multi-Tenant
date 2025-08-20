import { getUnreadNotificationsCount } from '@/lib/services/notificationService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import type { Session } from 'next-auth';
import { devLog } from "@/lib/utils/productionLogger";
import { 
  createApiSuccess, 
  createApiError,
  handleApiError,
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';

/**
 * Endpoint para obter contagem de notificações não lidas
 * Usado pelo componente de notificações na barra lateral
 */
export async function GET() {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user) {
      return createApiError(
        'Usuário não autenticado',
        ApiErrorCode.UNAUTHORIZED,
        401
      );
    }

    const userId = session.user.id;
    
    try {
      // Obter contagem de notificações não lidas
      const count = await getUnreadNotificationsCount(userId);
      return createApiSuccess({ count });
    } catch (dbError) {
      devLog.error('Erro ao buscar contagem de notificações:', dbError);
      return handleApiError(
        dbError,
        'Erro ao buscar contagem de notificações',
        ApiErrorCode.DATABASE_ERROR
      );
    }
  } catch (error) {
    devLog.error('Erro interno no endpoint de contagem de notificações:', error);
    return handleApiError(
      error,
      'Erro interno ao processar a solicitação',
      ApiErrorCode.INTERNAL_SERVER_ERROR
    );
  }
} 