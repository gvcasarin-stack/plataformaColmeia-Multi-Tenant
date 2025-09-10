'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { devLog } from '@/lib/utils/productionLogger'

interface TenantInfo {
  id: string
  name: string
  slug: string
  plan: string
  isTrial: boolean
  trialEndsAt?: string
  status: string
}

interface TenantContextType {
  tenant: TenantInfo | null
  isLoading: boolean
  error: string | null
  refreshTenant: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTenantInfo = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Obter tenant ID do URL para clientes
      const pathname = window.location.pathname;
      const slug = pathname.split('/')[1]; // Primeiro segmento do path
      
      devLog.log('[TenantContext] Buscando info do tenant:', { slug, pathname });

      // Para clientes, usar o slug do URL para criar headers
      let headers: HeadersInit = {};
      
      if (slug && slug !== 'admin') {
        // Para páginas de cliente, o slug está no URL
        headers = {
          'x-tenant-slug': slug,
          'Content-Type': 'application/json'
        };
      }

      const response = await fetch('/api/tenant/organization', {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        const organization = data.data;
        setTenant({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan || 'basico',
          isTrial: organization.is_trial,
          trialEndsAt: organization.trial_ends_at,
          status: organization.status
        })
        
        devLog.log('[TenantContext] Tenant carregado:', {
          id: organization.id,
          name: organization.name,
          isTrial: organization.is_trial,
          subscriptionStatus: organization.subscription_status
        });
      } else {
        throw new Error(data.message || 'Erro ao carregar informações da organização')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      devLog.error('[TenantContext] Erro ao buscar tenant:', err)
      setError(errorMessage)
      setTenant(null)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshTenant = async () => {
    await fetchTenantInfo()
  }

  useEffect(() => {
    // Só buscar se estivermos em um subdomínio de tenant
    const hostname = window.location.hostname
    const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && 
                      !hostname.startsWith('www.') && 
                      !hostname.startsWith('registro.')

    if (isSubdomain) {
      fetchTenantInfo()
    } else {
      setIsLoading(false)
    }
  }, [])

  return (
    <TenantContext.Provider value={{ tenant, isLoading, error, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

// Hook para verificar se estamos em um tenant
export function useIsTenant() {
  const { tenant } = useTenant()
  return !!tenant
}

// Hook para verificar se estamos em trial
export function useIsTrial() {
  const { tenant } = useTenant()
  return tenant?.isTrial ?? false
}

// Hook para obter informações do plano
export function usePlan() {
  const { tenant } = useTenant()
  return {
    plan: tenant?.plan,
    isTrial: tenant?.isTrial ?? false,
    trialEndsAt: tenant?.trialEndsAt
  }
}