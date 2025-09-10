/**
 * API de Debug para testar integração do Stripe
 * Permite verificar dados enviados e diagnosticar problemas
 */

import { NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    devLog.log('[Stripe-Debug] Iniciando teste de integração');
    
    // Capturar dados enviados
    const body = await request.json();
    const { planType, organizationId, tenantId, testMode = true } = body;

    devLog.log('[Stripe-Debug] Dados recebidos:', {
      planType,
      organizationId,
      tenantId,
      testMode,
      bodyKeys: Object.keys(body),
      bodySize: JSON.stringify(body).length
    });

    // Validação detalhada
    const validation = {
      planType: {
        provided: !!planType,
        type: typeof planType,
        value: planType,
        valid: ['basico', 'profissional'].includes(planType)
      },
      organizationId: {
        provided: !!organizationId,
        type: typeof organizationId,
        value: organizationId,
        valid: !!organizationId && typeof organizationId === 'string' && organizationId.length > 0
      },
      tenantId: {
        provided: !!tenantId,
        type: typeof tenantId,
        value: tenantId,
        valid: !!tenantId && typeof tenantId === 'string' && tenantId.length > 0
      }
    };

    devLog.log('[Stripe-Debug] Validação detalhada:', validation);

    // Verificar se todos os dados obrigatórios estão presentes
    const missingData = [];
    if (!planType) missingData.push('planType');
    if (!organizationId) missingData.push('organizationId');
    if (!tenantId) missingData.push('tenantId');

    if (missingData.length > 0) {
      const errorDetails = {
        error: 'Dados obrigatórios não fornecidos',
        missing: missingData,
        received: body,
        validation
      };
      
      devLog.error('[Stripe-Debug] Dados faltando:', errorDetails);
      
      return NextResponse.json({
        success: false,
        error: 'Dados obrigatórios não fornecidos',
        details: errorDetails
      }, { status: 400 });
    }

    // Se chegou até aqui, dados estão OK
    const successDetails = {
      message: 'Todos os dados obrigatórios foram fornecidos',
      validation,
      wouldProceed: true,
      nextStep: testMode ? 'Teste concluído' : 'Prosseguir para Stripe'
    };

    devLog.log('[Stripe-Debug] Teste bem-sucedido:', successDetails);

    return NextResponse.json({
      success: true,
      data: successDetails
    });

  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      name: error.name
    };

    devLog.error('[Stripe-Debug] Erro no teste:', errorDetails);

    return NextResponse.json({
      success: false,
      error: 'Erro interno no teste',
      details: errorDetails
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Endpoint para verificar status da API de debug
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'status') {
    return NextResponse.json({
      success: true,
      message: 'API de debug do Stripe funcionando',
      timestamp: new Date().toISOString(),
      endpoints: {
        'POST /api/debug/stripe-test': 'Testar dados enviados para o Stripe',
        'GET /api/debug/stripe-test?action=status': 'Verificar status da API'
      }
    });
  }

  return NextResponse.json({
    success: true,
    message: 'Use POST para testar dados ou GET?action=status para verificar status'
  });
}
