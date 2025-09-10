'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useTenant } from '@/lib/contexts/TenantContext'
import { devLog } from '@/lib/utils/productionLogger'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { AlertTriangle, Lock, CreditCard } from 'lucide-react'

interface FeatureGuardProps {
  children: ReactNode
  feature: 'create_project' | 'upload_file' | 'create_client' | 'create_user' | 'financial' | 'admin'
  fallback?: ReactNode
  showModal?: boolean
}

interface TrialStatus {
  is_trial: boolean
  days_remaining: number
  is_expired: boolean
  subscription_status: string
  can_use_features: boolean
  needs_upgrade: boolean
}

export function FeatureGuard({ 
  children, 
  feature, 
  fallback, 
  showModal = true 
}: FeatureGuardProps) {
  const { tenant } = useTenant()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [canCreate, setCanCreate] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      if (!tenant) {
        setIsLoading(false)
        return
      }

      try {
        // Verificar status do trial usando API de organização
        const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
        const headers = await createTenantHeaders(tenant.id);
        
        const trialResponse = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers,
        });
        
        if (trialResponse.ok) {
          const trialData = await trialResponse.json()
          if (trialData.success) {
            const orgData = trialData.data;
            const now = new Date();
            const trialEnd = new Date(orgData.trial_end_date);
            const isExpired = orgData.is_trial && now > trialEnd;
            const isTrialExpired = isExpired && orgData.subscription_status !== 'active';
            
            const status: TrialStatus = {
              is_trial: orgData.is_trial,
              days_remaining: Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
              is_expired: isTrialExpired,
              can_access: !isTrialExpired,
              needs_upgrade: isTrialExpired
            };
            
            setTrialStatus(status);

            // Se trial expirado, bloquear funcionalidade
            if (isTrialExpired) {
              devLog.log('[FeatureGuard] Trial expirado, bloqueando funcionalidade:', {
                feature,
                isTrialExpired,
                isTrial: orgData.is_trial,
                subscriptionStatus: orgData.subscription_status,
                trialEndsAt: orgData.trial_end_date,
                now: now.toISOString()
              });
              setCanCreate(false)
              if (showModal) {
                setShowUpgradeModal(true)
              }
              setIsLoading(false)
              return
            } else {
              devLog.log('[FeatureGuard] Trial OK, permitindo acesso:', {
                feature,
                isTrialExpired,
                isTrial: orgData.is_trial,
                subscriptionStatus: orgData.subscription_status
              });
            }
          }
        }

        // Verificar se pode criar o recurso específico
        let resourceType = ''
        switch (feature) {
          case 'create_project':
            resourceType = 'projects'
            break
          case 'create_client':
            resourceType = 'clients'
            break
          case 'create_user':
            resourceType = 'users'
            break
          case 'financial':
            resourceType = 'financial'
            break
          case 'upload_file':
          case 'admin':
            // Para upload e admin, verificar apenas trial
            setCanCreate(true)
            setIsLoading(false)
            return
        }

        if (resourceType) {
          const limitResponse = await fetch(`/api/tenant/can-create?type=${resourceType}`)
          if (limitResponse.ok) {
            const limitData = await limitResponse.json()
            setCanCreate(limitData.success)
            
            if (!limitData.success && showModal) {
              setShowUpgradeModal(true)
            }
          }
        }

      } catch (error) {
        devLog.error('[FeatureGuard] Erro ao verificar acesso:', error)
        setCanCreate(true) // Em caso de erro, permitir acesso
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [tenant, feature, showModal])

  const handleUpgrade = async () => {
    devLog.log('[FeatureGuard] Iniciando upgrade para plano pago')
    
    try {
      // Redirecionar para aba de assinaturas onde está o Stripe
      const currentPath = window.location.pathname
      const isClientPath = currentPath.includes('/cliente/')
      
      if (isClientPath) {
        // Para clientes, redirecionar para página de assinaturas do admin
        const slug = window.location.pathname.split('/')[1]
        window.location.href = `/${slug}/admin/assinaturas`
      } else {
        // Para admin, ir para aba de assinaturas
        window.location.href = '/admin/assinaturas'
      }
    } catch (error) {
      devLog.error('[FeatureGuard] Erro no redirecionamento:', error)
      // Fallback
      window.location.href = '/admin/assinaturas'
    }
  }

  const getBlockedMessage = () => {
    if (trialStatus?.is_expired && trialStatus.is_trial) {
      const isAdminFeature = ['admin', 'financial'].includes(feature)
      
      return {
        title: 'Trial Expirado ⏰',
        description: isAdminFeature 
          ? 'Seu período de teste expirou. Seus clientes também não conseguem criar projetos ou fazer uploads. Faça upgrade para reativar todas as funcionalidades.'
          : 'Período de teste expirado. Entre em contato com o administrador da sua empresa para reativar sua conta.',
        icon: <AlertTriangle className="w-6 h-6 text-orange-500" />
      }
    }

    const featureNames = {
      create_project: 'criar projetos',
      create_client: 'criar clientes', 
      create_user: 'criar usuários',
      upload_file: 'fazer upload de arquivos',
      financial: 'acessar dados financeiros',
      admin: 'acessar área administrativa'
    }

    return {
      title: 'Limite Atingido 📊',
      description: `Você atingiu o limite do seu plano para ${featureNames[feature]}. Faça upgrade para aumentar seus limites.`,
      icon: <Lock className="w-6 h-6 text-red-500" />
    }
  }

  // Ainda carregando
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Sem tenant, bloquear
  if (!tenant) {
    return fallback || (
      <div className="p-4 text-center text-gray-500">
        <Lock className="w-8 h-8 mx-auto mb-2" />
        <p>Acesso restrito</p>
      </div>
    )
  }

  // Pode acessar funcionalidade
  if (canCreate) {
    return <>{children}</>
  }

  // Funcionalidade bloqueada
  const blockedMessage = getBlockedMessage()

  return (
    <>
      {fallback || (
        <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg text-center">
          <div className="flex flex-col items-center space-y-2">
            {blockedMessage.icon}
            <h3 className="font-semibold text-gray-900">{blockedMessage.title}</h3>
            <p className="text-sm text-gray-600">{blockedMessage.description}</p>
            <Button 
              onClick={handleUpgrade}
              className="mt-2 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Fazer Upgrade
            </Button>
          </div>
        </div>
      )}

      {/* Modal obrigatório quando trial expira */}
      <Dialog open={showUpgradeModal} onOpenChange={() => {
        // Modal não pode ser fechado quando trial expira
        if (trialStatus?.is_expired && trialStatus.is_trial) {
          return false
        }
        setShowUpgradeModal(false)
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {blockedMessage.icon}
              <span>{blockedMessage.title}</span>
            </DialogTitle>
            <DialogDescription>
              {blockedMessage.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-3 pt-4">
            <Button 
              onClick={handleUpgrade}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Fazer Upgrade Agora
            </Button>
            
            {/* Só permite fechar se não for trial expirado */}
            {!(trialStatus?.is_expired && trialStatus.is_trial) && (
              <Button 
                variant="outline" 
                onClick={() => setShowUpgradeModal(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Hook para verificação programática
export function useFeatureAccess(feature: FeatureGuardProps['feature']) {
  const { tenant } = useTenant()
  const [canAccess, setCanAccess] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      if (!tenant) {
        setCanAccess(false)
        setIsLoading(false)
        return
      }

      try {
        // Verificar trial usando API de organização
        const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
        const headers = await createTenantHeaders(tenant.id);
        
        const trialResponse = await fetch('/api/tenant/organization', {
          method: 'GET',
          headers,
        });
        
        if (trialResponse.ok) {
          const trialData = await trialResponse.json()
          if (trialData.success) {
            const orgData = trialData.data;
            const now = new Date();
            const trialEnd = new Date(orgData.trial_end_date);
            const isExpired = orgData.is_trial && now > trialEnd;
            const isTrialExpired = isExpired && orgData.subscription_status !== 'active';
            
            if (isTrialExpired) {
              devLog.log('[useFeatureAccess] Trial expirado, bloqueando acesso:', feature);
              setCanAccess(false)
              setIsLoading(false)
              return
            }
          }
        }

        // Verificar limites
        let resourceType = ''
        switch (feature) {
          case 'create_project':
            resourceType = 'projects'
            break
          case 'create_client':
            resourceType = 'clients'
            break
          case 'create_user':
            resourceType = 'users'
            break
          default:
            setCanAccess(true)
            setIsLoading(false)
            return
        }

        if (resourceType) {
          const limitResponse = await fetch(`/api/tenant/can-create?type=${resourceType}`)
          if (limitResponse.ok) {
            const limitData = await limitResponse.json()
            setCanAccess(limitData.success)
          }
        }

      } catch (error) {
        devLog.error('[useFeatureAccess] Erro ao verificar acesso:', error)
        setCanAccess(true) // Em caso de erro, permitir acesso
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [tenant, feature])

  return { canAccess, isLoading }
}
