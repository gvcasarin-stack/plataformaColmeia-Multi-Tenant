'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Página de login administrativo - VERSÃO CORRIGIDA
 * Esta é a página que deve aparecer em /admin/login
 */
export default function AdminLoginPage() {
  // Debug crítico para confirmar renderização
  console.log('🔑 [ADMIN-LOGIN] COMPONENTE CORRETO RENDERIZADO - Colmeia Projetos / Área Administrativa');
  
  // Forçar renderização com alert para debug
  if (typeof window !== 'undefined') {
    console.log('🔑 PÁGINA ADMIN CARREGADA - DEVERIA SER LARANJA');
  }
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signInWithPassword, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  // Logger para monitorar acesso
  useEffect(() => {
    console.log('🔑 [ADMIN-LOGIN] useEffect executado - página carregada');
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
          <h1 className="mt-6 text-[#1A1A1A] dark:text-white text-2xl font-bold">Colmeia Projetos</h1>
          <p className="mt-2 text-[#666666] dark:text-gray-300">Área Administrativa</p>
        </div>
        
        {/* Formulário de login */}
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 dark:text-white">Login do Administrador</h2>
          
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