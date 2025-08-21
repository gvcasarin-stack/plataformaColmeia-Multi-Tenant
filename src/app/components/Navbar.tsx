'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignOutDialog } from '@/components/client/sign-out-dialog';
import { prepareForLogout, resetApplicationState, resetAllForms, logoutWithoutNavigation } from '@/lib/utils/reset';
import { devLog } from "@/lib/utils/productionLogger";
import { toast } from '@/components/ui/use-toast';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();
  
  // Estado para controlar o diálogo de logout
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Adicionar um efeito para garantir que o diálogo não esteja aberto ao iniciar
  useEffect(() => {
    // Certificar-se de que o diálogo está fechado na inicialização
    setLogoutDialogOpen(false);
    
    // Limpar qualquer estado de logout anterior
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isLoggingOut');
      document.body.classList.remove('logging-out');
    }
    
    // Adicionar listener para o evento app-state-reset
    const handleStateReset = () => {
      setLogoutDialogOpen(false);
      setIsLoading(false);
    };
    
    document.addEventListener('app-state-reset', handleStateReset);
    
    return () => {
      document.removeEventListener('app-state-reset', handleStateReset);
    };
  }, []);
  
  // Criar função para verificar se há modificações não salvas
  const checkUnsavedChanges = useCallback(() => {
    // Verificar todos os formulários ativos
    const forms = document.querySelectorAll('form');
    let hasUnsavedChanges = false;
    
    forms.forEach(form => {
      // Se o formulário tem um marcador de 'dirty' ou 'modified'
      if (form.dataset.modified === 'true' || form.dataset.dirty === 'true') {
        hasUnsavedChanges = true;
      }
    });
    
    // Verificar flags globais que possam indicar mudanças
    // @ts-ignore
    if (window.GLOBAL_UNSAVED_CHANGES === true) {
      hasUnsavedChanges = true;
    }
    
    return hasUnsavedChanges;
  }, []);

  const handleSignOut = () => {
    // Verificar se há alterações não salvas antes de sair
    const hasUnsavedChanges = checkUnsavedChanges();
    
    // Usar a função utilitária para preparar para logout
    prepareForLogout();
    
    // Se houver alterações não salvas, mostrar diálogo
    // Caso contrário, fazer logout direto em alguns casos
    if (hasUnsavedChanges) {
      // Abrir diálogo de confirmação apenas após as proteções estarem ativas
      setLogoutDialogOpen(true);
    } else {
      // Para simplificar a experiência do usuário, podemos iniciar o logout diretamente
      // Esta opção é configurável conforme a preferência da equipe
      // setLogoutDialogOpen(true); // Descomente para sempre mostrar confirmação
      confirmSignOut(); // Logout direto sem confirmação
    }
  };
  
  // Nova implementação do confirmSignOut usando logoutWithoutNavigation
  const confirmSignOut = async () => {
    try {
      // 1. Definir estado de carregamento e fechar diálogo
      setIsLoading(true);
      setLogoutDialogOpen(false);
      
      // 2. Resetar todos os formulários para evitar beforeunload
      resetAllForms();
      
      // 3. Usar nossa nova função que evita o diálogo do navegador em produção
      const success = await logoutWithoutNavigation(
        signOut, // Função de logout do Firebase/Auth
        '/cliente/login' // URL de redirecionamento
      );
      
      if (!success) {
        // Em caso de erro, restaurar o estado anterior
        setIsLoading(false);
        toast({
          title: "Erro ao sair",
          description: "Não foi possível completar o logout. Tente novamente.",
          variant: "destructive"
        });
      }
      
      // Não é necessário fazer mais nada aqui, pois logoutWithoutNavigation
      // já cuida do redirecionamento e limpeza de estado
    } catch (error) {
      devLog.error('Erro ao iniciar processo de logout:', error);
      
      // Resetar estados em caso de erro
      setIsLoading(false);
      setLogoutDialogOpen(false);
      resetApplicationState();
    }
  };

  const menuItems = [
    {
      name: 'Painel',
      href: '/cliente/painel',
      icon: (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Projetos',
      href: '/cliente/projetos',
      icon: (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Notificações',
      href: '/cliente/notificacoes',
      icon: (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      name: 'Perfil',
      href: '/cliente/perfil',
      icon: (
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div className="flex h-screen bg-white">
        {/* Sidebar - width set back to 240px */}
        <div className={`hidden md:flex md:flex-col ${isExpanded ? 'md:w-[240px]' : 'md:w-[70px]'} border-r border-gray-100 transition-all duration-300`}>
          {/* Logo and Toggle Button */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-50">
            {isExpanded && (
              <Link href="/cliente/painel" className="text-lg font-semibold text-orange-600">
                Colmeia Projetos
              </Link>
            )}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              {isExpanded ? (
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center h-[38px] px-3 text-[14px] font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900 mb-0.5"
                title={!isExpanded ? item.name : undefined}
              >
                <span className="w-[30px]">{item.icon}</span>
                {isExpanded && item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-3 mt-auto">
            {isExpanded ? (
              <>
                <div className="flex items-center px-3 py-2">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center">
                      <span className="text-sm font-medium text-orange-600">
                        {user?.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {user?.email}
                    </p>
                    <p className="text-[12px] text-gray-500">Conectado</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="mt-2 w-full h-[38px] flex items-center justify-center px-3 text-[14px] font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saindo...
                    </span>
                  ) : (
                    'Sair'
                  )}
                </button>
              </>
            ) : (
              <div className="flex justify-center">
                <div className="h-8 w-8 rounded-full bg-orange-50 flex items-center justify-center" title={user?.email || undefined}>
                  <span className="text-sm font-medium text-orange-600">
                    {user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <Link href="/cliente/painel" className="flex items-center">
              <span className="text-xl font-bold text-orange-600">Colmeia Projetos</span>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Abrir menu</span>
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} border-b border-gray-200`}>
            <div className="px-2 py-3 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center px-3 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-medium">
                      {user?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.email}</div>
                  <div className="text-sm text-gray-500">Conectado</div>
                </div>
              </div>
              <div className="mt-3 px-2">
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                >
                  {isLoading ? 'Saindo...' : 'Sair'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Diálogo de confirmação de logout */}
      <SignOutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={confirmSignOut}
        isLoading={isLoading}
      />
    </>
  );
}
