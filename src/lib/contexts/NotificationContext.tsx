"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '@/lib/services/notificationService/client';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';

type NotificationContextType = {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  // 🚀 NOVA FUNÇÃO: Atualização imediata otimista
  updateCounterOptimistic: (change: number) => void;
  // 🚀 POLLING INTELIGENTE: Status e controles
  isPollingActive: boolean;
  debugStatus?: any;
  forceRefresh: () => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  
  // 🚀 POLLING INTELIGENTE: Usar novo hook
  const smartNotifications = useSmartNotifications();
  
  // 🔄 COMPATIBILIDADE: Manter estados existentes para compatibilidade
  const [isLoading, setIsLoading] = useState(false);

  // 🚀 POLLING INTELIGENTE: Usar função do smart hook, mas manter compatibilidade
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      devLog.log('[NotificationContext] Usuário não disponível para refresh manual');
      return;
    }

    try {
      devLog.log('[NotificationContext] Refresh manual solicitado - delegando para polling inteligente');
      setIsLoading(true);
      
      // Delegar para o sistema de polling inteligente
      smartNotifications.forceRefresh();
      
    } catch (error) {
      devLog.error('[NotificationContext] Erro no refresh manual:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, smartNotifications]);

  // 🚀 POLLING INTELIGENTE: Não precisamos mais do useEffect manual
  // O smartNotifications já gerencia tudo automaticamente

  // 🚀 POLLING INTELIGENTE: Atualização otimista integrada com smart notifications
  const updateCounterOptimistic = useCallback((change: number) => {
    // Não precisamos mais gerenciar estado local, o React Query faz isso
    devLog.log(`[NotificationContext] Atualização otimística solicitada: ${change}`);
    
    // Forçar refresh para sincronizar
    setTimeout(() => {
      smartNotifications.forceRefresh();
    }, 100);
  }, [smartNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) {
      devLog.log('[NotificationContext] Usuário não disponível para markAsRead');
      return;
    }

    try {
      devLog.log(`[NotificationContext] Marcando notificação ${notificationId} como lida`);
      
      const success = await markNotificationAsRead(notificationId);
      
      if (success) {
        devLog.log('[NotificationContext] Notificação marcada como lida com sucesso');
        // 🚀 POLLING INTELIGENTE: Forçar atualização imediata
        smartNotifications.forceRefresh();
      } else {
        devLog.error('[NotificationContext] Falha ao marcar notificação como lida');
      }
    } catch (error) {
      devLog.error('[NotificationContext] Erro ao marcar notificação como lida:', error);
      // 🚀 ROLLBACK: Reverter contador se deu erro
      updateCounterOptimistic(1);
    }
  }, [user?.id, updateCounterOptimistic, refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) {
      devLog.log('[NotificationContext] Usuário não disponível para markAllAsRead');
      return;
    }

    try {
      devLog.log('[NotificationContext] Marcando todas as notificações como lidas');
      
      const success = await markAllNotificationsAsRead(user.id);
      
      if (success) {
        devLog.log('[NotificationContext] Todas as notificações marcadas como lidas');
        // 🚀 POLLING INTELIGENTE: Forçar atualização imediata
        smartNotifications.forceRefresh();
      } else {
        devLog.error('[NotificationContext] Falha ao marcar todas as notificações como lidas');
      }
    } catch (error) {
      devLog.error('[NotificationContext] Erro ao marcar todas as notificações como lidas:', error);
    }
  }, [user?.id, smartNotifications]);

  // 🚀 POLLING INTELIGENTE: Valor do contexto integrado com smart notifications
  const contextValue = useMemo(() => ({
    // Usar dados do polling inteligente
    unreadCount: smartNotifications.unreadCount,
    isLoading: smartNotifications.isLoading || isLoading,
    
    // Manter funções existentes para compatibilidade
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    updateCounterOptimistic,
    
    // Novos recursos do polling inteligente
    isPollingActive: !smartNotifications.error,
    debugStatus: smartNotifications.debugStatus,
    forceRefresh: smartNotifications.forceRefresh
  }), [
    smartNotifications.unreadCount,
    smartNotifications.isLoading,
    smartNotifications.error,
    smartNotifications.debugStatus,
    smartNotifications.forceRefresh,
    isLoading,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    updateCounterOptimistic
  ]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 
