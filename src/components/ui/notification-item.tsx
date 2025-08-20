"use client"

import React, { memo } from 'react';
import { NotificacaoPadrao } from '@/types/notification';
import { formatSafeDate } from '@/lib/utils/dateHelpers';

// Import custom icon components
import BellIcon from '@/components/icons/bell';
import MessageIcon from '@/components/icons/message';
import FileIcon from '@/components/icons/file';
import CheckIcon from '@/components/icons/check';
import ClockIcon from '@/components/icons/clock';
import RefreshIcon from '@/components/icons/refresh';

// ✅ CORREÇÃO REACT #130: Helper to get relative time sem criar objetos Date desnecessários
export const getRelativeTime = (dateValue: any) => {
  try {
    if (!dateValue) return '';
    
    // Handle Firebase Timestamp - converter para timestamp em ms
    let timestamp;
    if (dateValue && typeof dateValue.toDate === 'function') {
      timestamp = dateValue.toDate().getTime();
    } else if (typeof dateValue === 'string') {
      timestamp = new Date(dateValue).getTime();
    } else if (typeof dateValue === 'number') {
      timestamp = dateValue;
    } else {
      return '';
    }
    
    if (isNaN(timestamp)) return '';
    
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'agora';
    if (diffMin < 60) return `${diffMin}m atrás`;
    if (diffHour < 24) return `${diffHour}h atrás`;
    if (diffDay < 7) return `${diffDay}d atrás`;
    
    // Usar API do Intl para formatar data em português
    return new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric',
      month: 'short'
    }).format(timestamp);
  } catch (error) {
    return '';
  }
};

export const getNotificationIcon = (type: NotificacaoPadrao['type']) => {
  switch (type) {
    case 'new_comment':
      return <MessageIcon className="h-5 w-5 text-blue-500" />;
    case 'document_upload':
      return <FileIcon className="h-5 w-5 text-orange-500" />;
    case 'status_change':
      return <RefreshIcon className="h-5 w-5 text-purple-500" />;
    case 'deadline_approaching':
      return <ClockIcon className="h-5 w-5 text-amber-500" />;
    case 'project_completed':
      return <CheckIcon className="h-5 w-5 text-emerald-500" />;
    case 'new_project':
      return <FileIcon className="h-5 w-5 text-green-500" />;
    case 'payment':
      return <BellIcon className="h-5 w-5 text-green-500" />;
    default:
      return <BellIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
  }
};

interface NotificationItemProps {
  notification: NotificacaoPadrao;
  onClick: (notification: NotificacaoPadrao) => void;
  onMarkAsRead: (e: React.MouseEvent, notification: NotificacaoPadrao) => void;
  onDelete: (e: React.MouseEvent, notificationId: string) => void;
  isClientView?: boolean;
}

// Componente memoizado para evitar re-renderizações desnecessárias
const NotificationItem = memo(({
  notification, 
  onClick, 
  onMarkAsRead, 
  onDelete,
  isClientView = false
}: NotificationItemProps) => {
  // Usar funções para evitar cálculos repetidos em cada renderização
  const relativeTime = getRelativeTime(notification.createdAt);
  const formattedDate = formatSafeDate(notification.createdAt);
  
  // Verificar se a notificação está em processamento (sendo marcada como lida)
  const isProcessing = (notification as any).processing === true;
  
  return (
    <div 
      className={`
        p-4 rounded-lg border mb-4 cursor-pointer transition-all 
        ${notification.read 
          ? 'bg-white dark:bg-gray-800/30 border-gray-200 dark:border-gray-700' 
          : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30'}
        hover:bg-gray-50 dark:hover:bg-gray-800/50 
        ${isProcessing ? 'opacity-70' : ''}
      `}
      onClick={() => onClick(notification)}
      data-notification-id={notification.id}
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
              <span className={`
                inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                ${isClientView 
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'}
              `}>
                Nova
              </span>
            )}
            {isProcessing && (
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                Processando...
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
            {notification.message}
            {notification.type === 'new_comment' && notification.data && (
              <span className="block mt-1">
                <span className="font-medium">Autor: </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {notification.senderName || notification.data.authorName || notification.data.clientName || "Cliente"}
                </span>
              </span>
            )}
            {(notification.type === 'new_project' || notification.type === 'document_upload') && (
              <span className="block mt-1">
                <span className="font-medium">De: </span>
                <span className={`${notification.senderType === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
                  {notification.senderName || notification.data?.authorName || notification.data?.uploadedByName || "Sistema"}
                </span>
                {notification.data?.fromClient && (
                  <span className="ml-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    Cliente
                  </span>
                )}
              </span>
            )}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <time dateTime={formattedDate} title={formattedDate}>{relativeTime}</time>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => onMarkAsRead(e, notification)}
                className={`p-1 rounded-full transition-colors ${
                  isProcessing 
                    ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={notification.read ? "Notificação lida" : "Marcar como lida"}
                disabled={isProcessing}
              >
                <CheckIcon className={`h-4 w-4 ${
                  notification.read 
                    ? 'text-green-500' 
                    : isProcessing 
                    ? 'text-yellow-500 animate-pulse' 
                    : 'text-gray-400'
                }`} />
              </button>
              <button
                onClick={(e) => onDelete(e, notification.id)}
                className={`p-1 rounded-full ${
                  isProcessing 
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Excluir notificação"
                disabled={isProcessing}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4 text-gray-400 hover:text-red-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Implementando lógica personalizada para evitar re-renderizações desnecessárias
  // Só re-renderizar se os dados críticos mudarem
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.read === nextProps.notification.read &&
    prevProps.notification.title === nextProps.notification.title &&
    prevProps.notification.message === nextProps.notification.message &&
    prevProps.isClientView === nextProps.isClientView
  );
});

NotificationItem.displayName = 'NotificationItem';

export default NotificationItem; 