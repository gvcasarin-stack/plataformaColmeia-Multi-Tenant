/**
 * 🔒 UTILITÁRIOS DE SEGURANÇA MULTI-TENANT - CLIENT SIDE
 * Funções para client-side que não dependem de server-side imports
 */

import { devLog } from '@/lib/utils/productionLogger';

/**
 * 🔒 HELPER PARA VALIDAÇÃO DE TENANT NO LOGIN (CLIENT-SIDE)
 * Obtém o tenant_id baseado no domínio atual
 */
export function getCurrentDomainTenantId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const hostname = window.location.hostname;

    // Mapear domínios para tenant IDs (baseado no middleware.ts)
    const tenantMap: Record<string, string> = {
      'goias-solar': '5790d7a1-1c54-4fa8-b509-db766ca6bc3c',
      'suprema': '3e446dd9-44d2-4e22-ae7e-edbac10edf73'
    };

    // Extrair slug do hostname
    let tenantSlug = '';

    if (hostname.includes('goias-solar')) {
      tenantSlug = 'goias-solar';
    } else if (hostname.includes('suprema')) {
      tenantSlug = 'suprema';
    }

    const tenantId = tenantMap[tenantSlug];

    devLog.log('[getCurrentDomainTenantId] Tenant extraído:', {
      hostname,
      tenantSlug,
      tenantId
    });

    return tenantId || null;

  } catch (error) {
    devLog.error('[getCurrentDomainTenantId] Erro ao extrair tenant do domínio:', error);
    return null;
  }
}

/**
 * 🔒 FUNÇÃO PARA BUSCAR TENANT DO USUÁRIO (CLIENT-SIDE)
 * Usa API para buscar informações do tenant sem server imports
 */
export async function getUserTenantInfo(userId: string): Promise<{ tenant_id: string; organization: { name: string } } | null> {
  try {
    if (!userId) {
      devLog.error('[getUserTenantInfo] User ID não fornecido');
      return null;
    }

    const response = await fetch('/api/user/tenant-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      devLog.error('[getUserTenantInfo] API retornou erro:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.tenantInfo) {
      return data.tenantInfo;
    }

    devLog.warn('[getUserTenantInfo] Tenant info não encontrada para usuário:', userId);
    return null;

  } catch (error: any) {
    devLog.error('[getUserTenantInfo] Erro ao buscar tenant info:', error.message);
    return null;
  }
}