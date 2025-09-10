'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/hooks/useAuth';
import { getUnreadNotificationCount } from '@/lib/services/notificationService/client';
import { devLog } from '@/lib/utils/productionLogger';

interface SmartNotificationConfig {
  baseInterval: number;      // Intervalo base (30s)
  activeInterval: number;    // Quando usuário ativo (10s)
  inactiveInterval: number;  // Quando usuário inativo (60s)
  backgroundInterval: number; // Quando aba em background (2min)
  unreadMultiplier: number;  // Multiplicador quando há não lidas (0.5)
}

const DEFAULT_CONFIG: SmartNotificationConfig = {
  baseInterval: 30000,      // 30 segundos
  activeInterval: 10000,    // 10 segundos
  inactiveInterval: 60000,  // 1 minuto
  backgroundInterval: 120000, // 2 minutos
  unreadMultiplier: 0.5     // Reduz intervalo pela metade se há não lidas
};

export function useSmartNotifications(config: Partial<SmartNotificationConfig> = {}) {
  const { user } = useAuth();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Estados para controlar comportamento do polling
  const [isUserActive, setIsUserActive] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [currentInterval, setCurrentInterval] = useState(finalConfig.baseInterval);
  
  // Refs para controlar timers
  const lastActivityTime = useRef(Date.now());
  const activityCheckTimer = useRef<NodeJS.Timeout>();
  
  // Função para detectar atividade do usuário
  const handleUserActivity = useCallback(() => {
    lastActivityTime.current = Date.now();
    if (!isUserActive) {
      setIsUserActive(true);
      devLog.log('[SmartNotifications] Usuário ficou ativo');
    }
  }, [isUserActive]);
  
  // Função para calcular intervalo de polling baseado no contexto
  const calculatePollingInterval = useCallback((): number => {
    let interval = finalConfig.baseInterval;
    
    // Usuário ativo tem prioridade
    if (isUserActive) {
      interval = finalConfig.activeInterval;
    } else {
      interval = finalConfig.inactiveInterval;
    }
    
    // Aba em background reduz ainda mais a frequência
    if (!isPageVisible) {
      interval = finalConfig.backgroundInterval;
    }
    
    // Se há notificações não lidas, aumenta frequência
    if (hasUnreadNotifications) {
      interval = Math.round(interval * finalConfig.unreadMultiplier);
    }
    
    // Horário comercial vs noturno (opcional)
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 8 && currentHour <= 18;
    if (!isBusinessHours) {
      interval = Math.round(interval * 1.5); // 50% mais lento fora do horário comercial
    }
    
    return interval;
  }, [isUserActive, isPageVisible, hasUnreadNotifications, finalConfig]);
  
  // Atualizar intervalo quando contexto muda
  useEffect(() => {
    const newInterval = calculatePollingInterval();
    if (newInterval !== currentInterval) {
      setCurrentInterval(newInterval);
      devLog.log('[SmartNotifications] Intervalo atualizado:', {
        anterior: currentInterval,
        novo: newInterval,
        contexto: {
          userActive: isUserActive,
          pageVisible: isPageVisible,
          hasUnread: hasUnreadNotifications
        }
      });
    }
  }, [isUserActive, isPageVisible, hasUnreadNotifications, currentInterval, calculatePollingInterval]);
  
  // Setup de detecção de atividade do usuário
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Adicionar listeners para detectar atividade
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });
    
    // Timer para verificar inatividade
    const checkInactivity = () => {
      const timeSinceLastActivity = Date.now() - lastActivityTime.current;
      const inactivityThreshold = 60000; // 1 minuto
      
      if (timeSinceLastActivity > inactivityThreshold && isUserActive) {
        setIsUserActive(false);
        devLog.log('[SmartNotifications] Usuário ficou inativo');
      }
    };
    
    activityCheckTimer.current = setInterval(checkInactivity, 30000); // Verificar a cada 30s
    
    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      if (activityCheckTimer.current) {
        clearInterval(activityCheckTimer.current);
      }
    };
  }, [handleUserActivity, isUserActive]);
  
  // Setup de detecção de visibilidade da página
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsPageVisible(visible);
      devLog.log('[SmartNotifications] Visibilidade da página:', visible ? 'visível' : 'oculta');
      
      // ✅ CORREÇÃO CRÍTICA: Verificação mais robusta para páginas de login
      if (visible) {
        const isLoginPage = typeof window !== 'undefined' && 
                           (window.location.pathname === '/cliente/login' || 
                            window.location.pathname === '/admin/login');
        
        if (!isLoginPage) {
          handleUserActivity();
        } else {
          devLog.log('[SmartNotifications] Na página de login - não disparar atividade');
          // ✅ CORREÇÃO: Forçar estado inativo para evitar polling
          setIsUserActive(false);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleUserActivity]);
  
  // React Query para polling inteligente das notificações
  const {
    data: unreadCount = 0,
    isLoading,
    error,
    refetch: manualRefresh,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        devLog.log('[SmartNotifications] Usuário não disponível');
        return 0;
      }
      
      // ✅ CORREÇÃO CRÍTICA: Verificação mais robusta para páginas de login
      const isLoginPage = typeof window !== 'undefined' && 
                         (window.location.pathname === '/cliente/login' || 
                          window.location.pathname === '/admin/login');
      
      if (isLoginPage) {
        devLog.log('[SmartNotifications] Na página de login - não buscar notificações');
        return 0;
      }
      
      devLog.log('[SmartNotifications] Buscando contagem de notificações:', {
        userId: user.id,
        interval: currentInterval,
        context: {
          userActive: isUserActive,
          pageVisible: isPageVisible,
          hasUnread: hasUnreadNotifications
        }
      });
      
      const count = await getUnreadNotificationCount(user.id);
      
      devLog.log('[SmartNotifications] Contagem obtida:', count);
      return count;
    },
    enabled: (() => {
      // ✅ CORREÇÃO CRÍTICA: Verificação mais robusta para páginas de login
      const isLoginPage = typeof window !== 'undefined' && 
                         (window.location.pathname === '/cliente/login' || 
                          window.location.pathname === '/admin/login');
      return !!user?.id && !isLoginPage;
    })(),
    refetchInterval: (() => {
      // ✅ CORREÇÃO CRÍTICA: Não fazer polling na página de login
      const isLoginPage = typeof window !== 'undefined' && 
                         (window.location.pathname === '/cliente/login' || 
                          window.location.pathname === '/admin/login');
      return isLoginPage ? false : currentInterval;
    })(),
    refetchOnWindowFocus: (() => {
      // ✅ CORREÇÃO CRÍTICA: Não refetch no focus na página de login
      const isLoginPage = typeof window !== 'undefined' && 
                         (window.location.pathname === '/cliente/login' || 
                          window.location.pathname === '/admin/login');
      return !isLoginPage;
    })(),
    refetchOnMount: (() => {
      // ✅ CORREÇÃO CRÍTICA: Não refetch no mount na página de login
      const isLoginPage = typeof window !== 'undefined' && 
                         (window.location.pathname === '/cliente/login' || 
                          window.location.pathname === '/admin/login');
      return !isLoginPage;
    })(),
    retry: 3, // Tentar 3 vezes em caso de erro
    retryDelay: 5000, // Aguardar 5s entre tentativas
    staleTime: 5000, // Considerar dados válidos por 5s
  });
  
  // Atualizar estado de notificações não lidas
  useEffect(() => {
    const hasUnread = (unreadCount || 0) > 0;
    if (hasUnread !== hasUnreadNotifications) {
      setHasUnreadNotifications(hasUnread);
    }
  }, [unreadCount, hasUnreadNotifications]);
  
  // Funções de controle manual
  const forceRefresh = useCallback(() => {
    devLog.log('[SmartNotifications] Refresh manual solicitado');
    manualRefresh();
  }, [manualRefresh]);
  
  const setActiveMode = useCallback((active: boolean) => {
    setIsUserActive(active);
    if (active) {
      lastActivityTime.current = Date.now();
    }
  }, []);
  
  // Status de debug para desenvolvimento
  const debugStatus = {
    isUserActive,
    isPageVisible,
    hasUnreadNotifications,
    currentInterval,
    lastUpdate: new Date(dataUpdatedAt || Date.now()).toLocaleTimeString(),
    nextUpdateIn: Math.round(currentInterval / 1000),
    userId: user?.id,
    error: error?.message
  };
  
  return {
    // Dados principais
    unreadCount: unreadCount || 0,
    isLoading,
    error,
    
    // Controles
    forceRefresh,
    setActiveMode,
    
    // Status para debug/UI
    debugStatus,
    
    // Compatibilidade com NotificationContext existente
    refreshUnreadCount: forceRefresh
  };
}
