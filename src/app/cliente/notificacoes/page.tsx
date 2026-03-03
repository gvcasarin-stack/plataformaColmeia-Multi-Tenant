"use client";

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCircle, Trash2, ChevronRight, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useNotifications } from '@/lib/contexts/NotificationContext'
import { NotificacaoPadronizada } from '@/lib/services/notificationService/types'
import { devLog } from "@/lib/utils/productionLogger";
import { formatSafeDate } from '@/lib/utils/dateHelpers'
import { getNotificationIcon } from '@/lib/utils/notificationIcons'

// Utilities
const safelyFormatDate = formatSafeDate

// Ícones customizados usando componentes
const BellIcon = Bell;
const CheckIcon = Check;
const AlertIcon = AlertCircle;

export default function ClientNotificationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { refreshUnreadCount, updateCounterOptimistic } = useNotifications();
  const [notifications, setNotifications] = useState<NotificacaoPadronizada[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{id: string, action: string} | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const itemsPerPage = 10;

  // Calculate if there are any unread notifications
  const hasUnreadNotifications = notifications.some(notification => !notification.read);
  
  // Filter notifications based on active tab, type filter, and search query
  const filteredNotifications = notifications.filter(notification => {
    // Tab filter
    if (activeTab === 'unread' && notification.read) return false;
    if (activeTab === 'read' && !notification.read) return false;

    // Type filter
    if (typeFilter !== 'all') {
      const notifType = notification.data?.originalType || notification.type;
      if (notifType !== typeFilter) return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = notification.title?.toLowerCase().includes(query);
      const messageMatch = notification.message?.toLowerCase().includes(query);
      const projectMatch = notification.data?.projectName?.toLowerCase().includes(query);
      const clientMatch = notification.data?.clientName?.toLowerCase().includes(query);

      if (!titleMatch && !messageMatch && !projectMatch && !clientMatch) return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Count notifications by status
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  // Buscar notificações
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    // ✅ CORREÇÃO UX: Só mostrar loading se for o primeiro carregamento
    if (notifications.length === 0) {
      setIsLoadingNotifications(true);
    }
    setError(null);
    
    try {
      // 🔍 DEBUG: Verificar se user.id está sendo truncado
      devLog.log('🔍 [ClientNotifications] DEBUG - User object:', {
        userId: user.id,
        userIdLength: user.id?.length,
        fullUser: user
      });

      devLog.log('🔍 [ClientNotifications] Buscando notificações via API...');

      // ✅ SEGURANÇA MULTI-TENANT: Passar userId na query
      const response = await fetch(`/api/notifications/user?userId=${encodeURIComponent(user.id)}&limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      devLog.log('🔍 [ClientNotifications] Resultado da API:', {
        success: result.success,
        count: result.count,
        unreadCount: result.unreadCount
      });
      
      if (result.success) {
        setNotifications(result.data || []);
      } else {
        throw new Error(result.error || 'Erro ao carregar notificações');
      }
    } catch (error: any) {
      devLog.error('[ClientNotifications] Error fetching notifications:', error);
      setError(error.message || 'Erro ao carregar notificações');
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user]);

  // Carregar notificações quando o componente montar
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace('/cliente/login');
      return;
    }

    fetchNotifications();
  }, [user, authLoading, router, fetchNotifications]);

  // ✅ CORREÇÃO UX: Removido listener visibilitychange desnecessário
  // O polling inteligente já atualiza as notificações automaticamente
  // Não precisamos forçar reload a cada mudança de aba

  // Função removida - agora usa getNotificationIcon do utilitário centralizado

  // Lidar com clique na notificação
  const handleNotificationClick = useCallback(async (notification: NotificacaoPadronizada) => {
    try {
      // Verificar se trial expirou antes de permitir acesso ao projeto
      const projectId = notification.projectId || notification.data?.projectId;
      
      if (projectId) {
        try {
          const { createTenantHeaders } = await import('@/lib/utils/tenant-helper');
          const headers = await createTenantHeaders(user?.id || '');
          
          const response = await fetch('/api/tenant/organization', {
            method: 'GET',
            headers,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              const orgData = result.data;
              const now = new Date();
              const trialEnd = new Date(orgData.trial_ends_at);
              const isTrialExpired = orgData.is_trial && now > trialEnd && orgData.subscription_status !== 'active';
              
              if (isTrialExpired) {
                // Trial expirado - redirecionar para assinaturas
                devLog.log('[ClientNotifications] Trial expirado, redirecionando para assinaturas');
                const slug = window.location.pathname.split('/')[1];
                router.push(`/${slug}/admin/assinaturas`);
                return;
              }
            }
          }
        } catch (error) {
          devLog.error('[ClientNotifications] Erro ao verificar trial:', error);
          // Em caso de erro, permitir acesso (fallback)
        }
      }
      // Marcar como lida se não estiver
      if (!notification.read) {
        // 🚀 ATUALIZAÇÃO IMEDIATA: Decrementar contador antes da API
        updateCounterOptimistic(-1);
        
        // Usar rota de API para marcar como lida
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notificationId: notification.id,
            userId: user?.id
          }),
        });
        
        if (response.ok) {
          // Atualizar estado local
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
          );
          
          // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
          setTimeout(() => refreshUnreadCount(), 500);
        } else {
          // 🚀 ROLLBACK: Reverter contador se falhou
          updateCounterOptimistic(1);
        }
      }
      
      // ✅ MELHORIA UX: Navegar para projeto com visualização expandida
      devLog.log('[ClientNotifications] 🔍 DEBUG - Dados da notificação:', {
        notificationId: notification.id,
        projectId: projectId,
        projectIdFromData: notification.data?.projectId,
        type: notification.type,
        hasProjectId: !!projectId,
        notificationComplete: notification
      });
      
      // Continuar com navegação se projectId existe e trial não expirou
      if (projectId) {
        // Determinar seção específica baseada no tipo de notificação
        let focusSection = '';
        switch (notification.type) {
          case 'new_comment':
            focusSection = 'comments';
            break;
          case 'document_upload':
            focusSection = 'documents';
            break;
          case 'status_change':
            focusSection = 'status';
            break;
          default:
            focusSection = 'overview';
        }
        
        // Navegar com parâmetros para abrir visualização expandida
        const url = `/cliente/projetos/${projectId}?expand=true&focus=${focusSection}`;
        
        devLog.log('[ClientNotifications] Navegando para projeto:', {
          projectId: projectId,
          notificationType: notification.type,
          focusSection,
          url
        });
        
        router.push(url);
      }
    } catch (error) {
      devLog.error('[ClientNotifications] Error on notification click:', error);
      // 🚀 ROLLBACK: Reverter contador se deu erro
      updateCounterOptimistic(1);
    }
  }, [router, refreshUnreadCount, updateCounterOptimistic]);

  // Função para excluir notificação
  const handleDeleteNotification = useCallback(async (e: React.MouseEvent, notificationId: string) => {
    // Evitar propagação para não disparar o handleNotificationClick
    e.stopPropagation();
    
    try {
      // Mostrar feedback imediato
      setActionFeedback({id: notificationId, action: 'delete'});
      
      // 🚀 OTIMIZAÇÃO: Encontrar a notificação para saber se era não lida
      const notification = notifications.find(n => n.id === notificationId);
      const wasUnread = notification && !notification.read;
      
      // 🚀 ATUALIZAÇÃO IMEDIATA: Decrementar contador se era não lida
      if (wasUnread) {
        updateCounterOptimistic(-1);
      }
      
      // Usar rota de API para deletar
      const response = await fetch('/api/notifications/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId,
          userId: user?.id
        }),
      });
      
      if (response.ok) {
        // Atualizar estado local
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
        setTimeout(() => refreshUnreadCount(), 500);
      } else {
        // 🚀 ROLLBACK: Reverter contador se falhou
        if (wasUnread) {
          updateCounterOptimistic(1);
        }
        throw new Error('Erro ao deletar notificação');
      }
    } catch (error) {
      devLog.error('[ClientNotifications] Error deleting notification:', error);
      // 🚀 ROLLBACK: Reverter contador se deu erro
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        updateCounterOptimistic(1);
      }
      setActionFeedback(null);
    }
  }, [refreshUnreadCount, updateCounterOptimistic, notifications]);

  // Função para marcar notificação individual como lida
  const handleMarkAsRead = async (e: React.MouseEvent, notification: NotificacaoPadronizada) => {
    e.stopPropagation()
    
    try {
      setActionFeedback({id: notification.id, action: 'read'})
      
      if (notification.read) {
        setTimeout(() => setActionFeedback(null), 1500)
        return
      }
      
      updateCounterOptimistic(-1);
      
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: notification.id, userId: user?.id }),
      });
      
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ))
        setTimeout(() => refreshUnreadCount(), 500);
      } else {
        updateCounterOptimistic(1);
      }
      
      setTimeout(() => setActionFeedback(null), 1500)
    } catch (error) {
      devLog.error('[ClientNotifications] Error marking notification as read:', error)
      updateCounterOptimistic(1);
      setActionFeedback(null)
    }
  }

  // Marcar como não lida
  const handleMarkAsUnread = async (e: React.MouseEvent, notification: NotificacaoPadronizada) => {
    e.stopPropagation()

    try {
      setActionFeedback({id: notification.id, action: 'unread'})

      if (!notification.read) {
        setTimeout(() => setActionFeedback(null), 1500)
        return
      }

      updateCounterOptimistic(1);

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: notification.id, userId: user?.id, markAsUnread: true }),
      });

      if (response.ok) {
        setNotifications(notifications.map(n =>
          n.id === notification.id ? { ...n, read: false } : n
        ))
        setTimeout(() => refreshUnreadCount(), 500);
      } else {
        updateCounterOptimistic(-1);
      }

      setTimeout(() => setActionFeedback(null), 1500)
    } catch (error) {
      devLog.error('[ClientNotifications] Error marking notification as unread:', error)
      updateCounterOptimistic(-1);
      setActionFeedback(null)
    }
  }

  // Ações em lote
  const handleSelectAll = () => {
    if (selectedNotifications.length === paginatedNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(paginatedNotifications.map(n => n.id))
    }
  }

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev =>
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    )
  }

  const handleBulkMarkAsRead = async () => {
    if (selectedNotifications.length === 0) return

    try {
      const notificationsToMark = notifications.filter(n =>
        selectedNotifications.includes(n.id) && !n.read
      )

      updateCounterOptimistic(-notificationsToMark.length);

      for (const notifId of selectedNotifications) {
        const notif = notifications.find(n => n.id === notifId);
        if (notif && !notif.read) {
          await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ notificationId: notifId, userId: user?.id }),
          });
        }
      }

      setNotifications(notifications.map(n =>
        selectedNotifications.includes(n.id) ? { ...n, read: true } : n
      ))
      setSelectedNotifications([])
      setTimeout(() => refreshUnreadCount(), 500);
    } catch (error) {
      devLog.error('[ClientNotifications] Error bulk marking as read:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return

    try {
      const notificationsToDelete = notifications.filter(n =>
        selectedNotifications.includes(n.id) && !n.read
      )

      updateCounterOptimistic(-notificationsToDelete.length);

      for (const notifId of selectedNotifications) {
        await fetch('/api/notifications/delete', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificationId: notifId, userId: user?.id }),
        });
      }

      setNotifications(notifications.filter(n => !selectedNotifications.includes(n.id)))
      setSelectedNotifications([])
      setTimeout(() => refreshUnreadCount(), 500);
    } catch (error) {
      devLog.error('[ClientNotifications] Error bulk deleting:', error)
    }
  }

  // Função para marcar todas como lidas
  const handleMarkAllAsRead = useCallback(async () => {
    if (!hasUnreadNotifications || !user) return;
    
    const unreadNotifications = notifications.filter(n => !n.read);
    
    try {
      // 🚀 ATUALIZAÇÃO IMEDIATA: Zerar contador antes da API
      updateCounterOptimistic(-unreadNotifications.length);
      
      // 1. Atualizar estado local IMEDIATAMENTE para feedback visual
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      
      // 2. Usar rota de API para marcar todas como lidas
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (!response.ok) {
        // 🚀 ROLLBACK: Reverter contador se falhou
        updateCounterOptimistic(unreadNotifications.length);
        throw new Error('Erro ao marcar todas como lidas');
      }
      
      // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
      setTimeout(() => refreshUnreadCount(), 500);
    } catch (error) {
      devLog.error('[ClientNotifications] Error marking all notifications as read:', error);
      
      // 🚀 ROLLBACK: Reverter contador se deu erro
      updateCounterOptimistic(unreadNotifications.length);
      
      // 5. Em caso de erro, recarregar notificações para estado correto
      fetchNotifications();
    }
  }, [hasUnreadNotifications, user, refreshUnreadCount, updateCounterOptimistic, notifications, fetchNotifications]);

  // Estado de carregamento
  if (isLoadingNotifications) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Gradiente */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Notificações
          </h1>
          <p className="mt-2 text-blue-100">
            Acompanhe todas as atualizações dos seus projetos e atividades no sistema
          </p>
        </div>
        
        {/* Elementos decorativos */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30"></div>
      </div>

      {/* Exibir erro, se houver */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertIcon className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchNotifications}
                className="gap-2"
              >
                Tentar novamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80 border-b border-gray-100 dark:border-gray-700 p-1">
          <div className="flex space-x-1 px-2">
            <button
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/80 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setActiveTab('all')}
            >
              Todas ({notifications.length})
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'unread'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/80 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setActiveTab('unread')}
            >
              Não lidas {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === 'read'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/80 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => setActiveTab('read')}
            >
              Lidas {readCount > 0 && `(${readCount})`}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Filtros e Busca */}
          <div className="mb-6 space-y-4">
            <div className="flex gap-4 flex-wrap">
              {/* Campo de Busca */}
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por título, projeto ou cliente..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Filtro por Tipo */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">Todos os tipos</option>
                <option value="new_comment">Comentários</option>
                <option value="document_upload">Uploads</option>
                <option value="status_change">Mudanças de Status</option>
              </select>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              {activeTab !== 'read' && hasUnreadNotifications && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckIcon className="h-4 w-4" />
                  Marcar todas como lidas
                </Button>
              )}

              {selectedNotifications.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                    onClick={handleBulkMarkAsRead}
                  >
                    <CheckIcon className="h-4 w-4" />
                    Marcar selecionadas como lidas ({selectedNotifications.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                    onClick={handleBulkDelete}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir selecionadas ({selectedNotifications.length})
                  </Button>
                </>
              )}
            </div>

            {paginatedNotifications.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === paginatedNotifications.length && paginatedNotifications.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Selecionar todos
                </span>
              </div>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="space-y-2">
            {paginatedNotifications.length > 0 ? (
              paginatedNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 hover:shadow-lg transition-all duration-200 cursor-pointer shadow-md ${
                    !notification.read
                      ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-600'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => handleSelectNotification(notification.id)}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    <div className={`flex-shrink-0 p-1.5 rounded-full ${
                      !notification.read
                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 ring-offset-1'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {getNotificationIcon((notification.data?.originalType || notification.type) as any)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                            Nova
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                        {notification.message}
                        {notification.type === 'document_upload' && notification.data && notification.data.clientName && 
                          <span className="block font-medium mt-1 text-blue-600 dark:text-blue-400">
                            Enviado por: {notification.data.clientName}
                          </span>
                        }
                        {notification.type === 'new_comment' && notification.data && 
                          <div className="block mt-1">
                            <span className="font-medium">Autor: </span>
                            <span className="text-blue-600 dark:text-blue-400">
                              {notification.data.authorName || notification.data.clientName || "Admin"}
                            </span>
                            <div className="mt-1 border-l-2 border-blue-400 pl-2 py-1 italic">
                              {notification.data.commentFull || notification.data.commentSnippet || "Sem conteúdo"}
                            </div>
                          </div>
                        }
                      </p>
                      
                      {/* Detalhes adicionais com base no tipo de notificação */}
                      {notification.type === 'new_comment' && notification.data && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                          <div className="border-l-2 border-blue-400 pl-2 py-1 mb-2 italic">
                            {notification.data.commentFull || notification.data.commentSnippet || "Sem conteúdo"}
                          </div>
                          <div className="grid grid-cols-1 gap-1 mt-2">
                            {notification.data.projectName && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Projeto:</span> 
                                <span>{notification.data.projectName || notification.projectNumber}</span>
                              </div>
                            )}
                            {notification.data.createdAt && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Data:</span> 
                                <span>{safelyFormatDate(notification.data.createdAt)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {safelyFormatDate(notification.createdAt)}
                        </p>
                        <div className="flex gap-2">
                          {!notification.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 transition-all duration-300 ${
                                actionFeedback?.id === notification.id && actionFeedback?.action === 'read'
                                  ? 'bg-green-100 dark:bg-green-900/30 font-medium scale-105'
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              onClick={(e) => handleMarkAsRead(e, notification)}
                              disabled={actionFeedback?.id === notification.id}
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              {actionFeedback?.id === notification.id && actionFeedback?.action === 'read'
                                ? 'Notificação lida!'
                                : 'Marcar como lida'}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 px-2 transition-all duration-300 ${
                                actionFeedback?.id === notification.id && actionFeedback?.action === 'unread'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 font-medium scale-105'
                                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                              }`}
                              onClick={(e) => handleMarkAsUnread(e, notification)}
                              disabled={actionFeedback?.id === notification.id}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                              </svg>
                              {actionFeedback?.id === notification.id && actionFeedback?.action === 'unread'
                                ? 'Marcada como não lida!'
                                : 'Marcar como não lida'}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 px-2 transition-all duration-300 ${
                              actionFeedback?.id === notification.id && actionFeedback?.action === 'delete'
                                ? 'bg-red-100 dark:bg-red-900/30 font-medium scale-105'
                                : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            }`}
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                            disabled={actionFeedback?.id === notification.id}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-red-600 dark:text-red-400"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            {actionFeedback?.id === notification.id && actionFeedback?.action === 'delete'
                              ? 'Excluindo...'
                              : 'Excluir'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 mb-4">
                  <BellIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {activeTab === 'all' ? 'Nenhuma notificação' : 
                   activeTab === 'unread' ? 'Nenhuma notificação não lida' : 
                   'Nenhuma notificação lida'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'all' ? 'Você será notificado quando houver atualizações nos projetos.' : 
                   activeTab === 'unread' ? 'Todas as suas notificações foram lidas.' : 
                   'Você ainda não marcou nenhuma notificação como lida.'}
                </p>
              </div>
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredNotifications.length)} de {filteredNotifications.length} notificações
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2 text-gray-500">...</span>
                    }
                    return null
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-2"
                >
                  Próxima
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 