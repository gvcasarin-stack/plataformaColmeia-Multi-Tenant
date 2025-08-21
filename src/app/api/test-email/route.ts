/**
 * API: /api/test-email (LEGACY - DEPRECATED)
 * 
 * Este endpoint está depreciado e será desativado em Setembro/2024.
 * Por favor, atualize suas chamadas para usar `/api/emails/send` em vez disso.
 * 
 * @deprecated Use `/api/emails/send` em vez deste endpoint
 * @date 21/05/2024
 */

import { devLog } from "@/lib/utils/productionLogger";
import { NextRequest, NextResponse } from 'next/server';

// Define informações do ambiente
const envInfo = {
  api: 'test-email',
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
    migrateToEndpoint: '/api/emails/send',
    documentation: '/docs/api-reference.md#61-serviço-de-emails'
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
    devLog.warn('[DEPRECATED] O endpoint /api/test-email está depreciado. Use /api/emails/send em vez disso.');
    
    // Criar uma nova URL para o redirecionamento
    const url = new URL('/api/emails/send', req.url);
    
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
      deprecationWarning: "Este endpoint está depreciado. Use /api/emails/send em vez disso."
    }, {
      status: response.status,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Setembro/2024'
      }
    });
    
  } catch (error: any) {
    devLog.error('[/api/test-email] Erro ao redirecionar:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro ao processar requisição',
      deprecationWarning: "Este endpoint está depreciado. Use /api/emails/send em vez disso."
    }, { 
      status: 500,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Setembro/2024'
      }
    });
  }
}
