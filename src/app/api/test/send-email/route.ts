import { NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

// ✅ COOLDOWN: Cliente Supabase e configurações
const supabase = createSupabaseServiceRoleClient();
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const TEST_PROJECT_ID = 'test-email-api'; // ID fixo para APIs de teste

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
      devLog.error('[TEST-EMAIL-COOLDOWN] Erro ao consultar cooldown:', error);
      return false;
    }

    if (data && data.last_email_sent_at) {
      const lastSentTime = new Date(data.last_email_sent_at).getTime();
      const now = Date.now();
      return (now - lastSentTime) < COOLDOWN_DURATION_MS;
    }
    return false;
  } catch (error) {
    devLog.error('[TEST-EMAIL-COOLDOWN] Erro inesperado ao verificar cooldown:', error);
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
      devLog.error('[TEST-EMAIL-COOLDOWN] Erro ao atualizar cooldown:', error);
      return false;
    }
    devLog.log(`[TEST-EMAIL-COOLDOWN] Cooldown atualizado para usuário ${userId} projeto ${TEST_PROJECT_ID}`);
    return true;
  } catch (error) {
    devLog.error('[TEST-EMAIL-COOLDOWN] Erro inesperado ao atualizar cooldown:', error);
    return false;
  }
}

// Rota de teste para enviar email com Amazon SES
export async function GET(request: Request) {
  // Extrair o email de destino da query string
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  
  if (!to) {
    return NextResponse.json({ error: 'Parâmetro "to" é obrigatório' }, { status: 400 });
  }

  try {
    devLog.log('=== TESTE DE EMAIL SES ===');
    devLog.log('Enviando para:', to);

    // ✅ COOLDOWN: Verificar cooldown antes de enviar
    const userId = `test-user-${Buffer.from(to).toString('base64').slice(0, 16)}`; // Hash do email como userID
    const isInCooldown = await isUserInEmailCooldown(userId);

    if (isInCooldown) {
      devLog.log(`[TEST-EMAIL-COOLDOWN] EMAIL BLOQUEADO POR COOLDOWN - Usuário ${userId}`);
      return NextResponse.json({
        success: true,
        message: 'Email não enviado - usuário em cooldown de 5 minutos',
        cooldownActive: true,
        to: to
      });
    }
    
    // Criar cliente SES diretamente aqui para debugging
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'sa-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    
    // Mostrar as configurações (sem mostrar a chave secreta completa)
    devLog.log('Configurações SES:', {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + '...',
      secretAccessPresent: !!process.env.AWS_SECRET_ACCESS_KEY,
      from: process.env.EMAIL_FROM || 'email_nao_configurado@exemplo.com',
    });
    
    // Email simples para teste
    const params = {
      Source: process.env.EMAIL_FROM || 'email_nao_configurado@exemplo.com',
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: 'Teste de Email da Plataforma Colmeia',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'Este é um email de teste para verificar a integração com Amazon SES.',
            Charset: 'UTF-8',
          },
          Html: {
            Data: '<h1>Teste de Email</h1><p>Este é um email de teste para verificar a integração com Amazon SES.</p>',
            Charset: 'UTF-8',
          },
        },
      },
    };
    
    devLog.log('Enviando comando SES...');
    const command = new SendEmailCommand(params);
    
    try {
      const result = await sesClient.send(command);
      devLog.log('Email enviado com sucesso:', result.MessageId);

      // ✅ COOLDOWN: Atualizar cooldown após envio bem-sucedido
      await updateEmailCooldown(userId);

      return NextResponse.json({ 
        success: true, 
        message: 'Email enviado com sucesso',
        messageId: result.MessageId,
        cooldownActive: false,
        config: {
          region: process.env.AWS_REGION,
          accessKeyPresent: !!process.env.AWS_ACCESS_KEY_ID,
          secretKeyPresent: !!process.env.AWS_SECRET_ACCESS_KEY,
          fromEmail: process.env.EMAIL_FROM,
        }
      });
    } catch (sendError) {
      devLog.error('Erro específico ao enviar email:', JSON.stringify(sendError, null, 2));
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao enviar email via SES',
        message: sendError.message,
        name: sendError.name,
        errorDetail: JSON.stringify(sendError),
        config: {
          region: process.env.AWS_REGION,
          accessKeyPresent: !!process.env.AWS_ACCESS_KEY_ID,
          secretKeyPresent: !!process.env.AWS_SECRET_ACCESS_KEY,
          fromEmail: process.env.EMAIL_FROM,
        }
      }, { status: 500 });
    }
  } catch (error) {
    devLog.error('Erro geral:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro geral ao processar solicitação',
      message: error.message,
      config: {
        region: process.env.AWS_REGION,
        accessKeyPresent: !!process.env.AWS_ACCESS_KEY_ID,
        secretKeyPresent: !!process.env.AWS_SECRET_ACCESS_KEY,
        fromEmail: process.env.EMAIL_FROM,
      }
    }, { status: 500 });
  }
} 