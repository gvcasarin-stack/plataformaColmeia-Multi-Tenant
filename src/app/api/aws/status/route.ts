/**
 * API: /api/aws/status
 * 
 * Verifica o status da conexão com a AWS e exibe informações de configuração.
 * Este endpoint só pode ser acessado por administradores.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 25/08/2025
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import logger from '@/lib/utils/logger';
import { 
  createApiSuccess, 
  createApiError, 
  handleApiError, 
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';

// Interface para o tipo de sessão
interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
  name?: string;
}

interface Session {
  user?: SessionUser;
  expires?: string;
}

/**
 * Endpoint GET para verificar conexão com AWS 
 */
export async function GET(_req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session || !session.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
      logger.warn('[AWS/STATUS] Tentativa de acesso não autorizado');
      return createApiError(
        'Não autorizado - Você precisa ser administrador para acessar esta rota',
        ApiErrorCode.FORBIDDEN,
        403
      );
    }

    // Verificar configurações da AWS
    const region = process.env.AWS_REGION || 'sa-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const senderEmail = process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
    
    // Verificar se as credenciais estão presentes
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'não definido',
      AWS_REGION: region ? 'configurado' : 'não configurado',
      AWS_ACCESS_KEY_ID: accessKeyId ? 'configurado' : 'não configurado',
      AWS_SECRET_ACCESS_KEY: secretAccessKey ? 'configurado' : 'não configurado',
      SES_SENDER_EMAIL: senderEmail
    };

    // Determinar o status geral
    const configStatus = (accessKeyId && secretAccessKey && region)
      ? 'Todas as configurações AWS necessárias estão presentes'
      : 'Algumas configurações AWS estão faltando';

    return createApiSuccess({
      status: configStatus,
      config: envVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[AWS/STATUS] Erro:', error);
    return handleApiError(
      error,
      'Erro ao verificar configurações AWS',
      ApiErrorCode.EXTERNAL_SERVICE_ERROR
    );
  }
}

/**
 * Fornece informações sobre o endpoint quando acessado via OPTIONS
 */
export async function OPTIONS() {
  return createApiSuccess({
    endpoint: '/api/aws/status',
    description: 'Verifica o status da conexão com a AWS e exibe informações de configuração',
    methods: ['GET'],
    authorization: 'Apenas administradores',
    note: 'Este endpoint verifica a presença das variáveis de ambiente necessárias para usar os serviços AWS'
  });
}
