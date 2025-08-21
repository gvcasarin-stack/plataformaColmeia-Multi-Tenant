"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import * as LucideIcons from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/contexts/NotificationContext";
import { devLog } from "@/lib/utils/productionLogger";
import { SignOutDialog } from "@/components/client/sign-out-dialog";

// Definir tipos das props da Sidebar
interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed: collapsedProp, onToggle: onToggleProp }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp !== undefined ? collapsedProp : collapsedInternal;
  const { unreadCount: contextUnreadCount, refreshUnreadCount } = useNotifications();
  
  // Estado para controlar o diálogo de logout
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;
    if (pathname?.includes('/cliente/notificacoes')) {
      devLog.log('[ClientSidebar] Na página de notificações, configurando refresh periódico a cada 30s (fallback)');
      refreshInterval = setInterval(() => {
        if (user) {
          devLog.log('[ClientSidebar] Refresh periódico para /cliente/notificacoes');
          refreshUnreadCount();
        }
      }, 30000);
    }
    return () => {
      if (refreshInterval) {
        devLog.log('[ClientSidebar] Limpando refreshInterval periódico.');
        clearInterval(refreshInterval);
      }
    };
  }, [pathname, refreshUnreadCount, user]);

  const handleSignOut = async () => {
    // Disparar um evento personalizado para notificar outros componentes
    document.dispatchEvent(new CustomEvent('app-logout-initiated'));
    
    // Definir uma flag para indicar que o usuário está fazendo logout
    // Isso ajuda a evitar a mensagem de confirmação de beforeunload
    document.body.classList.add('logging-out');
    sessionStorage.setItem('isLoggingOut', 'true');
    
    // Abrir o diálogo de confirmação
    setLogoutDialogOpen(true);
  };
  
  const confirmSignOut = async () => {
    try {
      setIsLoggingOut(true);
      
      // Fazer logout no Firebase
      await signOut();
      
      // Redirecionar para a página de login
      window.location.href = "/cliente/login";
    } catch (error) {
      devLog.error("Error signing out:", error);
      setIsLoggingOut(false);
      
      // Reverter as flags caso ocorra erro
      document.body.classList.remove('logging-out');
      sessionStorage.removeItem('isLoggingOut');
    }
  };



  const toggleSidebar = () => {
    if (onToggleProp) {
      onToggleProp();
    } else {
      setCollapsedInternal(!collapsedInternal);
    }
  };

  const links = [
    {
      href: "/cliente/painel",
      label: "Painel",
      icon: LucideIcons.BarChart3,
      color: "bg-blue-50 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50"
    },
    {
      href: "/cliente/projetos",
      label: "Projetos",
      icon: LucideIcons.Lightbulb,
      color: "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50"
    },
    {
      href: "/cliente/cobranca",
      label: "Cobrança",
      icon: LucideIcons.DollarSign,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50"
    },
    {
      href: "/cliente/notificacoes",
      label: "Notificações",
      icon: LucideIcons.Bell,
      badge: contextUnreadCount > 0 ? contextUnreadCount : null,
      color: "bg-purple-50 text-purple-700 border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50"
    },
    {
      href: "/cliente/perfil",
      label: "Perfil",
      icon: LucideIcons.UserCircle2,
      color: "bg-cyan-50 text-cyan-700 border-cyan-200/50 dark:bg-cyan-900/20 dark:text-cyan-400 dark:border-cyan-800/50"
    },
  ];

  return (
    <>
      <aside className={`${collapsed ? 'w-20' : 'w-64'} bg-white shadow-md dark:bg-gray-800 dark:text-white flex flex-col h-full transition-all duration-300`}>
        {/* Logo and Brand with Toggle Button */}
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div className={cn(
            "flex items-center",
            collapsed && "w-full justify-center cursor-pointer"
          )}
          onClick={() => collapsed && toggleSidebar()}>
            <div className="w-8 h-8 rounded-md border-2 border-orange-500 dark:border-orange-400 flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-500 dark:text-orange-400">
                <path d="M21 16.5c0 0.38-0.21 0.71-0.53 0.88l-7.9 4.44c-0.16 0.12-0.36 0.18-0.57 0.18s-0.41-0.06-0.57-0.18l-7.9-4.44A0.991 0.991 0 0 1 3 16.5v-9c0-0.38 0.21-0.71 0.53-0.88l7.9-4.44c0.16-0.12 0.36-0.18 0.57-0.18s0.41 0.06 0.57 0.18l7.9 4.44c0.32 0.17 0.53 0.5 0.53 0.88v9z" 
                  fill="currentColor" 
                  stroke="currentColor" 
                  strokeWidth="0.5"
                />
              </svg>
            </div>
            <div className={cn(
              "transition-all duration-300 overflow-hidden",
              collapsed ? "w-0" : "w-auto"
            )}>
              {!collapsed && (
                <div className="ml-3">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">Colmeia</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Área do Cliente</p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            <div className="transform transition-transform duration-300 ease-in-out">
              {collapsed ? <LucideIcons.ChevronRight className="h-4 w-4" /> : <LucideIcons.Menu className="h-4 w-4" />}
            </div>
          </button>
        </div>

        {/* Adicionar um botão móvel flutuante para dispositivos pequenos */}
        <div className="md:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={toggleSidebar}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? <LucideIcons.ChevronRight className="h-5 w-5" /> : <LucideIcons.Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {links.map((link) => {
            // Verificar se estamos na página atual analisando o pathname
            // Para projetos, considerar também páginas que começam com o caminho de projetos
            const isActive = pathname === link.href || 
                            (link.href === '/cliente/projetos' && pathname?.startsWith('/cliente/projetos/'));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                  "hover:bg-orange-50/50 dark:hover:bg-orange-900/10",
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm"
                    : "text-gray-700 dark:text-gray-200",
                  collapsed && "justify-center"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-200",
                  isActive
                    ? "bg-white/20 text-white border-white/10"
                    : link.color
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                
                {/* Label normal quando não está recolhido */}
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium">
                    {link.label}
                  </span>
                )}
                
                {/* Badge de notificações */}
                {!collapsed && link.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-semibold h-5 min-w-[20px] rounded-full flex items-center justify-center px-1">
                    {link.badge}
                  </span>
                )}
                
                {/* Tooltip quando recolhido */}
                {collapsed && (
                  <>
                    <span className="sr-only">{link.label}</span>
                    <div className="absolute left-full ml-2 hidden group-hover:flex items-center">
                      <div className="w-2 h-2 rotate-45 bg-gray-900 dark:bg-gray-700"></div>
                      <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs py-1.5 px-3 rounded ml-[-2px] whitespace-nowrap z-50">
                        {link.label}
                        {link.badge && (
                          <span className="ml-1.5 bg-red-500 text-white text-xs font-semibold h-4 min-w-[16px] rounded-full inline-flex items-center justify-center px-1">
                            {link.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile and Theme Toggle */}
        <div className="p-2 border-t dark:border-gray-700 mt-auto space-y-2 bg-orange-50/30 dark:bg-orange-900/10">
          <div className={cn(
            "px-3 py-2.5 rounded-lg group transition-colors hover:bg-white dark:hover:bg-gray-700/50",
            collapsed ? "text-center" : "text-left"
          )}>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                {user?.profile?.full_name ? user.profile.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                collapsed ? "w-0" : "w-auto"
              )}>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.profile?.full_name || user?.email}
                </p>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">
                  Conectado
                </p>
              </div>

              {/* Theme Toggle Button */}
              {!collapsed && mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="ml-auto p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  aria-label="Alternar tema"
                >
                  {theme === "dark" ? (
                    <LucideIcons.Sun className="h-4 w-4" />
                  ) : (
                    <LucideIcons.Moon className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className={cn(
              "w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm",
              "transition-all duration-200 rounded-lg",
              "flex items-center justify-center py-2.5 px-3 text-sm",
              !collapsed && "px-2"
            )}>
              <LucideIcons.LogOut className="h-4 w-4" />
              <span
                className={cn(
                  "ml-2.5 font-medium",
                  collapsed ? "w-0 overflow-hidden" : "w-auto"
                )}
              >
                Sair
              </span>
            </button>
        </div>
      </aside>
      
      {/* Diálogo de confirmação de logout */}
      <SignOutDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={confirmSignOut}
        isLoading={isLoggingOut}
      />
    </>
  );
}
