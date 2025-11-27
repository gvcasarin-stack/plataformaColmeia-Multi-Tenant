/**
 * 🛠️ UTILITÁRIO PARA LIDAR COM TENANTS TEMPORÁRIOS
 * Funções para detectar e lidar com tenants temporários nas APIs
 */

import { NextResponse } from 'next/server';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * Verificar se é um tenant temporário e retornar resposta apropriada
 * @param tenantId - ID do tenant a ser verificado
 * @param dataType - Tipo de dados a serem retornados ('object' para {}, 'array' para [])
 * @param apiName - Nome da API para logs
 * @returns Response ou null se não for temporário
 */
export function handleTempTenant(
  tenantId: string | null,
  dataType: 'object' | 'array' = 'object',
  apiName: string = 'API'
): NextResponse | null {

  if (!tenantId) {
    return null; // Deixar API original lidar com tenant vazio
  }

  // Verificar se é tenant temporário
  if (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-')) {
    devLog.log(`[${apiName}] Tenant temporário detectado, retornando dados vazios:`, tenantId);

    if (apiName === 'ClientCount') {
      // Special case for client count API - return count: 0
      return NextResponse.json({
        success: true,
        count: 0
      });
    }

    if (apiName === 'UsageStats') {
      // Special case for usage stats API - return proper structure
      return NextResponse.json({
        success: true,
        data: {
          projects: { current: 0, limit: 30, percentage: 0 },
          users: { current: 0, limit: 10, percentage: 0 },
          clients: { current: 0, limit: 100, percentage: 0 },
          storage: { current: 0, limit: 3, percentage: 0 },
          apiCalls: { current: 0, limit: 2000, percentage: 0 }
        }
      });
    }

    const emptyData = dataType === 'array' ? [] : {};

    return NextResponse.json({
      success: true,
      data: emptyData
    });
  }

  return null; // Não é temporário, continuar execução normal
}

/**
 * Verificar se tenant é válido para operações no banco
 * @param tenantId - ID do tenant
 * @returns boolean
 */
export function isValidTenantForDb(tenantId: string | null): boolean {
  if (!tenantId) return false;

  // Tenants temporários não são válidos para DB
  if (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-')) {
    return false;
  }

  // Verificar se parece com UUID válido
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

/**
 * Obter resposta padrão para tenant temporário
 */
export function getTempTenantResponse(dataType: 'object' | 'array' = 'object') {
  const emptyData = dataType === 'array' ? [] : {};

  return {
    success: true,
    data: emptyData,
    note: 'Tenant temporário - dados não disponíveis',
    tempTenant: true
  };
}