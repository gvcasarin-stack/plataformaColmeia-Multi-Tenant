// 🚀 Sistema de Gestão de Sessão Avançada - FASE 2
// Token refresh inteligente, detecção de inatividade e validação de sessão

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';
import type { Session, User } from '@supabase/supabase-js';

// Interfaces para gestão de sessão
interface SessionConfig {
  refreshThreshold: number;      // Minutos antes da expiração para refresh
  inactivityTimeout: number;     // Minutos de inatividade antes de logout
  warningThreshold: number;      // Minutos antes de mostrar aviso
  heartbeatInterval: number;     // Intervalo de heartbeat em ms
  enableAutoRefresh: boolean;    // Ativar refresh automático
  enableInactivityCheck: boolean; // Ativar check de inatividade
}

interface SessionState {
  isActive: boolean;
  lastActivity: number;
  refreshToken?: string;
  expiresAt?: number;
  warningShown: boolean;
  heartbeatActive: boolean;
}

interface SessionEvents {
  onSessionExpired?: () => void;
  onInactivityWarning?: (minutesLeft: number) => void;
  onSessionRefreshed?: (session: Session) => void;
  onActivityDetected?: () => void;
  onSessionValidated?: (isValid: boolean) => void;
}

/**
 * 🔐 Gerenciador de Sessão Avançado
 * 
 * Features enterprise:
 * - Token refresh automático antes da expiração
 * - Detecção de inatividade do usuário
 * - Validação contínua de sessão
 * - Heartbeat para manter sessão ativa
 * - Avisos de expiração iminente
 * - Logout automático por inatividade
 * - Métricas de uso de sessão
 */
class SessionManager {
  private static instance: SessionManager;
  private config: SessionConfig;
  private state: SessionState;
  private events: SessionEvents;
  private supabase = createSupabaseBrowserClient();
  
  // Timers e intervalos
  private refreshTimer?: NodeJS.Timeout;
  private inactivityTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private warningTimer?: NodeJS.Timeout;

  // Event listeners
  private activityListeners: (() => void)[] = [];

  private constructor(config: Partial<SessionConfig> = {}, events: SessionEvents = {}) {
    this.config = {
      refreshThreshold: 10,         // 10 minutos antes de expirar
      inactivityTimeout: 30,        // 30 minutos de inatividade
      warningThreshold: 5,          // Avisar 5 minutos antes
      heartbeatInterval: 5 * 60 * 1000, // 5 minutos
      enableAutoRefresh: true,
      enableInactivityCheck: true,
      ...config
    };

    this.events = events;
    
    this.state = {
      isActive: false,
      lastActivity: Date.now(),
      warningShown: false,
      heartbeatActive: false
    };

    this.setupActivityDetection();
    logger.info('Session manager initialized', { config: this.config }, 'SessionManager');
  }

  static getInstance(config?: Partial<SessionConfig>, events?: SessionEvents): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(config, events);
    }
    return SessionManager.instance;
  }

  /**
   * 🚀 Iniciar gerenciamento de sessão
   */
  async startSession(session: Session): Promise<void> {
    try {
      logger.info('Starting session management', { 
        userId: session.user.id,
        expiresAt: session.expires_at 
      }, 'SessionManager');

      this.state.isActive = true;
      this.state.lastActivity = Date.now();
      this.state.refreshToken = session.refresh_token;
      this.state.expiresAt = session.expires_at;
      this.state.warningShown = false;

      // Limpar timers existentes
      this.clearAllTimers();

      // Configurar refresh automático
      if (this.config.enableAutoRefresh) {
        this.scheduleTokenRefresh();
      }

      // Configurar verificação de inatividade
      if (this.config.enableInactivityCheck) {
        this.scheduleInactivityCheck();
      }

      // Iniciar heartbeat
      this.startHeartbeat();

      logger.info('Session management started successfully', {
        userId: session.user.id,
        autoRefresh: this.config.enableAutoRefresh,
        inactivityCheck: this.config.enableInactivityCheck
      }, 'SessionManager');

    } catch (error) {
      logger.error('Failed to start session management', {
        error: error.message
      }, 'SessionManager');
      throw error;
    }
  }

  /**
   * ⏹️ Parar gerenciamento de sessão
   */
  stopSession(): void {
    logger.info('Stopping session management', {}, 'SessionManager');
    
    this.state.isActive = false;
    this.clearAllTimers();
    this.removeActivityListeners();
    
    logger.info('Session management stopped', {}, 'SessionManager');
  }

  /**
   * 🔄 Refresh manual da sessão
   */
  async refreshSession(): Promise<Session | null> {
    try {
      logger.debug('Manual session refresh requested', {}, 'SessionManager');

      const { data, error } = await this.supabase.auth.refreshSession();

      if (error) {
        logger.error('Session refresh failed', { error: error.message }, 'SessionManager');
        return null;
      }

      if (data.session) {
        this.state.expiresAt = data.session.expires_at;
        this.state.refreshToken = data.session.refresh_token;
        
        // Reagendar próximo refresh
        if (this.config.enableAutoRefresh) {
          this.scheduleTokenRefresh();
        }

        logger.info('Session refreshed successfully', {
          userId: data.session.user.id,
          newExpiresAt: data.session.expires_at
        }, 'SessionManager');

        this.events.onSessionRefreshed?.(data.session);
        return data.session;
      }

      return null;

    } catch (error) {
      logger.error('Session refresh error', { error: error.message }, 'SessionManager');
      return null;
    }
  }

  /**
   * ✅ Validar sessão atual
   */
  async validateSession(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error || !data.session) {
        logger.warn('Session validation failed', { 
          error: error?.message || 'No session found' 
        }, 'SessionManager');
        
        this.events.onSessionValidated?.(false);
        return false;
      }

      // Verificar se a sessão está próxima do vencimento
      if (data.session.expires_at) {
        const expiresAt = data.session.expires_at * 1000;
        const now = Date.now();
        const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);

        if (minutesUntilExpiry < 0) {
          logger.warn('Session has expired', { 
            expiresAt: new Date(expiresAt).toISOString() 
          }, 'SessionManager');
          
          this.events.onSessionValidated?.(false);
          return false;
        }

        // Agendar refresh se necessário
        if (minutesUntilExpiry < this.config.refreshThreshold && this.config.enableAutoRefresh) {
          logger.debug('Session nearing expiry, scheduling refresh', { 
            minutesLeft: minutesUntilExpiry 
          }, 'SessionManager');
          
          this.scheduleTokenRefresh(true); // Refresh imediato
        }
      }

      this.events.onSessionValidated?.(true);
      return true;

    } catch (error) {
      logger.error('Session validation error', { error: error.message }, 'SessionManager');
      this.events.onSessionValidated?.(false);
      return false;
    }
  }

  /**
   * 👆 Registrar atividade do usuário
   */
  recordActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.state.lastActivity;

    // Só registrar se passou tempo significativo
    if (timeSinceLastActivity > 10000) { // 10 segundos
      this.state.lastActivity = now;
      this.state.warningShown = false;

      // Reagendar check de inatividade
      if (this.config.enableInactivityCheck) {
        this.scheduleInactivityCheck();
      }

      logger.debug('User activity recorded', { 
        timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000) 
      }, 'SessionManager');

      this.events.onActivityDetected?.();
    }
  }

  /**
   * 📊 Obter métricas da sessão
   */
  getSessionMetrics(): {
    isActive: boolean;
    minutesSinceLastActivity: number;
    minutesUntilExpiry?: number;
    minutesUntilInactivityLogout: number;
    heartbeatActive: boolean;
    refreshScheduled: boolean;
  } {
    const now = Date.now();
    const minutesSinceLastActivity = (now - this.state.lastActivity) / (1000 * 60);
    const minutesUntilInactivityLogout = this.config.inactivityTimeout - minutesSinceLastActivity;
    
    let minutesUntilExpiry;
    if (this.state.expiresAt) {
      minutesUntilExpiry = (this.state.expiresAt * 1000 - now) / (1000 * 60);
    }

    return {
      isActive: this.state.isActive,
      minutesSinceLastActivity: Number(minutesSinceLastActivity.toFixed(1)),
      minutesUntilExpiry: minutesUntilExpiry ? Number(minutesUntilExpiry.toFixed(1)) : undefined,
      minutesUntilInactivityLogout: Number(Math.max(0, minutesUntilInactivityLogout).toFixed(1)),
      heartbeatActive: this.state.heartbeatActive,
      refreshScheduled: !!this.refreshTimer
    };
  }

  /**
   * ⚙️ Atualizar configuração
   */
  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Session manager config updated', { newConfig }, 'SessionManager');
    
    // Reagendar timers se necessário
    if (this.state.isActive) {
      this.clearAllTimers();
      
      if (this.config.enableAutoRefresh) {
        this.scheduleTokenRefresh();
      }
      
      if (this.config.enableInactivityCheck) {
        this.scheduleInactivityCheck();
      }
      
      this.startHeartbeat();
    }
  }

  // === MÉTODOS PRIVADOS ===

  private setupActivityDetection(): void {
    if (typeof window === 'undefined') return;

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = () => this.recordActivity();
    
    activityEvents.forEach(event => {
      window.addEventListener(event, activityHandler, { passive: true });
      this.activityListeners.push(() => window.removeEventListener(event, activityHandler));
    });
  }

  private removeActivityListeners(): void {
    this.activityListeners.forEach(removeListener => removeListener());
    this.activityListeners = [];
  }

  private scheduleTokenRefresh(immediate = false): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (!this.state.expiresAt) return;

    const now = Date.now();
    const expiresAt = this.state.expiresAt * 1000;
    const refreshAt = expiresAt - (this.config.refreshThreshold * 60 * 1000);
    const delay = immediate ? 0 : Math.max(0, refreshAt - now);

    this.refreshTimer = setTimeout(async () => {
      logger.debug('Automatic token refresh triggered', {}, 'SessionManager');
      await this.refreshSession();
    }, delay);

    logger.debug('Token refresh scheduled', { 
      delay: Math.round(delay / 1000),
      refreshAt: new Date(refreshAt).toISOString()
    }, 'SessionManager');
  }

  private scheduleInactivityCheck(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }

    const inactivityMs = this.config.inactivityTimeout * 60 * 1000;
    const warningMs = (this.config.inactivityTimeout - this.config.warningThreshold) * 60 * 1000;

    // Agendar aviso
    this.warningTimer = setTimeout(() => {
      if (!this.state.warningShown) {
        this.state.warningShown = true;
        logger.warn('Inactivity warning triggered', { 
          minutesLeft: this.config.warningThreshold 
        }, 'SessionManager');
        
        this.events.onInactivityWarning?.(this.config.warningThreshold);
      }
    }, warningMs);

    // Agendar logout por inatividade
    this.inactivityTimer = setTimeout(() => {
      logger.warn('Session expired due to inactivity', { 
        inactivityTimeout: this.config.inactivityTimeout 
      }, 'SessionManager');
      
      this.events.onSessionExpired?.();
    }, inactivityMs);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.state.heartbeatActive = true;
    
    this.heartbeatTimer = setInterval(async () => {
      if (this.state.isActive) {
        logger.debug('Session heartbeat', {}, 'SessionManager');
        await this.validateSession();
      }
    }, this.config.heartbeatInterval);
  }

  private clearAllTimers(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = undefined;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
      this.state.heartbeatActive = false;
    }
  }
}

// Instância global
export const sessionManager = SessionManager.getInstance();

// Funções de conveniência
export const startSessionManagement = (session: Session, config?: Partial<SessionConfig>, events?: SessionEvents) => {
  const manager = SessionManager.getInstance(config, events);
  return manager.startSession(session);
};

export const stopSessionManagement = () => sessionManager.stopSession();
export const refreshCurrentSession = () => sessionManager.refreshSession();
export const validateCurrentSession = () => sessionManager.validateSession();
export const recordUserActivity = () => sessionManager.recordActivity();
export const getSessionMetrics = () => sessionManager.getSessionMetrics();

// Exportar tipos
export type { SessionConfig, SessionState, SessionEvents }; 