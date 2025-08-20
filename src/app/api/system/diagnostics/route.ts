/**
 * API: /api/system/diagnostics
 * 
 * Endpoint para diagnóstico do sistema que fornece informações sobre o estado atual.
 * Útil para monitoramento e verificações de saúde.
 * 
 * @author Equipe de Desenvolvimento Colmeia
 * @date 25/08/2025
 */

import { NextRequest } from 'next/server';
import { 
  createApiSuccess, 
  handleApiError 
} from '@/lib/utils/apiErrorHandler';
import logger from '@/lib/utils/logger';

/**
 * Retorna informações de diagnóstico do sistema
 */
export async function GET(_req: NextRequest) {
  try {
    logger.info('[SYSTEM/DIAGNOSTICS] Endpoint de diagnóstico acessado');
    
    // Coletar informações do sistema
    const systemInfo = {
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      apiVersion: '2.0.0'
    };
    
    // Retornar informações coletadas
    return createApiSuccess({
      status: 'healthy',
      system: systemInfo
    }, 'Sistema operando normalmente');
  } catch (error) {
    logger.error('[SYSTEM/DIAGNOSTICS] Erro:', error);
    return handleApiError(
      error,
      'Erro ao obter informações de diagnóstico do sistema'
    );
  }
}

/**
 * Fornece informações sobre o endpoint quando acessado via OPTIONS
 */
export async function OPTIONS() {
  return createApiSuccess({
    endpoint: '/api/system/diagnostics',
    description: 'Fornece informações de diagnóstico sobre o estado atual do sistema',
    methods: ['GET'],
    authorization: 'Não requer autenticação',
    responseFormat: {
      status: 'Status do sistema (healthy/degraded/down)',
      system: {
        environment: 'Ambiente de execução (development/production)',
        nodeVersion: 'Versão do Node.js',
        uptime: 'Tempo de execução do servidor em segundos',
        timestamp: 'Data e hora atual ISO 8601',
        memoryUsage: 'Uso de memória do processo',
        apiVersion: 'Versão da API'
      }
    }
  });
} 