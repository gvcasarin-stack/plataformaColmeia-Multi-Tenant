'use client'

import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function NotificacoesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}
