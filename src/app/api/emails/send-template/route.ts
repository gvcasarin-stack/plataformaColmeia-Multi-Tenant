/**
 * API: /api/emails/send-template
 * 
 * Envia emails formatados em HTML para usuários através do sistema.
 * Este endpoint substitui o antigo `/api/test-ses`.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 21/08/2024
 */

import { NextRequest } from 'next/server';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { z } from 'zod';
import { devLog } from "@/lib/utils/productionLogger";
import { 
  createApiSuccess, 
  createApiError, 
  handleApiError, 
  handleValidationError,
  ApiErrorCode 
} from '@/lib/utils/apiErrorHandler';

// Schema de validação para o corpo da requisição
const emailSchema = z.object({
  email: z.string().email("Email inválido"),
  subject: z.string().min(3, "Assunto muito curto").max(100).optional(),
  htmlContent: z.string().optional(),
  templateName: z.string().optional(),
  templateData: z.record(z.string()).optional(),
  // ✅ Novos campos para cooldown
  userId: z.string().optional(),
  projectId: z.string().optional()
});

/**
 * Endpoint POST para envio de emails com templates HTML
 */
export async function POST(req: NextRequest) {
  devLog.log('[API:emails/send-template] Iniciando processamento de requisição');
  try {
    // Verificar autenticação com chave secreta
    const internalApiKey = process.env.INTERNAL_API_SECRET_KEY;
    if (!internalApiKey) {
      devLog.error('[API:emails/send-template] Chave secreta interna não configurada no servidor.');
      return createApiError(
        'Configuração de servidor incompleta.',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        500
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== internalApiKey) {
      devLog.warn('[API:emails/send-template] Tentativa de acesso não autorizada.');
      return createApiError(
        'Não autorizado. Chave de API inválida ou ausente.', 
        ApiErrorCode.UNAUTHORIZED, 
        401
      );
    }
    devLog.log('[API:emails/send-template] Autenticação por chave secreta bem-sucedida.');

    // Obter dados do request
    const body = await req.json();
    
    // Validar dados
    try {
      emailSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const fieldsWithErrors = validationError.errors.reduce((acc, curr) => {
          const fieldPath = curr.path.join('.');
          acc[fieldPath] = curr.message;
          return acc;
        }, {} as Record<string, string>);
        
        return handleValidationError(fieldsWithErrors);
      }
    }
    
    const { email, subject = 'Notificação da Plataforma Colmeia', htmlContent, templateName, templateData, userId, projectId } = body;

    // Registrar uso no log
    devLog.log(`[API:emails/send-template] Enviando email para ${email}`);

    // Obter credenciais AWS
    const region = process.env.AWS_REGION || 'sa-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const senderEmail = process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
    
    // Verificar se as credenciais estão configuradas
    if (!accessKeyId || !secretAccessKey) {
      devLog.error('[API:emails/send-template] Credenciais AWS não configuradas');
      return createApiError(
        'Credenciais AWS não configuradas',
        ApiErrorCode.EXTERNAL_SERVICE_ERROR,
        500
      );
    }
    
    // Determinar o conteúdo HTML a ser enviado
    let finalHtmlContent = htmlContent;
    
    // Se não houver conteúdo HTML fornecido mas houver nome de template,
    // aqui seria o local para carregar o template do banco de dados ou do sistema de arquivos
    if (!finalHtmlContent && templateName) {
      // Implementação futura: carregar template do banco de dados ou sistema de arquivos
      // Por enquanto, usamos um template padrão
      finalHtmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #10b981;">Template: ${templateName || 'Notificação'}</h2>
            <p>Este email foi enviado usando o template "${templateName || 'padrão'}".</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            ${templateData ? `<p>Dados: ${JSON.stringify(templateData)}</p>` : ''}
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `;
    }
    
    // Se ainda não tiver conteúdo HTML, usar um template padrão
    if (!finalHtmlContent) {
      finalHtmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #10b981;">Notificação</h2>
            <p>Este é um email enviado através da Plataforma Colmeia.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
            ${templateData ? `<p>Dados: ${JSON.stringify(templateData)}</p>` : ''}
            <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
              Este é um email automático, por favor não responda.<br>
              &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      `;
    }
    
    // Criar cliente SES
    const sesClient = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    
    // Configurar comando de envio de email
    const sendEmailCommand = new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: finalHtmlContent, Charset: 'UTF-8' },
          Text: { 
            Data: finalHtmlContent.replace(/<[^>]*>/g, ''), 
            Charset: 'UTF-8' 
          }
        }
      }
    });
    
    // ✅ Verificar cooldown antes de enviar (se userId e projectId fornecidos)
    if (userId && projectId) {
      try {
        // Importar funções de cooldown
        const { isUserInEmailCooldown, updateEmailCooldown } = await import('@/lib/services/emailService');
        
        // Verificar se está em cooldown
        const isInCooldown = await isUserInEmailCooldown(userId, projectId);
        
        if (isInCooldown) {
          devLog.log(`[API:emails/send-template] EMAIL BLOQUEADO POR COOLDOWN - Usuário ${userId} projeto ${projectId}`);
          
          // Retornar sucesso para não quebrar o fluxo, mas sem enviar
          return createApiSuccess(
            {
              messageId: "skipped-cooldown",
              email: email,
              cooldownActive: true
            },
            `Email não enviado - usuário em cooldown de 5 minutos`
          );
        }
      } catch (cooldownError) {
        devLog.error('[API:emails/send-template] Erro ao verificar cooldown:', cooldownError);
        // Continuar com envio em caso de erro no cooldown
      }
    }

    // Enviar email
    try {
      const response = await sesClient.send(sendEmailCommand);
      devLog.log(`[API:emails/send-template] Email enviado com sucesso, ID: ${response.MessageId}`);
      
      // ✅ Atualizar cooldown após envio bem-sucedido
      if (userId && projectId) {
        try {
          const { updateEmailCooldown } = await import('@/lib/services/emailService');
          await updateEmailCooldown(userId, projectId);
          devLog.log(`[API:emails/send-template] Cooldown atualizado para usuário ${userId} projeto ${projectId}`);
        } catch (cooldownError) {
          devLog.error('[API:emails/send-template] Erro ao atualizar cooldown:', cooldownError);
        }
      }
      
      return createApiSuccess(
        {
          messageId: response.MessageId,
          email: email
        },
        `Email enviado com sucesso para ${email}`
      );
    } catch (sesError) {
      devLog.error('[API:emails/send-template] Erro ao enviar email:', sesError);
      return createApiError(
        sesError instanceof Error ? sesError.message : String(sesError),
        ApiErrorCode.EMAIL_SENDING_ERROR,
        500
      );
    }
  } catch (error: any) {
    devLog.error('[API:emails/send-template] Erro:', error);
    
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
    endpoint: '/api/emails/send-template',
    description: 'Envia emails formatados em HTML para usuários da plataforma',
    method: 'POST',
    requiredFields: ['email'],
    optionalFields: ['subject', 'htmlContent', 'templateName', 'templateData'],
    note: 'Autenticação via Bearer token no header Authorization é necessária para usar este endpoint'
  });
} 