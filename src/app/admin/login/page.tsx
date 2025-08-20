'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';
import { getAuthErrorMessage, VALIDATION_MESSAGES, AUTH_SUCCESS_MESSAGES } from '@/lib/utils/auth-errors';
import { devLog } from "@/lib/utils/productionLogger";
import { logAdminPageAccess } from '@/lib/utils/adminRoutesLogger';

/**
 * Página principal de login administrativo
 * 
 * Esta é a página principal acessada via /admin e /(admin)/login que serve como
 * ponto de entrada para administradores. Durante a unificação dos
 * diretórios admin, esta página suporta acesso direto e redirecionado.
 * 
 * Ver documentação: docs/code-cleanup.md - Seção 6: Unificação dos Diretórios Admin
 */
export default function AdminLoginPage() {
  // Clear localStorage and sessionStorage to prevent caching issues
  if (typeof window !== 'undefined') {
    // Only keep critical items that shouldn't be cleared
    const theme = localStorage.getItem('theme');
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Restore critical items
    if (theme) localStorage.setItem('theme', theme);
  }
  
  // Logger para monitorar o uso desta página durante a migração
  useEffect(() => {
    logAdminPageAccess('/admin/login');
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signInWithPassword, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  // If user is already logged in and is an admin, redirect to admin dashboard
  useEffect(() => {
    if (!authIsLoading && user) {
      devLog.log('[AdminLogin] User authenticated, redirecting to /admin/painel. User data:', user);
      router.push('/admin/painel');
    }
  }, [user, authIsLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    try {
      setLoading(true);
      
      // Loading toast centralizado
      const loadingToastId = toast.loading('Verificando credenciais de administrador...', {
        position: 'top-center',
      });
      
      devLog.log('[AdminLogin] Attempting Supabase login...');
      const { error } = await signInWithPassword({ email, password });
      
      // Remove loading toast
      toast.dismiss(loadingToastId);
      
      if (error) {
        devLog.error('❌ [AdminLogin] Supabase login error:', error);
        
        // Use our improved error handling
        const errorInfo = getAuthErrorMessage(error);
        
        // Show user-friendly error message centralizado
        toast.error(errorInfo.message, {
          duration: 6000,
          position: 'top-center',
        });

        // Also log to console for debugging
        devLog.error(`🔍 [AdminLogin] Error details:`, {
          title: errorInfo.title,
          message: errorInfo.message,
          type: errorInfo.type,
          originalError: error
        });
        
        setLoading(false);
      } else {
        devLog.log('[AdminLogin] Supabase login successful. User state will update and useEffect will redirect.');
        
        // Success message centralizado
        toast.success('Login realizado com sucesso! Redirecionando...', {
          duration: 2000,
          position: 'top-center',
        });
      }
    } catch (error: any) {
      // Remove loading toast if still present
      toast.dismiss();
      
      devLog.error('❌ [AdminLogin] Unexpected error:', error);
      
      // Use our improved error handling for unexpected errors
      const errorInfo = getAuthErrorMessage(error);
      
      toast.error(errorInfo.message, {
        duration: 6000,
        position: 'top-center',
      });
      
      setLoading(false);
    }
  };

  if (authIsLoading || (!authIsLoading && user)) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center p-0 m-0 bg-white dark:bg-gray-900">
      <div className="w-full max-w-md px-4">
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
                disabled={loading || authIsLoading}
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
                disabled={loading || authIsLoading}
                required
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || authIsLoading}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {(loading || authIsLoading) ? (
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
              <a href="/recuperar-senha" className="text-sm text-orange-600 hover:text-orange-700 transition-colors">
                Esqueceu sua senha?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 