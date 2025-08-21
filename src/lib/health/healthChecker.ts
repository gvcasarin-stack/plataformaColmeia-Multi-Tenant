// 🚀 Sistema de Health Checks Automáticos - FASE 2
// Monitora continuamente a saúde da aplicação em background

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { profileCache } from '@/lib/cache/profileCache';
import { errorRecovery } from '@/lib/recovery/errorRecovery';
import { logger } from '@/lib/utils/logger';

// Interfaces para health checks
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

interface SystemHealth {
  database: HealthStatus;
  auth: HealthStatus;
  cache: HealthStatus;
  storage: HealthStatus;
  network: HealthStatus;
  overall: HealthStatus;
  timestamp: string;
}

interface HealthCheckConfig {
  interval: number; // Intervalo em ms
  timeout: number;  // Timeout para cada check
  retries: number;  // Tentativas antes de marcar como unhealthy
  enableAlerts: boolean;
  alertThreshold: number; // Quantos checks falham antes de alertar
}

/**
 * 🏥 Sistema de Health Checks Automáticos
 * 
 * Monitora continuamente:
 * - Conectividade com banco de dados
 * - Sistema de autenticação
 * - Performance do cache
 * - LocalStorage/SessionStorage
 * - Conectividade de rede
 * 
 * Features:
 * - Checks em background não-intrusivos
 * - Alertas automáticos para degradação
 * - Histórico de saúde do sistema
 * - Métricas de disponibilidade
 */
class HealthChecker {
  private static instance: HealthChecker;
  private config: HealthCheckConfig;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private healthHistory: SystemHealth[] = [];
  private alertCount = 0;
  private supabase = createSupabaseBrowserClient();

  private constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = {
      interval: 30000,      // 30 segundos
      timeout: 5000,        // 5 segundos timeout
      retries: 3,           // 3 tentativas
      enableAlerts: true,   // Alertas ativos
      alertThreshold: 3,    // 3 falhas consecutivas
      ...config
    };
  }

  static getInstance(config?: Partial<HealthCheckConfig>): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker(config);
    }
    return HealthChecker.instance;
  }

  /**
   * 🚀 Iniciar monitoramento automático
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Health checker already running', {}, 'HealthChecker');
      return;
    }

    this.isRunning = true;
    logger.info('Starting automatic health checks', {
      interval: this.config.interval,
      timeout: this.config.timeout
    }, 'HealthChecker');

    // Executar primeiro check imediatamente
    this.performHealthCheck();

    // Agendar checks regulares
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.interval);
  }

  /**
   * ⏹️ Parar monitoramento
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info('Health checker stopped', {}, 'HealthChecker');
  }

  /**
   * 🏥 Executar check completo de saúde
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      logger.debug('Performing system health check', {}, 'HealthChecker');

      // Executar todos os checks em paralelo para eficiência
      const [database, auth, cache, storage, network] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkAuth(),
        this.checkCache(),
        this.checkStorage(),
        this.checkNetwork()
      ]);

      const systemHealth: SystemHealth = {
        database: this.getResultStatus(database),
        auth: this.getResultStatus(auth),
        cache: this.getResultStatus(cache),
        storage: this.getResultStatus(storage),
        network: this.getResultStatus(network),
        overall: { status: 'healthy', lastCheck: new Date().toISOString() },
        timestamp: new Date().toISOString()
      };

      // Calcular status geral
      systemHealth.overall = this.calculateOverallHealth(systemHealth);

      // Armazenar no histórico
      this.addToHistory(systemHealth);

      // Verificar se precisa alertar
      if (this.config.enableAlerts) {
        this.checkForAlerts(systemHealth);
      }

      const duration = Date.now() - startTime;
      logger.performance.timing('health_check_complete', duration, {
        overallStatus: systemHealth.overall.status,
        checksPerformed: 5
      });

      return systemHealth;

    } catch (error) {
      logger.error('Failed to perform health check', {
        error: error.message,
        duration: Date.now() - startTime
      }, 'HealthChecker');

      // Retornar status de emergência
      const emergencyHealth: SystemHealth = {
        database: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Check failed' },
        auth: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Check failed' },
        cache: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Check failed' },
        storage: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Check failed' },
        network: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: 'Check failed' },
        overall: { status: 'unhealthy', lastCheck: new Date().toISOString(), error: error.message },
        timestamp: new Date().toISOString()
      };

      this.addToHistory(emergencyHealth);
      return emergencyHealth;
    }
  }

  /**
   * 📊 Obter status atual de saúde
   */
  getCurrentHealth(): SystemHealth | null {
    return this.healthHistory.length > 0 ? this.healthHistory[this.healthHistory.length - 1] : null;
  }

  /**
   * 📈 Obter relatório de disponibilidade
   */
  getAvailabilityReport(hours = 24): {
    uptime: number;
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    averageResponseTime: number;
  } {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    const recentHistory = this.healthHistory.filter(
      health => new Date(health.timestamp).getTime() > cutoffTime
    );

    if (recentHistory.length === 0) {
      return {
        uptime: 0,
        totalChecks: 0,
        healthyChecks: 0,
        degradedChecks: 0,
        unhealthyChecks: 0,
        averageResponseTime: 0
      };
    }

    const healthyChecks = recentHistory.filter(h => h.overall.status === 'healthy').length;
    const degradedChecks = recentHistory.filter(h => h.overall.status === 'degraded').length;
    const unhealthyChecks = recentHistory.filter(h => h.overall.status === 'unhealthy').length;

    const uptime = ((healthyChecks + degradedChecks) / recentHistory.length) * 100;

    const avgResponseTime = recentHistory
      .filter(h => h.overall.responseTime)
      .reduce((sum, h) => sum + (h.overall.responseTime || 0), 0) / recentHistory.length;

    return {
      uptime: Number(uptime.toFixed(2)),
      totalChecks: recentHistory.length,
      healthyChecks,
      degradedChecks,
      unhealthyChecks,
      averageResponseTime: Number(avgResponseTime.toFixed(2))
    };
  }

  /**
   * 🧹 Limpar histórico antigo
   */
  clearOldHistory(hoursToKeep = 168): void { // 7 dias por padrão
    const cutoffTime = Date.now() - (hoursToKeep * 60 * 60 * 1000);
    const initialCount = this.healthHistory.length;
    
    this.healthHistory = this.healthHistory.filter(
      health => new Date(health.timestamp).getTime() > cutoffTime
    );

    const removed = initialCount - this.healthHistory.length;
    if (removed > 0) {
      logger.debug('Cleaned up old health history', { removed, kept: this.healthHistory.length }, 'HealthChecker');
    }
  }

  // === CHECKS ESPECÍFICOS ===

  private async checkDatabase(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      // Teste simples de conectividade com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database check timeout')), this.config.timeout);
      });

      const queryPromise = this.supabase
        .from('users')
        .select('id')
        .limit(1);

      await Promise.race([queryPromise, timeoutPromise]);
      
      const responseTime = performance.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Number(responseTime.toFixed(2))
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkAuth(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      // Verificar se o cliente Supabase Auth está respondendo
      const { data, error } = await this.supabase.auth.getSession();
      
      const responseTime = performance.now() - startTime;
      
      if (error) {
        return {
          status: 'degraded',
          lastCheck: new Date().toISOString(),
          responseTime,
          error: error.message
        };
      }

      return {
        status: 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: Number(responseTime.toFixed(2))
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkCache(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      // Verificar se o cache está funcionando
      const stats = profileCache.getStats();
      const testUserId = 'health-check-test';
      
      // Teste rápido de read/write
      profileCache.setProfile(testUserId, { 
        id: testUserId, 
        email: 'test@health.check', 
        full_name: 'Health Check' 
      }, 'session');
      
      const retrieved = await profileCache.getProfile(testUserId);
      
      // Limpar teste
      profileCache.clearProfile(testUserId);
      
      const responseTime = performance.now() - startTime;
      
      const totalOps = stats.memoryHits + stats.sessionHits + stats.localHits + stats.misses;
      const hitRate = totalOps > 0 ? ((stats.memoryHits + stats.sessionHits + stats.localHits) / totalOps) * 100 : 100;
      
      return {
        status: retrieved && hitRate > 70 ? 'healthy' : hitRate > 50 ? 'degraded' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Number(responseTime.toFixed(2))
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkStorage(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      if (typeof window === 'undefined') {
        return {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime: 0
        };
      }

      // Testar localStorage e sessionStorage
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();
      
      localStorage.setItem(testKey, testValue);
      const localRetrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      sessionStorage.setItem(testKey, testValue);
      const sessionRetrieved = sessionStorage.getItem(testKey);
      sessionStorage.removeItem(testKey);
      
      const responseTime = performance.now() - startTime;
      
      const localWorks = localRetrieved === testValue;
      const sessionWorks = sessionRetrieved === testValue;
      
      return {
        status: localWorks && sessionWorks ? 'healthy' : localWorks || sessionWorks ? 'degraded' : 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Number(responseTime.toFixed(2))
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  private async checkNetwork(): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      if (typeof window === 'undefined') {
        return {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime: 0
        };
      }

      // Verificar se está online
      if (!navigator.onLine) {
        return {
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          error: 'Navigator reports offline'
        };
      }

      // Teste de conectividade simples
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      }).catch(() => null);

      const responseTime = performance.now() - startTime;

      return {
        status: response?.ok ? 'healthy' : 'degraded',
        lastCheck: new Date().toISOString(),
        responseTime: Number(responseTime.toFixed(2))
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: performance.now() - startTime,
        error: error.message
      };
    }
  }

  // === MÉTODOS PRIVADOS ===

  private getResultStatus(result: PromiseSettledResult<HealthStatus>): HealthStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: result.reason?.message || 'Check failed'
      };
    }
  }

  private calculateOverallHealth(health: SystemHealth): HealthStatus {
    const systems = [health.database, health.auth, health.cache, health.storage, health.network];
    
    const unhealthyCount = systems.filter(s => s.status === 'unhealthy').length;
    const degradedCount = systems.filter(s => s.status === 'degraded').length;
    const healthyCount = systems.filter(s => s.status === 'healthy').length;

    // Calcular tempo de resposta médio
    const responseTimes = systems.filter(s => s.responseTime).map(s => s.responseTime!);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    
    if (unhealthyCount > 2) {
      status = 'unhealthy';
    } else if (unhealthyCount > 0 || degradedCount > 2) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return {
      status,
      lastCheck: new Date().toISOString(),
      responseTime: Number(avgResponseTime.toFixed(2))
    };
  }

  private addToHistory(health: SystemHealth): void {
    this.healthHistory.push(health);
    
    // Manter apenas os últimos 1000 checks para performance
    if (this.healthHistory.length > 1000) {
      this.healthHistory = this.healthHistory.slice(-1000);
    }
  }

  private checkForAlerts(health: SystemHealth): void {
    if (health.overall.status === 'unhealthy') {
      this.alertCount++;
      
      if (this.alertCount >= this.config.alertThreshold) {
        logger.error('System health degraded - multiple consecutive failures', {
          consecutiveFailures: this.alertCount,
          threshold: this.config.alertThreshold,
          overallStatus: health.overall.status,
          systems: {
            database: health.database.status,
            auth: health.auth.status,
            cache: health.cache.status,
            storage: health.storage.status,
            network: health.network.status
          }
        }, 'HealthChecker');
        
        // Reset counter após alertar
        this.alertCount = 0;
      }
    } else if (health.overall.status === 'healthy') {
      // Reset counter quando sistema volta ao normal
      if (this.alertCount > 0) {
        logger.info('System health recovered', {
          previousFailures: this.alertCount,
          recoveredSystems: Object.entries(health).filter(([key, value]) => 
            key !== 'overall' && key !== 'timestamp' && value.status === 'healthy'
          ).map(([key]) => key)
        }, 'HealthChecker');
        
        this.alertCount = 0;
      }
    }
  }
}

// Instância global
export const healthChecker = HealthChecker.getInstance();

// Funções de conveniência
export const startHealthChecks = (config?: Partial<HealthCheckConfig>) => {
  const checker = HealthChecker.getInstance(config);
  checker.start();
  return checker;
};

export const stopHealthChecks = () => healthChecker.stop();
export const getCurrentSystemHealth = () => healthChecker.getCurrentHealth();
export const getSystemAvailability = (hours?: number) => healthChecker.getAvailabilityReport(hours);
export const performManualHealthCheck = () => healthChecker.performHealthCheck();

// Exportar tipos
export type { HealthStatus, SystemHealth, HealthCheckConfig };
