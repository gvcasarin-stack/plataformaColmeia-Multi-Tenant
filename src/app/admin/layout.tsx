"use client"

import React, { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from "@/lib/hooks/useAuth"
import { LayoutManager } from '@/components/ui/layout-manager'
import { logAdminPageAccess } from '@/lib/utils/adminRoutesLogger'
import { ClientRequestProvider } from '@/lib/contexts/ClientRequestContext'

// Dynamically load the sidebar to improve initial load time
const Sidebar = dynamic(() => import("@/components/layouts/AdminSidebar").then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div className="w-16 h-screen bg-white dark:bg-gray-800 shadow-md animate-pulse" />
  )
})

// Simple loading spinner
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center mb-4">
        <div className="w-12 h-12 text-orange-500">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Carregando Painel Administrativo...</h2>
      <p className="text-gray-600">Estamos preparando tudo para você.</p>
    </div>
  </div>
)

// ✅ SIMPLIFICADO: Layout limpo sem verificações complexas
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // ✅ SIMPLES: Verificação de admin básica
  const isAdmin = useMemo(() => {
    if (!user) return false;
    return user.role === 'admin' || user.role === 'superadmin' || 
           user.profile?.role === 'admin' || user.profile?.role === 'superadmin';
  }, [user]);
  
  // ✅ SIMPLES: Log de acesso sem verificações complexas
  useEffect(() => {
    if (pathname && user?.id) {
      logAdminPageAccess(pathname, user.id, {
        userType: user.profile?.role || user.role || 'unknown',
        isAdminRoute: true
      });
    }
  }, [pathname, user]);
  
  // ✅ SIMPLES: Redirecionamento básico (apenas quando necessário)
  useEffect(() => {
    // Se não está carregando e não tem usuário admin, redirecionar
    if (!isLoading && (!user || !isAdmin) && pathname !== '/admin/login') {
      router.replace('/admin/login');
  }
  }, [user, isAdmin, isLoading, pathname, router]);

  // ✅ LOADING: Apenas enquanto carrega autenticação
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  // ✅ LOGIN: Página de login sempre renderiza
  if (pathname === '/admin/login') {
    return children;
  }

  // ✅ PROTEÇÃO: Se não é admin, não renderizar (redirecionamento já foi feito)
  if (!user || !isAdmin) {
    return null;
  }

  // ✅ RENDERIZAÇÃO: Layout completo para admin autenticado
  return (
    <ClientRequestProvider>
      <LayoutManager sidebar={<Sidebar />}>
        {children}
      </LayoutManager>
    </ClientRequestProvider>
  )
}
