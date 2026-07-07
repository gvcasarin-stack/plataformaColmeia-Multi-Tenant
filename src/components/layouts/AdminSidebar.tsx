'use client';

import { useState, useEffect, useMemo, useRef } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import * as LucideIcons from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useTheme } from "next-themes"
import { useNotifications } from '@/lib/contexts/NotificationContext'
import { useClientRequests } from '@/lib/contexts/ClientRequestContext'
import { 
  AlertDialog,
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction
} from "@/components/ui/alert-dialog";
import { devLog } from "@/lib/utils/productionLogger";
import NextLink from 'next/link';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function AdminSidebar({ collapsed: collapsedProp, onToggle: onToggleProp, className }: SidebarProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [collapsedInternal, setCollapsedInternal] = useState(false)
  const collapsed = collapsedProp !== undefined ? collapsedProp : collapsedInternal
  
  const { unreadCount: totalUnreadCountFromContext, refreshUnreadCount } = useNotifications()
  const { pendingCount: pendingRequests } = useClientRequests()
  
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Logs removidos por questões de segurança em produção

  useEffect(() => {
    setMounted(true)
  }, [])

  const totalUnreadNotifications = totalUnreadCountFromContext;

  // Contador de solicitações pendentes é gerenciado pelo contexto ClientRequestContext
  
  const handleSignOutClick = () => {
    document.dispatchEvent(new CustomEvent('app-logout-initiated'))
    if (typeof window !== 'undefined') {
        document.body.classList.add('logging-out')
        sessionStorage.setItem('isLoggingOut', 'true')
    }
    setLogoutDialogOpen(true)
  }
  
  const confirmSignOut = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
      if (typeof window !== 'undefined') window.location.href = "/admin/login"
    } catch (error) {
      devLog.error("[AdminSidebar] Error signing out:", error)
      setIsLoggingOut(false)
      if (typeof window !== 'undefined') {
          document.body.classList.remove('logging-out')
          sessionStorage.removeItem('isLoggingOut')
      }
    }
  }



  const toggleSidebar = () => {
    if (onToggleProp) {
      onToggleProp()
    } else {
      setCollapsedInternal(!collapsedInternal)
    }
  }

  // ✅ Obter permissões do usuário (com fallback para admin completo)
  const userPermissions = user?.permissions || (user?.profile as any)?.permissions || {};
  const isFullAdmin = user?.role === 'admin' || user?.role === 'superadmin' ||
                      user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin' || user?.profile?.role === 'superadmin';

  // ✅ DEBUG: Log para verificar permissions
  useEffect(() => {
    if (user) {
      devLog.log('[AdminSidebar] ===== DEBUG PERMISSIONS =====');
      devLog.log('[AdminSidebar] User ID:', user.id);
      devLog.log('[AdminSidebar] User role:', user.role);
      devLog.log('[AdminSidebar] User.permissions:', user.permissions);
      devLog.log('[AdminSidebar] User.profile:', user.profile);
      devLog.log('[AdminSidebar] User.profile?.role:', user.profile?.role);
      devLog.log('[AdminSidebar] User.profile?.permissions:', (user.profile as any)?.permissions);
      devLog.log('[AdminSidebar] Merged userPermissions:', userPermissions);
      devLog.log('[AdminSidebar] isFullAdmin:', isFullAdmin);
      devLog.log('[AdminSidebar] Individual permission checks:', {
        can_view_dashboard: userPermissions.can_view_dashboard,
        can_edit_preferences: userPermissions.can_edit_preferences,
        can_view_dimensionamento: userPermissions.can_view_dimensionamento,
        can_view_clients: userPermissions.can_view_clients,
        can_manage_team: userPermissions.can_manage_team,
        can_view_financials: userPermissions.can_view_financials
      });
      devLog.log('[AdminSidebar] Visibility results:', {
        painelVisible: isFullAdmin || userPermissions.can_view_dashboard === true,
        preferenciasVisible: isFullAdmin || userPermissions.can_edit_preferences === true,
        dimensionamentoVisible: isFullAdmin || userPermissions.can_view_dimensionamento === true,
        clientesVisible: isFullAdmin || userPermissions.can_view_clients === true,
        equipeVisible: isFullAdmin || userPermissions.can_manage_team === true,
        financeiroVisible: isFullAdmin || userPermissions.can_view_financials === true
      });
      devLog.log('[AdminSidebar] =============================');
    }
  }, [user, userPermissions, isFullAdmin]);

  const links = useMemo(() => {
    const allLinks = [
      {
        href: "/admin/painel",
        label: "Painel",
        icon: LucideIcons.LayoutDashboard,
        color: "text-orange-700 dark:text-orange-400",
        group: "Gestão",
        visible: isFullAdmin || userPermissions.can_view_dashboard === true || userPermissions.can_view_dashboard_financials === true // ✅ Visível para ambas as permissões de painel
      },
      {
        href: "/admin/projetos",
        label: "Projetos",
        icon: LucideIcons.Zap,
        color: "text-amber-700 dark:text-amber-400",
        group: "Gestão",
        visible: isFullAdmin || userPermissions.can_create_projects === true || userPermissions.can_edit_projects === true // ✅ Visível se pode criar OU editar projetos (visualização é implícita)
      },
      {
        href: "/admin/leads",
        label: "Leads",
        icon: LucideIcons.UserPlus,
        color: "text-indigo-700 dark:text-indigo-400",
        group: "Gestão",
        badge: null,
        visible: isFullAdmin // ✅ Apenas admin por enquanto (fase inicial)
      },
      {
        href: "/admin/funil-vendas",
        label: "Pipeline",
        icon: LucideIcons.TrendingUp,
        color: "text-violet-700 dark:text-violet-400",
        group: "Gestão",
        badge: null,
        visible: isFullAdmin // ✅ Apenas admin por enquanto (fase inicial)
      },
      {
        href: "/admin/notificacoes",
        label: "Notificações",
        icon: LucideIcons.Bell,
        badge: totalUnreadNotifications > 0 ? totalUnreadNotifications : null,
        color: "text-purple-700 dark:text-purple-400",
        group: "Gestão",
        visible: true // ✅ Sempre visível (notificações são essenciais)
      },
      {
        href: "/admin/equipe",
        label: "Equipe",
        icon: LucideIcons.Users,
        color: "text-teal-700 dark:text-teal-400",
        group: "Pessoas",
        visible: isFullAdmin || userPermissions.can_manage_team === true // ✅ Controlado por permissão
      },
      {
        href: "/admin/clientes",
        label: "Clientes",
        icon: LucideIcons.Building2,
        color: "text-cyan-700 dark:text-cyan-400",
        group: "Pessoas",
        badge: pendingRequests > 0 ? pendingRequests : null,
        visible: isFullAdmin || userPermissions.can_view_clients === true // ✅ Controlado por permissão estrita
      },
      {
        href: "/admin/financeiro",
        label: "Financeiro",
        icon: LucideIcons.DollarSign,
        color: "text-green-700 dark:text-green-400",
        group: "Configurações",
        visible: isFullAdmin || userPermissions.can_view_financials === true // ✅ Controlado por permissão
      },
      {
        href: "/admin/dimensionamento",
        label: "Dimensionamento",
        icon: LucideIcons.Calculator,
        color: "text-sky-700 dark:text-sky-400",
        group: "Configurações",
        visible: isFullAdmin || userPermissions.can_view_dimensionamento === true // ✅ Controlado por permissão
      },
      {
        href: "/admin/assinaturas",
        label: "Assinaturas",
        icon: LucideIcons.CreditCard,
        color: "text-emerald-700 dark:text-emerald-400",
        group: "Configurações",
        visible: isFullAdmin || userPermissions.can_view_assinaturas === true // ✅ Controlado por permissão
      },
      {
        href: "/admin/preferencias",
        label: "Preferências",
        icon: LucideIcons.Settings,
        color: "text-rose-700 dark:text-rose-400",
        group: "Configurações",
        visible: isFullAdmin || userPermissions.can_edit_preferences === true // ✅ Controlado por permissão
      },
      {
        href: "/admin/arquivados",
        label: "Arquivados",
        icon: LucideIcons.Archive,
        color: "text-gray-700 dark:text-gray-400",
        group: "Configurações",
        visible: isFullAdmin // ✅ Apenas admin e superadmin
      },
      {
        href: "/admin/acervo-tecnico",
        label: "Acervo Técnico",
        icon: LucideIcons.FolderArchive,
        color: "text-blue-700 dark:text-blue-400",
        group: "Configurações",
        visible: isFullAdmin
      },
    ];

    // ✅ Filtrar apenas links visíveis
    return allLinks.filter(link => link.visible);
  }, [totalUnreadNotifications, pendingRequests, pathname, userPermissions, isFullAdmin, isSuperAdmin])

  // ✅ Agrupar os links visíveis em seções (Gestão / Pessoas / Configurações),
  // preservando a ordem original e omitindo seções sem nenhum item visível.
  const groupedLinks = useMemo(() => {
    const groupOrder = ["Gestão", "Pessoas", "Configurações"];
    const map: Record<string, typeof links> = {};
    links.forEach((link) => {
      const group = (link as any).group || "Gestão";
      if (!map[group]) map[group] = [];
      map[group].push(link);
    });
    return groupOrder
      .map((group) => ({ group, items: map[group] || [] }))
      .filter((g) => g.items.length > 0);
  }, [links])

  return (
    <>
      <aside className={cn(
        `${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-800 shadow-md dark:text-white flex flex-col h-screen transition-all duration-300`,
        className
      )}>
        <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
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
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">SGF</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Área Administrativa</p>
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

        <div className="md:hidden fixed bottom-4 right-4 z-50">
          <button
            onClick={toggleSidebar}
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            {collapsed ? <LucideIcons.ChevronRight className="h-5 w-5" /> : <LucideIcons.Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {groupedLinks.map(({ group, items }) => (
            <div key={group} className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pt-0.5 pb-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 leading-tight">
                  {group}
                </div>
              )}
              {items.map((link) => {
                const isActive = pathname === link.href ||
                                (link.href === '/admin/projetos' && (pathname?.startsWith('/admin/projetos/') || pathname?.startsWith('/projetos/'))) ||
                                (link.href === '/admin/clientes' && pathname?.startsWith('/admin/clientes/'));
                const Icon = link.icon;

                return (
                  <NextLink
                    key={link.href}
                    href={link.href}
                    passHref
                    legacyBehavior={false}
                    className={cn(
                      "flex items-center px-3 py-1 rounded-lg transition-all duration-200 group relative",
                      "hover:bg-orange-50/50 dark:hover:bg-orange-900/10",
                      isActive
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm"
                        : "text-gray-700 dark:text-gray-200",
                      collapsed && "justify-center"
                    )}
                  >
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-200",
                      isActive
                        ? "bg-white/20 text-white border-white/10"
                        : "bg-gray-100 dark:bg-gray-700/50 border-transparent"
                    )}>
                      <Icon className={cn("h-3.5 w-3.5", !isActive && link.color)} />
                    </div>

                    {!collapsed && (
                      <span className="ml-3 text-sm font-medium">
                        {link.label}
                      </span>
                    )}

                    {!collapsed && (link as any).comingSoon && (
                      <span className="ml-auto bg-blue-500 text-white text-xs font-semibold h-5 px-2 rounded-full flex items-center justify-center whitespace-nowrap">
                        Em Breve
                      </span>
                    )}

                    {!collapsed && link.badge && !(link as any).comingSoon && (
                      <span className="ml-auto bg-red-500 text-white text-xs font-semibold h-5 min-w-[20px] rounded-full flex items-center justify-center px-1">
                        {link.badge}
                      </span>
                    )}

                    {collapsed && link.badge && (
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
                  </NextLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-1.5 border-t dark:border-gray-700 mt-auto space-y-1.5 bg-orange-50/30 dark:bg-orange-900/10">
          <div className={cn(
            "px-2.5 py-1.5 rounded-lg group transition-colors hover:bg-white dark:hover:bg-gray-700/50",
            collapsed ? "text-center" : "text-left"
          )}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                {user?.profile?.name ? user.profile.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                collapsed ? "w-0" : "w-auto"
              )}>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.profile?.name || user?.email || "Admin"}
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
            onClick={handleSignOutClick}
            className={cn(
              "w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm",
              "transition-all duration-200 rounded-lg",
              "flex items-center justify-center py-1.5 px-3 text-sm",
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
      
      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado da sua conta e redirecionado para a página de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setLogoutDialogOpen(false)
              if (typeof window !== 'undefined') {
                  document.body.classList.remove('logging-out')
                  sessionStorage.removeItem('isLoggingOut')
              }
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmSignOut} disabled={isLoggingOut}>
              {isLoggingOut ? "Saindo..." : "Sair"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AdminSidebar; 