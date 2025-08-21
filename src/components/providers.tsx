'use client'

import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/contexts/AuthContext"
import { NotificationProvider } from "@/lib/contexts/NotificationContext"
import { LayoutProvider } from "@/components/ui/layout-context"
import { LoadingProvider } from "@/lib/contexts/loading-context"
import { InactivityProvider } from "@/lib/contexts/InactivityContext"
import { useState, useEffect } from "react"
import { Toaster as HotToaster } from 'react-hot-toast'
import { usePathname } from "next/navigation"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Páginas públicas que devem SEMPRE ser light mode
  const isPublicPage = pathname ? [
    '/cliente/login',
    '/cliente/cadastro', 
    '/cliente/recuperar-senha',
    '/admin/login',
    '/confirmar-email',
    '/recuperar-senha',
    '/cadastro/aguardando-confirmacao',
    '/cliente/nova-senha',
    '/cliente/nova-senha-debug',
    '/cliente/nova-senha-simples',
    '/cliente/nova-senha-simples-debug',
    '/cliente/nova-senha-test'
  ].includes(pathname) : false

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <InactivityProvider>
        <NotificationProvider>
          <LayoutProvider>
            <LoadingProvider 
              defaultTimeout={45000} 
              defaultTimeoutMessage="Esta operação está demorando mais que o esperado"
              defaultTimeoutSubMessage="Você pode tentar novamente ou voltar à página inicial"
            >
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                forcedTheme={isPublicPage ? "light" : undefined}
              >
                {children}
                <Toaster />
                <HotToaster
                  position="top-right"
                  toastOptions={{
                    duration: 5000,
                    style: {
                      background: '#FFF',
                      color: '#333',
                    },
                    success: {
                      style: {
                        background: '#ECFDF5',
                        border: '1px solid #D1FAE5',
                        color: '#047857',
                      },
                    },
                    error: {
                      style: {
                        background: '#FEF2F2',
                        border: '1px solid #FEE2E2',
                        color: '#B91C1C',
                      },
                    },
                  }}
                />
              </ThemeProvider>
            </LoadingProvider>
          </LayoutProvider>
        </NotificationProvider>
      </InactivityProvider>
    </AuthProvider>
  )
}
