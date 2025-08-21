import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/services/emailService';

export async function GET(request: NextRequest) {
  // 🚨 DESABILITADO: Não enviar e-mails automáticos durante build
  const isManualTest = request.nextUrl.searchParams.get('force') === 'true';
  
  if (!isManualTest) {
    return NextResponse.json({
      success: false,
      message: 'API desabilitada. Use ?force=true para teste manual.',
      note: 'Esta API estava enviando e-mails automáticos durante builds'
    });
  }
  
  try {
    console.log('[DIRECT EMAIL TEST] 🔍 Testando sendEmail diretamente...');
    
    const testEmail = 'gvcasarin@gmail.com';
    const subject = 'TESTE DIRETO - Sistema de Email';
    const htmlBody = `
      <html>
        <body>
          <h2>🧪 TESTE DIRETO DO SISTEMA DE EMAIL</h2>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Função:</strong> sendEmail() direta</p>
          <p><strong>Status:</strong> Sem cooldown, sem intermediários</p>
          <p>Se você recebeu este email, o sistema básico está funcionando!</p>
        </body>
      </html>
    `;
    
    console.log('[DIRECT EMAIL TEST] 🔍 Parâmetros:', {
      testEmail,
      subject,
      htmlBodyLength: htmlBody.length
    });
    
    // Chamar sendEmail DIRETAMENTE (sem cooldown, sem intermediários)
    const result = await sendEmail([testEmail], subject, htmlBody);
    
    console.log('[DIRECT EMAIL TEST] 🔍 Resultado:', { result });
    
    return NextResponse.json({
      success: true,
      data: {
        emailSent: result,
        testDetails: {
          recipient: testEmail,
          subject,
          timestamp: new Date().toISOString(),
          method: 'sendEmail() direct call'
        },
        analysis: {
          shouldReceiveEmail: result,
          checkSpamFolder: true,
          expectedDeliveryTime: '1-5 minutes'
        }
      }
    });
    
  } catch (error: any) {
    console.error('[DIRECT EMAIL TEST] ❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    });
  }
}
