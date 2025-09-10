"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useNotifications } from '@/lib/contexts/NotificationContext'
import { devLog } from "@/lib/utils/productionLogger"
import { NotificacaoPadrao } from '@/types/notification'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format } from 'date-fns/format'
import { ptBR } from 'date-fns/locale'

// Utilities
import { formatSafeDate } from '@/lib/utils/dateHelpers'

// Icons
import AlertIcon from '@/components/icons/alert'
import BellIcon from '@/components/icons/bell'
import MessageIcon from '@/components/icons/message'
import FileIcon from '@/components/icons/file'
import CheckIcon from '@/components/icons/check'
import ClockIcon from '@/components/icons/clock'
import RefreshIcon from '@/components/icons/refresh'

// Use the dateHelpers version instead
const safelyFormatDate = formatSafeDate

export default function NotificacoesClient() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { refreshUnreadCount, updateCounterOptimistic } = useNotifications()
  const [notifications, setNotifications] = useState<NotificacaoPadrao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{id: string, action: string} | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read'>('all')

  // Calculate if there are any unread notifications
  const hasUnreadNotifications = notifications.some(notification => !notification.read)
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    if (activeTab === 'read') return notification.read;
    return true;
  });
  
  // Count notifications by status
  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  useEffect(() => {
    if (authLoading) return

    // Check if user has admin privileges
    const isAdmin = user?.profile?.role === 'admin' || user?.profile?.role === 'superadmin'

    if (!user || !isAdmin) {
      devLog.log('[Notifications] No admin privileges, redirecting to /admin')
      router.replace('/admin')
      return
    }

    fetchNotifications()
  }, [user, authLoading, router])

  const fetchNotifications = async () => {
    // ✅ CORREÇÃO UX: Só mostrar loading se for o primeiro carregamento
    if (notifications.length === 0) {
      setIsLoading(true)
    }
    setError(null)
    try {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }
      
      devLog.log('🔍 [AdminNotifications] Buscando notificações via API...');
      
      const response = await fetch(`/api/notifications/user?limit=50`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      devLog.log('🔍 [AdminNotifications] Resultado da API:', {
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
      devLog.error('[AdminNotifications] Error fetching notifications:', error)
      setError(error.message || 'Erro ao carregar notificações')
    } finally {
      setIsLoading(false)
    }
  }

  const getNotificationIcon = (type: NotificacaoPadrao['type']) => {
    switch (type) {
      case 'new_comment':
        return <MessageIcon className="h-5 w-5 text-blue-500" />
      case 'document_upload':
        return <FileIcon className="h-5 w-5 text-orange-500" />
      case 'status_change':
        return <RefreshIcon className="h-5 w-5 text-purple-500" />
      case 'deadline_approaching':
        return <ClockIcon className="h-5 w-5 text-amber-500" />
      case 'project_completed':
        return <CheckIcon className="h-5 w-5 text-emerald-500" />
      case 'new_project':
        return <FileIcon className="h-5 w-5 text-green-500" />
      case 'new_client_registration':
        return <BellIcon className="h-5 w-5 text-blue-500" />
      case 'payment':
        return <BellIcon className="h-5 w-5 text-green-500" />
      case 'client_approval':
        return <CheckIcon className="h-5 w-5 text-blue-500" />
      case 'reminder':
        return <ClockIcon className="h-5 w-5 text-orange-500" />
      case 'system_message':
        return <AlertIcon className="h-5 w-5 text-gray-500" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const handleNotificationClick = async (notification: NotificacaoPadrao) => {
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
                devLog.log('[AdminNotifications] Trial expirado, redirecionando para assinaturas');
                router.push('/admin/assinaturas');
                return;
              }
            }
          }
        } catch (error) {
          devLog.error('[AdminNotifications] Erro ao verificar trial:', error);
          // Em caso de erro, permitir acesso (fallback)
        }
      }
      if (!notification.read) {
        // 🚀 ATUALIZAÇÃO IMEDIATA: Decrementar contador antes da API
        updateCounterOptimistic(-1);
        
        // Usar rota de API para marcar como lida
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ notificationId: notification.id }),
        });
        
        if (response.ok) {
          setNotifications(notifications.map(n => 
            n.id === notification.id ? { ...n, read: true } : n
          ))
          // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
          setTimeout(() => refreshUnreadCount(), 500);
        } else {
          // 🚀 ROLLBACK: Reverter contador se falhou
          updateCounterOptimistic(1);
        }
      }
      
      // ✅ MELHORIA UX: Navegar para projeto com visualização expandida
      if (notification.type === 'new_client_registration' || notification.type === 'client_approval') {
        router.push('/admin/clientes')
      } else {
        devLog.log('[AdminNotifications] 🔍 DEBUG - Dados da notificação:', {
          notificationId: notification.id,
          projectId: notification.projectId,
          projectIdFromData: notification.data?.projectId,
          type: notification.type,
          hasProjectId: !!notification.projectId,
          notificationComplete: notification
        });
        
        const projectId = notification.projectId || notification.data?.projectId;
        
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
          case 'new_project':
            focusSection = 'overview';
            break;
          default:
            focusSection = 'overview';
        }
        
          // Navegar com parâmetros para abrir visualização expandida
          const url = `/admin/projetos/${projectId}?expand=true&focus=${focusSection}`;
          
          devLog.log('[AdminNotifications] Navegando para projeto:', {
            projectId: projectId,
            notificationType: notification.type,
            focusSection,
            url
          });
          
          router.push(url);
        }
      }
    } catch (error) {
      devLog.error('[AdminNotifications] Error marking notification as read:', error)
      // 🚀 ROLLBACK: Reverter contador se deu erro
      updateCounterOptimistic(1);
    }
  }

  // Função para marcar uma notificação como lida ou não lida
  const handleMarkAsRead = async (e: React.MouseEvent, notification: NotificacaoPadrao) => {
    // Evitar propagação para não disparar o handleNotificationClick
    e.stopPropagation()
    
    try {
      // Mostrar feedback imediato
      setActionFeedback({id: notification.id, action: 'read'})
      
      if (notification.read) {
        // Se já estiver lida, apenas mostrar feedback
        setTimeout(() => setActionFeedback(null), 1500)
        return
      }
      
      // 🚀 ATUALIZAÇÃO IMEDIATA: Decrementar contador antes da API
      updateCounterOptimistic(-1);
      
      // Usar rota de API para marcar como lida
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: notification.id }),
      });
      
      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ))
        // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
        setTimeout(() => refreshUnreadCount(), 500);
      } else {
        // 🚀 ROLLBACK: Reverter contador se falhou
        updateCounterOptimistic(1);
      }
      
      // Limpar feedback após um tempo
      setTimeout(() => setActionFeedback(null), 1500)
    } catch (error) {
      devLog.error('[AdminNotifications] Error marking notification as read:', error)
      // 🚀 ROLLBACK: Reverter contador se deu erro
      updateCounterOptimistic(1);
      setActionFeedback(null)
    }
  }

  // Função para excluir uma notificação
  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    // Evitar propagação para não disparar o handleNotificationClick
    e.stopPropagation()
    
    try {
      // Mostrar feedback imediato
      setActionFeedback({id: notificationId, action: 'delete'})
      
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
        body: JSON.stringify({ notificationId }),
      });
      
      if (response.ok) {
        // Atualiza o estado removendo a notificação excluída
        setNotifications(notifications.filter(n => n.id !== notificationId))
        // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
        setTimeout(() => refreshUnreadCount(), 500);
      } else {
        // 🚀 ROLLBACK: Reverter contador se falhou
        if (wasUnread) {
          updateCounterOptimistic(1);
        }
        throw new Error('Erro ao deletar notificação');
      }
      
      // Feedback será limpo quando a notificação for removida da lista
    } catch (error) {
      devLog.error('[AdminNotifications] Error deleting notification:', error)
      // 🚀 ROLLBACK: Reverter contador se deu erro
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        updateCounterOptimistic(1);
      }
      setActionFeedback(null)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    
    const unreadNotifications = notifications.filter(n => !n.read)
    
    if (unreadNotifications.length === 0) return
    
    try {
      // 🚀 ATUALIZAÇÃO IMEDIATA: Zerar contador antes da API
      updateCounterOptimistic(-unreadNotifications.length);
      
      // Usar rota de API para marcar todas como lidas
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(notifications.map(n => 
          !n.read ? { ...n, read: true } : n
        ))
        // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais
        setTimeout(() => refreshUnreadCount(), 500);
      } else {
        // 🚀 ROLLBACK: Reverter contador se falhou
        updateCounterOptimistic(unreadNotifications.length);
        throw new Error('Erro ao marcar todas como lidas');
      }
    } catch (error) {
      devLog.error('[AdminNotifications] Error marking all notifications as read:', error)
      // 🚀 ROLLBACK: Reverter contador se deu erro
      updateCounterOptimistic(unreadNotifications.length);
    }
  }

  // Show loading state while checking auth
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">
            Notificações
          </h1>
          <p className="mt-2 text-blue-100">
            Acompanhe todas as notificações do sistema
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/30"></div>
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-500/30"></div>
      </div>

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
          <div className="flex items-center justify-between mb-6">
            <div>
              {activeTab !== 'read' && hasUnreadNotifications && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={markAllAsRead}
                >
                  <CheckIcon className="h-4 w-4" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
                      {getNotificationIcon(notification.type)}
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
                              {notification.data.authorName || notification.data.clientName || "Cliente"}
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
                            {notification.data.clientName && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Cliente:</span> 
                                <span className="text-blue-600 dark:text-blue-400">{notification.data.clientName}</span>
                                {notification.data.clientEmail && (
                                  <span className="text-gray-400 ml-1">({notification.data.clientEmail})</span>
                                )}
                              </div>
                            )}
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
                      
                      {notification.type === 'document_upload' && notification.data && (
                        <></>
                      )}
                      
                      {notification.type === 'new_project' && notification.data && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                          <div className="grid grid-cols-1 gap-1">
                            {notification.data.clientName && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Cliente:</span> 
                                <span className="text-blue-600 dark:text-blue-400">{notification.data.clientName}</span>
                              </div>
                            )}
                            {notification.data.companyName && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Empresa:</span> 
                                <span>{notification.data.companyName}</span>
                              </div>
                            )}
                            {notification.data.projectPower && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Potência:</span> 
                                <span>{notification.data.projectPower} kWp</span>
                              </div>
                            )}
                            {notification.data.projectValue && (
                              <div className="flex items-start">
                                <span className="font-semibold min-w-24">Valor:</span> 
                                <span>R$ {parseFloat(notification.data.projectValue).toLocaleString('pt-BR')}</span>
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
                              : notification.read 
                                ? 'Lida' 
                                : 'Marcar como lida'}
                          </Button>
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
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1 text-red-600 dark:text-red-400"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
        </div>
      </div>
    </div>
  )
} 