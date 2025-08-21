/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * 
 * Security Audit - STUB TEMPORÁRIO
 * Utilitário para registrar eventos de segurança importantes
 * Em produção, esses eventos podem ser enviados para um sistema de monitoramento externo
 */

import logger from './logger';
import { devLog } from "@/lib/utils/productionLogger";

export type SecurityEvent = {
  type: 'auth' | 'access' | 'data' | 'api' | 'admin';
  severity: 'info' | 'warning' | 'error' | 'critical';
  action: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
};

// ⚠️ STUB: logSecurityEvent
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    devLog.warn('[SecurityAudit] STUB: logSecurityEvent - TODO: migrar para Supabase');
    
    // Por enquanto, apenas registrar no logger
    const logMessage = `[SECURITY ${event.severity.toUpperCase()}] ${event.type}/${event.action}`;
    const logData = {
      userId: event.userId,
      email: event.email,
      ip: event.ip,
      userAgent: event.userAgent,
      metadata: event.metadata
    };
    
    switch (event.severity) {
      case 'critical':
      case 'error':
        logger.error(logMessage, logData);
        break;
      case 'warning':
        logger.warn(logMessage, logData);
        break;
      default:
        logger.info(logMessage, logData);
    }
    
  } catch (error) {
    logger.error('[SecurityAudit] STUB: Erro ao registrar evento de segurança:', error);
  }
}

// ⚠️ STUB: getSecurityEvents
export async function getSecurityEvents(filters?: {
  userId?: string;
  type?: SecurityEvent['type'];
  severity?: SecurityEvent['severity'];
  limit?: number;
}): Promise<SecurityEvent[]> {
  devLog.warn('[SecurityAudit] STUB: getSecurityEvents - TODO: migrar para Supabase');
  return [];
}

// ⚠️ STUB: Funções de conveniência
export const logAuthEvent = (action: string, data: Partial<SecurityEvent>) => 
  logSecurityEvent({ ...data, type: 'auth', action });

export const logAccessEvent = (action: string, data: Partial<SecurityEvent>) => 
  logSecurityEvent({ ...data, type: 'access', action });

export const logDataEvent = (action: string, data: Partial<SecurityEvent>) => 
  logSecurityEvent({ ...data, type: 'data', action });

export const logApiEvent = (action: string, data: Partial<SecurityEvent>) => 
  logSecurityEvent({ ...data, type: 'api', action });

export const logAdminEvent = (action: string, data: Partial<SecurityEvent>) => 
  logSecurityEvent({ ...data, type: 'admin', action });
