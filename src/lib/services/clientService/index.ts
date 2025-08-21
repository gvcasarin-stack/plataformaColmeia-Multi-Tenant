// ✅ PRODUÇÃO - Wrapper para migração gradual e segura
import logger from '@/lib/utils/logger';

// ✅ PRODUÇÃO - Flag de controle para alternar entre serviços
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE_CLIENT_SERVICE === 'true';

/**
 * ✅ PRODUÇÃO - Serviço adaptativo que permite alternar entre Firebase e Supabase
 * 
 * Este wrapper permite uma migração gradual e segura:
 * 1. Controle via variável de ambiente
 * 2. Fallback automático em caso de erro
 * 3. Logs detalhados para monitoramento
 * 4. Interface idêntica independente do backend
 */

// Imports condicionais para otimização
let firebaseService: any = null;
let supabaseService: any = null;

// Lazy loading dos serviços
async function getFirebaseService() {
  if (!firebaseService) {
    firebaseService = await import('../clientService');
  }
  return firebaseService;
}

async function getSupabaseService() {
  if (!supabaseService) {
    supabaseService = await import('../clientService.supabase');
  }
  return supabaseService;
}

/**
 * ✅ PRODUÇÃO - Wrapper com fallback automático
 */
async function withFallback<T>(
  operation: string,
  supabaseFunction: () => Promise<T>,
  firebaseFunction: () => Promise<T>
): Promise<T> {
  if (USE_SUPABASE) {
    try {
      logger.debug(`[ClientService] [WRAPPER] Usando Supabase para ${operation}`);
      const result = await supabaseFunction();
      return result;
    } catch (supabaseError) {
      logger.error(`[ClientService] [WRAPPER] Erro no Supabase para ${operation}, tentando Firebase:`, supabaseError);
      
      try {
        const result = await firebaseFunction();
        logger.warn(`[ClientService] [WRAPPER] Fallback para Firebase bem-sucedido para ${operation}`);
        return result;
      } catch (firebaseError) {
        logger.error(`[ClientService] [WRAPPER] Erro no Firebase para ${operation}:`, firebaseError);
        throw supabaseError; // Jogar erro original do Supabase
      }
    }
  } else {
    logger.debug(`[ClientService] [WRAPPER] Usando Firebase para ${operation}`);
    return await firebaseFunction();
  }
}

/**
 * ✅ PRODUÇÃO - Get the count of registered clients
 */
export async function getClientCount(): Promise<number> {
  const firebase = await getFirebaseService();
  const supabase = await getSupabaseService();
  
  return withFallback(
    'getClientCount',
    () => supabase.getClientCount(),
    () => firebase.getClientCount()
  );
}

/**
 * ✅ PRODUÇÃO - Get all registered clients
 */
export async function getClients(): Promise<any[]> {
  const firebase = await getFirebaseService();
  const supabase = await getSupabaseService();
  
  return withFallback(
    'getClients',
    () => supabase.getClients(),
    () => firebase.getClients()
  );
}

/**
 * ✅ PRODUÇÃO - Get client by ID
 */
export async function getClientById(clientId: string): Promise<any | null> {
  const firebase = await getFirebaseService();
  const supabase = await getSupabaseService();
  
  return withFallback(
    'getClientById',
    () => supabase.getClientById(clientId),
    () => firebase.getClientById(clientId)
  );
}

/**
 * ✅ PRODUÇÃO - Get paginated list of clients
 */
export async function getPaginatedClients(
  pageSize: number = 10,
  startAfterDoc?: any
): Promise<{ clients: any[]; hasMore: boolean; lastVisible: any; }> {
  const firebase = await getFirebaseService();
  const supabase = await getSupabaseService();
  
  if (USE_SUPABASE) {
    // Para Supabase, converter DocumentSnapshot para ID se necessário
    const lastClientId = startAfterDoc?.id || startAfterDoc;
    return withFallback(
      'getPaginatedClients',
      () => supabase.getPaginatedClients(pageSize, lastClientId),
      () => firebase.getPaginatedClients(pageSize, startAfterDoc)
    );
  } else {
    return firebase.getPaginatedClients(pageSize, startAfterDoc);
  }
}

/**
 * ✅ PRODUÇÃO - Invalidate client cache when data changes
 */
export function invalidateClientCache(clientId?: string): void {
  try {
    if (USE_SUPABASE) {
      // Invalidar cache do Supabase
      getSupabaseService().then(supabase => {
        supabase.invalidateClientCache(clientId);
      }).catch(error => {
        logger.error('[ClientService] [WRAPPER] Erro ao invalidar cache Supabase:', error);
      });
    } else {
      // Invalidar cache do Firebase
      getFirebaseService().then(firebase => {
        firebase.invalidateClientCache(clientId);
      }).catch(error => {
        logger.error('[ClientService] [WRAPPER] Erro ao invalidar cache Firebase:', error);
      });
    }
  } catch (error) {
    logger.error('[ClientService] [WRAPPER] Erro ao invalidar cache:', error);
  }
}

/**
 * ✅ PRODUÇÃO - Health check para monitoramento
 */
export async function checkServiceHealth(): Promise<{ status: string; details: any }> {
  try {
    const firebase = await getFirebaseService();
    const supabase = await getSupabaseService();
    
    const currentService = USE_SUPABASE ? 'Supabase' : 'Firebase';
    
    if (USE_SUPABASE) {
      const health = await supabase.checkClientServiceHealth();
      return {
        ...health,
        details: {
          ...health.details,
          activeService: currentService,
          fallbackAvailable: true
        }
      };
    } else {
      // Para Firebase, criar health check simples
      const startTime = Date.now();
      const count = await firebase.getClientCount();
      const endTime = Date.now();
      
      return {
        status: 'healthy',
        details: {
          service: 'ClientService Firebase',
          activeService: currentService,
          responseTime: `${endTime - startTime}ms`,
          clientCount: count,
          fallbackAvailable: true
        }
      };
    }
  } catch (error) {
    logger.error('[ClientService] [WRAPPER] Health check falhou:', error);
    return {
      status: 'unhealthy',
      details: {
        service: 'ClientService Wrapper',
        activeService: USE_SUPABASE ? 'Supabase' : 'Firebase',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    };
  }
}

// ✅ PRODUÇÃO - Exportar status da migração para monitoramento
export const migrationStatus = {
  useSupabase: USE_SUPABASE,
  service: USE_SUPABASE ? 'Supabase' : 'Firebase',
  version: '1.0.0'
};
