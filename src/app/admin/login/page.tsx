'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { getCurrentDomainTenantId } from '@/lib/utils/tenant-client';
import toast from 'react-hot-toast';

/**
 * Página de login administrativo - VERSÃO CORRIGIDA
 * Esta é a página que deve aparecer em /admin/login
 */
export default function AdminLoginPage() {
  // Debug crítico para confirmar renderização
  console.log('🔑 [ADMIN-LOGIN] COMPONENTE CORRETO RENDERIZADO - Sistema de Gerenciamento Fotovoltaico / Área Administrativa');
  
  // Forçar renderização com alert para debug
  if (typeof window !== 'undefined') {
    console.log('🔑 PÁGINA ADMIN CARREGADA - DEVERIA SER LARANJA');
  }
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantWarning, setTenantWarning] = useState<string | null>(null);
  const [domainInfo, setDomainInfo] = useState<{ tenantId: string | null; hostname: string }>({
    tenantId: null,
    hostname: ''
  });
  const { user, signInWithPassword, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  // 🔒 VALIDAÇÃO PREVENTIVA: Detectar informações do domínio atual
  useEffect(() => {
    console.log('🔑 [ADMIN-LOGIN] useEffect executado - página carregada');

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const tenantId = getCurrentDomainTenantId();

      setDomainInfo({ tenantId, hostname });

      console.log('🔒 [ADMIN-LOGIN] Domínio detectado:', {
        hostname,
        tenantId,
        isGoiasSolar: hostname.includes('goias-solar'),
        isSuprema: hostname.includes('suprema')
      });
    }
  }, []);

  // Redirecionamento apenas se usuário tiver papel de admin/superadmin
  useEffect(() => {
    const isAdmin = !!user && (
      (user as any).role === 'admin' ||
      (user as any).role === 'superadmin' ||
      (user as any).profile?.role === 'admin' ||
      (user as any).profile?.role === 'superadmin'
    );

    if (!authIsLoading && isAdmin) {
      console.log('🔑 [ADMIN-LOGIN] Usuário admin autenticado, redirecionando para /admin/painel...');
      router.push('/admin/painel');
    }
  }, [user, authIsLoading, router]);

  // 🔒 VALIDAÇÃO PREVENTIVA: Detectar possível tentativa cross-tenant
  const checkTenantMismatch = (userEmail: string) => {
    if (!domainInfo.tenantId || !userEmail) return;

    const isGoiasSolarDomain = domainInfo.hostname.includes('goias-solar');
    const isSupremaDomain = domainInfo.hostname.includes('suprema');

    // Heurística: detectar possível mismatch baseado no e-mail
    const emailLowerCase = userEmail.toLowerCase();

    if (isGoiasSolarDomain) {
      // Está no domínio Goiás Solar - verificar se e-mail pode ser da Suprema
      if (emailLowerCase.includes('suprema') ||
          emailLowerCase.includes('luan') ||
          emailLowerCase.endsWith('@suprema.com') ||
          emailLowerCase.endsWith('@supremasolar.com')) {

        setTenantWarning(
          '⚠️ Atenção: Você está tentando fazer login no domínio da Goiás Solar, mas seu e-mail parece ser da Suprema Solar. ' +
          'Você deveria fazer login em suprema-solar.gerenciamentofotovoltaico.com.br'
        );
        return true;
      }
    }

    if (isSupremaDomain) {
      // Está no domínio Suprema - verificar se e-mail pode ser da Goiás
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

    // Limpar warning se não há mismatch
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔑 [ADMIN-LOGIN] Tentativa de login iniciada');
    
    if (!email || !password) {
      toast.error('Preencha todos os campos', {
        duration: 4000,
        position: 'top-center',
      });
      return;
    }

    // 🔒 VERIFICAÇÃO ADICIONAL: Se há warning de tenant, pedir confirmação
    if (tenantWarning) {
      const shouldContinue = window.confirm(
        tenantWarning + '\n\nTem certeza que deseja continuar com este login? ' +
        'Lembre-se que o sistema irá bloquear automaticamente se você não pertencer a esta organização.'
      );

      if (!shouldContinue) {
        console.log('🔒 [ADMIN-LOGIN] Login cancelado pelo usuário devido ao warning de tenant');
        return;
      }
    }

    try {
      setLoading(true);
      
      const loadingToastId = toast.loading('Verificando credenciais...', {
        position: 'top-center',
      });
      
      console.log('🔑 [ADMIN-LOGIN] Chamando signInWithPassword...');
      const { error } = await signInWithPassword({ email, password });
      
      toast.dismiss(loadingToastId);
      
      if (error) {
        console.error('🔑 [ADMIN-LOGIN] Erro no login:', error);
        toast.error('Erro no login. Verifique suas credenciais.', {
          duration: 6000,
          position: 'top-center',
        });
      } else {
        console.log('🔑 [ADMIN-LOGIN] Login bem-sucedido!');
        toast.success('Login realizado com sucesso!', {
          duration: 3000,
          position: 'top-center',
        });
      }
      
    } catch (error) {
      console.error('🔑 [ADMIN-LOGIN] Erro inesperado:', error);
      toast.error('Erro inesperado. Tente novamente.', {
        duration: 4000,
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authIsLoading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Main render - LAYOUT CORRETO DO ADMIN
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-0 m-0 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md px-4">
        {/* Header com ícone e títulos corretos */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-md border-2 border-orange-500 flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-orange-500">
              <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" 
                fill="currentColor" 
                stroke="currentColor" 
                strokeWidth="0.5"
              />
            </svg>
          </div>
          <h1 className="mt-6 text-[#1A1A1A] dark:text-white text-2xl font-bold whitespace-nowrap">Sistema de Gerenciamento Fotovoltaico</h1>
          <p className="mt-2 text-[#666666] dark:text-gray-300">Área Administrativa</p>
        </div>
        
        {/* Formulário de login */}
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Login do Administrador</h2>

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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                placeholder="••••••••"
                disabled={loading}
                required
                autoComplete="current-password"
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
          
          <div className="mt-4 text-center">
            <a href="/recuperar-senha" className="text-sm text-orange-600 hover:text-orange-700 transition-colors">
              Esqueceu sua senha?
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}