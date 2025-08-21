"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { devLog } from "@/lib/utils/productionLogger";
import { Suspense } from "react";

/**
 * Root Page
 * 
 * This page serves as the entry point of the application.
 * It includes server-side metadata and redirects to the client login page.
 */

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Função para limpar completamente as sessões do Supabase (DEBUG)
  const clearAllSupabaseSessions = () => {
    if (typeof window !== 'undefined') {
      devLog.log('[HomePage] Limpando todas as sessões do Supabase...');
      
      // Limpar localStorage
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => 
        key.includes('sb-') || 
        key.includes('supabase')
      );
      
      supabaseKeys.forEach(key => {
        devLog.log(`[HomePage] Removendo ${key} do localStorage`);
        localStorage.removeItem(key);
      });

      // Limpar sessionStorage
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('sb-') || 
        key.includes('supabase') ||
        key.includes('recovery')
      );
      
      sessionKeys.forEach(key => {
        devLog.log(`[HomePage] Removendo ${key} do sessionStorage`);
        sessionStorage.removeItem(key);
      });
      
      devLog.log('[HomePage] Limpeza de sessões concluída');
    }
  };

  // Função para verificar se usuário está autenticado
  const checkIfUserIsAuthenticated = async () => {
    try {
      // Importar o cliente do Supabase dinamicamente para evitar problemas de SSR
      const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
      const supabase = createSupabaseBrowserClient();
      
      const { data: { session }, error } = await supabase.auth.getSession();
      devLog.log('[HomePage] checkIfUserIsAuthenticated:', { hasSession: !!session, error });
      return !!session && !error;
    } catch (e) {
      devLog.error('[HomePage] Error checking authentication:', e);
      return false;
    }
  };

  useEffect(() => {
    const currentPath = window.location.pathname;
    const currentFragment = window.location.hash; // Pegar o fragmento
    
    if (currentPath !== '/') {
      devLog.log('[HomePage] Not home page, path:', currentPath);
      return;
    }

    devLog.log('[HomePage] Full URL:', window.location.href);
    devLog.log('[HomePage] Search params string:', window.location.search);
    devLog.log('[HomePage] All searchParams entries:', Array.from(searchParams.entries()));
    devLog.log('[HomePage] URL Fragment:', currentFragment);

    // Prioridade 1: Se houver um fragmento que pareça ser de autenticação/recuperação do Supabase
    if (currentFragment && (currentFragment.includes('access_token') && currentFragment.includes('type=recovery'))) {
      devLog.log(`[HomePage] Supabase recovery fragment detected, redirecting to /cliente/nova-senha with fragment: ${currentFragment}`);
      router.push(`/cliente/nova-senha${currentFragment}`);
      return;
    } else if (currentFragment && currentFragment.includes('access_token')) {
      // Outros tipos de fragmentos com access_token (ex: magic link login, OAuth)
      // Podem ser redirecionados para uma página de callback ou painel, dependendo do fluxo
      // Por agora, vamos assumir que eles podem ir para o painel se o AuthContext os processar.
      // Ou para uma página de callback se você tiver uma: router.push(`/auth/callback${currentFragment}`);
      // Se o AuthContext lida com SIGNED_IN globalmente, talvez só precise ir para o painel.
      devLog.log(`[HomePage] Generic access_token fragment detected, attempting redirect to /cliente/painel. AuthContext should handle session. Fragment: ${currentFragment}`);
      router.push(`/cliente/painel${currentFragment}`); // Ou uma página de callback dedicada
      return;
    }
    
    // Prioridade 2: Verificar parâmetro 'code' na query string (padrão do Supabase para magic links/recovery)
    const code = searchParams.get('code');
    if (code) {
      devLog.log(`[HomePage] Query code parameter ('code'): ${code}`);
      devLog.log(`[HomePage] Code detected, redirecting to /confirmar-email for processing`);
      
      // Redirecionar diretamente para a página de confirmação
      // A página /confirmar-email irá processar o código adequadamente
      router.push(`/confirmar-email?code=${code}`);
      return;
    }
    
    // Prioridade 3: Verificar erros de autenticação nos parâmetros da URL (geralmente de OAuth ou falhas)
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');

    devLog.log('[HomePage] URL params:', {
      error,
      errorCode,
      errorDescription,
      path: currentPath,
      allParams: Object.fromEntries(searchParams.entries())
    });

    if (error || errorCode) {
      devLog.log('[HomePage] Auth error detected, redirecting to login');
      
      if (errorCode === 'otp_expired') {
        router.push('/cliente/login?message=link_expired');
      } else {
        router.push('/cliente/login?message=auth_error');
      }
    } else {
      devLog.log('[HomePage] No errors, redirecting to client area');
      router.push('/cliente/painel');
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecionando...</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
