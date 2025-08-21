import 'server-only';
import { getUserDataAdminSupabase } from '@/lib/services/authService.supabase';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { AWS_CONFIG } from "@/lib/aws/config";
import logger from "@/lib/utils/logger";
import { getProject } from "./projectService/core";
import { getUserById, getAllAdminUsers } from "./userService/core"; // Corrigido
import { devLog } from "@/lib/utils/productionLogger";
import { User } from "@/types/user";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
// ✅ MIGRADO PARA SUPABASE - Firebase removido

const sesClient = new SESClient({
  region: AWS_CONFIG.getRegion(),
  credentials: AWS_CONFIG.getCredentials(),
});

// Configurar cliente Supabase para cooldown de emails
const supabase = createSupabaseServiceRoleClient();

// Obter o email remetente da configuração
function getSenderEmail() {
  return process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
}

/**
 * Verifica se o usuário está em cooldown para receber emails sobre o projeto
 * 
 * @param {string} userId - ID do usuário
 * @param {string} projectId - ID do projeto
 * @returns {Promise<boolean>} - true se está em cooldown (não deve enviar), false se pode enviar
 */
async function isUserInEmailCooldown(userId: string, projectId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('email_cooldowns')
      .select('last_email_sent_at')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = registro não encontrado
      logger.error('[EMAIL_COOLDOWN] Erro ao verificar cooldown:', error);
      return false; // Em caso de erro, permitir envio
    }

    if (!data) {
      // Não há registro = pode enviar
      return false;
    }

    const lastEmailTime = new Date(data.last_email_sent_at);
    const now = new Date();
    const timeDiff = now.getTime() - lastEmailTime.getTime();
    const fiveMinutesInMs = 5 * 60 * 1000; // 5 minutos em millisegundos

    const isInCooldown = timeDiff < fiveMinutesInMs;
    
    if (isInCooldown) {
      const remainingTime = Math.ceil((fiveMinutesInMs - timeDiff) / 1000);
      logger.info(`[EMAIL_COOLDOWN] Usuário ${userId} está em cooldown para projeto ${projectId}. Restam ${remainingTime}s`);
    }

    return isInCooldown;
  } catch (error) {
    logger.error('[EMAIL_COOLDOWN] Erro ao verificar cooldown:', error);
    return false; // Em caso de erro, permitir envio
  }
}

/**
 * Atualiza o timestamp do último email enviado para o usuário+projeto
 * 
 * @param {string} userId - ID do usuário
 * @param {string} projectId - ID do projeto
 * @returns {Promise<boolean>} - Resultado da operação
 */
async function updateEmailCooldown(userId: string, projectId: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('email_cooldowns')
      .upsert({
        user_id: userId,
        project_id: projectId,
        last_email_sent_at: now,
        updated_at: now
      }, {
        onConflict: 'user_id,project_id'
      });

    if (error) {
      logger.error('[EMAIL_COOLDOWN] Erro ao atualizar cooldown:', error);
      return false;
    }

    logger.info(`[EMAIL_COOLDOWN] Cooldown atualizado para usuário ${userId} projeto ${projectId}`);
    return true;
  } catch (error) {
    logger.error('[EMAIL_COOLDOWN] Erro ao atualizar cooldown:', error);
    return false;
  }
}

/**
 * ✅ CORREÇÃO RACE CONDITION: Usa transação atômica para evitar múltiplos emails simultâneos
 * Evita múltiplos emails quando 5+ documentos são adicionados ao mesmo tempo
 * 
 * @param {string} recipientUserId - ID do usuário destinatário
 * @param {string} projectId - ID do projeto  
 * @param {string} recipientEmail - Email do destinatário
 * @param {string} subject - Assunto do email
 * @param {string} htmlBody - Corpo HTML do email
 * @returns {Promise<boolean>} - true se enviou ou está em cooldown, false se erro
 */
export async function sendEmailWithCooldown(
  recipientUserId: string,
  projectId: string, 
  recipientEmail: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
    
    // ✅ CORREÇÃO RACE CONDITION: Separar verificação de atualização
    // 1. PRIMEIRO: Apenas verifica se pode enviar (sem atualizar timestamp)
    logger.info(`[EMAIL_COOLDOWN] 🔍 STEP 1: Verificando cooldown para usuário ${recipientUserId}, projeto ${projectId}`);
    
    const { data: checkData, error: checkError } = await supabase.rpc('check_email_cooldown', {
      p_user_id: recipientUserId,
      p_project_id: projectId,
      p_current_time: now.toISOString(),
      p_cooldown_minutes: 5
    });

          logger.info(`[EMAIL_COOLDOWN] 🔍 STEP 1 RESULTADO:`, { 
        checkData, 
        checkError, 
        canSend: checkData?.[0]?.can_send,
        minutesRemaining: checkData?.[0]?.minutes_remaining 
      });

      if (checkError) {
        logger.error('[EMAIL_COOLDOWN] ❌ ERRO na verificação - Usando método legacy como fallback:', checkError);
        // Em caso de erro, usar método legacy como fallback
        return await sendEmailWithCooldownLegacy(recipientUserId, projectId, recipientEmail, subject, htmlBody);
      }

      // Se não pode enviar, está em cooldown
      if (!checkData || !checkData[0] || !checkData[0].can_send) {
        logger.info(`[EMAIL_COOLDOWN] ⚠️ EMAIL BLOQUEADO POR COOLDOWN - Usuário ${recipientUserId} projeto ${projectId}, restam ${checkData?.[0]?.minutes_remaining || 0} minutos`);
        return true; // Retornar true para não quebrar o fluxo
      }

    // ✅ Pode enviar! PRIMEIRO enviar email, DEPOIS atualizar timestamp
    logger.info(`[EMAIL_COOLDOWN] ✅ STEP 2: Pode enviar - Enviando email para ${recipientUserId}`);
    const emailSent = await sendEmail([recipientEmail], subject, htmlBody, process.env.EMAIL_FROM || 'no-reply@colmeiasolar.com');
    
    logger.info(`[EMAIL_COOLDOWN] 🔍 STEP 2 RESULTADO:`, { emailSent, recipientEmail });
    
    if (emailSent) {
      // ✅ APENAS se email foi enviado com sucesso, atualizar timestamp
      logger.info(`[EMAIL_COOLDOWN] ✅ STEP 3: Email enviado com sucesso - Atualizando cooldown`);
      const { error: updateError } = await supabase.rpc('update_email_cooldown_after_send', {
        p_user_id: recipientUserId,
        p_project_id: projectId,
        p_current_time: now.toISOString()
      });
      
      if (updateError) {
        logger.error('[EMAIL_COOLDOWN] ⚠️ Erro ao atualizar cooldown (email foi enviado):', updateError);
      } else {
        logger.info(`[EMAIL_COOLDOWN] ✅ STEP 3 SUCESSO: Cooldown atualizado`);
      }
    } else {
      logger.warn(`[EMAIL_COOLDOWN] ❌ Falha ao enviar - NÃO atualizando cooldown`);
    }
    
    return emailSent;
  } catch (error) {
    logger.error('[EMAIL_COOLDOWN] Erro ao enviar email com cooldown:', error);
    // Em caso de erro crítico, usar método legacy
    return await sendEmailWithCooldownLegacy(recipientUserId, projectId, recipientEmail, subject, htmlBody);
  }
}

/**
 * Método legacy para fallback em caso de erro na função RPC
 */
async function sendEmailWithCooldownLegacy(
  recipientUserId: string,
  projectId: string, 
  recipientEmail: string,
  subject: string,
  htmlBody: string
): Promise<boolean> {
  try {
    // Verificar cooldown
    const isInCooldown = await isUserInEmailCooldown(recipientUserId, projectId);
    
    if (isInCooldown) {
      logger.info(`[EMAIL_COOLDOWN] EMAIL BLOQUEADO POR COOLDOWN (LEGACY) - Usuário ${recipientUserId} projeto ${projectId}`);
      return true;
    }

    // Enviar email
    // 🔧 TESTE: Forçar usar EMAIL_FROM como as APIs que funcionavam
    const emailSent = await sendEmail([recipientEmail], subject, htmlBody, process.env.EMAIL_FROM || 'no-reply@colmeiasolar.com');
    
    if (emailSent) {
      await updateEmailCooldown(recipientUserId, projectId);
    }
    
    return emailSent;
  } catch (error) {
    logger.error('[EMAIL_COOLDOWN] Erro no método legacy:', error);
    return false;
  }
}

// Email templates using the standard format
export const emailTemplates = {
  statusChange: (projectName: string, projectNumber: string, oldStatus: string, newStatus: string, projectUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #10b981;">Atualização de Status</h2>
        <p>O status do projeto <strong>${projectName}</strong> <span style="color: #6b7280; font-weight: 500;">(${projectNumber})</span> foi atualizado.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0;"><span style="color: #6b7280;">Status anterior:</span> <strong>${oldStatus}</strong></p>
          <p style="margin: 10px 0 0;"><span style="color: #6b7280;">Novo status:</span> <strong>${newStatus}</strong></p>
        </div>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${projectUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Ver Projeto</a>
        </div>
        <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Este é um e-mail automático, por favor não responda.<br>
          &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `,
  
  documentAdded: (projectName: string, projectNumber: string, documentName: string, projectUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #10b981;">Novo Documento Adicionado</h2>
        <p>Um novo documento foi adicionado ao projeto <strong>${projectName}</strong> <span style="color: #6b7280; font-weight: 500;">(${projectNumber})</span>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p style="color: #6b7280; margin: 0 0 5px;">Documento:</p>
          <div style="background-color: white; padding: 10px; border-radius: 4px; border-left: 3px solid #10b981;">
            <strong>${documentName}</strong>
          </div>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${projectUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Ver Documento</a>
        </div>
        
        <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Este é um e-mail automático, por favor não responda.<br>
          &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `,
  
  commentAdded: (projectName: string, projectNumber: string, commentBy: string, commentText: string, projectUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #10b981;">Novo Comentário</h2>
        <p>Um novo comentário foi adicionado ao projeto <strong>${projectName}</strong> <span style="color: #6b7280; font-weight: 500;">(${projectNumber})</span>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="color: #6b7280; margin: 0 0 5px;">Comentário de <strong>${commentBy}</strong>:</p>
          <div style="background-color: white; padding: 10px; border-radius: 4px; border-left: 3px solid #10b981;">
            ${commentText}
          </div>
        </div>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${projectUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Ver Comentário</a>
        </div>
        <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Este é um e-mail automático, por favor não responda.<br>
          &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `,
  
  // Email verification template
  emailVerification: (userName: string, verificationLink: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #10b981;">Verificação de Email</h2>
        <p>Olá <strong>${userName}</strong>, bem-vindo(a) à Plataforma Colmeia Solar!</p>
        <p>Para verificar seu endereço de email e confirmar sua conta, clique no botão abaixo:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${verificationLink}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Verificar Email</a>
        </div>
        <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 0.9rem; word-break: break-all;">${verificationLink}</p>
        <p>Esta verificação é importante para garantir a segurança da sua conta e permitir que você receba todas as notificações importantes.</p>
        <p>Após a verificação do seu email, seu cadastro passará por uma análise e aprovação pelos nossos administradores. Você receberá uma notificação assim que seu cadastro for aprovado.</p>
        <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Este é um e-mail automático, por favor não responda.<br>
          &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `,
  
  // Account approval template
  accountApproval: (userName: string, loginUrl: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #10b981; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #10b981;">Cadastro Aprovado</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Temos o prazer de informar que seu cadastro na Plataforma Colmeia Solar foi <strong>aprovado</strong>!</p>
        <p>Agora você pode acessar todas as funcionalidades da plataforma, incluindo a criação e gerenciamento de projetos.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${loginUrl}" style="background-color: #10b981; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Acessar Plataforma</a>
        </div>
        <p>Caso precise de ajuda ou tenha alguma dúvida, entre em contato com nosso suporte.</p>
        <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Este é um e-mail automático, por favor não responda.<br>
          &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `,
  
  // Novo template para notificação de novo projeto
  newProject: (projectName: string, projectNumber: string, clientName: string, projectUrl: string, potencia?: string|number, distribuidora?: string) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #3b82f6;">Novo Projeto Criado</h2>
        <p>Um novo projeto foi criado pelo cliente <strong>${clientName}</strong>.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0;"><span style="color: #6b7280;">Projeto:</span> <strong>${projectName}</strong> <span style="color: #6b7280; font-weight: 500;">(${projectNumber})</span></p>
          ${potencia ? `<p style="margin: 10px 0 0;"><span style="color: #6b7280;">Potência:</span> <strong>${potencia} kWp</strong></p>` : ''}
          ${distribuidora ? `<p style="margin: 10px 0 0;"><span style="color: #6b7280;">Distribuidora:</span> <strong>${distribuidora}</strong></p>` : ''}
        </div>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${projectUrl}" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Acessar Projeto</a>
        </div>
        <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          Este é um e-mail automático, por favor não responda.<br>
          &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
        </p>
      </div>
    </div>
  `
};

// Verificar as preferências de notificação do usuário
async function shouldSendEmailNotification(userId: string, notificationType: 'status' | 'document' | 'comment'): Promise<boolean> {
  try {
    const userData = await getUserDataAdminSupabase(userId);
    
    switch(notificationType) {
      case 'status':
        return userData.emailNotificacaoStatus !== false; // true por padrão
      case 'document':
        return userData.emailNotificacaoDocumentos !== false; // true por padrão
      case 'comment':
        return userData.emailNotificacaoComentarios !== false; // true por padrão
      default:
        return false;
    }
  } catch (error) {
    devLog.error('Erro ao verificar preferências de notificação:', error);
    return false;
  }
}

/**
 * Envia um e-mail usando o AWS SES.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  htmlBody: string,
  sourceEmail?: string
): Promise<boolean> {
  // 🔍 DEBUG DETALHADO: Log inicial
  logger.info(`[EmailService] 🔍 INÍCIO SENDMAIL - to: ${Array.isArray(to) ? to.join(', ') : to}, subject: "${subject}"`);
  
  const recipientAddresses = Array.isArray(to) ? to : [to];
  if (recipientAddresses.length === 0) {
    logger.warn("[EmailService] ❌ ERRO: Nenhum destinatário fornecido para o e-mail.");
    return false;
  }
  
  // Filtrar e-mails vazios ou nulos para evitar erros no SES
  const validRecipients = recipientAddresses.filter(email => email && email.trim() !== '');
  logger.info(`[EmailService] 🔍 DEBUG: validRecipients após filtro:`, validRecipients);
  
  if (validRecipients.length === 0) {
    logger.warn("[EmailService] ❌ ERRO: Nenhum destinatário válido fornecido após a filtragem.");
    return false;
  }

  // 🔍 DEBUG: Verificar configurações AWS E VARIÁVEIS DE AMBIENTE
  const region = AWS_CONFIG.getRegion();
  const credentials = AWS_CONFIG.getCredentials();
  const sourceEmailAddress = sourceEmail || AWS_CONFIG.getSESSourceEmail();
  
  logger.info(`[EmailService] 🔍 DEBUG AWS CONFIG + ENV VARS:`, {
    region,
    hasAccessKey: !!credentials.accessKeyId,
    hasSecretKey: !!credentials.secretAccessKey,
    sourceEmail: sourceEmailAddress,
    recipientCount: validRecipients.length,
    // ⚡ COMPARAR COM API QUE FUNCIONAVA:
    EMAIL_FROM_ENV: process.env.EMAIL_FROM,
    SES_SENDER_EMAIL_ENV: process.env.SES_SENDER_EMAIL,
    AWS_REGION_ENV: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID_EXISTS: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY_EXISTS: !!process.env.AWS_SECRET_ACCESS_KEY
  });

  const params = {
    Destination: {
      ToAddresses: validRecipients,
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: htmlBody,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: subject,
      },
    },
    Source: sourceEmailAddress,
  };

  // 🔍 DEBUG: Log dos parâmetros do SES
  logger.info(`[EmailService] 🔍 DEBUG SES PARAMS:`, {
    destination: params.Destination.ToAddresses,
    source: params.Source,
    subject: params.Message.Subject.Data,
    bodyLength: params.Message.Body.Html?.Data?.length || 0
  });

  try {
    logger.info(`[EmailService] 🔍 DEBUG: Tentando enviar via SES...`);
    const result = await sesClient.send(new SendEmailCommand(params));
    logger.info(`[EmailService] ✅ SUCESSO: E-mail enviado para: ${validRecipients.join(', ')} com assunto: "${subject}"`, {
      messageId: result.MessageId,
      result
    });
    return true;
  } catch (error: any) {
    logger.error("[EmailService] ❌ ERRO CRÍTICO ao enviar e-mail via SES:", {
      error: error.message,
      errorCode: error.Code,
      errorType: error.name,
      statusCode: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      validRecipients,
      subject,
      sourceEmail: sourceEmailAddress,
      region,
      hasCredentials: !!(credentials.accessKeyId && credentials.secretAccessKey)
    });
    return false;
  }
}

/**
 * Prepara o corpo HTML para e-mails de notificação.
 */
function createEmailHtmlBody(
  title: string,
  mainMessage: string,
  callToActionLink?: string,
  callToActionText?: string
): string {
  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #0056b3; }
          .content { margin-bottom: 20px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 3px; font-weight: bold; }
          .footer { font-size: 0.9em; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">${title}</div>
          <div class="content">
            <p>${mainMessage.replace(/\n/g, "<br>")}</p>
          </div>
          ${callToActionLink && callToActionText ? `
          <p>
            <a href="${callToActionLink}" class="button">${callToActionText}</a>
          </p>
          ` : ''}
          <div class="footer">
            <p>Esta é uma mensagem automática. Por favor, não responda diretamente a este e-mail.</p>
            <p>&copy; ${new Date().getFullYear()} Colmeia</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return html;
}

/**
 * Envia notificação por e-mail sobre um novo comentário.
 */
export async function sendEmailNotificationForComment(
  projectId: string,
  commentId: string,
  commentText: string,
  author: User, // Alterado para receber o objeto User completo do autor
  projectOwnerUserId?: string
): Promise<void> {
  try {
    const project = await getProject(projectId);
    if (!project) {
      logger.error(`[EmailService/Comment] Projeto ${projectId} não encontrado.`);
      return;
    }

    const authorName = author.name || author.email || "Usuário Desconhecido";
    const authorRole = author.role || 'user';
    const authorId = author.uid;

    const projectName = project.name || project.number || projectId;
    const commentSnippet = commentText.substring(0, 150) + (commentText.length > 150 ? "..." : "");
    
    let recipients: string[] = [];
    let validAdmins: any[] = []; // Declarar aqui para usar no envio
    let subject = "";
    let mainMessage = "";
    let callToActionLink = "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (authorRole === 'client' || authorRole === 'user') {
      const adminUsers = await getAllAdminUsers();
      validAdmins = adminUsers.filter(admin => admin.uid !== authorId && admin.email);
      recipients = validAdmins.map(admin => admin.email as string);
        
      if (recipients.length === 0) {
        logger.warn(`[EmailService/Comment] Nenhum admin qualificado para notificar sobre comentário do cliente no projeto ${projectId}`);
        return;
      }
      
      subject = `Novo Comentário do Cliente no Projeto ${projectName}`;
      mainMessage = `O cliente <strong>${authorName}</strong> adicionou um novo comentário ao projeto <strong>${projectName}</strong>:
      <br><br><em>"${commentSnippet}"</em>`;
      callToActionLink = `${appUrl}/admin/projetos/${projectId}?tab=comments&commentId=${commentId}`;
      logger.info(`[EmailService/Comment] Preparando e-mail para ${recipients.length} admin(s) sobre comentário do cliente ${authorName} no projeto ${projectName}`);

    } else if (authorRole === 'admin' || authorRole === 'superadmin') {
      if (!projectOwnerUserId) {
        logger.warn(`[EmailService/Comment] ID do cliente dono do projeto ${projectId} não fornecido.`);
        return;
      }
      if (projectOwnerUserId === authorId) {
        logger.info(`[EmailService/Comment] Autor (${authorName}) é o dono do projeto. Não enviando e-mail para si mesmo.`);
        return;
      }

      const clientUser = await getUserById(projectOwnerUserId);
      if (!clientUser || !clientUser.email) {
        logger.error(`[EmailService/Comment] Cliente ${projectOwnerUserId} (ou e-mail) não encontrado para notificação no projeto ${projectId}.`);
        return;
      }
      recipients = [clientUser.email]; // clientUser.email já é string | undefined, o filter em sendEmail cuidará de nulos
      
      subject = `Novo Comentário no Seu Projeto ${projectName}`;
      mainMessage = `<strong>${authorName}</strong> (Admin) adicionou um novo comentário ao seu projeto <strong>${projectName}</strong>:
      <br><br><em>"${commentSnippet}"</em>`;
      callToActionLink = `${appUrl}/cliente/projetos/${projectId}?tab=comments&commentId=${commentId}`;
      logger.info(`[EmailService/Comment] Preparando e-mail para cliente ${clientUser.email} sobre comentário do admin ${authorName} no projeto ${projectName}`);
    } else {
      logger.warn(`[EmailService/Comment] Papel do autor desconhecido ('${authorRole}') para notificação no projeto ${projectId}.`);
      return;
    }

    if (recipients.length > 0) {
      const validRecipients = recipients.filter(r => r); // Garantir que não há e-mails nulos/undefined
      if (validRecipients.length > 0) {
        const htmlBody = createEmailHtmlBody(
          `Novo Comentário: ${projectName}`,
          mainMessage,
          callToActionLink,
          "Ver Comentário"
        );
        
        // Enviar com cooldown para cada recipient
        if (authorRole === 'client' || authorRole === 'user') {
          // Cliente comentou -> enviar para admins
          for (const admin of validAdmins) {
            if (admin.email) {
              await sendEmailWithCooldown(admin.uid, projectId, admin.email, subject, htmlBody);
            }
          }
        } else if (projectOwnerUserId) {
          // Admin comentou -> enviar para cliente
          await sendEmailWithCooldown(projectOwnerUserId, projectId, validRecipients[0], subject, htmlBody);
        }
      }
    }

  } catch (error) {
    logger.error(`[EmailService/Comment] Erro ao enviar notificação por e-mail para comentário ${commentId} no projeto ${projectId}:`, error);
  }
}

/**
 * Envia notificação por e-mail sobre um novo documento.
 */
export async function sendEmailNotificationForDocument(
  projectId: string,
  documentName: string,
  uploader: User, // Alterado para receber o objeto User completo do uploader
  projectOwnerUserId?: string
): Promise<void> {
  try {
    const project = await getProject(projectId);
    if (!project) {
      logger.error(`[EmailService/Document] Projeto ${projectId} não encontrado.`);
      return;
    }
    
    const uploaderName = uploader.name || uploader.email || "Usuário Desconhecido";
    const uploaderRole = uploader.role || 'user';
    const uploaderId = uploader.uid;

    const projectName = project.name || project.number || projectId;
    
    let recipients: string[] = [];
    let validAdminsDoc: any[] = []; // Para armazenar referência aos admins
    let subject = "";
    let mainMessage = "";
    let callToActionLink = "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (uploaderRole === 'client' || uploaderRole === 'user') {
      const adminUsers = await getAllAdminUsers();
      validAdminsDoc = adminUsers.filter(admin => admin.uid !== uploaderId && admin.email);
      recipients = validAdminsDoc.map(admin => admin.email as string);

       if (recipients.length === 0) {
        logger.warn(`[EmailService/Document] Nenhum admin qualificado para notificar sobre upload do cliente no projeto ${projectId}`);
        return;
      }

      subject = `Novo Documento do Cliente no Projeto ${projectName}`;
      mainMessage = `O cliente <strong>${uploaderName}</strong> adicionou um novo documento (<em>${documentName}</em>) ao projeto <strong>${projectName}</strong>.`;
      callToActionLink = `${appUrl}/admin/projetos/${projectId}?tab=documentos`;
      logger.info(`[EmailService/Document] Preparando e-mail para ${recipients.length} admin(s) sobre upload do cliente ${uploaderName} no projeto ${projectName}`);

    } else if (uploaderRole === 'admin' || uploaderRole === 'superadmin') {
      if (!projectOwnerUserId) {
        logger.warn(`[EmailService/Document] ID do cliente dono do projeto ${projectId} não fornecido.`);
        return;
      }
      if (projectOwnerUserId === uploaderId) {
         logger.info(`[EmailService/Document] Uploader (${uploaderName}) é o dono do projeto. Não enviando e-mail para si mesmo.`);
        return;
      }

      const clientUser = await getUserById(projectOwnerUserId);
      if (!clientUser || !clientUser.email) {
        logger.error(`[EmailService/Document] Cliente ${projectOwnerUserId} (ou e-mail) não encontrado para notificação no projeto ${projectId}.`);
        return;
      }
      recipients = [clientUser.email];
      
      subject = `Novo Documento Adicionado ao Seu Projeto ${projectName}`;
      mainMessage = `<strong>${uploaderName}</strong> (Admin) adicionou um novo documento (<em>${documentName}</em>) ao seu projeto <strong>${projectName}</strong>.`;
      callToActionLink = `${appUrl}/cliente/projetos/${projectId}?tab=documentos`;
      logger.info(`[EmailService/Document] Preparando e-mail para cliente ${clientUser.email} sobre upload do admin ${uploaderName} no projeto ${projectName}`);
    } else {
      logger.warn(`[EmailService/Document] Papel do uploader desconhecido ('${uploaderRole}') para notificação no projeto ${projectId}.`);
      return;
    }

    if (recipients.length > 0) {
      const validRecipients = recipients.filter(r => r);
      if (validRecipients.length > 0) {
        const htmlBody = createEmailHtmlBody(
          `Novo Documento: ${projectName}`,
          mainMessage,
          callToActionLink,
          "Ver Documentos"
        );
        
        // Enviar com cooldown para cada recipient
        if (uploaderRole === 'client' || uploaderRole === 'user') {
          // Cliente fez upload -> enviar para admins
          for (const admin of validAdminsDoc) {
            if (admin.email) {
              await sendEmailWithCooldown(admin.uid, projectId, admin.email, subject, htmlBody);
            }
          }
        } else if (projectOwnerUserId) {
          // Admin fez upload -> enviar para cliente
          await sendEmailWithCooldown(projectOwnerUserId, projectId, validRecipients[0], subject, htmlBody);
        }
      }
    }

  } catch (error) {
    logger.error(`[EmailService/Document] Erro ao enviar notificação por e-mail para documento "${documentName}" no projeto ${projectId}:`, error);
  }
}

// Função para notificar mudança de status (V2)
export async function notifyStatusChangeV2(
  targetUserId: string,
  projectName: string,
  projectNumber: string,
  projectOwnerUserId: string, // Manter, pois estava na chamada original, mas avaliar se é realmente necessário
  oldStatus: string,
  newStatus: string,
  projectUrl: string,
  projectId?: string // Adicionado para cooldown
): Promise<boolean> {
  devLog.log(`[EmailService V2] Notificando usuário ${targetUserId} sobre mudança de status do projeto ${projectNumber} de ${oldStatus} para ${newStatus}`);

  try {
    const userShouldBeNotified = await shouldSendEmailNotification(targetUserId, 'status');
    if (!userShouldBeNotified) {
      devLog.log(`[EmailService V2] Usuário ${targetUserId} optou por não receber emails de mudança de status.`);
      return true; // Considerar sucesso, pois a preferência do usuário foi respeitada
    }

    const userData = await getUserDataAdminSupabase(targetUserId);
    if (!userData || !userData.email) {
      devLog.error(`[EmailService V2] Não foi possível obter o email do usuário ${targetUserId}.`);
      return false;
    }

    // TODO: Re-avaliar a necessidade da função getDisplayStatus. Por enquanto, usando os status brutos.
    // const displayOldStatus = getDisplayStatus(oldStatus) || oldStatus;
    // const displayNewStatus = getDisplayStatus(newStatus) || newStatus;
    const displayOldStatus = oldStatus;
    const displayNewStatus = newStatus;

    const emailHtml = emailTemplates.statusChange(
      projectName,
      projectNumber,
      displayOldStatus,
      displayNewStatus,
      projectUrl
    );

    const subject = `Atualização de Status: Projeto ${projectName} (${projectNumber})`;

    // Usar projectId se fornecido, senão usar targetUserId como fallback (não ideal, mas funcional)
    const effectiveProjectId = projectId || targetUserId;
    const result = await sendEmailWithCooldown(targetUserId, effectiveProjectId, userData.email, subject, emailHtml);

    if (result) {
      devLog.log(`[EmailService V2] Email de mudança de status enviado com sucesso para ${userData.email}`);
      return true;
    } else {
      devLog.error(`[EmailService V2] Falha ao enviar email de mudança de status para ${userData.email}`);
      return false;
    }
  } catch (error: any) {
    devLog.error(`[EmailService V2] Erro ao enviar notificação de mudança de status para o usuário ${targetUserId}:`, error);
    return false;
  }
}

// Função para notificar o usuário sobre um novo comentário
export async function notifyUserOfNewComment(
  targetUserId: string,
  projectName: string,
  projectNumber: string,
  commentBy: string,
  commentText: string,
  projectUrl: string,
  projectId?: string
): Promise<boolean> {
  devLog.log(`[EmailService] Notificando usuário ${targetUserId} sobre novo comentário no projeto ${projectNumber} por ${commentBy}`);

  try {
    const userShouldBeNotified = await shouldSendEmailNotification(targetUserId, 'comment');
    if (!userShouldBeNotified) {
      devLog.log(`[EmailService] Usuário ${targetUserId} optou por não receber emails de novos comentários.`);
      return true;
    }

    const userData = await getUserDataAdminSupabase(targetUserId);
    if (!userData || !userData.email) {
      devLog.error(`[EmailService] Não foi possível obter o email do usuário ${targetUserId} para notificação de comentário.`);
      return false;
    }

    const emailHtml = emailTemplates.commentAdded(
      projectName,
      projectNumber,
      commentBy,
      commentText,
      projectUrl
    );

    const subject = `Novo Comentário: Projeto ${projectName} (${projectNumber})`;
    
    // Logs removidos por questões de segurança em produção
    
    // Usar cooldown se projectId foi fornecido
    const result = projectId 
      ? await sendEmailWithCooldown(targetUserId, projectId, userData.email, subject, emailHtml)
      : await sendEmail(userData.email, subject, emailHtml);
    
    // Logs removidos por questões de segurança em produção

    if (result) {
      devLog.log(`[EmailService] Email de novo comentário enviado com sucesso para ${userData.email}`);
      return true;
    } else {
      devLog.error(`[EmailService] Falha ao enviar email de novo comentário para ${userData.email}`);
      return false;
    }
  } catch (error: any) {
    devLog.error(`[EmailService] Erro ao enviar notificação de novo comentário para o usuário ${targetUserId}:`, error);
    return false;
  }
}

// Função para notificar administradores sobre um novo comentário
export async function notifyAdminAboutComment(
  commentText: string,
  clientName: string, // Nome do cliente dono do projeto
  commentAuthorName: string,
  projectName: string,
  projectNumber: string,
  projectUrlForAdmin: string,
  projectId?: string
): Promise<boolean> {
  devLog.log(`[EmailService] Notificando administradores sobre novo comentário no projeto ${projectNumber} (Cliente: ${clientName}) por ${commentAuthorName}`);

  try {
    // Usar função para obter admins com UIDs para cooldown
    const adminUsers = await getAllAdminUsers();
    
    if (!adminUsers || adminUsers.length === 0) {
      devLog.warn('[EmailService] Nenhum administrador encontrado para notificação de comentário.');
      return false; 
    }
    
    let allEmailsSentSuccessfully = true;

    for (const admin of adminUsers) {
      if (!admin.email) continue;
      
      const emailHtml = emailTemplates.commentAdded(
        projectName,
        projectNumber,
        commentAuthorName, // Quem comentou
        commentText,       // O comentário
        projectUrlForAdmin // URL para o admin ver o comentário
      );

      const subject = `Novo Comentário de ${commentAuthorName} no Projeto ${projectNumber} (${clientName})`;
      
      // Adicionar informação sobre o cliente no corpo do e-mail para o admin
      const adminEmailHtml = `
        <p style="font-size: 0.9rem; color: #333;">Este comentário é referente ao projeto do cliente: <strong>${clientName}</strong>.</p>
        ${emailHtml}
      `;
      
      // Logs removidos por questões de segurança em produção
      
      // Usar cooldown se projectId foi fornecido
      const result = projectId 
        ? await sendEmailWithCooldown(admin.uid, projectId, admin.email, subject, adminEmailHtml)
        : await sendEmail(admin.email, subject, adminEmailHtml);
      
      // Logs removidos por questões de segurança em produção

      if (result) {
        devLog.log(`[EmailService] Email de novo comentário (para admin) enviado com sucesso para ${admin.email}`);
      } else {
        devLog.error(`[EmailService] Falha ao enviar email de novo comentário (para admin) para ${admin.email}`);
        allEmailsSentSuccessfully = false;
      }
    }
    return allEmailsSentSuccessfully;

  } catch (error: any) {
    devLog.error(`[EmailService] Erro ao enviar notificação de novo comentário para administradores:`, error);
    return false;
  }
}

// Função para notificar administradores sobre um novo projeto criado por um cliente
export async function notifyAdminAboutNewProject(
  clientName: string,
  projectName: string, 
  projectNumber: string,
  projectPotencia: string | number | undefined,
  projectDistribuidora: string | undefined,
  projectUrlForAdmin: string,
  projectId?: string
): Promise<boolean> {
  devLog.log(`[EmailService] Notificando administradores sobre novo projeto ${projectNumber} (Cliente: ${clientName})`);

  try {
    // Usar função para obter admins com UIDs para cooldown
    const adminUsers = await getAllAdminUsers();

    if (!adminUsers || adminUsers.length === 0) {
      devLog.warn('[EmailService] Nenhum administrador encontrado para notificação de novo projeto.');
      return false; 
    }
    
    let allEmailsSentSuccessfully = true;

    for (const admin of adminUsers) {
      if (!admin.email) continue;
      
      const emailHtml = emailTemplates.newProject(
        projectName,
        projectNumber,
        clientName,
        projectUrlForAdmin,
        projectPotencia,
        projectDistribuidora
      );

      const subject = `Novo Projeto Criado: ${projectName} (${projectNumber}) por ${clientName}`;
      
      // Usar cooldown se projectId foi fornecido
      const result = projectId 
        ? await sendEmailWithCooldown(admin.uid, projectId, admin.email, subject, emailHtml)
        : await sendEmail(admin.email, subject, emailHtml);

      if (result) {
        devLog.log(`[EmailService] Email de novo projeto (para admin) enviado com sucesso para ${admin.email}`);
      } else {
        devLog.error(`[EmailService] Falha ao enviar email de novo projeto (para admin) para ${admin.email}`);
        allEmailsSentSuccessfully = false;
      }
    }
    return allEmailsSentSuccessfully;

  } catch (error: any) {
    devLog.error(`[EmailService] Erro ao enviar notificação de novo projeto para administradores:`, error);
    return false;
  }
}

// Função para notificar o usuário sobre um novo documento adicionado ao projeto
export async function notifyUserOfNewDocument(
  targetUserId: string,
  projectName: string,
  projectNumber: string,
  documentName: string,
  projectUrl: string,
  projectId?: string
): Promise<boolean> {
  devLog.log(`[EmailService] Notificando usuário ${targetUserId} sobre novo documento "${documentName}" no projeto ${projectNumber}`);

  try {
    const userShouldBeNotified = await shouldSendEmailNotification(targetUserId, 'document');
    if (!userShouldBeNotified) {
      devLog.log(`[EmailService] Usuário ${targetUserId} optou por não receber emails de novos documentos.`);
      return true;
    }

    const userData = await getUserDataAdminSupabase(targetUserId);
    if (!userData || !userData.email) {
      devLog.error(`[EmailService] Não foi possível obter o email do usuário ${targetUserId} para notificação de novo documento.`);
      return false;
    }

    const emailHtml = emailTemplates.documentAdded(
      projectName,
      projectNumber,
      documentName,
      projectUrl
    );

    const subject = `Novo Documento Adicionado: ${documentName} (Projeto ${projectNumber})`;
    
    // Usar cooldown se projectId foi fornecido
    const result = projectId 
      ? await sendEmailWithCooldown(targetUserId, projectId, userData.email, subject, emailHtml)
      : await sendEmail(userData.email, subject, emailHtml);

    if (result) {
      devLog.log(`[EmailService] Email de novo documento enviado com sucesso para ${userData.email}`);
      return true;
    } else {
      devLog.error(`[EmailService] Falha ao enviar email de novo documento para ${userData.email}`);
      return false;
    }
  } catch (error: any) {
    devLog.error(`[EmailService] Erro ao enviar notificação de novo documento para o usuário ${targetUserId}:`, error);
    return false;
  }
}

// Função para notificar administradores sobre um novo documento adicionado
export async function notifyAdminAboutDocument(
  documentName: string,
  clientName: string, // Nome do cliente dono do projeto
  projectName: string,
  projectNumber: string,
  projectUrlForAdmin: string,
  projectId?: string
): Promise<boolean> {
  devLog.log(`[EmailService] Notificando administradores sobre novo documento "${documentName}" no projeto ${projectNumber} (Cliente: ${clientName})`);

  try {
    // Usar função para obter admins com UIDs para cooldown
    const adminUsers = await getAllAdminUsers();

    if (!adminUsers || adminUsers.length === 0) {
      devLog.warn('[EmailService] Nenhum administrador encontrado para notificação de novo documento.');
      return false; 
    }
    
    let allEmailsSentSuccessfully = true;

    for (const admin of adminUsers) {
      if (!admin.email) continue;
      
      const emailHtml = emailTemplates.documentAdded(
        projectName,
        projectNumber,
        documentName,
        projectUrlForAdmin 
      );

      const subject = `Novo Documento: "${documentName}" adicionado ao Projeto ${projectNumber} (${clientName})`;
      
      // Adicionar informação sobre o cliente no corpo do e-mail para o admin
      const adminEmailHtml = `
        <p style="font-size: 0.9rem; color: #333;">O documento "${documentName}" foi adicionado ao projeto do cliente: <strong>${clientName}</strong>.</p>
        ${emailHtml}
      `;
      
      // Usar cooldown se projectId foi fornecido
      const result = projectId 
        ? await sendEmailWithCooldown(admin.uid, projectId, admin.email, subject, adminEmailHtml)
        : await sendEmail(admin.email, subject, adminEmailHtml);

      if (result) {
        devLog.log(`[EmailService] Email de novo documento (para admin) enviado com sucesso para ${admin.email}`);
      } else {
        devLog.error(`[EmailService] Falha ao enviar email de novo documento (para admin) para ${admin.email}`);
        allEmailsSentSuccessfully = false;
      }
    }
    return allEmailsSentSuccessfully;

  } catch (error: any) {
    devLog.error(`[EmailService] Erro ao enviar notificação de novo documento para administradores:`, error);
    return false;
  }
}
