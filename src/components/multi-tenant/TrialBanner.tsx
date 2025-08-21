'use client'

import { useState, useEffect } from 'react'
import { useTenant } from '@/lib/contexts/TenantContext'

export function TrialBanner() {
  const { organization, trialStatus, isLoading } = useTenant()
  const [isVisible, setIsVisible] = useState(true)

  // Não mostrar se estiver carregando ou se não há organização
  if (isLoading || !organization) {
    return null
  }

  // Não mostrar se não é trial ou se trial ainda está ativo
  if (!organization.is_trial || !trialStatus?.trial_expired) {
    return null
  }

  // Não mostrar se usuário fechou o banner
  if (!isVisible) {
    return null
  }

  const handleUpgrade = () => {
    // TODO: Implementar redirecionamento para página de upgrade
    window.location.href = '/billing/upgrade'
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  return (
    <div className="bg-red-600 text-white px-4 py-3 relative">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          {/* Ícone de aviso */}
          <svg className="w-5 h-5 text-red-200" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          
          <div>
            <span className="font-medium">
              Seu período de teste expirou
            </span>
            <span className="hidden sm:inline ml-2 text-red-200">
              Faça upgrade para continuar usando todas as funcionalidades
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpgrade}
            className="bg-white text-red-600 px-4 py-1 rounded font-medium text-sm hover:bg-red-50 transition-colors"
          >
            Fazer Upgrade
          </button>
          
          <button
            onClick={handleDismiss}
            className="text-red-200 hover:text-white transition-colors"
            aria-label="Fechar banner"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function TrialInfo() {
  const { organization, trialStatus, isLoading } = useTenant()

  if (isLoading || !organization?.is_trial || !trialStatus) {
    return null
  }

  const daysRemaining = trialStatus.days_remaining
  const isExpiring = daysRemaining <= 2
  const isExpired = trialStatus.trial_expired

  if (isExpired) {
    return null // TrialBanner vai mostrar
  }

  return (
    <div className={`rounded-lg p-4 mb-4 ${isExpiring ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpiring ? 'bg-orange-100' : 'bg-blue-100'}`}>
            <svg className={`w-5 h-5 ${isExpiring ? 'text-orange-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <div>
            <h3 className={`font-medium ${isExpiring ? 'text-orange-900' : 'text-blue-900'}`}>
              Período de Teste - {organization.plan === 'basico' ? 'Plano Básico' : 'Plano Profissional'}
            </h3>
            <p className={`text-sm ${isExpiring ? 'text-orange-700' : 'text-blue-700'}`}>
              {daysRemaining === 0 ? 'Último dia!' : 
               daysRemaining === 1 ? 'Resta 1 dia' : 
               `Restam ${daysRemaining} dias`}
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.href = '/billing/upgrade'}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            isExpiring 
              ? 'bg-orange-600 text-white hover:bg-orange-700' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Fazer Upgrade
        </button>
      </div>
    </div>
  )
}

export function PlanLimitsInfo() {
  const { organization, getPlanLimits } = useTenant()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!organization) {
    return null
  }

  const limits = getPlanLimits()
  if (!limits) {
    return null
  }

  const planName = organization.plan === 'basico' ? 'Básico' : 'Profissional'

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h3 className="font-medium text-gray-900">
            Plano {planName}
          </h3>
          <p className="text-sm text-gray-600">
            Ver limites do plano
          </p>
        </div>
        
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Projetos:</span>
              <span className="ml-2 font-medium">
                {limits.max_projects === -1 ? 'Ilimitado' : limits.max_projects}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Usuários:</span>
              <span className="ml-2 font-medium">
                {limits.max_users === -1 ? 'Ilimitado' : limits.max_users}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Clientes:</span>
              <span className="ml-2 font-medium">
                {limits.max_clients === -1 ? 'Ilimitado' : limits.max_clients}
              </span>
            </div>
            
            <div>
              <span className="text-gray-600">Armazenamento:</span>
              <span className="ml-2 font-medium">
                {limits.max_storage_gb === -1 ? 'Ilimitado' : `${limits.max_storage_gb}GB`}
              </span>
            </div>
          </div>
          
          {limits.features && limits.features.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Recursos inclusos:</p>
              <div className="flex flex-wrap gap-1">
                {limits.features.map((feature, index) => (
                  <span 
                    key={index}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                  >
                    {feature.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
