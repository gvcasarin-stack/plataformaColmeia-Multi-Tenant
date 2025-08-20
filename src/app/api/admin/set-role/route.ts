/**
 * API: /api/admin/set-role
 * 
 * Define a função de um usuário no sistema.
 * Atualmente permite definir um usuário como administrador.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 22/05/2025
 */

import { 
  createApiSuccess, 
  createApiError, 
  handleApiError,
  handleMissingRequiredField,
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';
import { devLog } from "@/lib/utils/productionLogger";
import { setUserRole } from '@/lib/utils/roles';

/**
 * Endpoint POST para definir a função do usuário
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, role = 'admin' } = body;
    
    // Validar dados de entrada
    if (!userId) {
      return handleMissingRequiredField('userId');
    }

    // Verificar se a função é válida
    if (role !== 'admin' && role !== 'client') {
      return createApiError(
        'Função inválida. Deve ser "admin" ou "client"',
        ApiErrorCode.VALIDATION_ERROR,
        400
      );
    }

    // Atualizar função do usuário
    await setUserRole(userId, role);

    return createApiSuccess(
      { userId, role },
      'Função definida com sucesso'
    );
  } catch (error) {
    devLog.error('Erro ao definir função:', error);
    
    return handleApiError(
      error,
      'Falha ao definir a função do usuário',
      ApiErrorCode.OPERATION_FAILED
    );
  }
}

/**
 * Fornecer informações sobre o endpoint quando acessado via GET
 */
export async function GET() {
  return createApiSuccess({
    endpoint: '/api/admin/set-role',
    description: 'Define a função de um usuário no sistema',
    method: 'POST',
    requiredFields: ['userId'],
    optionalFields: ['role'],
    note: 'A função padrão é "admin" se não especificada. As opções são "admin" ou "client".'
  });
} 