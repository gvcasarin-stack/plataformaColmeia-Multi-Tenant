import { NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

// ✅ COOLDOWN: Cliente Supabase e configurações
const supabase = createSupabaseServiceRoleClient();
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const TEST_PROJECT_ID = 'test-new-project-api'; // ID fixo para APIs de teste

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
      devLog.error('[TEST-NEW-PROJECT-COOLDOWN] Erro ao consultar cooldown:', error);
      return false;
    }

    if (data && data.last_email_sent_at) {
      const lastSentTime = new Date(data.last_email_sent_at).getTime();
      const now = Date.now();
      return (now - lastSentTime) < COOLDOWN_DURATION_MS;
    }
    return false;
  } catch (error) {
    devLog.error('[TEST-NEW-PROJECT-COOLDOWN] Erro inesperado ao verificar cooldown:', error);
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
      devLog.error('[TEST-NEW-PROJECT-COOLDOWN] Erro ao atualizar cooldown:', error);
      return false;
    }
    devLog.log(`[TEST-NEW-PROJECT-COOLDOWN] Cooldown atualizado para usuário ${userId} projeto ${TEST_PROJECT_ID}`);
    return true;
  } catch (error) {
    devLog.error('[TEST-NEW-PROJECT-COOLDOWN] Erro inesperado ao atualizar cooldown:', error);
    return false;
  }
}

/**
 * Rota para testar o envio de email de notificação de novo projeto
 * Acessível através de GET para facilitar testes via navegador
 */
export async function GET(request: Request) {
  devLog.log('[TEST-NEW-PROJECT] Iniciando teste de email para admin');
  
  // Extrair o email de destino da query string
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to') || 'admin@example.com';
  
  // Verificar email
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    devLog.error(`[TEST-NEW-PROJECT] Email inválido: "${to}"`);
    return NextResponse.json({
      success: false,
      error: 'Email de destino inválido'
    }, { status: 400 });
  }
  
  devLog.log(`[TEST-NEW-PROJECT] Enviando email de teste para: ${to}`);

  try {
    // ✅ COOLDOWN: Verificar cooldown antes de enviar
    const userId = `test-project-${Buffer.from(to).toString('base64').slice(0, 16)}`; // Hash do email como userID
    const isInCooldown = await isUserInEmailCooldown(userId);

    if (isInCooldown) {
      devLog.log(`[TEST-NEW-PROJECT-COOLDOWN] EMAIL BLOQUEADO POR COOLDOWN - Usuário ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'Email não enviado - usuário em cooldown de 5 minutos',
        cooldownActive: true,
        to: to
      });
    }
    // Obter credenciais
    const region = process.env.AWS_REGION || 'sa-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const senderEmail = process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
    
    // Verificar se as credenciais estão configuradas
    if (!accessKeyId || !secretAccessKey) {
      devLog.error('[TEST-NEW-PROJECT] Credenciais AWS não configuradas');
      return NextResponse.json({
        success: false,
        error: 'Credenciais AWS não configuradas'
      }, { status: 500 });
    }
    
    // Criar cliente SES
    devLog.log('[TEST-NEW-PROJECT] Criando cliente SES');
    const sesClient = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    
    // Preparar conteúdo do email para admin
    const subject = '[ADMIN] Teste de Notificação - Novo Projeto Criado';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Colmeia Solar - Admin</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #3b82f6;">Novo Projeto Criado</h2>
          <p>Um novo projeto foi criado pelo cliente <strong>Cliente de Teste</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0;"><span style="color: #6b7280;">Projeto:</span> <strong>Projeto de Teste</strong> <span style="color: #6b7280; font-weight: 500;">(FV-2024-123)</span></p>
            <p style="margin: 10px 0 0;"><span style="color: #6b7280;">Potência:</span> <strong>10.5 kWp</strong></p>
            <p style="margin: 10px 0 0;"><span style="color: #6b7280;">Distribuidora:</span> <strong>ENEL</strong></p>
          </div>
          <div style="margin: 30px 0; text-align: center;">
            <a href="https://app.colmeiasolar.com.br/projetos/TESTE123" style="background-color: #3b82f6; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Acessar Projeto</a>
          </div>
          <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Este é um e-mail automático, por favor não responda.<br>
            &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `;
    
    // Configurar comando de envio de email
    devLog.log('[TEST-NEW-PROJECT] Configurando comando de envio');
    const sendEmailCommand = new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: [to] },
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
    devLog.log(`[TEST-NEW-PROJECT] Enviando email para ${to}`);
    const result = await sesClient.send(sendEmailCommand);
    
    devLog.log(`[TEST-NEW-PROJECT] Email enviado com sucesso, MessageId: ${result.MessageId}`);

    // ✅ COOLDOWN: Atualizar cooldown após envio bem-sucedido
    await updateEmailCooldown(userId);
    
    return NextResponse.json({
      success: true,
      messageId: result.MessageId,
      cooldownActive: false
    });
  } catch (error) {
    devLog.error('[TEST-NEW-PROJECT] Erro ao enviar email:', error);
    
    return NextResponse.json({
      success: false,
      error: `Erro ao enviar email: ${error.message || 'Erro desconhecido'}`
    }, { status: 500 });
  }
} 