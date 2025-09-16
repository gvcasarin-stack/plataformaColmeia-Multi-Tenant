/**
 * API para chamar a sincronização de produção
 * Útil quando testamos localmente mas precisamos usar as APIs de produção
 */

import { NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, organizationId } = await request.json();

    if (!sessionId || !organizationId) {
      return NextResponse.json(
        { error: 'sessionId e organizationId são obrigatórios' },
        { status: 400 }
      );
    }

    devLog.log('[Production Sync] Chamando API de produção...', {
      sessionId,
      organizationId
    });

    // Chamar a API de sync simplificada de produção
    const productionUrl = 'https://goias-solar.gerenciamentofotovoltaico.com.br/api/stripe/simple-sync';

    const response = await fetch(productionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        organizationId
      })
    });

    const result = await response.json();

    devLog.log('[Production Sync] Resposta da produção:', {
      status: response.status,
      result
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Sincronização via produção bem-sucedida',
        data: result
      });
    } else {
      return NextResponse.json(
        {
          error: 'Erro na API de produção',
          details: result,
          status: response.status
        },
        { status: response.status }
      );
    }

  } catch (error: any) {
    devLog.error('[Production Sync] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno', details: error.message },
      { status: 500 }
    );
  }
}