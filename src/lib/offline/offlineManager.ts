// 🚀 Sistema de Modo Offline Básico - FASE 2
// Funcionalidade sem internet com sincronização automática

import { logger } from '@/lib/utils/logger';
import { profileCache } from '@/lib/cache/profileCache';

// Interfaces para modo offline
interface OfflineConfig {
  enableOfflineMode: boolean;
  maxOfflineActions: number;
  syncInterval: number;        // Intervalo para tentar sync em ms
  enableServiceWorker: boolean;
  enableDataPersistence: boolean;
}

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface OfflineState {
  isOnline: boolean;
  isOfflineMode: boolean;
  lastSyncTime?: number;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
}

interface OfflineEvents {
  onGoOffline?: () => void;
  onGoOnline?: () => void;
  onSyncStarted?: () => void;
  onSyncCompleted?: (successful: number, failed: number) => void;
  onActionQueued?: (action: OfflineAction) => void;
  onSyncFailed?: (error: Error) => void;
}

/**
 * 📱 Gerenciador de Modo Offline
 * 
 * Features:
 * - Detecção automática de conectividade
 * - Queue de ações para executar quando online
 * - Cache de dados críticos para uso offline
 * - Sincronização automática ao voltar online
 * - Interface funcional básica sem internet
 * - Persistência de dados offline
 */
class OfflineManager {
  private static instance: OfflineManager;
  private config: OfflineConfig;
  private state: OfflineState;
  private events: OfflineEvents;
  
  // Timers e intervalos
  private syncTimer?: NodeJS.Timeout;
  private connectivityTimer?: NodeJS.Timeout;

  // Chave para persistir dados offline
  private readonly OFFLINE_STORAGE_KEY = 'plataforma_colmeia_offline_data';
  private readonly ACTIONS_STORAGE_KEY = 'plataforma_colmeia_offline_actions';

  private constructor(config: Partial<OfflineConfig> = {}, events: OfflineEvents = {}) {
    this.config = {
      enableOfflineMode: true,
      maxOfflineActions: 100,
      syncInterval: 30000,        // 30 segundos
      enableServiceWorker: false, // Desativado por padrão
      enableDataPersistence: true,
      ...config
    };

    this.events = events;

    this.state = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isOfflineMode: false,
      pendingActions: [],
      syncInProgress: false
    };

    this.init();
    logger.info('Offline manager initialized', { config: this.config }, 'OfflineManager');
  }

  static getInstance(config?: Partial<OfflineConfig>, events?: OfflineEvents): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager(config, events);
    }
    return OfflineManager.instance;
  }

  /**
   * 🚀 Inicializar sistema offline
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    // Carregar ações pendentes do localStorage
    this.loadPendingActions();

    // Configurar listeners de conectividade
    this.setupConnectivityListeners();

    // Configurar timer de sincronização
    if (this.config.enableOfflineMode) {
      this.startSyncTimer();
    }

    // Registrar service worker se habilitado
    if (this.config.enableServiceWorker) {
      this.registerServiceWorker();
    }

    logger.info('Offline manager initialized successfully', { 
      isOnline: this.state.isOnline,
      pendingActions: this.state.pendingActions.length
    }, 'OfflineManager');
  }

  /**
   * 🌐 Verificar se está online
   */
  isOnline(): boolean {
    return this.state.isOnline;
  }

  /**
   * 📱 Verificar se está em modo offline
   */
  isOfflineMode(): boolean {
    return this.state.isOfflineMode;
  }

  /**
   * 📋 Adicionar ação à queue offline
   */
  queueAction(type: string, data: any, maxRetries = 3): string {
    if (!this.config.enableOfflineMode) {
      throw new Error('Offline mode is disabled');
    }

    const action: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries
    };

    // Limitar número de ações pendentes
    if (this.state.pendingActions.length >= this.config.maxOfflineActions) {
      // Remover ação mais antiga
      const removed = this.state.pendingActions.shift();
      logger.warn('Offline action queue full, removing oldest action', { 
        removedId: removed?.id,
        queueSize: this.state.pendingActions.length 
      }, 'OfflineManager');
    }

    this.state.pendingActions.push(action);
    this.savePendingActions();

    logger.info('Action queued for offline sync', { 
      actionId: action.id,
      type: action.type,
      queueSize: this.state.pendingActions.length
    }, 'OfflineManager');

    this.events.onActionQueued?.(action);

    // Tentar sincronizar imediatamente se online
    if (this.state.isOnline && !this.state.syncInProgress) {
      this.performSync();
    }

    return action.id;
  }

  /**
   * 🔄 Executar sincronização manual
   */
  async performSync(): Promise<{ successful: number; failed: number }> {
    if (this.state.syncInProgress) {
      logger.debug('Sync already in progress, skipping', {}, 'OfflineManager');
      return { successful: 0, failed: 0 };
    }

    if (!this.state.isOnline) {
      logger.debug('Cannot sync while offline', {}, 'OfflineManager');
      return { successful: 0, failed: 0 };
    }

    if (this.state.pendingActions.length === 0) {
      logger.debug('No pending actions to sync', {}, 'OfflineManager');
      return { successful: 0, failed: 0 };
    }

    this.state.syncInProgress = true;
    this.events.onSyncStarted?.();

    logger.info('Starting offline sync', { 
      actionsToSync: this.state.pendingActions.length 
    }, 'OfflineManager');

    let successful = 0;
    let failed = 0;
    const actionsToRemove: string[] = [];

    try {
      // Processar ações em lotes de 5
      const batchSize = 5;
      for (let i = 0; i < this.state.pendingActions.length; i += batchSize) {
        const batch = this.state.pendingActions.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(action => this.processOfflineAction(action))
        );

        results.forEach((result, index) => {
          const action = batch[index];
          
          if (result.status === 'fulfilled' && result.value) {
            successful++;
            actionsToRemove.push(action.id);
            logger.debug('Offline action processed successfully', { 
              actionId: action.id,
              type: action.type 
            }, 'OfflineManager');
          } else {
            action.retries++;
            
            if (action.retries >= action.maxRetries) {
              failed++;
              actionsToRemove.push(action.id);
              logger.error('Offline action failed permanently', { 
                actionId: action.id,
                type: action.type,
                retries: action.retries,
                error: result.status === 'rejected' ? result.reason?.message : 'Unknown error'
              }, 'OfflineManager');
            } else {
              logger.warn('Offline action failed, will retry', { 
                actionId: action.id,
                type: action.type,
                retries: action.retries,
                maxRetries: action.maxRetries
              }, 'OfflineManager');
            }
          }
        });
      }

      // Remover ações processadas com sucesso ou que falharam permanentemente
      this.state.pendingActions = this.state.pendingActions.filter(
        action => !actionsToRemove.includes(action.id)
      );

      this.savePendingActions();
      this.state.lastSyncTime = Date.now();

      logger.info('Offline sync completed', { 
        successful,
        failed,
        remaining: this.state.pendingActions.length
      }, 'OfflineManager');

      this.events.onSyncCompleted?.(successful, failed);

    } catch (error) {
      logger.error('Sync failed with error', { error: error.message }, 'OfflineManager');
      this.events.onSyncFailed?.(error);
    } finally {
      this.state.syncInProgress = false;
    }

    return { successful, failed };
  }

  /**
   * 💾 Salvar dados para uso offline
   */
  saveOfflineData(key: string, data: any): void {
    if (!this.config.enableDataPersistence) return;

    try {
      const offlineData = this.getOfflineData();
      offlineData[key] = {
        data,
        timestamp: Date.now()
      };

      localStorage.setItem(this.OFFLINE_STORAGE_KEY, JSON.stringify(offlineData));
      
      logger.debug('Data saved for offline use', { key }, 'OfflineManager');

    } catch (error) {
      logger.error('Failed to save offline data', { 
        key, 
        error: error.message 
      }, 'OfflineManager');
    }
  }

  /**
   * 📖 Recuperar dados offline
   */
  getOfflineData(key?: string): any {
    if (!this.config.enableDataPersistence) return null;

    try {
      const offlineDataStr = localStorage.getItem(this.OFFLINE_STORAGE_KEY);
      
      if (!offlineDataStr) return key ? null : {};
      
      const offlineData = JSON.parse(offlineDataStr);
      
      if (key) {
        const item = offlineData[key];
        return item ? item.data : null;
      }
      
      return offlineData;

    } catch (error) {
      logger.error('Failed to get offline data', { 
        key, 
        error: error.message 
      }, 'OfflineManager');
      return key ? null : {};
    }
  }

  /**
   * 📊 Obter métricas do modo offline
   */
  getOfflineMetrics(): {
    isOnline: boolean;
    isOfflineMode: boolean;
    pendingActions: number;
    lastSyncTime?: string;
    syncInProgress: boolean;
    offlineDataSize: number;
  } {
    const offlineData = this.getOfflineData();
    const offlineDataSize = JSON.stringify(offlineData || {}).length;

    return {
      isOnline: this.state.isOnline,
      isOfflineMode: this.state.isOfflineMode,
      pendingActions: this.state.pendingActions.length,
      lastSyncTime: this.state.lastSyncTime ? new Date(this.state.lastSyncTime).toISOString() : undefined,
      syncInProgress: this.state.syncInProgress,
      offlineDataSize
    };
  }

  /**
   * 🧹 Limpar dados offline antigos
   */
  clearOldOfflineData(maxAgeHours = 168): void { // 7 dias por padrão
    if (!this.config.enableDataPersistence) return;

    try {
      const offlineData = this.getOfflineData();
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      let removedCount = 0;

      Object.keys(offlineData).forEach(key => {
        const item = offlineData[key];
        if (item.timestamp < cutoffTime) {
          delete offlineData[key];
          removedCount++;
        }
      });

      if (removedCount > 0) {
        localStorage.setItem(this.OFFLINE_STORAGE_KEY, JSON.stringify(offlineData));
        logger.info('Cleaned old offline data', { removedCount }, 'OfflineManager');
      }

    } catch (error) {
      logger.error('Failed to clean offline data', { error: error.message }, 'OfflineManager');
    }
  }

  // === MÉTODOS PRIVADOS ===

  private setupConnectivityListeners(): void {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      logger.info('Connection restored', {}, 'OfflineManager');
      this.state.isOnline = true;
      this.state.isOfflineMode = false;
      this.events.onGoOnline?.();
      
      // Tentar sincronizar imediatamente
      setTimeout(() => this.performSync(), 1000);
    };

    const handleOffline = () => {
      logger.warn('Connection lost - entering offline mode', {}, 'OfflineManager');
      this.state.isOnline = false;
      this.state.isOfflineMode = this.config.enableOfflineMode;
      this.events.onGoOffline?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificação periódica adicional
    this.connectivityTimer = setInterval(() => {
      const currentOnlineState = navigator.onLine;
      
      if (currentOnlineState !== this.state.isOnline) {
        if (currentOnlineState) {
          handleOnline();
        } else {
          handleOffline();
        }
      }
    }, 5000);
  }

  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.state.isOnline && this.state.pendingActions.length > 0 && !this.state.syncInProgress) {
        this.performSync();
      }
    }, this.config.syncInterval);
  }

  private async processOfflineAction(action: OfflineAction): Promise<boolean> {
    // Aqui você implementaria o processamento específico de cada tipo de ação
    // Por exemplo: salvar projeto, atualizar cliente, etc.
    
    logger.debug('Processing offline action', { 
      actionId: action.id,
      type: action.type 
    }, 'OfflineManager');

    // Simulação de processamento
    // Na implementação real, você faria a chamada para a API apropriada
    await new Promise(resolve => setTimeout(resolve, 500));

    // Por enquanto, vamos apenas logar a ação
    logger.info('Offline action would be processed', {
      actionId: action.id,
      type: action.type,
      data: action.data
    }, 'OfflineManager');

    return true;
  }

  private savePendingActions(): void {
    try {
      localStorage.setItem(this.ACTIONS_STORAGE_KEY, JSON.stringify(this.state.pendingActions));
    } catch (error) {
      logger.error('Failed to save pending actions', { error: error.message }, 'OfflineManager');
    }
  }

  private loadPendingActions(): void {
    try {
      const actionsStr = localStorage.getItem(this.ACTIONS_STORAGE_KEY);
      
      if (actionsStr) {
        this.state.pendingActions = JSON.parse(actionsStr);
        logger.info('Loaded pending actions from storage', { 
          count: this.state.pendingActions.length 
        }, 'OfflineManager');
      }

    } catch (error) {
      logger.error('Failed to load pending actions', { error: error.message }, 'OfflineManager');
      this.state.pendingActions = [];
    }
  }

  private registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logger.debug('Service worker not supported', {}, 'OfflineManager');
      return;
    }

    // Implementação básica de service worker seria aqui
    logger.debug('Service worker registration skipped (not implemented)', {}, 'OfflineManager');
  }
}

// Instância global
export const offlineManager = OfflineManager.getInstance();

// Funções de conveniência
export const isOnline = () => offlineManager.isOnline();
export const isOfflineMode = () => offlineManager.isOfflineMode();
export const queueOfflineAction = (type: string, data: any, maxRetries?: number) => 
  offlineManager.queueAction(type, data, maxRetries);
export const syncOfflineActions = () => offlineManager.performSync();
export const saveForOfflineUse = (key: string, data: any) => offlineManager.saveOfflineData(key, data);
export const getOfflineData = (key?: string) => offlineManager.getOfflineData(key);
export const getOfflineMetrics = () => offlineManager.getOfflineMetrics();

// Exportar tipos
export type { OfflineConfig, OfflineAction, OfflineState, OfflineEvents }; 