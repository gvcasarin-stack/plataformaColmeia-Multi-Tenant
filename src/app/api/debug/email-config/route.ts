import { NextRequest, NextResponse } from 'next/server';
import { AWS_CONFIG } from '@/lib/aws/config';

/**
 * API de DEBUG para verificar configurações de email
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar configurações AWS
    const region = AWS_CONFIG.getRegion();
    const credentials = AWS_CONFIG.getCredentials();
    const sourceEmail = AWS_CONFIG.getSESSourceEmail();

    // Informações detalhadas das variáveis de ambiente
    const debugInfo = {
      timestamp: new Date().toISOString(),
      
      // ✅ Configurações processadas pelo AWS_CONFIG
      processedConfig: {
        region,
        hasAccessKey: !!credentials.accessKeyId,
        hasSecretKey: !!credentials.secretAccessKey,
        accessKeyPreview: credentials.accessKeyId ? `${credentials.accessKeyId.substring(0, 8)}...` : 'MISSING',
        sourceEmail,
      },

      // 🔍 Variáveis de ambiente RAW (como as APIs que funcionavam usavam)
      rawEnvVars: {
        EMAIL_FROM: process.env.EMAIL_FROM || 'UNDEFINED',
        SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL || 'UNDEFINED', 
        AWS_REGION: process.env.AWS_REGION || 'UNDEFINED',
        AWS_ACCESS_KEY_ID_EXISTS: !!process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY_EXISTS: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_ACCESS_KEY_ID_PREVIEW: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'MISSING'
      },

      // 🚨 COMPARAÇÃO: Como as APIs que funcionavam configuravam vs função centralizada
      comparison: {
        workingApiConfig: `process.env.EMAIL_FROM || 'email_nao_configurado@exemplo.com'`,
        workingApiConfigValue: process.env.EMAIL_FROM || 'email_nao_configurado@exemplo.com',
        centralizedFunctionConfig: `AWS_CONFIG.getSESSourceEmail()`,
        centralizedFunctionConfigValue: sourceEmail,
        MISMATCH: (process.env.EMAIL_FROM || 'email_nao_configurado@exemplo.com') !== sourceEmail
      }
    };

    return NextResponse.json({
      success: true,
      message: "Configurações de email - DEBUG",
      data: debugInfo
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}