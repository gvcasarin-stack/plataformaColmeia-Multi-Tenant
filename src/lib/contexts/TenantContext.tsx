'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { devLog } from '@/lib/utils/productionLogger'

// Tipos para o contexto de tenant
export interface Organization {
  id: string
  name: string
  slug: string
  plan: 'basico' | 'profissional'
  status: 'active' | 'suspended' | 'cancelled'
  is_trial: boolean
  subscription_status: 'trial' | 'active' | 'cancelled' | 'expired' | 'past_due'
  trial_ends_at?: string
  plan_limits: {
    max_users: number
    max_projects: number
    max_clients: number
    max_storage_gb: number
    max_transactions_per_month: number
    features: string[]
    integrations: string[]
    api_calls_per_day: number
  }
  settings: {
    timezone: string
    currency: string
    date_format: string
    language: string
  }
  created_at: string
  updated_at: string
}

export interface TrialStatus {
  is_trial_active: boolean
  days_remaining: number
  trial_expired: boolean
  subscription_status: string
  can_use_features: boolean
  upgrade_required: boolean
}

export interface TenantContextType {
  // Dados da organização
  organization: Organization | null
  isLoading: boolean
  error: string | null
  
  // Status do trial
  trialStatus: TrialStatus | null
  
  // Funções utilitárias
  canCreateResource: (resourceType: 'users' | 'projects' | 'clients') => Promise<boolean>
  hasFeature: (featureName: string) => boolean
  getPlanLimits: () => Organization['plan_limits'] | null
  
  // Ações
  refreshOrganization: () => Promise<void>
  checkTrialStatus: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detectar tenant atual baseado no hostname ou headers
  const getCurrentTenant = (): { slug: string | null; isSubdomain: boolean } => {
    if (typeof window === 'undefined') {
      // Server-side: tentar obter do header (definido pelo middleware)
      return { slug: null, isSubdomain: false }
    }

    const hostname = window.location.hostname
    const isMainSite = hostname === 'gerenciamentofotovoltaico.com.br'
    const isRegistroSite = hostname === 'registro.gerenciamentofotovoltaico.com.br'
    const isSubdomain = hostname.includes('.gerenciamentofotovoltaico.com.br') && !isMainSite && !isRegistroSite
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')

    if (isSubdomain && !isLocalhost) {
      const slug = hostname.split('.')[0]
      return { slug, isSubdomain: true }
    }

    return { slug: null, isSubdomain: false }
  }

  // Carregar dados da organização
  const loadOrganization = async (slug: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/tenant/organization?slug=${slug}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar organização: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }

      setOrganization(data.organization)
      
      // Carregar status do trial também
      if (data.organization) {
        await loadTrialStatus(data.organization.id)
      }

      devLog.log('[TenantContext] Organização carregada:', {
        slug,
        name: data.organization?.name,
        plan: data.organization?.plan,
        isTrial: data.organization?.is_trial
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      devLog.error('[TenantContext] Erro ao carregar organização:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Carregar status do trial
  const loadTrialStatus = async (organizationId: string) => {
    try {
      const response = await fetch(`/api/tenant/trial-status?orgId=${organizationId}`)
      
      if (response.ok) {
        const data = await response.json()
        setTrialStatus(data.trialStatus)
      }
    } catch (error) {
      devLog.warn('[TenantContext] Erro ao carregar status do trial:', error)
      // Não falhar o carregamento da organização por causa do trial
    }
  }

  // Verificar se pode criar recurso
  const canCreateResource = async (resourceType: 'users' | 'projects' | 'clients'): Promise<boolean> => {
    if (!organization) return false

    try {
      const response = await fetch(`/api/tenant/can-create?type=${resourceType}&orgId=${organization.id}`)
      
      if (response.ok) {
        const data = await response.json()
        return data.canCreate || false
      }
      
      return false
    } catch (error) {
      devLog.error('[TenantContext] Erro ao verificar limite:', error)
      return false
    }
  }

  // Verificar se tem feature
  const hasFeature = (featureName: string): boolean => {
    if (!organization) return false
    return organization.plan_limits.features.includes(featureName)
  }

  // Obter limites do plano
  const getPlanLimits = (): Organization['plan_limits'] | null => {
    return organization?.plan_limits || null
  }

  // Refresh da organização
  const refreshOrganization = async () => {
    const { slug, isSubdomain } = getCurrentTenant()
    if (slug && isSubdomain) {
      await loadOrganization(slug)
    }
  }

  // Verificar status do trial
  const checkTrialStatus = async () => {
    if (organization) {
      await loadTrialStatus(organization.id)
    }
  }

  // Effect para carregar dados iniciais
  useEffect(() => {
    const { slug, isSubdomain } = getCurrentTenant()
    
    if (isSubdomain && slug) {
      loadOrganization(slug)
    } else {
      // Não é subdomínio de tenant, não precisa carregar
      setIsLoading(false)
    }
  }, [])

  const value: TenantContextType = {
    organization,
    isLoading,
    error,
    trialStatus,
    canCreateResource,
    hasFeature,
    getPlanLimits,
    refreshOrganization,
    checkTrialStatus
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

// Hook para usar o contexto
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext)
  
  if (context === undefined) {
    throw new Error('useTenant deve ser usado dentro de um TenantProvider')
  }
  
  return context
}

// Hook para verificar se está em contexto de tenant
export function useIsTenant(): boolean {
  const { organization } = useTenant()
  return organization !== null
}

// Hook para obter informações do tenant atual
export function useTenantInfo() {
  const { organization, trialStatus, isLoading, error } = useTenant()
  
  return {
    organization,
    trialStatus,
    isLoading,
    error,
    isTrial: organization?.is_trial || false,
    planName: organization?.plan || null,
    organizationName: organization?.name || null,
    slug: organization?.slug || null
  }
}
