/**
 * API: /api/test-storage (LEGACY - DEPRECATED)
 * 
 * Este endpoint está depreciado e será desativado em Outubro/2025.
 * Por favor, atualize suas chamadas para usar `/api/storage/diagnostics` em vez disso.
 * 
 * @deprecated Use `/api/storage/diagnostics` em vez deste endpoint
 * @date 25/08/2025
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/utils/logger';

// Define informações do ambiente (usado no log e cabeçalho de depreciação)
const _envInfo = {
  api: 'test-storage',
  version: '1.0',
  nodejs: process.version
};

// Rota GET para verificar disponibilidade e redirecionar
export async function GET(req: NextRequest) {
  try {
    logger.warn('[DEPRECATED] O endpoint /api/test-storage está depreciado. Use /api/storage/diagnostics em vez disso.');
    
    // Criar uma nova URL para o redirecionamento
    const url = new URL('/api/storage/diagnostics', req.url);
    
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
      deprecationWarning: "Este endpoint está depreciado. Use /api/storage/diagnostics em vez disso."
    }, {
      status: response.status,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Outubro/2025'
      }
    });
    
  } catch (error: any) {
    logger.error('[/api/test-storage] Erro ao redirecionar:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro ao processar requisição',
      deprecationWarning: "Este endpoint está depreciado. Use /api/storage/diagnostics em vez disso."
    }, { 
      status: 500,
      headers: {
        'X-Deprecation-Warning': 'Este endpoint será desativado em Outubro/2025'
      }
    });
  }
} 