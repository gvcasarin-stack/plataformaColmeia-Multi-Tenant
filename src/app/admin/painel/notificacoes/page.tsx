"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NotificacoesRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the new route
    router.replace('/notificacoes')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      <p className="ml-2 text-gray-600">Redirecionando para o novo local...</p>
    </div>
  )
}
