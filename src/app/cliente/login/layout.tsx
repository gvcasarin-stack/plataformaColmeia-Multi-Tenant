"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { devLog } from "@/lib/utils/productionLogger";
import { ErrorBoundary } from "@/components/error-boundary";

// Routes that don't require authentication
const publicRoutes = ['/cliente/login', '/cliente/cadastro', '/cliente/recuperar-senha'];

export default function ClientLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Se há parâmetros de recovery, verificar o que fazer
    const recoveryCode = searchParams.get('recovery_code');
    const hasRecoveryParams = recoveryCode !== null;
    
    if (hasRecoveryParams) {
      if (!isLoading && user) {
        // Usuário está autenticado E há recovery params → redirecionar para nova-senha
        devLog.log('[ClientLoginLayout] User authenticated with recovery params, redirecting to /cliente/nova-senha');
        router.replace("/cliente/nova-senha");
        return;
      } else if (!isLoading && !user) {
        // Usuário NÃO está autenticado mas há recovery params → aguardar autenticação
        devLog.log('[ClientLoginLayout] Recovery params detected but user not authenticated, waiting for auth');
        return;
      }
      // Se ainda está carregando, não fazer nada e deixar carregar
      return;
    }

    // Fluxo normal: se usuário está autenticado e não há recovery params, ir para painel
    if (!isLoading && user) {
      // A lógica de redirecionamento APÓS UM NOVO LOGIN será movida para a própria página de login.
      // Este layout ainda pode redirecionar se um usuário JÁ AUTENTICADO acessar /cliente/login diretamente.
      // No entanto, para evitar loops com a nova lógica na página de login, 
      // é melhor ser mais específico aqui ou garantir que a página de login não redirecione se já estiver nela.
      // Por agora, vamos manter um redirecionamento simples se o usuário já estiver logado e na página de login.
      if (pathname === '/cliente/login' || pathname === '/cliente/cadastro') { // Apenas se estiver na pág de login/cadastro
        devLog.log('[ClientLoginLayout] User is already authenticated and on a public auth page, redirecting to /cliente/painel.');
        router.replace("/cliente/painel");
      }
    }
  }, [user, isLoading, router, searchParams, pathname]);

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
} 