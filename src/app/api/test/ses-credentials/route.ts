import { NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { SESClient, GetSendQuotaCommand } from '@aws-sdk/client-ses';

// Rota de teste apenas para verificar as credenciais sem enviar email
export async function GET() {
  try {
    // Criar cliente SES diretamente
    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    
    // Apenas verifica as credenciais solicitando as cotas de envio
    devLog.log('Verificando credenciais SES...');
    const command = new GetSendQuotaCommand({});
    
    try {
      const result = await sesClient.send(command);
      devLog.log('Credenciais válidas! Cotas de envio:', result);
      return NextResponse.json({ 
        success: true, 
        message: 'Credenciais válidas',
        quotas: result,
        config: {
          region: process.env.AWS_REGION,
          accessKeyPresent: !!process.env.AWS_ACCESS_KEY_ID,
          secretKeyPresent: !!process.env.AWS_SECRET_ACCESS_KEY
        }
      });
    } catch (authError) {
      devLog.error('Erro de autenticação SES:', JSON.stringify(authError, null, 2));
      return NextResponse.json({ 
        success: false, 
        error: 'Erro de autenticação SES',
        message: authError.message,
        name: authError.name,
        errorDetail: JSON.stringify(authError),
        config: {
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID?.substring(0, 5) + '...',
          secretKeyPresent: !!process.env.AWS_SECRET_ACCESS_KEY
        }
      }, { status: 401 });
    }
  } catch (error) {
    devLog.error('Erro geral:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro geral ao processar solicitação',
      message: error.message
    }, { status: 500 });
  }
} 