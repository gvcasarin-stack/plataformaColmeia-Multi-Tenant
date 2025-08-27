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

      const response = await fetch('/api/tenant/organization')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.organization) {
        setTenant({
          id: data.organization.id,
          name: data.organization.name,
          slug: data.organization.slug,
          plan: data.organization.plan,
          isTrial: data.organization.is_trial,
          trialEndsAt: data.organization.trial_ends_at,
          status: data.organization.status
        })
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