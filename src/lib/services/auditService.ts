import { devLog } from '@/lib/utils/productionLogger';

interface AuditLog {
  id?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userEmail: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogCreate {
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

class AuditService {
  /**
   * Registra uma ação de auditoria
   */
  static async logAction(
    logData: AuditLogCreate,
    user: { id: string; email: string }
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        ...logData,
        userId: user.id,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
      };

      // Log no console para desenvolvimento
      devLog.log('[AUDIT]', {
        action: auditLog.action,
        resource: `${auditLog.resourceType}:${auditLog.resourceId}`,
        user: auditLog.userEmail,
        timestamp: auditLog.timestamp,
        details: auditLog.details,
      });

      // Em produção, aqui você salvaria no banco de dados
      // await this.saveToDatabase(auditLog);
      
    } catch (error) {
      devLog.error('[AUDIT] Erro ao registrar log:', error);
      // Não falhar a operação principal por causa do log
    }
  }

  /**
   * Logs específicos para ações de bloqueio/desbloqueio
   */
  static async logUserBlock(
    clientId: string,
    clientName: string,
    reason: string,
    adminUser: { id: string; email: string }
  ): Promise<void> {
    await this.logAction(
      {
        action: 'USER_BLOCKED',
        resourceType: 'user',
        resourceId: clientId,
        details: {
          clientName,
          blockedReason: reason,
          actionType: 'block',
        },
      },
      adminUser
    );
  }

  static async logUserUnblock(
    clientId: string,
    clientName: string,
    adminUser: { id: string; email: string }
  ): Promise<void> {
    await this.logAction(
      {
        action: 'USER_UNBLOCKED',
        resourceType: 'user',
        resourceId: clientId,
        details: {
          clientName,
          actionType: 'unblock',
        },
      },
      adminUser
    );
  }

  /**
   * Logs para outras ações administrativas
   */
  static async logClientApproval(
    clientId: string,
    clientEmail: string,
    adminUser: { id: string; email: string }
  ): Promise<void> {
    await this.logAction(
      {
        action: 'CLIENT_APPROVED',
        resourceType: 'client_request',
        resourceId: clientId,
        details: {
          clientEmail,
          actionType: 'approval',
        },
      },
      adminUser
    );
  }

  static async logClientRejection(
    clientId: string,
    clientEmail: string,
    adminUser: { id: string; email: string }
  ): Promise<void> {
    await this.logAction(
      {
        action: 'CLIENT_REJECTED',
        resourceType: 'client_request',
        resourceId: clientId,
        details: {
          clientEmail,
          actionType: 'rejection',
        },
      },
      adminUser
    );
  }

  /**
   * Buscar logs de auditoria (para futuras implementações)
   */
  static async getAuditLogs(filters?: {
    userId?: string;
    resourceType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    // Implementar busca no banco de dados
    devLog.log('[AUDIT] Buscando logs com filtros:', filters);
    return [];
  }
}

export { AuditService, type AuditLog, type AuditLogCreate }; 