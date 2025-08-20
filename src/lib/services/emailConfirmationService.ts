import { devLog } from "@/lib/utils/productionLogger";
import type { ConfirmEmailRequest, ConfirmEmailResponse, ConfirmEmailErrorResponse } from '@/types/api';

// Estrutura de log SaaS-grade
interface LogContext {
  correlationId: string;
  userId?: string;
  email?: string;
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class EmailConfirmationService {
  private generateCorrelationId(): string {
    return `conf_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, context: Partial<LogContext>) {
    const logEntry = {
      level,
      message,
      service: 'email-confirmation',
      ...context,
      timestamp: new Date().toISOString()
    };
    
    devLog.log(`[EmailConfirmationService] ${JSON.stringify(logEntry)}`);
  }

  async confirmEmail(request: ConfirmEmailRequest): Promise<ConfirmEmailResponse> {
    const correlationId = this.generateCorrelationId();
    
    this.log('info', 'Email confirmation started', {
      correlationId,
      action: 'confirm_email_start',
      timestamp: new Date().toISOString(),
      metadata: {
        hasTokenHash: !!request.token_hash,
        hasCode: !!request.code,
        type: request.type
      }
    });

    try {
      const response = await fetch('/api/confirm-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(request)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.log('info', 'Email confirmation successful', {
          correlationId,
          userId: result.data?.userId,
          email: result.data?.email,
          action: 'confirm_email_success',
          timestamp: new Date().toISOString()
        });

        return result;
      } else {
        this.log('warn', 'Email confirmation failed', {
          correlationId,
          action: 'confirm_email_failed',
          timestamp: new Date().toISOString(),
          metadata: {
            error: result.error,
            message: result.message,
            statusCode: response.status
          }
        });

        throw new EmailConfirmationError(
          result.error || 'CONFIRMATION_FAILED',
          result.message || 'Falha na confirmação do email',
          response.status
        );
      }

    } catch (error: any) {
      if (error instanceof EmailConfirmationError) {
        throw error;
      }

      this.log('error', 'Email confirmation error', {
        correlationId,
        action: 'confirm_email_error',
        timestamp: new Date().toISOString(),
        metadata: {
          error: error.message,
          stack: error.stack
        }
      });

      throw new EmailConfirmationError(
        'UNEXPECTED_ERROR',
        'Erro inesperado durante confirmação',
        500
      );
    }
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await fetch('/api/confirm-email', {
        method: 'GET'
      });

      const result = await response.json();
      
      return {
        status: result.status || 'unknown',
        timestamp: result.timestamp || new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Classe de erro customizada para confirmação de email
export class EmailConfirmationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'EmailConfirmationError';
  }
}

// Instância singleton
export const emailConfirmationService = new EmailConfirmationService(); 