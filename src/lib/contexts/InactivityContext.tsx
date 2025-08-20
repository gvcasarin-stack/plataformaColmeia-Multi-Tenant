'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useInactivityTimer } from '@/lib/hooks/useInactivityTimer';
import { SessionExpiryAlert } from '@/components/session-expiry-alert';
import { useAuth } from '@/lib/hooks/useAuth';
import { WARNING_TIME_SECONDS, SESSION_SECURITY } from '@/lib/constants/inactivity';
import { createSession, updateSessionActivity, endSession } from '@/lib/services/sessionService/client';
import { devLog } from "@/lib/utils/productionLogger";
import logger from '@/lib/utils/logger';

interface InactivityContextType {
  showingWarning: boolean;
  extendSession: () => void;
}

// 📊 Interface para sessão ativa no banco
interface ActiveSession {
  id?: string;
  user_id: string;
  login_time: string;
  last_activity: string;
  ip_address?: string;
  user_agent?: string;
  is_active: boolean;
  expires_at: string;
}

const InactivityContext = createContext<InactivityContextType | undefined>(undefined);

/**
 * Provider que gerencia a inatividade do usuário e o logout automático
 */
export function InactivityProvider({ children }: { children: React.ReactNode }) {
  // Estados para contagem regressiva
  const [remainingTime, setRemainingTime] = useState<number>(WARNING_TIME_SECONDS);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  // Flag para controlar redirecionamento
  const [redirecting, setRedirecting] = useState(false);
  // Estado para controlar verificação de sessão
  const [isSessionChecking, setIsSessionChecking] = useState(false);
  // ID da sessão ativa no banco
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Contexto de autenticação
  const { user, signOut, isAuthenticated, checkSession } = useAuth();

  // 🔐 Funções de gerenciamento de sessão no banco
  const createSessionRecord = useCallback(async (userId: string): Promise<string | null> => {
    try {
      logger.info('[InactivityContext] Criando registro de sessão para:', userId);
      
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;
      
      const result = await createSession(userId, ipAddress, userAgent);
      
      if (result.success && result.sessionId) {
        logger.info('[InactivityContext] Sessão criada:', result.sessionId);
        return result.sessionId;
      } else {
        logger.error('[InactivityContext] Erro ao criar sessão');
        return null;
      }
    } catch (error) {
      logger.error('[InactivityContext] Erro ao criar sessão:', error);
      return null;
    }
  }, []);

  const updateSessionActivityRecord = useCallback(async (userId: string): Promise<void> => {
    try {
      await updateSessionActivity(userId);
    } catch (error) {
      logger.error('[InactivityContext] Erro ao atualizar atividade:', error);
    }
  }, []);

  const endSessionRecord = useCallback(async (userId: string): Promise<void> => {
    try {
      logger.info('[InactivityContext] Encerrando sessão para usuário:', userId);
      await endSession(userId);
    } catch (error) {
      logger.error('[InactivityContext] Erro ao encerrar sessão:', error);
    }
  }, []);

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };
  
  // ✅ SEGURANÇA - Criar sessão no banco quando usuário faz login
  useEffect(() => {
    if (user?.id && isAuthenticated && !sessionId) {
      createSessionRecord(user.id).then(newSessionId => {
        if (newSessionId) {
          setSessionId(newSessionId);
          logger.info('[InactivityContext] Sessão segura iniciada:', newSessionId);
        }
      });
    } else if (!isAuthenticated && user?.id) {
      // Encerrar sessão quando usuário faz logout
      endSessionRecord(user.id).then(() => {
        setSessionId(null);
        logger.info('[InactivityContext] Sessão segura encerrada');
      });
    }
  }, [user, isAuthenticated, sessionId, createSessionRecord, endSessionRecord]);

  // Efeito para limpar interval na desmontagem
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);
  
  // Gerenciar visibilidade da página para verificar sessão
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        devLog.log('[Inatividade] Tab became visible, checking session');
        
        // Previne múltiplas verificações simultâneas
        if (isSessionChecking) return;
        
        setIsSessionChecking(true);
        
        try {
          // Usa o checkSession do AuthContext para verificar se a sessão ainda é válida
          const isValid = await checkSession();
          
          if (isValid) {
            devLog.log('[Inatividade] Session still valid after visibility change');
            // Reestender a sessão se ela ainda for válida
            extendSession();
          } else {
            devLog.log('[Inatividade] Session invalid after visibility change, user will be logged out');
            // O checkSession já cuida do logout se necessário
          }
        } catch (error) {
          devLog.error('[Inatividade] Error checking session after visibility change:', error);
        } finally {
          setIsSessionChecking(false);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isSessionChecking, checkSession]);
  
  // Callback para quando o aviso é mostrado
  const handleWarning = useCallback(() => {
    // Iniciar contagem regressiva
    setRemainingTime(WARNING_TIME_SECONDS); // Resetar para o tempo de aviso
    
    // Limpar intervalo anterior se existir
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    // Configurar novo intervalo para atualizar a contagem regressiva a cada segundo
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(interval);
  }, [countdownInterval]);
  
  // Função de redirecionamento seguro
  const redirectToLogin = useCallback(() => {
    if (redirecting) return;
    
    // Marcar que já estamos redirecionando para evitar chamadas múltiplas
    setRedirecting(true);
    
    devLog.log('[Inatividade] Redirecionando para a página de login após logout');
    
    // Usar setTimeout para garantir que o logout tenha tempo para ser processado
    setTimeout(() => {
      try {
        // Determinar a rota de redirecionamento com base na URL atual
        // Use window.location para compatibilidade máxima
        const currentPath = window.location.pathname;
        let redirectPath = '/admin'; // Default para admin
        
        if (currentPath.includes('/cliente') || currentPath.includes('/client')) {
          redirectPath = '/cliente/login';
        }
        
        // Forçar uma navegação completa para garantir que a sessão seja limpa
        window.location.href = redirectPath;
      } catch (error) {
        devLog.error('[Inatividade] Erro ao redirecionar:', error);
        // Fallback para redirecionamento simples
        window.location.href = '/';
      }
    }, 100);
  }, [redirecting]);
  
  // Efeito para limpar a página após o logout
  useEffect(() => {
    // Limpar qualquer cache de estado que possa manter dados da sessão
    if (redirecting) {
      const cleanupTimeout = setTimeout(() => {
        // Remover variáveis de sessão armazenadas no localStorage
        try {
          // Lista de possíveis chaves de sessão para remover
          const sessionKeys = [
            'user_session',
            'auth_state',
            'user_data',
            'admin_user_cache',
            'nav_state_cache',
            'last_activity_timestamp'
          ];
          
          sessionKeys.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (e) {
              // Ignorar erros de remoção de item específico
            }
          });
        } catch (e) {
          devLog.error('[Inatividade] Erro ao limpar localStorage:', e);
        }
      }, 50);
      
      return () => clearTimeout(cleanupTimeout);
    }
  }, [redirecting]);
  
  // Callback para quando o tempo de inatividade expira
  const handleTimeout = useCallback(async () => {
    // Limpar intervalo de contagem regressiva
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    
    // Fazer logout
    if (isAuthenticated) {
      devLog.log('[Inatividade] Tempo expirado, realizando logout automático');
      try {
        await signOut();
        // Pequeno delay para garantir que o estado seja atualizado
        setTimeout(() => {
          // Redirecionar após o logout
          redirectToLogin();
        }, 50);
      } catch (error) {
        devLog.error('[Inatividade] Erro durante logout automático:', error);
        // Tentar redirecionamento mesmo se o logout falhar
        redirectToLogin();
      }
    }
  }, [countdownInterval, isAuthenticated, signOut, redirectToLogin]);
  
  // Inicializar o timer de inatividade
  const { showingWarning, extendSession: originalExtendSession, hasTimedOut } = useInactivityTimer({
    onWarning: handleWarning,
    onTimeout: handleTimeout,
    isAuthenticated,
  });

  // ✅ SEGURANÇA - Estender sessão com atualização no banco
  const extendSession = useCallback(() => {
    originalExtendSession();
    
    // Atualizar atividade no banco se temos um usuário ativo
    if (user?.id) {
      updateSessionActivityRecord(user.id);
    }
  }, [originalExtendSession, user?.id, updateSessionActivityRecord]);
  
  // Efeito para forçar o redirecionamento se o timer expirou
  useEffect(() => {
    if (hasTimedOut && isAuthenticated) {
      devLog.log('[Inatividade] Detectado timeout (hasTimedOut=true), forçando redirecionamento');
      handleTimeout();
    }
  }, [hasTimedOut, isAuthenticated, handleTimeout]);
  
  // Função para estender a sessão e limpar a contagem regressiva
  const handleExtendSession = useCallback(() => {
    // Limpar intervalo de contagem regressiva
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    
    // Log para debug
    devLog.log('[Inatividade] sessão estendida pelo usuário');
    
    // Chamar a função do hook para estender a sessão
    extendSession();
  }, [countdownInterval, extendSession]);
  
  // Função para logout manual com redirecionamento
  const handleManualLogout = useCallback(async () => {
    // Limpar intervalo de contagem regressiva
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    
    devLog.log('[Inatividade] Logout manual iniciado');
    
    try {
      await signOut();
      // Redirecionar após o logout
      redirectToLogin();
    } catch (error) {
      devLog.error('[Inatividade] Erro durante logout manual:', error);
      // Tentar redirecionamento mesmo se o logout falhar
      redirectToLogin();
    }
  }, [countdownInterval, signOut, redirectToLogin]);
  
  return (
    <InactivityContext.Provider
      value={{
        showingWarning,
        extendSession: handleExtendSession,
      }}
    >
      {children}
      
      {/* Alerta de sessão prestes a expirar */}
      {isAuthenticated && !hasTimedOut && !isSessionChecking && (
        <SessionExpiryAlert
          isOpen={showingWarning}
          onExtendSession={handleExtendSession}
          onLogout={handleManualLogout}
          remainingTime={remainingTime}
        />
      )}
    </InactivityContext.Provider>
  );
}

/**
 * Hook para usar o contexto de inatividade
 */
export function useInactivity() {
  const context = useContext(InactivityContext);
  
  if (context === undefined) {
    throw new Error('useInactivity must be used within an InactivityProvider');
  }
  
  return context;
} 
