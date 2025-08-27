'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/contexts/TenantContext'
import { devLog } from '@/lib/utils/productionLogger'

interface TrialStatus {
  is_trial: boolean
  days_remaining: number
  is_expired: boolean
  subscription_status: string
  can_use_features: boolean
  needs_upgrade: boolean
}

export function useTrialStatus() {
  const { tenant } = useTenant()
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!tenant?.isTrial) {
        setTrialStatus({
          is_trial: false,
          days_remaining: 0,
          is_expired: false,
          subscription_status: 'active',
          can_use_features: true,
          needs_upgrade: false
        })
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/tenant/trial-status')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setTrialStatus(data.trial_status)
            setError(null)
          } else {
            setError(data.message || 'Erro ao buscar status do trial')
          }
        } else {
          setError('Erro na requisição')
        }
      } catch (err) {
        devLog.error('[useTrialStatus] Erro ao buscar status do trial:', err)
        setError('Erro inesperado')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrialStatus()

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchTrialStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [tenant?.isTrial])

  const canUseFeatures = trialStatus?.can_use_features ?? true
  const needsUpgrade = trialStatus?.needs_upgrade ?? false
  const isExpired = trialStatus?.is_expired ?? false

  return {
    trialStatus,
    isLoading,
    error,
    canUseFeatures,
    needsUpgrade,
    isExpired,
    daysRemaining: trialStatus?.days_remaining ?? 0
  }
}
