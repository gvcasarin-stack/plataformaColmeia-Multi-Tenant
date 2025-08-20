/**
 * API: /api/emails/send
 * 
 * Envia emails para usuários através do sistema.
 * Este endpoint substitui o antigo `/api/test-email`.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 21/05/2024
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { 
  createApiSuccess, 
  createApiError, 
  handleApiError, 
  handleMissingRequiredField,
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';
import { devLog } from "@/lib/utils/productionLogger";
import { type Session } from 'next-auth';

// Interface para argumentos da função de envio de email
interface SendEmailArgs {
  to: string;
  subject?: string;
  text?: string;
  template?: string;
  data?: Record<string, any>;
}

/**
 * Endpoint POST para envio de emails
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions) as Session | null;
    if (!session) {
      return createApiError(
        'Não autorizado', 
        ApiErrorCode.UNAUTHORIZED, 
        401
      );
    }

    // Obter dados do request
    const data = await req.json();
    const { email, subject, message, template } = data;

    // Validar dados
    if (!email) {
      return handleMissingRequiredField('email');
    }

    // Registrar uso no log
    devLog.log(`[/api/emails/send] Enviando email para ${email}`);

    // Importar dinâmicamente o serviço de email para evitar problemas de módulo server/client
    const { sendEmail } = await import('@/lib/services/emailService');

    // Enviar email
    const result = await sendEmail(
      email,
      subject || 'Notificação da Plataforma Colmeia',
      message || template || 'Mensagem enviada pela Plataforma Colmeia'
    );

    // Retornar resultado
    return createApiSuccess(
      { messageId: result.messageId },
      'Email enviado com sucesso'
    );
  } catch (error: any) {
    devLog.error('[/api/emails/send] Erro:', error);
    
    return handleApiError(
      error,
      'Erro ao enviar email',
      ApiErrorCode.EMAIL_SENDING_ERROR
    );
  }
}

/**
 * Fornecer informações sobre o endpoint quando acessado via GET
 */
export async function GET() {
  return createApiSuccess({
    endpoint: '/api/emails/send',
    description: 'Envia emails para usuários da plataforma',
    method: 'POST',
    requiredFields: ['email'],
    optionalFields: ['subject', 'message', 'template'],
    note: 'Autenticação necessária para usar este endpoint'
  });
} 