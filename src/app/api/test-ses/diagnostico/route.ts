import { NextResponse } from 'next/server';
import { SESClient, GetSendQuotaCommand, ListIdentitiesCommand } from '@aws-sdk/client-ses';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import logger from '@/lib/utils/logger';
// import { logUnauthorizedAccess, logAdminAction } from '@/lib/utils/security-audit'; // TEMPORARIAMENTE DESABILITADO

/**
 * Rota GET para diagnóstico avançado de configuração SES
 * Esta rota fornece informações detalhadas sobre o ambiente e tenta
 * conexão com AWS SES para verificar se as credenciais estão corretas
 * Protegida: Apenas usuários admin ou superadmin podem acessar
 */
export async function GET(request: Request) {
  logger.debug('[DIAGNOSTICO-SES] Iniciando diagnóstico completo de AWS SES');
  
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'admin' && session.user.role !== 'superadmin')) {
      // TODO: Registrar tentativa de acesso não autorizado (função temporariamente desabilitada)
      logger.warn('[DIAGNOSTICO-SES] Tentativa de acesso não autorizado:', {
        userId: session?.user?.id,
        email: session?.user?.email,
        route: '/api/test-ses/diagnostico',
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });
      
      logger.warn('[DIAGNOSTICO-SES] Tentativa de acesso não autorizado');
      return NextResponse.json({
        error: 'Não autorizado',
        message: 'Você precisa ser administrador para acessar esta rota'
      }, { status: 403 });
    }
    
    // TODO: Registrar acesso autorizado (função temporariamente desabilitada)
    logger.info('[DIAGNOSTICO-SES] Acesso autorizado por admin:', {
      adminId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      details: 'Iniciando diagnóstico completo de AWS SES'
    });
    
    // 1. Verificar variáveis de ambiente
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'não definido',
      VERCEL_ENV: process.env.VERCEL_ENV || 'não definido',
      AWS_REGION: process.env.AWS_REGION || 'não definido',
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID 
        ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 4)}...${process.env.AWS_ACCESS_KEY_ID.substring(process.env.AWS_ACCESS_KEY_ID.length - 4)}` 
        : 'não definido',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY 
        ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 4)}...${process.env.AWS_SECRET_ACCESS_KEY.substring(process.env.AWS_SECRET_ACCESS_KEY.length - 4)}` 
        : 'não definido',
      SES_SENDER_EMAIL: process.env.SES_SENDER_EMAIL || 'não definido',
    };
    
    logger.debug('[DIAGNOSTICO-SES] Variáveis de ambiente verificadas:', envVars);
    
    // 2. Preparar para conexão AWS
    const awsTests = {
      credentialsPresent: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'sa-east-1',
      senderEmail: process.env.SES_SENDER_EMAIL || 'não definido',
    };
    
    // 3. Verificar se as credenciais estão presentes
    if (!awsTests.credentialsPresent) {
      logger.error('[DIAGNOSTICO-SES] Credenciais AWS ausentes ou incompletas');
      return NextResponse.json({
        diagnostico: 'falha',
        mensagem: 'Credenciais AWS não configuradas corretamente',
        ambiente: envVars,
        aws: awsTests,
      });
    }
    
    // 4. Tentar conexão com AWS SES
    logger.debug('[DIAGNOSTICO-SES] Tentando conectar ao AWS SES');
    const sesClient = new SESClient({
      region: awsTests.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    
    // 5. Obter cotas de envio
    try {
      logger.debug('[DIAGNOSTICO-SES] Verificando cotas de envio');
      const quotaCommand = new GetSendQuotaCommand({});
      const quotaResponse = await sesClient.send(quotaCommand);
      
      // 6. Obter identidades verificadas
      logger.debug('[DIAGNOSTICO-SES] Verificando identidades configuradas');
      const identitiesCommand = new ListIdentitiesCommand({
        IdentityType: 'EmailAddress',
        MaxItems: 10
      });
      const identitiesResponse = await sesClient.send(identitiesCommand);
      
      const sesStatus = {
        conectado: true,
        cotas: {
          envioMaximoDiario: quotaResponse.Max24HourSend,
          enviadoUltimas24Horas: quotaResponse.SentLast24Hours,
          taxaMaximaEnvio: quotaResponse.MaxSendRate
        },
        identidades: identitiesResponse.Identities || [],
        senderEmailVerificado: identitiesResponse.Identities?.includes(awsTests.senderEmail) || false
      };
      
      logger.debug('[DIAGNOSTICO-SES] Diagnóstico completo com sucesso');
      return NextResponse.json({
        diagnostico: 'sucesso',
        mensagem: 'Conexão com AWS SES bem-sucedida',
        ambiente: envVars,
        aws: {
          ...awsTests,
          sesStatus
        }
      });
    } catch (sesError) {
      logger.error('[DIAGNOSTICO-SES] Erro na conexão com AWS SES:', 
        sesError instanceof Error ? sesError.message : sesError);
      
      return NextResponse.json({
        diagnostico: 'falha',
        mensagem: 'Falha na conexão com AWS SES',
        erro: sesError instanceof Error ? sesError.message : String(sesError),
        ambiente: envVars,
        aws: awsTests,
      });
    }
  } catch (error) {
    logger.error('[DIAGNOSTICO-SES] Erro no diagnóstico:', error);
    return NextResponse.json({
      diagnostico: 'erro',
      mensagem: 'Erro ao executar diagnóstico',
      erro: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 