"use client"

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from "@/lib/hooks/useAuth"
import { LayoutManager } from '@/components/ui/layout-manager'
import { logAdminPageAccess } from '@/lib/utils/adminRoutesLogger'

// Dynamically load the sidebar to improve initial load time
const Sidebar = dynamic(() => import("@/components/layouts/AdminSidebar").then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => (
    <div className="w-16 h-screen bg-white dark:bg-gray-800 shadow-md animate-pulse" />
  )
})

// Optimize loading spinner into a separate component to prevent re-renders
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
  </div>
)

// Componente principal que contém a lógica de autenticação e renderização
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [loadingTimeout, setLoadingTimeout] = useState(false)
  const [forceRender, setForceRender] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [preventsReloads, setPreventReloads] = useState(false)
  
  // Log de diagnóstico para ajudar a debugar problemas de renderização
  useEffect(() => {
    console.log('[ADMIN-LAYOUT-DEBUG]', {
      pathname,
      user: !!user,
      isLoading,
      isInitialLoad,
      loadingTimeout,
      isLoginPage: pathname === '/admin/login'
    });
  }, [pathname, user, isLoading, isInitialLoad, loadingTimeout]);
  
  // Verificador de logout para uso em useEffect - versão mais restrita
  const checkIfLoggingOut = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Verificar se há flags explícitas de logout
    const hasLogoutFlag = sessionStorage.getItem('isLoggingOut') === 'true';
    const hasAdminLogoutFlag = sessionStorage.getItem('admin_logging_out') === 'true';
    const hasBodyClass = document.body.classList.contains('logging-out');
    
    // Verificar URL de redirecionamento de logout
    const hasLogoutParam = window.location.href.includes('?t=');
    
    // Precisamos de pelo menos um dos sinalizadores explícitos
    return (hasLogoutFlag || hasAdminLogoutFlag || hasBodyClass) || hasLogoutParam;
  }, []);
  
  // Novo efeito para gerenciar retorno de visibilidade da página
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('[AdminLayout] Tab became visible, checking session');
        
        // Cancela qualquer timeout de carregamento ativo
        setLoadingTimeout(false);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);
  
  // Novo efeito para evitar reloads automáticos em projetos
  useEffect(() => {
    // Detectar se estamos na página de projeto
    if (typeof window !== 'undefined') {
      // Verificar se estamos em uma página de projeto específico
      const isProjectPage = pathname?.includes('/projetos/') && pathname?.match(/\/projetos\/[a-zA-Z0-9]+$/);
      
      console.log('[AdminLayout] Verificando página atual:', {
        pathname,
        isProjectPage,
        shouldPreventReloads: !!isProjectPage
      });
      
      // Se for uma página de projeto, previne reloads
      if (isProjectPage) {
        console.log('[AdminLayout] Página de projeto detectada, prevenindo reloads automáticos');
        setPreventReloads(true);
        
        // CORREÇÃO CRÍTICA: Desabilitar qualquer lógica de timeout para páginas de projetos
        setLoadingTimeout(false);
        
        // Remover quaisquer parâmetros de URL que possam causar reload
        const url = new URL(window.location.href);
        if (url.searchParams.has('refresh') || 
            url.searchParams.has('t') || 
            url.searchParams.toString().includes('refresh')) {
          
          // Removendo parâmetros sem causar refresh
          url.search = '';
          window.history.replaceState({}, '', url.toString());
          console.log('[AdminLayout] Parâmetros de URL removidos para evitar reloads');
        }
      } else {
        setPreventReloads(false);
      }
    }
  }, [pathname]);
  
  // Mark initial load as complete after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
      console.log('[DEBUG-ADMIN-DASHBOARD] Initial load complete');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Force a re-render after a short delay to ensure loading state is updated
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceRender(true);
    }, 3000); // 3 seconds
    
    return () => clearTimeout(timer);
  }, []);
  
  // Set a timeout to prevent infinite loading
  useEffect(() => {
    // CORREÇÃO CRÍTICA: Se estivermos em uma página de projeto ou preventsReloads for true,
    // não iniciar o timer de timeout, pois ele poderia causar reload
    if (preventsReloads) {
      console.log('[DEBUG-ADMIN-DASHBOARD] Timeout check skipped for project page');
      return;
    }
    
    // Skip timeout if we're in the middle of a navigation or logout
    if (typeof window !== 'undefined') {
      // Verificar se o usuário está em processo de logout usando a função dedicada
      if (checkIfLoggingOut()) {
        console.log('[DEBUG-ADMIN-DASHBOARD] Timeout check skipped during logout process');
        return;
      }
      
      // Navigation detection - don't show timeout during navigation
      if (document.visibilityState === 'hidden' || 
          document.readyState !== 'complete' ||
          window.location.href.includes('?t=')) {
        console.log('[DEBUG-ADMIN-DASHBOARD] Skipping timeout check during navigation');
        return;
      }
    }
    
    // Only set timeout during loading states, not redirects
    if (isLoading) {
      console.log('[DEBUG-ADMIN-DASHBOARD] Starting loading timeout check');
      
      const timer = setTimeout(() => {
        // Double-check we're not navigating before showing timeout
        if (typeof window !== 'undefined') {
          // Verificar novamente se o usuário está em processo de logout
          if (checkIfLoggingOut()) {
            console.log('[DEBUG-ADMIN-DASHBOARD] Logout em andamento, cancelando timeout');
            return;
          }
          
          if (document.visibilityState === 'hidden' || 
             document.readyState !== 'complete' ||
             window.location.href.includes('?t=')) {
            console.log('[DEBUG-ADMIN-DASHBOARD] Navigation detected, skipping timeout');
            return;
          }
        }
        
        // CORREÇÃO CRÍTICA: Não ativar timeout para páginas de projeto
        if (pathname?.includes('/projetos/') && pathname?.match(/\/projetos\/[a-zA-Z0-9]+$/)) {
          console.log('[DEBUG-ADMIN-DASHBOARD] Projeto específico detectado, ignorando timeout');
          return;
        }
        
        console.log('[DEBUG-ADMIN-DASHBOARD] Loading timeout triggered');
        setLoadingTimeout(true);
      }, 35000); // Aumentado para 35 segundos
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, pathname, preventsReloads, checkIfLoggingOut]);
  
  // Never show timeout errors during navigation
  const isNavigating = typeof window !== 'undefined' && 
                      (document.visibilityState === 'hidden' || 
                       document.readyState !== 'complete' ||
                       window.location.href.includes('?t='));
                       
  // Verificar se o usuário está em processo de logout
  const isUserLoggingOut = typeof window !== 'undefined' && (
    sessionStorage.getItem('isLoggingOut') === 'true' ||
    sessionStorage.getItem('admin_logging_out') === 'true' ||
    document.body.classList.contains('logging-out') ||
    window.location.href.includes('?t=')
  );
  
  // Escutar eventos de logout - simplificado para evitar problemas
  useEffect(() => {
    // Ouvinte para o evento específico de logout confirmado
    const handleLogoutConfirmed = () => {
      console.log('[AdminLayout] Logout confirmado, preparando navegação');
      setIsLoggingOut(true);
    };
    
    // Apenas registrar para o evento principal de logout
    document.addEventListener('admin-logout-confirmed', handleLogoutConfirmed);
    
    return () => {
      document.removeEventListener('admin-logout-confirmed', handleLogoutConfirmed);
    };
  }, []);
  
  // Memoize isAdmin check to prevent recalculation
  const isAdmin = useMemo(() => {
    if (!user || !user.profile) return false; // Check if user and user.profile exist
    // Check the role from the profile
    return user.profile.role === 'admin' || user.profile.role === 'superadmin';
  }, [user]);
  
  // Only check authentication after initial load
  useEffect(() => {
    // CORREÇÃO CRÍTICA: Não fazer redirecionamentos em páginas de projeto
    if (preventsReloads) {
      console.log('[DEBUG-ADMIN-DASHBOARD] Redirect check skipped for project page');
      return;
    }
    
    // Skip during initial load to prevent automatic redirects with cached credentials
    if (isInitialLoad) return;
    
    if (isLoading && !loadingTimeout) return;

    // Verifica se estamos na página de login - se estiver, não redireciona
    if (pathname === '/admin/login') {
      console.log('[DEBUG-ADMIN-DASHBOARD] Acesso à página de login, permitindo sem autenticação');
      return;
    }

    // If no user or not admin, redirect to login
    if (!user || !isAdmin) {
      console.log('[DEBUG-ADMIN-DASHBOARD] No admin privileges, redirecting to /admin:', {
        userExists: !!user,
        profileExists: !!user?.profile,
        userRoleFromProfile: user?.profile?.role, // Updated to log profile role
        isAdmin,
        pathname
      })
      router.replace('/admin/login')
      return
    }
  }, [user, isLoading, pathname, router, isAdmin, loadingTimeout, isInitialLoad, preventsReloads]);

  // Check for active logout state via URL parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // If URL contains logout parameter, show a blank screen
      if (window.location.href.includes('?t=')) {
        setIsLoggingOut(true);
      }
    }
  }, [pathname]);
  
  // Remover o event listener beforeunload para páginas de projetos específicos
  useEffect(() => {
    if (preventsReloads) {
      // SOLUÇÃO DEFINITIVA: Interceptar e bloquear completamente o evento beforeunload
      // para evitar qualquer tipo de reload automático
      console.log('[AdminLayout] Prevenindo reload automático (lógica de listener onbeforeunload e onunload agora comentada).');

      // NOVA SOLUÇÃO: Também bloquear o evento 'unload' para prevenir reloads após beforeunload
      console.log('[AdminLayout] Prevenindo unload (preventUnload listener ATIVO - AGORA COMENTADO)');

      // REMOVENDO CÓDIGO PROBLEMÁTICO:
      // A tentativa de substituir window.location.reload não funciona
      // porque essa propriedade é somente leitura em navegadores modernos
      
      // SOLUÇÃO ALTERNATIVA: Monitorar tentativas de navegação com um interval
      console.log('[AdminLayout] Possível redirecionamento detectado (navigationMonitor ATIVO - AGORA COMENTADO), verificando...');
      
      return () => {
        console.log('[AdminLayout] Cleanup do useEffect de preventsReloads (listeners e monitor comentados).');
      };
    }
  }, [preventsReloads, pathname, router]);
  
  // Adicionar este novo useEffect para logging
  useEffect(() => {
    if (pathname && !isLoading && user && user.id && user.profile) {
      // Registra o acesso à rota admin com o ID do usuário
      logAdminPageAccess(pathname, user.id, {
        userType: user.profile.role || 'unknown',
        isAdminRoute: true
      });
    }
  }, [pathname, isLoading, user]);
  
  // If we're in the process of logging out, don't show anything
  if (isLoggingOut) {
    return null;
  }

  // Show loading state during initial load
  if (isInitialLoad) {
    return <LoadingSpinner />
  }
  
  // Show a loading spinner if AuthContext is loading, we don't have a user yet,
  // and the specific loading timeout for an error message hasn't been triggered.
  // This covers the login process primarily.
  if (isLoading && !user && !loadingTimeout && !preventsReloads) {
    return <LoadingSpinner />
  }
  
  // If loading takes too long, show an error message with a refresh button
  // But only if we're not navigating away, not logging out, not checking session,
  // the AuthContext is still loading, and we are NOT on the login page.
  if (loadingTimeout && isLoading && pathname !== '/admin/login' && 
      !isNavigating && !preventsReloads && !isUserLoggingOut) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <p className="text-red-500">Tempo de carregamento excedido. Por favor, tente novamente.</p>
        <button 
          onClick={() => {
            if (preventsReloads) {
              console.log('[AdminLayout] Evitando reload em página de projeto');
              setForceRender(false);
              setTimeout(() => setForceRender(true), 100);
            } else {
              window.location.reload();
            }
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
        >
          Recarregar página
        </button>
      </div>
    )
  }

  // If no user or not admin, return null (will redirect)
  if (!user || !isAdmin) {
    // Se estivermos na página de login, ainda assim devemos renderizar o conteúdo
    if (pathname === '/admin/login') {
      console.log('[ADMIN-LAYOUT-DEBUG] Renderizando página de login sem usuário autenticado');
      // Retornamos diretamente o children sem o LayoutManager para tela cheia
      return children;
    }
    
    console.log('[ADMIN-LAYOUT-DEBUG] Usuário não autenticado redirecionando para login');
    return null;
  }

  // Verificar se estamos na página de login mesmo com usuário autenticado
  if (pathname === '/admin/login') {
    // Retornamos diretamente o children sem o LayoutManager para tela cheia
    return children;
  }

  // Usar o LayoutManager para animações suaves sem problemas de autenticação
  // Renderiza o Sidebar apenas se o usuário estiver autenticado e não estiver na página de login
  console.log('[ADMIN-LAYOUT-DEBUG] Renderizando layout completo para usuário autenticado');
  return (
    <LayoutManager 
      sidebar={<Sidebar />}
    >
      {children}
    </LayoutManager>
  )
}
