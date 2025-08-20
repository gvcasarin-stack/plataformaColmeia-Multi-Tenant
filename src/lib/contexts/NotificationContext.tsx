"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { devLog } from "@/lib/utils/productionLogger";
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '@/lib/services/notificationService/client';

type NotificationContextType = {
  unreadCount: number;
  isLoading: boolean;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  // 🚀 NOVA FUNÇÃO: Atualização imediata otimista
  updateCounterOptimistic: (change: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      devLog.log('[NotificationContext] Usuário não disponível, resetando contagem');
      setUnreadCount(0);
      return;
    }

    try {
      devLog.log('[NotificationContext] Atualizando contagem de notificações (Supabase)');
      setIsLoading(true);
      
      const count = await getUnreadNotificationCount(user.id);
      
      devLog.log(`[NotificationContext] ${count} notificações não lidas encontradas`);
      setUnreadCount(count);
    } catch (error) {
      devLog.error('[NotificationContext] Erro ao buscar notificações:', error);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      devLog.log('[NotificationContext] Usuário detectado, carregando notificações');
      refreshUnreadCount();
    } else {
      devLog.log('[NotificationContext] Usuário não disponível, resetando contagem');
      setUnreadCount(0);
      setIsLoading(false);
    }
  }, [user?.id, refreshUnreadCount]);

  // 🚀 NOVA FUNÇÃO: Atualização imediata otimista
  const updateCounterOptimistic = useCallback((change: number) => {
    setUnreadCount(prev => {
      const newCount = Math.max(0, prev + change);
      devLog.log(`[NotificationContext] Contador atualizado otimisticamente: ${prev} → ${newCount}`);
      return newCount;
    });
  }, []);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) {
      devLog.log('[NotificationContext] Usuário não disponível para markAsRead');
      return;
    }

    try {
      devLog.log(`[NotificationContext] Marcando notificação ${notificationId} como lida`);
      
      // 🚀 ATUALIZAÇÃO IMEDIATA: Decrementar contador antes mesmo da API responder
      updateCounterOptimistic(-1);
      
      const success = await markNotificationAsRead(notificationId);
      
      if (success) {
        devLog.log('[NotificationContext] Notificação marcada como lida com sucesso');
        // 🚀 GARANTIR SINCRONIZAÇÃO: Atualizar contador com dados reais do servidor
        setTimeout(() => {
          refreshUnreadCount();
        }, 500); // Pequeno delay para garantir que o servidor processou
      } else {
        devLog.error('[NotificationContext] Falha ao marcar notificação como lida');
        // 🚀 ROLLBACK: Reverter contador se falhou
        updateCounterOptimistic(1);
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
      
      // 🚀 ATUALIZAÇÃO IMEDIATA: Zerar contador antes mesmo da API responder
      const previousCount = unreadCount;
      setUnreadCount(0);
      
      const success = await markAllNotificationsAsRead(user.id);
      
      if (success) {
        devLog.log('[NotificationContext] Todas as notificações marcadas como lidas');
        // 🚀 GARANTIR SINCRONIZAÇÃO: Confirmar com servidor
        setTimeout(() => {
          refreshUnreadCount();
        }, 500);
      } else {
        devLog.error('[NotificationContext] Falha ao marcar todas as notificações como lidas');
        // 🚀 ROLLBACK: Restaurar contador se falhou
        setUnreadCount(previousCount);
      }
    } catch (error) {
      devLog.error('[NotificationContext] Erro ao marcar todas as notificações como lidas:', error);
      // 🚀 ROLLBACK: Restaurar contador se deu erro
      setUnreadCount(unreadCount);
    }
  }, [user?.id, unreadCount, refreshUnreadCount]);

  // 🚀 OTIMIZAÇÃO: Memorizar o valor do contexto para evitar re-renderizações desnecessárias
  const contextValue = useMemo(() => ({
    unreadCount,
    isLoading,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    updateCounterOptimistic
  }), [unreadCount, isLoading, refreshUnreadCount, markAsRead, markAllAsRead, updateCounterOptimistic]);

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
