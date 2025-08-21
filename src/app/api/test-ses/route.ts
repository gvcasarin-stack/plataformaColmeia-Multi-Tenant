/**
 * API: /api/test-ses (LEGACY - DEPRECATED)
 * 
 * Este endpoint está depreciado e será desativado em Setembro/2024.
 * Por favor, atualize suas chamadas para usar `/api/emails/send-template` em vez disso.
 * 
 * @deprecated Use `/api/emails/send-template` em vez deste endpoint
 * @date 21/08/2024
 */

import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { SESClient, SendEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';

// Definição de tipos
type AwsTestResult = {
  success: boolean;
  message: string;
  quota?: {
    max24HourSend?: number;
    sentLast24Hours?: number;
    maxSendRate?: number;
  };
  error?: string;
};

// Define informações do ambiente
const envInfo = {
  api: 'test-ses',
  version: '1.0',
  nodejs: process.version
};

// Rota GET para verificar disponibilidade
export async function GET() {
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: envInfo,
    deprecated: true,
    deprecationNotice: 'Este endpoint está depreciado e será desativado em Setembro/2024',
    migrateToEndpoint: '/api/emails/send-template',
    documentation: '/docs/api-reference.md#62-serviço-de-emails-com-templates-html'
  }, {
    headers: {
      'X-Deprecation-Warning': 'Este endpoint será desativado em Setembro/2024'
    }
  });
}

/**
 * Redireciona todas as chamadas POST para o novo endpoint
 */
export async function POST(req: NextRequest) {
  try {
    devLog.warn('[DEPRECATED] O endpoint /api/test-ses está depreciado. Use /api/emails/send-template em vez disso.');
    
    // Criar uma nova URL para o redirecionamento
    const url = new URL('/api/emails/send-template', req.url);
    
    // Obter o corpo da requisição
    const body = await req.text();
    
    // Fazer a chamada para o novo endpoint
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        // Copiar outros headers relevantes
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || ''
      },
      body
    });
    
    // Obter o corpo da resposta
    const result = await response.json();
    
    // Adicionar aviso de depreciação à resposta
    return NextResponse.json({
      ...result,
      deprecationWarning: "Este endpoint está depreciado. Use /api/emails/send-template em vez disso."
    }, {
      status: response.status,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Setembro/2024'
      }
    });
    
  } catch (error: any) {
    devLog.error('[/api/test-ses] Erro ao redirecionar:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro ao processar requisição',
      deprecationWarning: "Este endpoint está depreciado. Use /api/emails/send-template em vez disso."
    }, { 
      status: 500,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Setembro/2024'
      }
    });
  }
}

// Rota GET para testar a conexão com o SES e exibir informações
export async function GET_old() {
  try {
    // Obter as credenciais diretamente das variáveis de ambiente
    const region = process.env.AWS_REGION || 'sa-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const senderEmail = process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
    
    // Exibe informações sanitizadas (sem mostrar credenciais completas)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV || 'não definido',
      AWS_REGION: region,
      AWS_ACCESS_KEY_ID: accessKeyId ? `${accessKeyId.substring(0, 5)}...` : 'não configurado',
      AWS_SECRET_ACCESS_KEY: secretAccessKey ? '********' : 'não configurado',
      SES_SENDER_EMAIL: senderEmail,
    };
    
    // Verifica credenciais na AWS
    let awsTestResult: AwsTestResult = { success: false, message: 'Teste não executado' };
    
    if (accessKeyId && secretAccessKey) {
      try {
        // Criar cliente SES
        const sesClient = new SESClient({
          region,
          credentials: { accessKeyId, secretAccessKey }
        });
        
        // Testar obtenção de cotas
        const quotaCommand = new GetSendQuotaCommand({});
        const quotaResponse = await sesClient.send(quotaCommand);
        
        awsTestResult = {
          success: true,
          message: 'Conexão com AWS SES bem-sucedida',
          quota: {
            max24HourSend: quotaResponse.Max24HourSend,
            sentLast24Hours: quotaResponse.SentLast24Hours,
            maxSendRate: quotaResponse.MaxSendRate
          }
        };
      } catch (awsError) {
        awsTestResult = {
          success: false,
          message: 'Falha na conexão com AWS SES',
          error: awsError instanceof Error ? awsError.message : String(awsError)
        };
      }
    }
    
    return NextResponse.json({
      status: 'ok',
      message: 'API de teste SES funcionando',
      timestamp: new Date().toISOString(),
      environment: envInfo,
      awsTest: awsTestResult
    });
  } catch (error) {
    devLog.error('[API] Erro no teste de SES:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Erro ao processar teste de SES',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Rota POST para enviar um email de teste
export async function POST_old(request: Request) {
  devLog.log('[API-SES] Iniciando processamento de envio de email de teste');
  try {
    // Extrair email de destino do corpo da requisição
    const body = await request.json();
    const { email, subject = 'Teste API SES - Colmeia Solar', htmlContent } = body;
    
    devLog.log(`[API-SES] Dados recebidos: email="${email}", subject="${subject}", htmlContent tamanho=${htmlContent?.length || 0}`);
    
    // Validar email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      devLog.error(`[API-SES] Email inválido: "${email}"`);
      return NextResponse.json(
        { error: 'Email de destino inválido ou não fornecido' },
        { status: 400 }
      );
    }
    
    // Obter credenciais
    const region = process.env.AWS_REGION || 'sa-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    const senderEmail = process.env.SES_SENDER_EMAIL || 'no-reply@colmeiasolar.com';
    
    devLog.log(`[API-SES] Usando região: ${region}, sender: ${senderEmail}, AWS key começa com: ${accessKeyId ? accessKeyId.substring(0, 3) : 'não definida'}`);
    
    // Verificar se as credenciais estão configuradas
    if (!accessKeyId || !secretAccessKey) {
      devLog.error('[API-SES] Credenciais AWS não configuradas');
      return NextResponse.json(
        { error: 'Credenciais AWS não configuradas' },
        { status: 500 }
      );
    }
    
    // Criar cliente SES
    devLog.log('[API-SES] Criando cliente SES');
    const sesClient = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });
    
    // Preparar conteúdo do email (usar o conteúdo fornecido ou o padrão)
    const finalHtmlContent = htmlContent || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #10b981; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Colmeia Solar</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #10b981;">Teste de Email SES</h2>
          <p>Este é um email de teste direto da API para verificar a configuração do AWS SES.</p>
          <p>Se você está recebendo este email, significa que a configuração está funcionando corretamente!</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p style="color: #6b7280; font-size: 0.8rem; margin-top: 30px; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            Este é um email automático, por favor não responda.<br>
            &copy; ${new Date().getFullYear()} Colmeia Solar. Todos os direitos reservados.
          </p>
        </div>
      </div>
    `;
    
    // Configurar comando de envio de email
    devLog.log('[API-SES] Configurando comando de envio');
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
    
    // Enviar email
    devLog.log(`[API-SES] Tentando enviar email de teste para ${email}`);
    try {
      const response = await sesClient.send(sendEmailCommand);
      devLog.log(`[API-SES] Email enviado com sucesso, ID: ${response.MessageId}`);
      
      return NextResponse.json({
        success: true,
        message: `Email de teste enviado para ${email}`,
        messageId: response.MessageId
      });
    } catch (sesError) {
      devLog.error('[API-SES] Erro específico do SES ao enviar email:', sesError);
      const errorDetail = sesError instanceof Error 
        ? { message: sesError.message, name: sesError.name, code: (sesError as any).code }
        : String(sesError);
      devLog.error('[API-SES] Detalhes do erro SES:', JSON.stringify(errorDetail));
      
      return NextResponse.json(
        { 
          success: false,
          error: sesError instanceof Error ? sesError.message : String(sesError),
          errorDetail
        },
        { status: 500 }
      );
    }
  } catch (error) {
    devLog.error('[API-SES] Erro geral ao processar requisição de email:', error);
    const errorDetail = error instanceof Error 
      ? { message: error.message, name: error.name, stack: error.stack }
      : String(error);
    devLog.error('[API-SES] Detalhes do erro:', JSON.stringify(errorDetail));
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorDetail
      },
      { status: 500 }
    );
  }
}
