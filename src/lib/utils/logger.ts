import { devLog } from "@/lib/utils/productionLogger";

// 🚀 Sistema de Logging Estruturado
// Implementação da FASE 1: CRÍTICA - Logs Estruturados

// Tipos para o sistema de logging
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, any>;

// Interface para entrada de log
interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  component: string;
  userId?: string;
  sessionId?: string;
  error?: Error;
}

// Interface para configuração do logger
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  enableProductionLogs: boolean;
}

// Configuração padrão
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: process.env.NODE_ENV === 'development',
  enableStorage: true,
  maxStorageEntries: 1000,
  enableProductionLogs: false // Apenas para debugging específico em produção
};

// Mapeamento de níveis de log para números (para comparação)
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

/**
 * 📝 Sistema de Logging Estruturado para Plataforma Colmeia
 * 
 * Features:
 * - Logging estruturado com contexto
 * - Níveis apropriados por ambiente
 * - Armazenamento local para debugging
 * - Formatação consistente
 * - Performance otimizada
 */
class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private sessionId: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    
    // Limpeza periódica dos logs armazenados
    if (typeof window !== 'undefined' && this.config.enableStorage) {
      setInterval(() => this.cleanupStoredLogs(), 5 * 60 * 1000); // A cada 5 minutos
    }
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * 🐛 Log de debug (apenas desenvolvimento)
   */
  debug(message: string, context?: LogContext, component = 'System'): void {
    this.log('debug', message, context, component);
  }

  /**
   * ℹ️ Log informativo
   */
  info(message: string, context?: LogContext, component = 'System'): void {
    this.log('info', message, context, component);
  }

  /**
   * ⚠️ Log de aviso
   */
  warn(message: string, context?: LogContext, component = 'System'): void {
    this.log('warn', message, context, component);
  }

  /**
   * ❌ Log de erro
   */
  error(message: string, context?: LogContext, component = 'System', error?: Error): void {
    this.log('error', message, context, component, error);
  }

  /**
   * 📊 Logs específicos de autenticação
   */
  auth = {
    login: (email: string, success: boolean, context?: LogContext) => {
      this.log('info', `Login ${success ? 'successful' : 'failed'}`, {
        email,
        success,
        ...context
      }, 'Auth');
    },

    logout: (userId: string, context?: LogContext) => {
      this.log('info', 'User logout', {
        userId,
        ...context
      }, 'Auth');
    },

    sessionExpired: (userId: string, context?: LogContext) => {
      this.log('warn', 'Session expired', {
        userId,
        ...context
      }, 'Auth');
    },

    profileFetch: (userId: string, success: boolean, source?: string, context?: LogContext) => {
      this.log(success ? 'info' : 'warn', `Profile fetch ${success ? 'successful' : 'failed'}`, {
        userId,
        success,
        source,
        ...context
      }, 'Auth');
    },

    cacheHit: (userId: string, cacheType: string, context?: LogContext) => {
      this.log('debug', 'Cache hit', {
        userId,
        cacheType,
        ...context
      }, 'Auth');
    },

    cacheMiss: (userId: string, context?: LogContext) => {
      this.log('debug', 'Cache miss', {
        userId,
        ...context
      }, 'Auth');
    }
  };

  /**
   * 📊 Logs específicos de performance
   */
  performance = {
    timing: (operation: string, duration: number, context?: LogContext) => {
      const level = duration > 2000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
      this.log(level, `Performance: ${operation}`, {
        operation,
        duration,
        slow: duration > 1000,
        ...context
      }, 'Performance');
    },

    databaseQuery: (query: string, duration: number, success: boolean, context?: LogContext) => {
      this.log(success ? 'debug' : 'error', `Database query ${success ? 'completed' : 'failed'}`, {
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        duration,
        success,
        ...context
      }, 'Database');
    }
  };

  /**
   * 📊 Logs específicos de API
   */
  api = {
    request: (endpoint: string, method: string, context?: LogContext) => {
      this.log('debug', `API request`, {
        endpoint,
        method,
        ...context
      }, 'API');
    },

    response: (endpoint: string, status: number, duration: number, context?: LogContext) => {
      const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'debug';
      this.log(level, `API response`, {
        endpoint,
        status,
        duration,
        ...context
      }, 'API');
    },

    error: (endpoint: string, error: Error, context?: LogContext) => {
      this.log('error', `API error`, {
        endpoint,
        errorMessage: error.message,
        ...context
      }, 'API', error);
    }
  };

  /**
   * 📊 Obter logs armazenados
   */
  getLogs(level?: LogLevel, component?: string, limit = 100): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (level) {
      const minLevel = LOG_LEVELS[level];
      filteredLogs = filteredLogs.filter(log => LOG_LEVELS[log.level] >= minLevel);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    return filteredLogs.slice(-limit);
  }

  /**
   * 📊 Exportar logs para análise
   */
  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      config: this.config,
      logs: this.logs
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 🧹 Limpar logs
   */
  clearLogs(): void {
    this.logs = [];
    devLog.log('[Logger] 🧹 Logs limpos');
  }

  /**
   * ⚙️ Atualizar configuração
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    devLog.log('[Logger] ⚙️ Configuração atualizada:', this.config);
  }

  // === MÉTODOS PRIVADOS ===

  private log(level: LogLevel, message: string, context?: LogContext, component = 'System', error?: Error): void {
    // Verificar se o nível de log é suficiente
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    // Criar entrada de log
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date().toISOString(),
      component,
      sessionId: this.sessionId,
      error
    };

    // Adicionar userId se disponível no contexto
    if (context?.userId) {
      logEntry.userId = context.userId;
    }

    // Armazenar log
    if (this.config.enableStorage) {
      this.logs.push(logEntry);
      this.maintainStorageLimit();
    }

    // Log no console (apenas desenvolvimento ou debugging específico)
    if (this.config.enableConsole || (this.config.enableProductionLogs && level === 'error')) {
      this.logToConsole(logEntry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.component}]`;
    
    const logData = {
      message: entry.message,
      ...(entry.context && Object.keys(entry.context).length > 0 && { context: entry.context }),
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.error && { error: entry.error })
    };

    switch (entry.level) {
      case 'debug':
        console.debug(`${prefix} 🐛 ${entry.message}`, logData);
        break;
      case 'info':
        devLog.info(`${prefix} ℹ️ ${entry.message}`, logData);
        break;
      case 'warn':
        devLog.warn(`${prefix} ⚠️ ${entry.message}`, logData);
        break;
      case 'error':
        devLog.error(`${prefix} ❌ ${entry.message}`, logData);
        if (entry.error) {
          devLog.error('Stack trace:', entry.error.stack);
        }
        break;
    }
  }

  private maintainStorageLimit(): void {
    if (this.logs.length > this.config.maxStorageEntries) {
      const excessLogs = this.logs.length - this.config.maxStorageEntries;
      this.logs.splice(0, excessLogs);
    }
  }

  private cleanupStoredLogs(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const initialCount = this.logs.length;
    
    this.logs = this.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime > oneHourAgo || log.level === 'error'; // Manter erros por mais tempo
    });

    const removed = initialCount - this.logs.length;
    if (removed > 0) {
      devLog.log(`[Logger] 🧹 Limpeza automática: ${removed} logs antigos removidos`);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Criar instância global
export const logger = Logger.getInstance();

// Funções de conveniência para uso direto
export const logDebug = (message: string, context?: LogContext, component?: string) => 
  logger.debug(message, context, component);

export const logInfo = (message: string, context?: LogContext, component?: string) => 
  logger.info(message, context, component);

export const logWarn = (message: string, context?: LogContext, component?: string) => 
  logger.warn(message, context, component);

export const logError = (message: string, context?: LogContext, component?: string, error?: Error) => 
  logger.error(message, context, component, error);

// Exportar tipos
export type { LogLevel, LogContext, LogEntry, LoggerConfig };

// ✅ PHASE 1: Export default para compatibilidade com imports existentes
export default logger;
