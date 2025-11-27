"use client"

import { devLog } from "@/lib/utils/productionLogger";

import React, { useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from "@/lib/hooks/useAuth"
import { LayoutManager } from '@/components/ui/layout-manager'
import { logAdminPageAccess } from '@/lib/utils/adminRoutesLogger'
import { ClientRequestProvider } from '@/lib/contexts/ClientRequestContext'
import { PollingStatusIndicator } from '@/components/debug/PollingStatusIndicator'

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

// ✅ CORRIGIDO: Layout que permite acesso sem autenticação às rotas de login
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // ✅ CRÍTICO: Rotas de login e definição de senha NÃO PRECISAM de autenticação
  if (pathname === '/admin/login' || pathname === '/admin/nova-senha') {
    devLog.log(`🔑 [ADMIN-LAYOUT] Rota ${pathname} - ACESSO LIVRE sem autenticação`);
    return <>{children}</>;
  }

  // ✅ APENAS rotas protegidas usam autenticação
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // ✅ Verificação de admin/colaborador para rotas protegidas
  const isAdmin = useMemo(() => {
    if (!user) return false;
    // ✅ Aceita: admin, superadmin, colaborador
    return user.role === 'admin' || user.role === 'superadmin' || user.role === 'colaborador' ||
           user.profile?.role === 'admin' || user.profile?.role === 'superadmin' || user.profile?.role === 'colaborador';
  }, [user]);
  
  // ✅ Log apenas para rotas protegidas
  useEffect(() => {
    if (pathname && user?.id) {
      logAdminPageAccess(pathname, user.id, {
        userType: user.profile?.role || user.role || 'unknown',
        isAdminRoute: true
      });
    }
  }, [pathname, user]);
  
  // ✅ Redirecionamento apenas para rotas protegidas
  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      devLog.log('🔑 [ADMIN-LAYOUT] Usuário não autenticado, redirecionando para login');
      router.replace('/admin/login');
    }
  }, [user, isAdmin, isLoading, pathname, router]);

  // ✅ Loading apenas para rotas protegidas
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  // ✅ Proteção apenas para rotas protegidas
  if (!user || !isAdmin) {
    return null;
  }

  // ✅ Layout completo apenas para admin autenticado em rotas protegidas
  return (
    <ClientRequestProvider>
      <LayoutManager sidebar={<Sidebar />}>
        {children}
        {/* 🧪 DEBUG: Indicador de status do polling (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <PollingStatusIndicator showDebugPanel={true} />
        )}
      </LayoutManager>
    </ClientRequestProvider>
  )
} 