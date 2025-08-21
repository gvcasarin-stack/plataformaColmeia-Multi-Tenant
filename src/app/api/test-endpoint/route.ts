/**
 * API: /api/test-endpoint (LEGACY - DEPRECATED)
 * 
 * Este endpoint está depreciado e será desativado em Outubro/2025.
 * Por favor, atualize suas chamadas para usar `/api/system/diagnostics` em vez disso.
 * 
 * @deprecated Use `/api/system/diagnostics` em vez deste endpoint
 * @date 25/08/2025
 */

import { devLog } from "@/lib/utils/productionLogger";
import { NextRequest, NextResponse } from 'next/server';

// Rota GET para redirecionar para o novo endpoint
export async function GET(req: NextRequest) {
  try {
    devLog.warn('[DEPRECATED] O endpoint /api/test-endpoint está depreciado. Use /api/system/diagnostics em vez disso.');
    
    // Criar uma nova URL para o redirecionamento
    const url = new URL('/api/system/diagnostics', req.url);
    
    // Preservar os query params
    const searchParams = new URL(req.url).searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    
    // Fazer a chamada para o novo endpoint
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // Copiar headers relevantes
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || ''
      }
    });
    
    // Obter o corpo da resposta
    const result = await response.json();
    
    // Adicionar aviso de depreciação à resposta
    return NextResponse.json({
      ...result,
      deprecationWarning: "Este endpoint está depreciado. Use /api/system/diagnostics em vez disso."
    }, {
      status: response.status,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Outubro/2025'
      }
    });
    
  } catch (error: any) {
    devLog.error('[/api/test-endpoint] Erro ao redirecionar:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro ao processar requisição',
      deprecationWarning: "Este endpoint está depreciado. Use /api/system/diagnostics em vez disso."
    }, { 
      status: 500,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Outubro/2025'
      }
    });
  }
}
