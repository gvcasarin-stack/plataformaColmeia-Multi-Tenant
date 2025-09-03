import { NextRequest, NextResponse } from 'next/server';

/**
 * API DE TESTE ISOLADO - EMAIL DIRETO
 * Testa APENAS o envio de email, sem notificações ou banco
 */
export async function POST(request: NextRequest) {
  console.log('🔍 [TEST-EMAIL-ISOLATED] =================================');
  console.log('🔍 [TEST-EMAIL-ISOLATED] INÍCIO DO TESTE ISOLADO DE EMAIL');
  console.log('🔍 [TEST-EMAIL-ISOLATED] Timestamp:', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { to, subject, message } = body;
    
    console.log('🔍 [TEST-EMAIL-ISOLATED] Parâmetros recebidos:', {
      to,
      subject,
      messageLength: message?.length
    });
    
    // Validação básica
    if (!to || !subject || !message) {
      console.error('❌ [TEST-EMAIL-ISOLATED] Parâmetros faltando');
      return NextResponse.json({ 
        error: 'Parâmetros obrigatórios: to, subject, message' 
      }, { status: 400 });
    }
    
    // TESTE 1: Verificar variáveis de ambiente
    console.log('🔍 [TEST-EMAIL-ISOLATED] TESTE 1: Verificando variáveis de ambiente...');
    const envCheck = {
      AWS_REGION: process.env.AWS_REGION ? '✅ DEFINIDA' : '❌ FALTANDO',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '✅ DEFINIDA' : '❌ FALTANDO',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '✅ DEFINIDA' : '❌ FALTANDO',
      SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL || '❌ FALTANDO',
      EMAIL_FROM: process.env.EMAIL_FROM || '❌ FALTANDO'
    };
    console.log('🔍 [TEST-EMAIL-ISOLATED] Variáveis:', envCheck);
    
    // TESTE 2: Tentar importar e usar o serviço de email
    console.log('🔍 [TEST-EMAIL-ISOLATED] TESTE 2: Importando serviço de email...');
    try {
      const { sendEmail } = await import('@/lib/services/emailService');
      console.log('✅ [TEST-EMAIL-ISOLATED] Serviço importado com sucesso');
      
      // TESTE 3: Enviar email de teste
      console.log('🔍 [TEST-EMAIL-ISOLATED] TESTE 3: Enviando email...');
      console.log('🔍 [TEST-EMAIL-ISOLATED] Destinatário:', to);
      console.log('🔍 [TEST-EMAIL-ISOLATED] Assunto:', subject);
      
      const emailResult = await sendEmail(
        to,
        subject,
        `<h2>Teste Isolado de Email</h2>
        <p>${message}</p>
        <hr>
        <p><small>Teste realizado em: ${new Date().toLocaleString('pt-BR')}</small></p>`,
        process.env.SES_SENDER_EMAIL || process.env.EMAIL_FROM
      );
      
      console.log('🔍 [TEST-EMAIL-ISOLATED] Resultado do envio:', emailResult);
      
      if (emailResult) {
        console.log('✅ [TEST-EMAIL-ISOLATED] EMAIL ENVIADO COM SUCESSO!');
        return NextResponse.json({ 
          success: true, 
          message: 'Email enviado com sucesso!',
          details: {
            to,
            subject,
            timestamp: new Date().toISOString(),
            environment: envCheck
          }
        });
      } else {
        console.error('❌ [TEST-EMAIL-ISOLATED] Falha no envio do email');
        return NextResponse.json({ 
          success: false, 
          error: 'Email não foi enviado',
          environment: envCheck
        }, { status: 500 });
      }
      
    } catch (importError: any) {
      console.error('❌ [TEST-EMAIL-ISOLATED] Erro ao importar serviço:', importError);
      return NextResponse.json({ 
        error: 'Erro ao importar serviço de email',
        details: importError.message,
        environment: envCheck
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ [TEST-EMAIL-ISOLATED] ERRO GERAL:', error);
    return NextResponse.json({ 
      error: 'Erro no teste de email',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    console.log('🔍 [TEST-EMAIL-ISOLATED] FIM DO TESTE');
    console.log('🔍 [TEST-EMAIL-ISOLATED] =================================');
  }
}