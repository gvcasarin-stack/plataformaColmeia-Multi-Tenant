// ✅ CORREÇÃO CRÍTICA: Frontend não pode usar Service Role Client
// Vamos buscar o tenant_id via API route dedicada

/**
 * Helper para buscar tenant_id do usuário autenticado via API
 * Usado para enviar headers x-tenant-id nas chamadas de API
 * ✅ CORREÇÃO: Fallback para extrair tenant do hostname se API falhar
 */
export async function getUserTenantId(userId: string): Promise<string | null> {
  try {
    // ✅ PRIMEIRA TENTATIVA: Usar API se disponível
    const response = await fetch('/api/user/tenant-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (response.ok) {
      const { tenantId } = await response.json();
      if (tenantId) {
        console.log('[getUserTenantId] Tenant ID obtido via API:', tenantId);
        return tenantId;
      }
    } else {
      console.warn('[getUserTenantId] API falhou:', response.status);
    }
  } catch (error) {
    console.warn('[getUserTenantId] Erro na API, tentando fallback:', error);
  }

  // ✅ FALLBACK: Extrair tenant do hostname atual
  try {
    const hostname = window.location.hostname;
    const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && 
                       !hostname.startsWith('www.') && 
                       !hostname.startsWith('registro.');
    
    if (isSubdomain) {
      const tenantSlug = hostname.split('.')[0];
      console.log('[getUserTenantId] Tenant extraído do hostname:', tenantSlug);
      
      // Como não temos o ID, vamos buscar via API de debug que sempre funciona
      try {
        const debugResponse = await fetch(`/api/debug/tenant-health?slug=${tenantSlug}`, {
          method: 'GET'
        });
        
        if (debugResponse.ok) {
          const debugResult = await debugResponse.json();
          if (debugResult.success && debugResult.tenant?.id) {
            console.log('[getUserTenantId] Tenant ID obtido via debug API:', debugResult.tenant.id);
            return debugResult.tenant.id;
          }
        }
      } catch (debugError) {
        console.warn('[getUserTenantId] Debug API também falhou:', debugError);
      }
    }
  } catch (fallbackError) {
    console.error('[getUserTenantId] Fallback falhou:', fallbackError);
  }

  console.error('[getUserTenantId] Todas as tentativas falharam');
  return null;
}

/**
 * Helper para criar headers com tenant_id para chamadas de API
 */
export async function createTenantHeaders(userId: string): Promise<HeadersInit> {
  const tenantId = await getUserTenantId(userId);
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }
  
  return headers;
}
