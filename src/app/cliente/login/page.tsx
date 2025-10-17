"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentDomainTenantId } from '@/lib/utils/tenant-client';
import toast from 'react-hot-toast';
import { devLog } from "@/lib/utils/productionLogger";
import { getAuthErrorMessage, VALIDATION_MESSAGES, AUTH_SUCCESS_MESSAGES } from "@/lib/utils/auth-errors";

export default function ClientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [tenantWarning, setTenantWarning] = useState<string | null>(null);
  const [domainInfo, setDomainInfo] = useState<{ tenantId: string | null; hostname: string }>({
    tenantId: null,
    hostname: ''
  });

  // Estados para controlar o fluxo de recovery
  const [isAwaitingRecovery, setIsAwaitingRecovery] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  const { signInWithPassword, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle success/error messages from URL params
  useEffect(() => {
    const message = searchParams.get('message');
    const details = searchParams.get('details');

    if (message) {
      if (message.includes('Senha alterada com sucesso')) {
        toast.success('Senha alterada com sucesso! Faça login com sua nova senha.', {
          duration: 5000,
          position: 'top-center',
        });
      } else {
        let description = decodeURIComponent(message);
        if (details) {
          description += ` Detalhes: ${decodeURIComponent(details)}`;
        }

        switch (message) {
          case 'link_expired':
            toast.error('Link expirado. Solicite um novo link de recuperação.', {
              duration: 6000,
              position: 'top-center',
            });
            break;
          case 'auth_error':
            toast.error('Erro de autenticação. Tente novamente.', {
              duration: 4000,
              position: 'top-center',
            });
            break;
          default:
            toast(description, {
              duration: 4000,
              position: 'top-center',
            });
        }
      }
      
      // Clean URL parameters
      const url = new URL(window.location.href);
      url.searchParams.delete('message');
      url.searchParams.delete('details');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // 🔒 VALIDAÇÃO PREVENTIVA: Detectar informações do domínio atual
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const tenantId = getCurrentDomainTenantId();

      setDomainInfo({ tenantId, hostname });

      devLog.log('[CLIENT-LOGIN] Domínio detectado:', {
        hostname,
        tenantId,
        isGoiasSolar: hostname.includes('goias-solar'),
        isSuprema: hostname.includes('suprema')
      });
    }
  }, []);

  // 🔒 VALIDAÇÃO PREVENTIVA: Detectar possível tentativa cross-tenant
  const checkTenantMismatch = (userEmail: string) => {
    if (!domainInfo.tenantId || !userEmail) return;

    const isGoiasSolarDomain = domainInfo.hostname.includes('goias-solar');
    const isSupremaDomain = domainInfo.hostname.includes('suprema');

    const emailLowerCase = userEmail.toLowerCase();

    if (isGoiasSolarDomain) {
      if (emailLowerCase.includes('suprema') ||
          emailLowerCase.includes('luan') ||
          emailLowerCase.endsWith('@suprema.com') ||
          emailLowerCase.endsWith('@supremasolar.com')) {

        setTenantWarning(
          '⚠️ Atenção: Você está tentando fazer login no domínio da Goiás Solar, mas seu e-mail parece ser da Suprema Solar. ' +
          'Você deveria fazer login em suprema.gerenciamentofotovoltaico.com.br'
        );
        return true;
      }
    }

    if (isSupremaDomain) {
      if (emailLowerCase.includes('goias') ||
          emailLowerCase.includes('goiás') ||
          emailLowerCase.includes('gabriel') ||
          emailLowerCase.endsWith('@goiassolar.com') ||
          emailLowerCase.endsWith('@colmeiasolar.com')) {

        setTenantWarning(
          '⚠️ Atenção: Você está tentando fazer login no domínio da Suprema Solar, mas seu e-mail parece ser da Goiás Solar. ' +
          'Você deveria fazer login em goias-solar.gerenciamentofotovoltaico.com.br'
        );
        return true;
      }
    }

    if (tenantWarning) {
      setTenantWarning(null);
    }

    return false;
  };

  // Validar tenant quando e-mail mudar
  useEffect(() => {
    if (email && domainInfo.tenantId) {
      checkTenantMismatch(email);
    }
  }, [email, domainInfo.tenantId, domainInfo.hostname]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🔒 VERIFICAÇÃO ADICIONAL: Se há warning de tenant, pedir confirmação
    if (tenantWarning) {
      const shouldContinue = window.confirm(
        tenantWarning + '\n\nTem certeza que deseja continuar com este login? ' +
        'Lembre-se que o sistema irá bloquear automaticamente se você não pertencer a esta organização.'
      );

      if (!shouldContinue) {
        devLog.log('[CLIENT-LOGIN] Login cancelado pelo usuário devido ao warning de tenant');
        return;
      }
    }

    // Validação básica de campos
    if (!email || !password) {
      const validation = VALIDATION_MESSAGES.REQUIRED_FIELDS;
      toast.error(validation.message, {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const validation = VALIDATION_MESSAGES.INVALID_EMAIL;
      toast.error(validation.message, {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }
    
    setLoading(true);
    const loadingToastId = toast.loading('Verificando credenciais...', {
      position: 'top-center',
    });

    let authUser = null;
    let authSession = null;

    try {
      devLog.log('🔄 [ClientLogin] Attempting Supabase login...');
      const { user, session, error: signInError } = await signInWithPassword({ email, password });
      
      authUser = user;
      authSession = session;
      
      toast.dismiss(loadingToastId);
      
      if (signInError) {
        devLog.error('❌ [ClientLogin] Supabase login error:', signInError);
        const errorInfo = getAuthErrorMessage(signInError);
        toast.error(errorInfo.message, {
          duration: 6000,
          position: 'top-center',
        });
        devLog.error(`🔍 [ClientLogin] Error details:`, {
          title: errorInfo.title,
          message: errorInfo.message,
          type: errorInfo.type,
          originalError: signInError
        });
        setLoading(false);
        return;
      }
      
      if (authUser && authSession) {
        devLog.log('✅ [ClientLogin] Supabase login successful. Verificando permissões...');

        // 🔒 VALIDAÇÃO DE ROLE: Apenas clientes podem acessar área de cliente
        const userRole = (authUser as any)?.profile?.role || (authUser as any)?.role;
        devLog.log('🔑 [CLIENT-LOGIN] Role detectado:', userRole);

        if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'colaborador') {
          devLog.error('🔑 [CLIENT-LOGIN] Acesso negado - usuário não-cliente tentando acessar área de cliente:', { email, role: userRole });

          const mensagemRole = userRole === 'colaborador'
            ? 'Colaboradores devem usar a área administrativa (/admin/login).'
            : 'Administradores devem usar a área administrativa (/admin/login).';

          toast.error(`Acesso negado. ${mensagemRole}`, {
            duration: 6000,
            position: 'top-center',
          });

          // Fazer logout imediatamente
          await signOut();
          setLoading(false);
          return;
        }

        devLog.log('✅ [ClientLogin] Permissão validada! User state will update, relying on layout to redirect.');
        toast.success(AUTH_SUCCESS_MESSAGES.LOGIN.message, {
          duration: 2000,
          position: 'top-center',
        });
        // Não fazemos router.push() aqui. Deixamos o ClientLoginLayout ou ClientLayout principal lidar com isso
        // baseado na atualização do estado de autenticação.
        // setLoading(false) não é estritamente necessário se o layout for redirecionar e desmontar a página,
        // mas se o layout demorar, o botão pode ficar desabilitado.
        // Se o redirecionamento for rápido, o estado de loading da página de login não importa tanto.
        // Por segurança, vamos manter o setLoading(false) no finally se não houver erro.

      } else {
        devLog.error('❌ [ClientLogin] Login successful but no user or session data, and no signInError. This is unexpected.');
        toast.error('Ocorreu um erro inesperado após o login. Tente novamente.', {
          duration: 6000,
          position: 'top-center',
        });
      }
      
    } catch (generalError: any) {
      toast.dismiss(loadingToastId);
      devLog.error('❌ [ClientLogin] Unexpected error during handleSubmit (catch block):', generalError);
      const errorInfo = getAuthErrorMessage(generalError);
      toast.error(errorInfo.message, {
        duration: 6000,
        position: 'top-center',
      });
    } finally {
      // Se signInError ocorreu, setLoading(false) já foi chamado e houve return.
      // Se não houve erro e o login foi bem-sucedido (authUser e authSession existem),
      // o redirecionamento deve ocorrer pelo layout. Ainda assim, é bom setar loading false.
      // Se houve um generalError no catch, ou se authUser/authSession não foram definidos sem signInError.
      setLoading(false);
    }
  };

  // Lógica de Renderização
  let pageTitle = "Área do Cliente";
  let formTitle = "Login do Cliente";
  let content = (
    <>
      {/* 🔒 AVISO DE TENANT MISMATCH */}
      {tenantWarning && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">{tenantWarning}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            placeholder="seu@email.com"
            disabled={loading}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
      <div className="mt-4 text-center space-y-2">
        <div>
          <a href="/cliente/recuperar-senha" className="text-sm text-orange-600 hover:text-orange-700 transition-colors">
            Esqueceu sua senha?
          </a>
        </div>
        <div>
          <a href="/cliente/cadastro" className="text-sm text-orange-600 hover:text-orange-700 transition-colors">
            Não tem uma conta? Cadastre-se
          </a>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-md border-2 border-orange-500 flex items-center justify-center bg-white shadow-sm">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-orange-500">
              <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="0.5"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-[#1A1A1A] text-2xl font-bold whitespace-nowrap">Sistema de Gerenciamento Fotovoltaico</h1>
          <p className="mt-2 text-[#666666]">
            {pageTitle}
          </p>
        </div>
        
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            {formTitle}
          </h2>
          {content}
        </div>
      </div>
    </div>
  );
} 