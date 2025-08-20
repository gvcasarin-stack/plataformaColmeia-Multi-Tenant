/**
 * Sistema de Logging Inteligente para Produção
 * 
 * Este sistema automaticamente desabilita logs em produção para:
 * - Melhorar performance
 * - Evitar vazamento de dados sensíveis
 * - Manter console limpo para usuários finais
 * - Manter logs apenas em desenvolvimento
 */

// Detecta se está em produção - FORÇAR PRODUÇÃO PARA VERCEL
const isProduction = process.env.NODE_ENV === 'production' || 
                    process.env.VERCEL_ENV === 'production' ||
                    (typeof window !== 'undefined' && 
                     window.location.hostname.includes('vercel.app'));

// Detecta se é desenvolvimento - APENAS localhost
const isDevelopment = !isProduction && 
                     (process.env.NODE_ENV === 'development' || 
                      (typeof window !== 'undefined' && 
                       (window.location.hostname.includes('localhost') || 
                        window.location.hostname.includes('127.0.0.1'))));

/**
 * Logger condicional que só executa em desenvolvimento
 * SILENCIOSO EM PRODUÇÃO
 */
export const devLog = {
  log: (...args: any[]) => {
    // NUNCA loga em produção
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // NUNCA loga em produção
    if (isDevelopment) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    // NUNCA loga em produção
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    // NUNCA loga em produção
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    // NUNCA loga em produção
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

/**
 * Logger para erros críticos que devem aparecer sempre
 * (mas sem dados sensíveis em produção)
 */
export const criticalLog = {
  error: (message: string, error?: any) => {
    if (isProduction) {
      // Em produção, só loga mensagem genérica
      console.error(`[CRITICAL] ${message}`);
    } else {
      // Em desenvolvimento, loga tudo
      console.error(`[CRITICAL] ${message}`, error);
    }
  }
};

/**
 * Logger para auditoria que funciona em todos os ambientes
 * mas filtra dados sensíveis em produção
 */
export const auditLog = {
  log: (action: string, data: any) => {
    if (isProduction) {
      // Em produção, só loga ação sem dados sensíveis
      console.log(`[AUDIT] ${action}`);
    } else {
      // Em desenvolvimento, loga tudo
      console.log(`[AUDIT] ${action}`, data);
    }
  }
};

/**
 * Remove dados sensíveis de objetos para logging seguro
 */
export const sanitizeForLogging = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'email', 'phone', 'cpf', 'cnpj', 'address', 'personal'
  ];
  
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
};

/**
 * Utilitário para logging seguro em produção
 */
export const safeLog = {
  log: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(message, data);
    } else if (data) {
      console.log(message, sanitizeForLogging(data));
    } else {
      console.log(message);
    }
  }
};

// Exporta flags de ambiente para uso em outras partes do código
export const env = {
  isProduction,
  isDevelopment,
  isTest: process.env.NODE_ENV === 'test'
}; 