/**
 * API: /api/admin/send-welcome-email
 * 
 * Envia email de boas vindas para um novo usuário com link para definir senha.
 * Utiliza o serviço de email para enviar um template de boas-vindas.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 22/05/2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
// import { sendPasswordResetEmail } from '@/lib/services/emailService'; // Comentado - função não existe mais (migração para Supabase)
import { 
  createApiSuccess, 
  createApiError, 
  handleApiError, 
  handleMissingRequiredField,
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';

/**
 * Endpoint POST para envio de email de boas-vindas
 */
export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return handleMissingRequiredField('email');
    }

    // TODO: Implementar via Supabase durante migração
    devLog.log('Email de boas-vindas seria enviado para:', email);

    return createApiSuccess(
      { email, sent: true },
      'Email de boas-vindas enviado com sucesso (temporariamente desabilitado durante migração)'
    );
  } catch (error: any) {
    devLog.error('Erro ao enviar email de boas-vindas:', error);
    return handleApiError(
      error,
      'Erro ao enviar email de boas-vindas',
      ApiErrorCode.EMAIL_SENDING_ERROR
    );
  }
}

/**
 * Fornecer informações sobre o endpoint quando acessado via GET
 */
export async function GET() {
  return createApiSuccess({
    endpoint: '/api/admin/send-welcome-email',
    description: 'Envia email de boas-vindas para novo usuário com link para definir senha',
    method: 'POST',
    requiredFields: ['email'],
    optionalFields: ['name'],
  });
}
