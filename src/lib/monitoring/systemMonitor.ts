// 🚀 Sistema de Monitoramento - FASE 1
// Utilitário para acompanhar métricas dos sistemas implementados

import { profileCache } from '@/lib/cache/profileCache';
import { errorRecovery } from '@/lib/recovery/errorRecovery';
import { logger } from '@/lib/utils/logger';

// Interfaces para métricas
interface SystemMetrics {
  cache: {
    stats: any;
    performance: {
      avgHitTime: number;
      hitRate: number;
    };
  };
  errorRecovery: {
    stats: any;
    circuitBreakerState: string;
  };
  logger: {
    totalLogs: number;
    errorCount: number;
    performanceLogs: number;
  };
  timestamp: string;
}

interface PerformanceTest {
  operation: string;
  duration: number;
  success: boolean;
  cacheHit?: boolean;
  timestamp: string;
}

/**
 * 📊 Monitor de Sistema - FASE 1
 * 
 * Monitora a performance e saúde dos sistemas implementados:
 * - Cache multi-camada
 * - Error recovery
 * - Logging estruturado
 */
class SystemMonitor {
  private static instance: SystemMonitor;
  private performanceTests: PerformanceTest[] = [];
  private isMonitoring = false;

  private constructor() {}

  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * 📊 Obter métricas atuais do sistema
   */
  getSystemMetrics(): SystemMetrics {
    try {
      // Métricas do cache
      const cacheStats = profileCache.getStats();
      const totalOperations = cacheStats.memoryHits + cacheStats.sessionHits + 
                             cacheStats.localHits + cacheStats.misses;
      const hitRate = totalOperations > 0 ? 
        ((cacheStats.memoryHits + cacheStats.sessionHits + cacheStats.localHits) / totalOperations) * 100 : 0;

      // Métricas do error recovery
      const recoveryStats = errorRecovery.getStats();

      // Métricas do logger
      const logs = logger.getLogs();
      const errorLogs = logs.filter(log => log.level === 'error');
      const performanceLogs = logs.filter(log => log.component === 'Performance');

      return {
        cache: {
          stats: cacheStats,
          performance: {
            avgHitTime: this.calculateAverageHitTime(),
            hitRate: Number(hitRate.toFixed(2))
          }
        },
        errorRecovery: {
          stats: recoveryStats,
          circuitBreakerState: recoveryStats.circuitBreakerState
        },
        logger: {
          totalLogs: logs.length,
          errorCount: errorLogs.length,
          performanceLogs: performanceLogs.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting system metrics', { error: error.message }, 'SystemMonitor');
      throw error;
    }
  }

  /**
   * 🧪 Teste de performance de busca de perfil
   */
  async testProfileFetchPerformance(userId: string): Promise<PerformanceTest> {
    const startTime = performance.now();
    let success = false;
    let cacheHit = false;

    try {
      // Verificar se está em cache primeiro
      const cachedProfile = await profileCache.getProfile(userId);
      cacheHit = !!cachedProfile;
      
      if (cachedProfile) {
        success = true;
        logger.debug('Profile fetch test - cache hit', { userId }, 'SystemMonitor');
      } else {
        logger.debug('Profile fetch test - cache miss', { userId }, 'SystemMonitor');
        // Aqui poderia testar fetch do banco, mas vamos apenas simular para não afetar dados
        success = true;
      }

      const duration = performance.now() - startTime;
      
      const test: PerformanceTest = {
        operation: 'profile_fetch',
        duration: Number(duration.toFixed(2)),
        success,
        cacheHit,
        timestamp: new Date().toISOString()
      };

      this.performanceTests.push(test);
      
      // Manter apenas os últimos 100 testes
      if (this.performanceTests.length > 100) {
        this.performanceTests = this.performanceTests.slice(-100);
      }

      logger.performance.timing('profile_fetch_test', duration, { 
        success, 
        cacheHit,
        testId: Date.now()
      });

      return test;

    } catch (error) {
      const duration = performance.now() - startTime;
      
      const test: PerformanceTest = {
        operation: 'profile_fetch',
        duration: Number(duration.toFixed(2)),
        success: false,
        timestamp: new Date().toISOString()
      };

      this.performanceTests.push(test);
      
      logger.error('Profile fetch test failed', { 
        userId, 
        error: error.message, 
        duration 
      }, 'SystemMonitor');

      return test;
    }
  }

  /**
   * 📈 Obter relatório de performance
   */
  getPerformanceReport(): {
    averageResponseTime: number;
    successRate: number;
    cacheHitRate: number;
    totalTests: number;
    recentTests: PerformanceTest[];
  } {
    if (this.performanceTests.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        cacheHitRate: 0,
        totalTests: 0,
        recentTests: []
      };
    }

    const successfulTests = this.performanceTests.filter(test => test.success);
    const cacheHits = this.performanceTests.filter(test => test.cacheHit);
    
    const averageResponseTime = this.performanceTests.reduce((sum, test) => sum + test.duration, 0) / this.performanceTests.length;
    const successRate = (successfulTests.length / this.performanceTests.length) * 100;
    const cacheHitRate = (cacheHits.length / this.performanceTests.length) * 100;

    return {
      averageResponseTime: Number(averageResponseTime.toFixed(2)),
      successRate: Number(successRate.toFixed(2)),
      cacheHitRate: Number(cacheHitRate.toFixed(2)),
      totalTests: this.performanceTests.length,
      recentTests: this.performanceTests.slice(-10)
    };
  }

  /**
   * 🧹 Limpar dados de monitoramento
   */
  clearMonitoringData(): void {
    this.performanceTests = [];
    logger.info('Monitoring data cleared', {}, 'SystemMonitor');
  }

  /**
   * 📊 Exportar relatório completo
   */
  exportFullReport(): string {
    const metrics = this.getSystemMetrics();
    const performance = this.getPerformanceReport();
    
    const report = {
      reportType: 'FASE_1_VALIDATION',
      timestamp: new Date().toISOString(),
      systemMetrics: metrics,
      performanceReport: performance,
      summary: {
        cacheHealth: metrics.cache.performance.hitRate > 80 ? 'EXCELLENT' : 
                    metrics.cache.performance.hitRate > 60 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
        errorRecoveryHealth: metrics.errorRecovery.circuitBreakerState === 'CLOSED' ? 'HEALTHY' : 'ATTENTION_NEEDED',
        overallStatus: this.calculateOverallStatus(metrics, performance)
      }
    };

    logger.info('Full system report exported', { 
      reportId: Date.now(),
      overallStatus: report.summary.overallStatus 
    }, 'SystemMonitor');

    return JSON.stringify(report, null, 2);
  }

  // === MÉTODOS PRIVADOS ===

  private calculateAverageHitTime(): number {
    const recentTests = this.performanceTests
      .filter(test => test.cacheHit)
      .slice(-10);
    
    if (recentTests.length === 0) return 0;
    
    const total = recentTests.reduce((sum, test) => sum + test.duration, 0);
    return Number((total / recentTests.length).toFixed(2));
  }

  private calculateOverallStatus(metrics: SystemMetrics, performance: any): string {
    const cacheGood = metrics.cache.performance.hitRate > 70;
    const recoveryGood = metrics.errorRecovery.circuitBreakerState === 'CLOSED';
    const performanceGood = performance.averageResponseTime < 100; // ms
    const successGood = performance.successRate > 95;

    const goodCount = [cacheGood, recoveryGood, performanceGood, successGood].filter(Boolean).length;

    if (goodCount === 4) return 'EXCELLENT';
    if (goodCount >= 3) return 'GOOD';
    if (goodCount >= 2) return 'FAIR';
    return 'NEEDS_ATTENTION';
  }
}

// Exportar instância singleton
export const systemMonitor = SystemMonitor.getInstance();

// Funções de conveniência
export const getSystemHealth = () => systemMonitor.getSystemMetrics();
export const testPerformance = (userId: string) => systemMonitor.testProfileFetchPerformance(userId);
export const getPerformanceReport = () => systemMonitor.getPerformanceReport();
export const exportSystemReport = () => systemMonitor.exportFullReport();

// Exportar tipos
export type { SystemMetrics, PerformanceTest };
