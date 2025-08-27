'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Zap, CreditCard, X } from 'lucide-react'
import { useTenant } from '@/lib/contexts/TenantContext'
import { devLog } from '@/lib/utils/productionLogger'

interface TrialStatus {
  is_trial: boolean
  trial_started_at: string | null
  trial_ends_at: string | null
  days_remaining: number
  is_expired: boolean
  can_access: boolean
  message: string
}

export function TrialBanner() {
  const { tenant } = useTenant()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!tenant?.isTrial) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/tenant/trial-status')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setTrialStatus(data.trial_status)
          }
        }
      } catch (error) {
        devLog.error('[TrialBanner] Erro ao buscar status do trial:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrialStatus()
  }, [tenant?.isTrial])

  // Não mostrar se não é trial, se está carregando, se foi dismissed ou se não há status
  if (!tenant?.isTrial || isLoading || isDismissed || !trialStatus) {
    return null
  }

  const handleUpgrade = () => {
    // TODO: Implementar modal do Stripe ou redirecionamento para página de upgrade
    devLog.log('[TrialBanner] Iniciando upgrade para plano pago')
    alert('Modal de upgrade será implementado aqui')
  }

  const getBannerColor = () => {
    if (trialStatus.is_expired) return 'bg-red-50 border-red-200'
    if (trialStatus.days_remaining <= 2) return 'bg-orange-50 border-orange-200'
    if (trialStatus.days_remaining <= 5) return 'bg-yellow-50 border-yellow-200'
    return 'bg-blue-50 border-blue-200'
  }

  const getIconColor = () => {
    if (trialStatus.is_expired) return 'text-red-600'
    if (trialStatus.days_remaining <= 2) return 'text-orange-600'
    if (trialStatus.days_remaining <= 5) return 'text-yellow-600'
    return 'text-blue-600'
  }

  const getTextColor = () => {
    if (trialStatus.is_expired) return 'text-red-800'
    if (trialStatus.days_remaining <= 2) return 'text-orange-800'
    if (trialStatus.days_remaining <= 5) return 'text-yellow-800'
    return 'text-blue-800'
  }

  const getBadgeVariant = () => {
    if (trialStatus.is_expired) return 'destructive'
    if (trialStatus.days_remaining <= 2) return 'destructive'
    if (trialStatus.days_remaining <= 5) return 'secondary'
    return 'default'
  }

  return (
    <Card className={`mb-4 ${getBannerColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full bg-white ${getIconColor()}`}>
              {trialStatus.is_expired ? (
                <X className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`font-semibold ${getTextColor()}`}>
                  {trialStatus.is_expired ? 'Trial Expirado' : 'Trial Ativo'}
                </h3>
                <Badge variant={getBadgeVariant()}>
                  {trialStatus.is_expired 
                    ? 'Expirado' 
                    : `${trialStatus.days_remaining} dias restantes`
                  }
                </Badge>
              </div>
              
              <p className={`text-sm ${getTextColor()}`}>
                {trialStatus.message}
              </p>
              
              {trialStatus.trial_ends_at && !trialStatus.is_expired && (
                <p className={`text-xs ${getTextColor()} opacity-75 mt-1`}>
                  Trial expira em: {new Date(trialStatus.trial_ends_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {trialStatus.is_expired || trialStatus.days_remaining <= 5 ? (
              <Button 
                onClick={handleUpgrade}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            ) : (
              <Button 
                onClick={handleUpgrade}
                variant="outline" 
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                <Zap className="w-4 h-4 mr-2" />
                Ver Planos
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}