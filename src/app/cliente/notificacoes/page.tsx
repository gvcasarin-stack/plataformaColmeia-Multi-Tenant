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


const MessageIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const FileIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12,6 12,12 16,14"/>
  </svg>
);

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

  // Calculate if there are any unread notifications
  const hasUnreadNotifications = notifications.some(notification => !notification.read);
  
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

  // Buscar notificações
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoadingNotifications(true);
    setError(null);
    
    try {
      devLog.log('🔍 [ClientNotifications] Buscando notificações via API...');
      
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

  // Atualizar notificações quando a página ganhar foco
  useEffect(() => {
    if (!user) return;
    
    // Handler para quando o usuário voltar para a tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        devLog.log('[ClientNotifications] Tab visível, atualizando notificações');
        fetchNotifications();
        refreshUnreadCount();
      }
    };
    
    // Registrar e limpar o listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchNotifications, refreshUnreadCount]);

  // Obter ícone com base no tipo de notificação
  const getNotificationIcon = (type: NotificacaoPadronizada['type']) => {
    switch (type) {
      case 'new_comment':
        return <div className="text-blue-500"><MessageIcon /></div>;
      case 'document_upload':
        return <div className="text-orange-500"><FileIcon /></div>;
      case 'status_change':
        return <div className="text-purple-500"><ClockIcon /></div>;
      case 'deadline_approaching':
        return <div className="text-amber-500"><ClockIcon /></div>;
      case 'project_completed':
        return <div className="text-emerald-500"><CheckIcon className="h-5 w-5" /></div>;
      case 'new_project':
        return <div className="text-green-500"><FileIcon /></div>;
      case 'payment':
        return <div className="text-green-500"><BellIcon className="h-5 w-5" /></div>;
      default:
        return <div className="text-gray-500 dark:text-gray-400"><BellIcon className="h-5 w-5" /></div>;
    }
  };

  // Lidar com clique na notificação
  const handleNotificationClick = useCallback(async (notification: NotificacaoPadronizada) => {
    try {
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
          body: JSON.stringify({ notificationId: notification.id }),
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
      
      // Navegar com base no tipo de notificação
      if (notification.projectId) {
        router.push(`/cliente/projetos/${notification.projectId}`);
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
        body: JSON.stringify({ notificationId }),
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
          <div className="flex items-center justify-between mb-6">
            <div>
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
            </div>
          </div>

          {/* Lista de Notificações */}
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
                          </div>
                        }
                      </p>
                      
                      {/* Conteúdo adicional para certos tipos de notificação */}
                      {notification.type === 'new_comment' && notification.data && notification.data.commentFull && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                          <div className="border-l-2 border-blue-400 pl-2 py-1 mb-2 italic">
                            {notification.data.commentFull}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatSafeDate(notification.createdAt)}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-7 px-2 transition-all duration-300 ${
                              !notification.read
                                ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                                : 'text-gray-400 cursor-default'
                            }`}
                            disabled={notification.read}
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            {notification.read ? 'Lida' : 'Clique para marcar como lida'}
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
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
  );
}
