// 🚀 Sistema de Recuperação de Erro SIMPLIFICADO
// ✅ REMOVIDO: Circuit breakers complexos, verificações periódicas

import { UserProfile } from '@/lib/contexts/AuthContext';
import { devLog } from "@/lib/utils/productionLogger";
import { logger } from '@/lib/utils/logger';

// ✅ CONSERVADOR: Configurações mais simples
const DEFAULT_MAX_RETRIES = 2; // Menos retries
const DEFAULT_BASE_DELAY = 1000; // 1 segundo
const DEFAULT_MAX_DELAY = 5000; // 5 segundos máximo
const JITTER_FACTOR = 0.1;

// Tipos para as operações
type AsyncOperation<T> = () => Promise<T>;
type FallbackOperation<T> = () => T | Promise<T>;

// Interface para configuração de retry
interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

// Interface para estatísticas simples
interface RecoveryStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  retriedOperations: number;
  fallbackUsages: number;
}

/**
 * 🔄 Sistema de Recovery SIMPLIFICADO
 * ✅ REMOVIDO: Circuit breakers, timeouts complexos, verificações periódicas
 */
class ErrorRecovery {
  private static instance: ErrorRecovery;
  private stats: RecoveryStats = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    retriedOperations: 0,
    fallbackUsages: 0
  };

  private constructor() {}

  static getInstance(): ErrorRecovery {
    if (!ErrorRecovery.instance) {
      ErrorRecovery.instance = new ErrorRecovery();
    }
    return ErrorRecovery.instance;
  }

  /**
   * 🔄 Executar operação com retry simples
   */
  async withRetry<T>(
    operation: AsyncOperation<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const {
      maxRetries = DEFAULT_MAX_RETRIES,
      baseDelay = DEFAULT_BASE_DELAY,
      maxDelay = DEFAULT_MAX_DELAY,
      shouldRetry = this.defaultShouldRetry.bind(this),
      onRetry
    } = config;

    this.stats.totalOperations++;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.stats.successfulOperations++;
        return result;
      } catch (error) {
        lastError = error;
        
        // Verificar se deve tentar novamente
        if (attempt === maxRetries || !shouldRetry(error)) {
          break;
        }

        // Incrementar estatísticas de retry
        if (attempt > 0) {
          this.stats.retriedOperations++;
        }

        // Callback para retry
        if (onRetry) {
          onRetry(error, attempt + 1);
        }

        // Calcular delay exponencial
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * JITTER_FACTOR * delay;
        const finalDelay = delay + jitter;

        devLog.warn(`[ErrorRecovery] ⚠️ Tentativa ${attempt + 1}/${maxRetries + 1} falhou, tentando novamente em ${finalDelay.toFixed(0)}ms:`, error.message);
        
        await this.sleep(finalDelay);
      }
    }

    this.stats.failedOperations++;
    devLog.error('[ErrorRecovery] ❌ Operação falhou após todas as tentativas:', lastError);
    throw lastError;
  }

  /**
   * 🚀 Executar operação com retry e fallback simples
   */
  async withRecovery<T>(
    operation: AsyncOperation<T>,
    fallback: FallbackOperation<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    try {
      return await this.withRetry(operation, config);
    } catch (error) {
      devLog.warn('[ErrorRecovery] 🚨 Operação principal falhou, usando fallback:', error.message);
      
      try {
        this.stats.fallbackUsages++;
        const fallbackResult = await fallback();
        devLog.log('[ErrorRecovery] ✅ Fallback executado com sucesso');
        return fallbackResult;
      } catch (fallbackError) {
        devLog.error('[ErrorRecovery] ❌ Fallback também falhou:', fallbackError);
        throw new Error(`Operação principal e fallback falharam. Principal: ${error.message}, Fallback: ${fallbackError.message}`);
      }
    }
  }

  /**
   * 📊 Obter estatísticas
   */
  getStats(): RecoveryStats {
    return { ...this.stats };
  }

  /**
   * 🧹 Resetar estatísticas
   */
  reset(): void {
    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      retriedOperations: 0,
      fallbackUsages: 0
    };
    devLog.log('[ErrorRecovery] 🧹 Sistema de recovery resetado');
  }

  // === MÉTODOS PRIVADOS ===

  private defaultShouldRetry(error: any): boolean {
    return this.isRetryableError(error);
  }

  private isRetryableError(error: any): boolean {
    // Não tentar novamente para erros que são definitivos
    const nonRetryableMessages = [
      'Invalid JWT',
      'Unauthorized', 
      'Forbidden',
      'Not found',
      'Invalid credentials'
    ];

    const errorMessage = error?.message || '';
    const isNonRetryable = nonRetryableMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );

    if (isNonRetryable) {
      devLog.log(`[ErrorRecovery] ❌ Erro não-retryable: ${errorMessage}`);
      return false;
    }

    // Tentar novamente para erros de rede, timeout, etc.
    const retryableMessages = [
      'timeout',
      'network', 
      'connection',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'Query timeout',
      'Database connection'
    ];

    const isRetryable = retryableMessages.some(msg => 
      errorMessage.toLowerCase().includes(msg.toLowerCase())
    );

    if (isRetryable) {
      devLog.log(`[ErrorRecovery] 🔄 Erro retryable: ${errorMessage}`);
    }

    return isRetryable;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportar instância singleton
export const errorRecovery = ErrorRecovery.getInstance();

// ✅ SIMPLIFICADO: Função para perfil sem circuit breakers
export const fetchUserProfileWithRecovery = async (
  primaryFetch: () => Promise<UserProfile | null>,
  fallbackData: UserProfile | null,
  userId: string
): Promise<UserProfile | null> => {
  const recovery = ErrorRecovery.getInstance();

  try {
    const result = await recovery.withRetry(primaryFetch, { 
      maxRetries: 1, // Apenas 1 retry
      baseDelay: 500 
    });
    
    logger.info('Profile fetch bem-sucedido', { userId }, 'Recovery');
    return result;

  } catch (error: any) {
    logger.error('Profile fetch falhou', { 
      userId, 
      error: error.message,
      hasFallback: !!fallbackData 
    }, 'Recovery');

    // ✅ FALLBACK: Usar dados de fallback ou perfil básico da sessão
    if (fallbackData) {
      logger.info('Usando fallback data para profile', { userId }, 'Recovery');
      return fallbackData;
    }

    // ✅ ÚLTIMO RECURSO: Criar perfil básico da sessão
    if (typeof window !== 'undefined') {
      try {
        const sessionKeys = Object.keys(sessionStorage).filter(key => 
          key.includes('supabase') && key.includes('auth')
        );
        
        for (const key of sessionKeys) {
          const sessionData = sessionStorage.getItem(key);
          if (sessionData) {
            const parsed = JSON.parse(sessionData);
            const user = parsed?.user || parsed?.currentUser;
            
            if (user?.id === userId) {
              const basicProfile: UserProfile = {
                id: userId,
                email: user.email || '',
                full_name: user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split('@')[0] || 'Usuário',
                role: user.user_metadata?.role || 'cliente'
              };
              
              logger.info('Criado perfil básico da sessão como fallback', { userId }, 'Recovery');
              return basicProfile;
            }
          }
        }
      } catch (sessionError) {
        logger.warn('Erro ao criar perfil de sessão como fallback', { 
          error: sessionError.message 
        }, 'Recovery');
      }
    }

    return null;
  }
};

// Função de conveniência
export const withRecovery = <T>(
  operation: AsyncOperation<T>,
  fallback: FallbackOperation<T>,
  config?: RetryConfig
): Promise<T> => {
  return errorRecovery.withRecovery(operation, fallback, config);
};

// Exportar tipos
export type { RetryConfig, RecoveryStats };
