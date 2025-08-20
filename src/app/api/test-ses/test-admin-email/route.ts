import { NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

// ✅ COOLDOWN: Cliente Supabase e configurações
const supabase = createSupabaseServiceRoleClient();
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const TEST_PROJECT_ID = 'test-admin-email-api'; // ID fixo para APIs de teste

/**
 * Verifica se um usuário está em cooldown para APIs de teste
 */
async function isUserInEmailCooldown(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('email_cooldowns')
      .select('last_email_sent_at')
      .eq('user_id', userId)
      .eq('project_id', TEST_PROJECT_ID)
      .single();

    if (error && error.code !== 'PGRST116') {
      devLog.error('[TEST-ADMIN-EMAIL-COOLDOWN] Erro ao consultar cooldown:', error);
      return false;
    }

    if (data && data.last_email_sent_at) {
      const lastSentTime = new Date(data.last_email_sent_at).getTime();
      const now = Date.now();
      return (now - lastSentTime) < COOLDOWN_DURATION_MS;
    }
    return false;
  } catch (error) {
    devLog.error('[TEST-ADMIN-EMAIL-COOLDOWN] Erro inesperado ao verificar cooldown:', error);
    return false;
  }
}

/**
 * Atualiza o timestamp do último email enviado para APIs de teste
 */
async function updateEmailCooldown(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_cooldowns')
      .upsert(
        { user_id: userId, project_id: TEST_PROJECT_ID, last_email_sent_at: new Date().toISOString() },
        { onConflict: 'user_id,project_id' }
      );

    if (error) {
      devLog.error('[TEST-ADMIN-EMAIL-COOLDOWN] Erro ao atualizar cooldown:', error);
      return false;
    }
    devLog.log(`[TEST-ADMIN-EMAIL-COOLDOWN] Cooldown atualizado para usuário ${userId} projeto ${TEST_PROJECT_ID}`);
    return true;
  } catch (error) {
    devLog.error('[TEST-ADMIN-EMAIL-COOLDOWN] Erro inesperado ao atualizar cooldown:', error);
    return false;
  }
}

/**
 * Rota GET para testar o envio de email para admin
 * Use com ?adminEmail=email@exemplo.com
 */
export async function GET(request: Request) {
  devLog.log('[TEST-ADMIN-EMAIL] Iniciando teste de email para admin');
  
  // Extrair o email de destino da URL
  const { searchParams } = new URL(request.url);
  const adminEmail = searchParams.get('adminEmail');
  
  if (!adminEmail) {
    devLog.error('[TEST-ADMIN-EMAIL] Email do admin não fornecido');
    return NextResponse.json({
      success: false,
      error: 'Parâmetro adminEmail não fornecido. Use ?adminEmail=email@exemplo.com'
    }, { status: 400 });
  }
  
  devLog.log(`[TEST-ADMIN-EMAIL] Destinatário: ${adminEmail}`);

  try {
    // ✅ COOLDOWN: Verificar cooldown antes de enviar
    const userId = `test-admin-${Buffer.from(adminEmail).toString('base64').slice(0, 16)}`; // Hash do email como userID
    const isInCooldown = await isUserInEmailCooldown(userId);

    if (isInCooldown) {
      devLog.log(`[TEST-ADMIN-EMAIL-COOLDOWN] EMAIL BLOQUEADO POR COOLDOWN - Usuário ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'Email não enviado - usuário em cooldown de 5 minutos',
        cooldownActive: true,
        adminEmail: adminEmail
      });
    }
    // Obter credenciais
    const region = process.env.AWS_REGION || 'sa-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const senderEmail = process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
    
    // Verificar se as credenciais estão configuradas
    if (!accessKeyId || !secretAccessKey) {
      devLog.error('[TEST-ADMIN-EMAIL] Credenciais AWS não configuradas');
      return NextResponse.json({
        success: false,
        error: 'Credenciais AWS não configuradas'
      }, { status: 500 });
    }
    
    // Criar cliente SES
    devLog.log('[TEST-ADMIN-EMAIL] Criando cliente SES');
    const sesClient = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    
    // Preparar conteúdo do email para admin
    const subject = '[ADMIN] Teste de Notificação - Comentário de Cliente';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Colmeia Solar - Admin</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #3b82f6;">Teste de Notificação para Admin</h2>
          <p><strong>Projeto:</strong> Teste de Projeto <span style="color: #6b7280; font-weight: 500;">(FV-2024-123)</span></p>
          <p><strong>Cliente:</strong> Cliente de Teste</p>
          <p><strong>Ação:</strong> Adicionou um comentário</p>
          <div style="background-color: #f9fafb; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0;">
            <p style="margin: 0;"><em>"Este é um comentário de teste para verificar a notificação para o admin responsável."</em></p>
          </div>
          <p>Para verificar este comentário, acesse o projeto:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="https://app.colmeiasolar.com.br/projetos/TESTE123" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Acessar Projeto
            </a>
          </div>
          <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Este é um email automático, por favor não responda.<br>
            &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `;
    
    // Configurar comando de envio de email
    devLog.log('[TEST-ADMIN-EMAIL] Configurando comando de envio');
    const sendEmailCommand = new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: [adminEmail] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: htmlContent, Charset: 'UTF-8' },
          Text: { 
            Data: htmlContent.replace(/<[^>]*>/g, ''), 
            Charset: 'UTF-8' 
          }
        }
      }
    });
    
    // Enviar email
    devLog.log(`[TEST-ADMIN-EMAIL] Tentando enviar email para ${adminEmail}`);
    try {
      const response = await sesClient.send(sendEmailCommand);
      devLog.log(`[TEST-ADMIN-EMAIL] Email enviado com sucesso, ID: ${response.MessageId}`);

      // ✅ COOLDOWN: Atualizar cooldown após envio bem-sucedido
      await updateEmailCooldown(userId);
      
      return NextResponse.json({
        success: true,
        message: `Email de teste para admin enviado para ${adminEmail}`,
        messageId: response.MessageId,
        cooldownActive: false
      });
    } catch (sesError) {
      devLog.error('[TEST-ADMIN-EMAIL] Erro no envio via SES:', sesError);
      return NextResponse.json({
        success: false,
        error: sesError instanceof Error ? sesError.message : String(sesError)
      }, { status: 500 });
    }
  } catch (error) {
    devLog.error('[TEST-ADMIN-EMAIL] Erro geral:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 