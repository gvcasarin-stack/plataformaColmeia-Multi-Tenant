/**
 * 🔒 UTILITÁRIOS DE SEGURANÇA MULTI-TENANT - CLIENT SIDE
 * Funções para client-side que não dependem de server-side imports
 */

import { devLog } from '@/lib/utils/productionLogger';

/**
 * 🚀 HELPER DINÂMICO PARA VALIDAÇÃO DE TENANT NO LOGIN (CLIENT-SIDE)
 * Obtém o tenant_id baseado no domínio atual usando headers do middleware
 */
export function getCurrentDomainTenantId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const hostname = window.location.hostname;

    // 1. PRIMEIRO: Tentar obter do header do middleware dinâmico
    const tenantIdFromHeader = (window as any).__TENANT_ID__;
    if (tenantIdFromHeader) {
      devLog.log('[getCurrentDomainTenantId] Tenant ID do header global:', tenantIdFromHeader);
      return tenantIdFromHeader;
    }

    // 2. SEGUNDO: Tentar obter de meta tag
    const metaTenantId = document.querySelector('meta[name="x-tenant-id"]')?.getAttribute('content');
    if (metaTenantId) {
      devLog.log('[getCurrentDomainTenantId] Tenant ID do meta tag:', metaTenantId);
      return metaTenantId;
    }

    // 3. TERCEIRO: Para novos tenants dinâmicos, tentar extrair do headers da página
    const bodyElement = document.body;
    const tenantIdFromBody = bodyElement?.getAttribute('data-tenant-id');
    if (tenantIdFromBody) {
      devLog.log('[getCurrentDomainTenantId] Tenant ID do body:', tenantIdFromBody);
      return tenantIdFromBody;
    }

    // 4. FALLBACK: Tenants hardcoded legados (APENAS como último recurso)
    const legacyTenantMap: Record<string, string> = {
      'goias-solar': '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'
      // Removido 'suprema' para forçar uso do sistema dinâmico
    };

    let tenantSlug = '';
    if (hostname.includes('goias-solar')) {
      tenantSlug = 'goias-solar';
    }

    const legacyTenantId = legacyTenantMap[tenantSlug];
    if (legacyTenantId) {
      devLog.log('[getCurrentDomainTenantId] Tenant ID legacy (último recurso):', legacyTenantId);
      return legacyTenantId;
    }

    // 5. Se chegou aqui, é um tenant dinâmico novo
    devLog.log('[getCurrentDomainTenantId] Tenant dinâmico - será validado via API:', hostname);
    return null; // Será resolvido pela validação via API

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

/**
 * Verifica se um tenant existe no banco de dados pelo slug (SERVER-SIDE)
 * Usada pelo middleware para decidir se deve dar ID temporário ou buscar no banco
 */
export async function checkTenantExists(slug: string): Promise<{
  exists: boolean;
  tenantId?: string;
  tenantName?: string;
  status?: string;
  subscriptionStatus?: string;
}> {
  try {
    // Esta função precisa ser importada dinamicamente no middleware para evitar problemas edge
    const { createSupabaseServiceRoleClient } = await import('@/lib/supabase/service');
    const supabase = createSupabaseServiceRoleClient();

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, name, slug, status, subscription_status')
      .eq('slug', slug)
      .single();

    // Tenant não existe no banco
    if (error || !organization) {
      return { exists: false };
    }

    // Tenant existe, retornar dados incluindo status
    return {
      exists: true,
      tenantId: organization.id,
      tenantName: organization.name,
      status: organization.status,
      subscriptionStatus: organization.subscription_status
    };
  } catch (error) {
    devLog.error('[tenant-client] Erro ao verificar tenant:', error);
    return { exists: false };
  }
}