import { devLog } from "@/lib/utils/productionLogger";

/**
 * Utilitário para logging centralizado da migração de rotas admin
 * 
 * Este módulo facilita a coleta centralizada de logs relacionados
 * à migração das rotas /admin para /(admin), permitindo uma análise
 * mais detalhada do uso e comportamento durante a transição.
 */

type RouteType = 'page-access' | 'redirect';
type SourceType = 'old-admin-route' | 'old-admin-login-route' | 'new-admin-route';

interface LogData {
  timestamp: string;
  userAgent?: string;
  referrer?: string;
  userId?: string;
  isAuthenticated?: boolean;
  params?: Record<string, string>;
  route?: string;
  destination?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Registra eventos relacionados às rotas admin durante a migração
 * 
 * @param type Tipo de evento (acesso à página ou redirecionamento)
 * @param source Identificador da origem do log
 * @param message Mensagem descritiva
 * @param data Dados adicionais para o log
 */
export function logAdminRouteEvent(
  type: RouteType,
  source: SourceType,
  message: string,
  data: Partial<LogData> = {}
): void {
  // Criar objeto de log com dados padrão
  const logEntry = {
    type,
    source,
    message,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SSR',
    referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
    ...data
  };

  // Registrar no console com tag específica para facilitar a filtragem
  devLog.log(`[Migração-Admin:${type}:${source}]`, message, logEntry);

  // Em ambiente de produção, podemos enviar esses logs para um serviço
  // de análise como Google Analytics, Segment, ou um endpoint próprio
  if (process.env.NODE_ENV === 'production') {
    try {
      // Exemplo: enviar para um endpoint dedicado (implementar conforme necessário)
      // sendToAnalyticsService('/api/admin-migration-log', logEntry);
      
      // Ou salvar em localStorage para coleta posterior
      if (typeof window !== 'undefined') {
        const existingLogs = JSON.parse(localStorage.getItem('admin-migration-logs') || '[]');
        existingLogs.push(logEntry);
        
        // Limitar a 100 entradas para não ocupar muito espaço
        if (existingLogs.length > 100) {
          existingLogs.shift();
        }
        
        localStorage.setItem('admin-migration-logs', JSON.stringify(existingLogs));
      }
    } catch (error) {
      // Ignorar erros de telemetria para não afetar a experiência do usuário
      devLog.error('[Migração-Admin:error]', 'Falha ao enviar telemetria', error);
    }
  }
}

/**
 * Registra acesso à página admin
 */
export function logAdminPageAccess(route: string, userId?: string, additionalInfo?: Record<string, any>): void {
  logAdminRouteEvent(
    'page-access',
    'new-admin-route',
    `Acesso à página ${route}`,
    {
      route,
      userId,
      additionalInfo,
      isAuthenticated: !!userId
    }
  );
}

/**
 * Registra redirecionamento de rota antiga para nova
 */
export function logAdminRedirect(
  source: 'old-admin-route' | 'old-admin-login-route',
  fromRoute: string,
  toRoute: string,
  params?: Record<string, string>
): void {
  logAdminRouteEvent(
    'redirect',
    source,
    `Redirecionamento: ${fromRoute} → ${toRoute}`,
    {
      route: fromRoute,
      destination: toRoute,
      params
    }
  );
}

/**
 * Utilitário para recuperar logs armazenados localmente
 * para fins de diagnóstico (apenas em ambiente de desenvolvimento)
 */
export function getStoredAdminMigrationLogs(): any[] {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      return JSON.parse(localStorage.getItem('admin-migration-logs') || '[]');
    } catch (error) {
      devLog.error('[Migração-Admin:error]', 'Falha ao recuperar logs', error);
      return [];
    }
  }
  return [];
}

/**
 * Limpa os logs armazenados localmente
 */
export function clearStoredAdminMigrationLogs(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin-migration-logs');
  }
} 