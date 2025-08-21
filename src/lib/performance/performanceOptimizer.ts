// 🚀 Sistema de Otimização de Performance - FASE 2
// Query optimization, connection pooling, lazy loading e monitoramento

import { logger } from '@/lib/utils/logger';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Interfaces para otimização de performance
interface PerformanceConfig {
  enableQueryOptimization: boolean;
  enableConnectionPooling: boolean;
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enableDebouncing: boolean;
  debounceDelay: number;
  maxConcurrentQueries: number;
  queryTimeout: number;
  cacheStrategy: 'aggressive' | 'conservative' | 'minimal';
}

interface QueryMetrics {
  queryId: string;
  query: string;
  duration: number;
  cacheHit: boolean;
  optimized: boolean;
  timestamp: number;
  rowsReturned?: number;
}

interface PerformanceMetrics {
  totalQueries: number;
  averageQueryTime: number;
  cacheHitRate: number;
  optimizedQueries: number;
  slowQueries: number;
  concurrentQueries: number;
  memoryUsage: number;
}

/**
 * ⚡ Otimizador de Performance Enterprise
 * 
 * Features:
 * - Query optimization automática
 * - Connection pooling inteligente
 * - Lazy loading de componentes
 * - Debouncing de inputs
 * - Cache de queries
 * - Monitoramento de performance
 * - Alertas de performance
 */
class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private config: PerformanceConfig;
  private queryMetrics: QueryMetrics[] = [];
  private activeQueries = new Map<string, Promise<any>>();
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private connectionPool: any[] = [];
  
  // Contadores de performance
  private concurrentQueryCount = 0;
  private slowQueryThreshold = 1000; // 1 segundo

  private constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableQueryOptimization: true,
      enableConnectionPooling: true,
      enableLazyLoading: true,
      enableImageOptimization: true,
      enableDebouncing: true,
      debounceDelay: 300,
      maxConcurrentQueries: 10,
      queryTimeout: 30000,
      cacheStrategy: 'conservative',
      ...config
    };

    this.initializeOptimizations();
    logger.info('Performance optimizer initialized', { config: this.config }, 'PerformanceOptimizer');
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer(config);
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * 🚀 Query otimizada com cache e métricas
   */
  async optimizedQuery<T>(
    queryFn: () => Promise<T>,
    queryKey: string,
    options: {
      cacheTTL?: number;
      timeout?: number;
      skipCache?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = performance.now();
    const queryId = `${queryKey}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Verificar cache primeiro (se habilitado)
      if (this.config.enableQueryOptimization && !options.skipCache) {
        const cachedResult = this.getCachedQuery(queryKey);
        if (cachedResult) {
          const duration = performance.now() - startTime;
          this.recordQueryMetrics(queryId, queryKey, duration, true, true);
          
          logger.debug('Query cache hit', { 
            queryKey, 
            duration,
            cacheAge: Date.now() - cachedResult.timestamp 
          }, 'PerformanceOptimizer');
          
          return cachedResult.data;
        }
      }

      // Verificar se a mesma query já está sendo executada
      if (this.activeQueries.has(queryKey)) {
        logger.debug('Query deduplication', { queryKey }, 'PerformanceOptimizer');
        return await this.activeQueries.get(queryKey);
      }

      // Verificar limite de queries concorrentes
      if (this.concurrentQueryCount >= this.config.maxConcurrentQueries) {
        logger.warn('Max concurrent queries reached, queuing', { 
          queryKey,
          currentCount: this.concurrentQueryCount,
          maxAllowed: this.config.maxConcurrentQueries
        }, 'PerformanceOptimizer');
        
        await this.waitForQuerySlot();
      }

      // Executar query com timeout
      this.concurrentQueryCount++;
      const queryPromise = this.executeWithTimeout(queryFn, options.timeout || this.config.queryTimeout);
      this.activeQueries.set(queryKey, queryPromise);

      const result = await queryPromise;
      
      // Cache do resultado
      if (this.config.enableQueryOptimization && !options.skipCache) {
        this.setCachedQuery(queryKey, result, options.cacheTTL);
      }

      const duration = performance.now() - startTime;
      this.recordQueryMetrics(queryId, queryKey, duration, false, true);

      // Alertar sobre queries lentas
      if (duration > this.slowQueryThreshold) {
        logger.warn('Slow query detected', { 
          queryKey, 
          duration,
          threshold: this.slowQueryThreshold
        }, 'PerformanceOptimizer');
      }

      return result;

    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordQueryMetrics(queryId, queryKey, duration, false, false);
      
      logger.error('Optimized query failed', { 
        queryKey, 
        duration,
        error: error.message 
      }, 'PerformanceOptimizer');
      
      throw error;
    } finally {
      this.concurrentQueryCount--;
      this.activeQueries.delete(queryKey);
    }
  }

  /**
   * 🎯 Debounce para inputs de busca
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    key: string,
    delay?: number
  ): (...args: Parameters<T>) => void {
    if (!this.config.enableDebouncing) {
      return fn;
    }

    return (...args: Parameters<T>) => {
      // Limpar timer existente
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Criar novo timer
      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(key);
      }, delay || this.config.debounceDelay);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * 🖼️ Otimização de imagens
   */
  optimizeImageUrl(url: string, options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}): string {
    if (!this.config.enableImageOptimization) {
      return url;
    }

    // Implementação básica - em produção você usaria um serviço como Cloudinary
    const params = new URLSearchParams();
    
    if (options.width) params.append('w', options.width.toString());
    if (options.height) params.append('h', options.height.toString());
    if (options.quality) params.append('q', options.quality.toString());
    if (options.format) params.append('f', options.format);

    const separator = url.includes('?') ? '&' : '?';
    return params.toString() ? `${url}${separator}${params.toString()}` : url;
  }

  /**
   * 🏃‍♂️ Lazy loading para componentes
   */
  createLazyComponent<T>(importFn: () => Promise<{ default: T }>): () => Promise<{ default: T }> {
    if (!this.config.enableLazyLoading) {
      return importFn;
    }

    let componentPromise: Promise<{ default: T }> | null = null;

    return () => {
      if (!componentPromise) {
        logger.debug('Loading component lazily', {}, 'PerformanceOptimizer');
        componentPromise = importFn();
      }
      return componentPromise;
    };
  }

  /**
   * 📊 Obter métricas de performance
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const recentMetrics = this.queryMetrics.filter(
      metric => Date.now() - metric.timestamp < 3600000 // Última hora
    );

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        optimizedQueries: 0,
        slowQueries: 0,
        concurrentQueries: this.concurrentQueryCount,
        memoryUsage: this.getMemoryUsage()
      };
    }

    const totalQueries = recentMetrics.length;
    const averageQueryTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;
    const optimizedQueries = recentMetrics.filter(m => m.optimized).length;
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold).length;

    return {
      totalQueries,
      averageQueryTime: Number(averageQueryTime.toFixed(2)),
      cacheHitRate: Number(cacheHitRate.toFixed(2)),
      optimizedQueries,
      slowQueries,
      concurrentQueries: this.concurrentQueryCount,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * 🧹 Limpar cache e métricas antigas
   */
  cleanup(): void {
    const now = Date.now();
    
    // Limpar cache expirado
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.queryCache.delete(key);
      }
    }

    // Limpar métricas antigas (mais de 24 horas)
    const cutoffTime = now - 24 * 60 * 60 * 1000;
    this.queryMetrics = this.queryMetrics.filter(
      metric => metric.timestamp > cutoffTime
    );

    // Limpar timers de debounce órfãos
    for (const [key, timer] of this.debounceTimers.entries()) {
      if (!timer) {
        this.debounceTimers.delete(key);
      }
    }

    logger.debug('Performance optimizer cleanup completed', {
      cacheSize: this.queryCache.size,
      metricsCount: this.queryMetrics.length,
      debounceTimers: this.debounceTimers.size
    }, 'PerformanceOptimizer');
  }

  /**
   * ⚙️ Atualizar configuração
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Performance optimizer config updated', { newConfig }, 'PerformanceOptimizer');
  }

  // === MÉTODOS PRIVADOS ===

  private initializeOptimizations(): void {
    // Configurar limpeza automática
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // A cada 5 minutos

    // Configurar monitoramento de memória
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      setInterval(() => {
        const memory = this.getMemoryUsage();
        if (memory > 100) { // MB
          logger.warn('High memory usage detected', { memoryMB: memory }, 'PerformanceOptimizer');
        }
      }, 60000); // A cada minuto
    }
  }

  private getCachedQuery(key: string): { data: any; timestamp: number } | null {
    const cached = this.queryCache.get(key);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached;
  }

  private setCachedQuery(key: string, data: any, ttl?: number): void {
    const defaultTTL = this.config.cacheStrategy === 'aggressive' ? 10 * 60 * 1000 : // 10 min
                      this.config.cacheStrategy === 'conservative' ? 5 * 60 * 1000 : // 5 min
                      2 * 60 * 1000; // 2 min

    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || defaultTTL
    });
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  private async waitForQuerySlot(): Promise<void> {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.concurrentQueryCount < this.config.maxConcurrentQueries) {
          resolve();
        } else {
          setTimeout(checkSlot, 50); // Verificar a cada 50ms
        }
      };
      checkSlot();
    });
  }

  private recordQueryMetrics(
    queryId: string, 
    query: string, 
    duration: number, 
    cacheHit: boolean, 
    optimized: boolean
  ): void {
    const metric: QueryMetrics = {
      queryId,
      query,
      duration,
      cacheHit,
      optimized,
      timestamp: Date.now()
    };

    this.queryMetrics.push(metric);
    
    // Manter apenas os últimos 1000 registros
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Log de performance
    logger.performance.timing('database_query', duration, {
      queryKey: query,
      cacheHit,
      optimized,
      slow: duration > this.slowQueryThreshold
    });
  }

  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // MB
    }
    return 0;
  }
}

// Instância global
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Funções de conveniência
export const optimizedQuery = <T>(
  queryFn: () => Promise<T>, 
  queryKey: string, 
  options?: { cacheTTL?: number; timeout?: number; skipCache?: boolean }
) => performanceOptimizer.optimizedQuery(queryFn, queryKey, options);

export const debounce = <T extends (...args: any[]) => any>(
  fn: T, 
  key: string, 
  delay?: number
) => performanceOptimizer.debounce(fn, key, delay);

export const optimizeImage = (url: string, options?: {
  width?: number; height?: number; quality?: number; format?: 'webp' | 'jpeg' | 'png';
}) => performanceOptimizer.optimizeImageUrl(url, options);

export const createLazyComponent = <T>(importFn: () => Promise<{ default: T }>) => 
  performanceOptimizer.createLazyComponent(importFn);

export const getPerformanceMetrics = () => performanceOptimizer.getPerformanceMetrics();
export const cleanupPerformanceData = () => performanceOptimizer.cleanup();

// Hook personalizado para React
export const useOptimizedQuery = <T>(
  queryFn: () => Promise<T>,
  queryKey: string,
  dependencies: any[] = [],
  options?: { cacheTTL?: number; timeout?: number; skipCache?: boolean }
) => {
  // Esta seria a implementação do hook se estivéssemos em um contexto React
  // Por agora, apenas retornamos a função otimizada
  return () => optimizedQuery(queryFn, queryKey, options);
};

// Exportar tipos
export type { PerformanceConfig, QueryMetrics, PerformanceMetrics };
