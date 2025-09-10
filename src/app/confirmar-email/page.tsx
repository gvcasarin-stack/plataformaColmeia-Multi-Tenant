"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { devLog } from "@/lib/utils/productionLogger";
import { emailConfirmationService, EmailConfirmationError } from "@/lib/services/emailConfirmationService";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const hasRunRef = useRef(false);

  useEffect(() => {
    let confirmationCompleted = false;

    const completeConfirmation = (method: string) => {
      if (confirmationCompleted) return;
      confirmationCompleted = true;
      
      devLog.log(`[EmailConfirmation] ✅ Email confirmado com sucesso via ${method}!`);
      
      setStatus("success");
      setMessage("Seu email foi confirmado com sucesso! Você pode fazer login agora.");
      
      setTimeout(() => {
        // Se a API retornou tenantSlug via query (opcional), usar para redirecionar ao subdomínio
        const params = new URLSearchParams(window.location.search);
        const fallback = "/cliente/login?message=Email confirmado com sucesso! Você pode fazer login agora.";
        const tenant = params.get('tenant') || '';
        if (tenant) {
          const host = window.location.hostname;
          const root = 'gerenciamentofotovoltaico.com.br';
          const target = `https://${tenant}.${root}/cliente/login?message=Email confirmado com sucesso! Você pode fazer login agora.`;
          window.location.href = target;
          return;
        }
        router.push(fallback);
      }, 3000);
    };

    const handleEmailConfirmation = async () => {
      if (hasRunRef.current) {
        return; // evitar segunda execução causada por mudanças de URL/param
      }
      hasRunRef.current = true;
      devLog.log("[EmailConfirmation] 🚀 Iniciando confirmação SaaS-grade...");
      
      try {
        // Verificar se há parâmetros de erro na URL
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");
        
        devLog.log("[EmailConfirmation] Parâmetros da URL:", {
          error,
          errorDescription,
          allParams: Object.fromEntries(searchParams.entries())
        });
        
        if (error) {
          devLog.error("[EmailConfirmation] Erro detectado nos parâmetros:", { error, errorDescription });
          setStatus("error");
          
          if (errorDescription?.includes("expired") || error === "access_denied") {
            setMessage("O link de confirmação expirou ou é inválido. Por favor, solicite um novo.");
          } else {
            setMessage(errorDescription || "Erro ao confirmar email.");
          }
          return;
        }

        // Verificar se há código de confirmação
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const typeParam = searchParams.get("type");
        
        devLog.log("[EmailConfirmation] Tokens encontrados:", { 
          hasCode: !!code, 
          hasTokenHash: !!tokenHash,
          codePreview: code ? code.substring(0, 8) + "..." : null,
          tokenHashPreview: tokenHash ? tokenHash.substring(0, 8) + "..." : null
        });
        
        if (!code && !tokenHash) {
          devLog.log("[EmailConfirmation] Nenhum token válido encontrado na URL");
          setStatus("error");
          setMessage("Link de confirmação inválido. Verifique o link no seu email.");
          return;
        }

        // ✅ SAAS-GRADE: Usar service layer em vez de API fetch direta
        devLog.log("[EmailConfirmation] 🔐 Chamando service SaaS de confirmação...");
        
        try {
          const typeToUse = typeParam || (tokenHash ? 'signup' : 'email');
          const result = await emailConfirmationService.confirmEmail({
            token_hash: tokenHash || undefined,
            code: code || undefined,
            type: typeToUse as any
          });

          devLog.log("[EmailConfirmation] ✅ Confirmação SaaS-grade bem-sucedida!");
          // Propagar tenantSlug via query para o redirect usar
          // Redirecionar com slug diretamente no momento do redirect, sem alterar a URL agora
          if (result?.data?.tenantSlug) {
            // Acrescentar tenant como parâmetro temporário apenas para o setTimeout abaixo
            const url = new URL(window.location.href);
            url.searchParams.set('tenant', result.data.tenantSlug);
            window.history.replaceState({}, '', url.toString());
          }
          completeConfirmation("SaaS-Service");

        } catch (error) {
          if (error instanceof EmailConfirmationError) {
            devLog.error("[EmailConfirmation] ❌ Erro conhecido:", error.code);
            setStatus("error");
            
            switch (error.code) {
              case 'TOKEN_EXPIRED':
                setMessage("Este link de confirmação expirou. Por favor, solicite um novo.");
                break;
              case 'TOKEN_INVALID':
                setMessage("Link de confirmação inválido. Verifique o link no seu email.");
                break;
              case 'TOKEN_MISSING':
                setMessage("Token de confirmação ausente. Verifique o link no seu email.");
                break;
              default:
                setMessage(error.message || "Erro ao confirmar email. Tente novamente.");
            }
          } else {
            devLog.error("[EmailConfirmation] ⏱️ Erro inesperado:", error);
            setStatus("error");
            setMessage("Erro inesperado ao confirmar email. Tente novamente.");
          }
        }
        
      } catch (error: any) {
        devLog.error("[EmailConfirmation] 💥 Erro inesperado:", error);
        setStatus("error");
        setMessage("Erro inesperado ao confirmar email. Tente novamente.");
      }
    };

    devLog.log("[EmailConfirmation] useEffect executado, iniciando confirmação...");
    handleEmailConfirmation();

    // Cleanup function
    return () => {
      confirmationCompleted = true;
    };
  }, [searchParams, router]);

  const renderIcon = () => {
    if (status === 'loading') {
      return (
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
      );
    }
    
    if (status === 'success') {
      return (
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }
    
    return (
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-md border-2 border-orange-500 flex items-center justify-center bg-white shadow-sm mb-4">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-orange-500">
              <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" fill="currentColor" stroke="currentColor" strokeWidth="0.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {status === 'loading' ? 'Confirmando Email...' : status === 'success' ? 'Email Confirmado!' : 'Erro na Confirmação'}
          </h1>
        </div>

        <div className="mb-6">
          {renderIcon()}
        </div>

        <p className="text-gray-600 mb-8">{message}</p>

        {status !== 'loading' && (
          <div className="space-y-3">
            <Link
              href="/cliente/login"
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-md transition-colors text-lg"
            >
              Ir para Login
            </Link>
            
            {status === 'error' && (
              <Link
                href="/cliente/recuperar-senha"
                className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-6 rounded-md transition-colors"
              >
                Solicitar Novo Link
              </Link>
            )}
          </div>
        )}
      </div>
      
      <footer className="mt-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Sistema de Gerenciamento Fotovoltaico. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className='mt-4 text-gray-600'>Carregando...</p>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  );
} 