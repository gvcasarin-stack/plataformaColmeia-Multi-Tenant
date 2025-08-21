"use client";

import React, { useMemo } from 'react';
import { NotificacaoPadrao } from '@/types/notification';
import BellIcon from '@/components/icons/bell';
import CheckIcon from '@/components/icons/check';
import { Button } from '@/components/ui/button';
import NotificationItem from '@/components/ui/notification-item';

// Componente memoizado para a lista de notificações
// Este componente evita re-renderizações desnecessárias ao filtrar notificações
export default function MemoizedNotificationsList({
  notifications,
  activeTab,
  onNotificationClick,
  onMarkAsRead,
  onDeleteNotification,
  isLoading,
  onMarkAllAsRead,
}: {
  notifications: NotificacaoPadrao[];
  activeTab: 'all' | 'unread' | 'read';
  onNotificationClick: (notification: NotificacaoPadrao) => void;
  onMarkAsRead: (e: React.MouseEvent, notification: NotificacaoPadrao) => void;
  onDeleteNotification: (e: React.MouseEvent, notificationId: string) => void;
  isLoading: boolean;
  onMarkAllAsRead: () => Promise<void>;
}) {
  // Usar useMemo para evitar filtrar a lista em cada renderização
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      if (activeTab === 'all') return true;
      if (activeTab === 'unread') return !notification.read;
      if (activeTab === 'read') return notification.read;
      return true;
    });
  }, [notifications, activeTab]);

  // Calcular contagens apenas quando as notificações mudarem
  const stats = useMemo(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    const readCount = notifications.filter(n => n.read).length;
    const hasUnread = unreadCount > 0;
    return { unreadCount, readCount, hasUnread };
  }, [notifications]);

  // Renderizar mensagem quando não houver notificações
  if (!isLoading && filteredNotifications.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <BellIcon className="h-8 w-8 text-gray-500 dark:text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Nenhuma notificação {activeTab === 'unread' ? 'não lida' : activeTab === 'read' ? 'lida' : ''}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {activeTab === 'unread'
            ? 'Você não tem notificações não lidas no momento.'
            : activeTab === 'read'
            ? 'Você não tem notificações lidas.'
            : 'Você não tem notificações.'}
        </p>
        <Button
          variant="outline"
          onClick={onRefresh}
          className="inline-flex items-center space-x-2"
        >
          <BellIcon className="h-4 w-4" />
          <span>Atualizar</span>
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Barra de estatísticas */}
      <div className="flex flex-wrap items-center justify-end mb-4 gap-2">
        <div className="flex space-x-2">
          {stats.hasUnread && (
            <Button
              size="sm"
              onClick={onMarkAllAsRead}
              className="inline-flex items-center"
              variant="outline"
            >
              <CheckIcon className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Lista de notificações */}
      <div className="space-y-4">
        {isLoading ? (
          // Estado de carregamento
          <div className="flex justify-center items-center py-12">
            <div className="h-8 w-8 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
          </div>
        ) : (
          // Lista de notificações usando o componente memoizado
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={onNotificationClick}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDeleteNotification}
              isClientView={true}
            />
          ))
        )}
      </div>
    </div>
  );
}
