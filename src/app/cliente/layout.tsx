"use client";

import { Sidebar } from "@/components/client/sidebar";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import { devLog } from "@/lib/utils/productionLogger";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";

// Rotas públicas que não requerem autenticação
const publicRoutes = [
  '/cliente/login',
  '/cliente/cadastro',
  '/cliente/recuperar-senha',
  '/cliente/nova-senha'
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // ✅ SIMPLIFICAÇÃO EXTREMA: Apenas os estados básicos necessários
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);

  // ✅ SIMPLES: Detectar mudanças de rota (mantém UX)
  useEffect(() => {
    if (pathname !== prevPathname) {
      setIsChangingPage(true);
      if (isMobile) setSidebarCollapsed(true);
      
      const timer = setTimeout(() => {
        setIsChangingPage(false);
        setPrevPathname(pathname);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [pathname, prevPathname, isMobile]);

  // ✅ SIMPLIFICAÇÃO CRÍTICA: Autenticação ultra-simples
  useEffect(() => {
    // Rotas públicas = sempre permite
    if (publicRoutes.includes(pathname || '')) {
      return;
    }

    // ✅ UMA VEZ LOGADO = CONFIADO ATÉ TOKEN EXPIRAR
    // Se não está carregando E não tem usuário = redirect
    if (!isLoading && !user) {
      devLog.log('[ClientLayout] Usuário não autenticado, redirecionando para login');
      router.replace("/cliente/login");
    }
  }, [user, isLoading, pathname, router]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // ✅ LOADING SIMPLES: Apenas durante autenticação inicial
  const isAppRoute = !publicRoutes.includes(pathname || '');
  if (isAppRoute && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  // ✅ ROTAS PÚBLICAS: Layout limpo
  if (publicRoutes.includes(pathname || '')) {
    return (
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen">
        {children}
        <Toaster />
      </div>
    );
  }

  // ✅ ROTAS PROTEGIDAS: Só renderiza se tem usuário
  if (!user && isAppRoute) {
    return null; // Evita flash, o useEffect vai redirecionar
  }

  // ✅ LAYOUT AUTENTICADO: Simples e direto
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="h-full flex-shrink-0 z-20">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>
      
      {/* Overlay mobile */}
      {isMobile && !sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/20 z-10 md:hidden" 
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}
      
      {/* Conteúdo principal */}
      <main className="flex-1 overflow-auto p-6 relative">
        {/* Indicador de navegação */}
        {isChangingPage && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500 animate-pulse z-50" />
        )}
        
        {/* Conteúdo */}
        <div className={isChangingPage ? 'opacity-50 transition-opacity duration-200' : 'opacity-100 transition-opacity duration-200'}>
          {children}
        </div>
      </main>
      
      <Toaster />
    </div>
  );
}
