'use client';

import { devLog } from "@/lib/utils/productionLogger";
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  INACTIVITY_TIME_MS,
  WARNING_TIME_MS,
} from '@/lib/constants/inactivity';

/**
 * Hook para monitorar inatividade do usuário e lidar com logout automático
 *
 * @param onTimeout Função a ser chamada quando o tempo de inatividade expirar
 * @param onWarning Função a ser chamada quando estiver próximo do timeout
 * @param isAuthenticated Flag que indica se o usuário está autenticado
 */
export function useInactivityTimer({
  onTimeout,
  onWarning,
  isAuthenticated = false,
}: {
  onTimeout: () => void;
  onWarning: () => void;
  isAuthenticated?: boolean;
}) {
  // Estado para controlar se o aviso está sendo exibido
  const [showingWarning, setShowingWarning] = useState(false);
  // Estado para rastrear se o timeout foi acionado
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  // Referências para os timers
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  
  // Função para resetar os timers
  const resetTimer = useCallback(() => {
    // Limpa o timer de timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Limpa o timer de aviso
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    
    // Reset do estado de timeout
    setHasTimedOut(false);
    
    // Reinicia os timers se o usuário estiver autenticado
    if (isAuthenticated) {
      // Configura o timer de aviso
      warningRef.current = setTimeout(() => {
        setShowingWarning(true);
        onWarning();
      }, INACTIVITY_TIME_MS - WARNING_TIME_MS);
      
      // Configura o timer de timeout
      timeoutRef.current = setTimeout(() => {
        devLog.log('[Inatividade] Temporizador expirou completamente, acionando timeout');
        setHasTimedOut(true);
        setShowingWarning(false);
        // Usar setTimeout com 0ms para garantir que o callback seja executado 
        // após o estado ser atualizado e fora do contexto atual
        setTimeout(() => {
          onTimeout();
        }, 0);
      }, INACTIVITY_TIME_MS);
    }
  }, [isAuthenticated, onTimeout, onWarning]);
  
  // Função para estender a sessão
  const extendSession = useCallback(() => {
    if (hasTimedOut) {
      devLog.log('[Inatividade] Tentativa de estender sessão após timeout, ignorando');
      return;
    }
    setShowingWarning(false);
    resetTimer();
  }, [resetTimer, hasTimedOut]);
  
  // Efeito para inicializar e limpar os timers
  useEffect(() => {
    // Lista de eventos para monitorar
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];
    
    // Reinicia os timers quando o usuário interage com a página
    const handleUserActivity = () => {
      // Só resetamos o timer se não estivermos mostrando o aviso
      // e se não tivermos atingido o timeout
      if (!showingWarning && !hasTimedOut) {
        resetTimer();
      }
    };
    
    // Adiciona os listeners se o usuário estiver autenticado
    if (isAuthenticated) {
      // Inicializa os timers
      resetTimer();
      
      // Adiciona os event listeners
      events.forEach(event => {
        window.addEventListener(event, handleUserActivity);
      });
      
      // Log para debug
      devLog.log(`[Inatividade] Timer iniciado: ${INACTIVITY_TIME_MS / 1000}s com aviso em ${(INACTIVITY_TIME_MS - WARNING_TIME_MS) / 1000}s`);
    }
    
    // Função de limpeza
    return () => {
      // Remove os event listeners
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      
      // Limpa os timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [isAuthenticated, resetTimer, showingWarning, hasTimedOut]);
  
  return {
    showingWarning,
    extendSession,
    resetTimer,
    hasTimedOut,
  };
} 
