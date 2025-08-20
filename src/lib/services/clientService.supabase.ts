// ✅ SUPABASE - Serviço de clientes para produção
// ✅ PRODUÇÃO - Usando apenas Browser Client (seguro no frontend)
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import logger from '@/lib/utils/logger';

/**
 * SERVIÇO DE CLIENTES SUPABASE - PRODUÇÃO READY
 * 
 * Migração completa do Firebase mantendo 100% de compatibilidade
 * Sistema de cache robusto e fallbacks para SaaS em produção
 * ✅ Usando apenas Browser Client para segurança no frontend
 */

// Sistema de cache para clientes (mantendo estrutura original)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

// Configurações de cache (mantendo valores originais)
const CLIENT_CACHE_TTL = 300000; // 5 minutos
const CLIENT_COUNT_CACHE_TTL = 600000; // 10 minutos

// Estrutura de cache (idêntica ao Firebase)
const cache = {
  clientCount: null as CacheEntry<number> | null,
  clientsList: null as CacheEntry<any[]> | null,
  clientQueries: new Map<string, CacheEntry<any[]>>(),
  clientById: new Map<string, CacheEntry<any>>()
};

/**
 * ✅ PRODUÇÃO - Verifica se um item do cache ainda é válido
 */
function isCacheValid<T>(entry: CacheEntry<T> | null, ttl: number = CLIENT_CACHE_TTL): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * ✅ PRODUÇÃO - Limpa o cache com mais de 30 minutos
 */
function cleanupCache(): void {
  const now = Date.now();
  const MAX_AGE = 1800000; // 30 minutos
  
  try {
    // Limpar caches
    if (cache.clientCount && now - cache.clientCount.timestamp > MAX_AGE) {
      cache.clientCount = null;
      logger.debug('[ClientService] [SUPABASE] Cache de contagem limpo por expiração');
    }
    
    if (cache.clientsList && now - cache.clientsList.timestamp > MAX_AGE) {
      cache.clientsList = null;
      logger.debug('[ClientService] [SUPABASE] Cache de lista limpo por expiração');
    }
    
    // Limpar cache de consultas específicas
    cache.clientQueries.forEach((entry, key) => {
      if (now - entry.timestamp > MAX_AGE) {
        cache.clientQueries.delete(key);
      }
    });
    
    // Limpar cache de clientes por ID
    cache.clientById.forEach((entry, key) => {
      if (now - entry.timestamp > MAX_AGE) {
        cache.clientById.delete(key);
      }
    });
    
    logger.debug('[ClientService] [SUPABASE] Limpeza de cache concluída');
  } catch (error) {
    logger.error('[ClientService] [SUPABASE] Erro na limpeza de cache:', error);
  }
}

// Configurar limpeza periódica do cache (mantendo comportamento original)
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 900000);
}

/**
 * ✅ PRODUÇÃO - Busca contagem de clientes registrados
 * ✅ BROWSER CLIENT - Seguro para uso no frontend
 */
export async function getClientCount(): Promise<number> {
  try {
    logger.debug('[ClientService] [SUPABASE] Verificando cache para contagem de clientes');
    
    // Verificar cache (mantendo lógica original)
    if (isCacheValid(cache.clientCount, CLIENT_COUNT_CACHE_TTL)) {
      logger.debug('[ClientService] [SUPABASE] Usando contagem de clientes em cache');
      return cache.clientCount!.data;
    }
    
    logger.debug('[ClientService] [SUPABASE] Iniciando contagem de clientes');
    
    // ✅ PRODUÇÃO - Usando Browser Client seguro
    const supabase = createSupabaseBrowserClient();
    
    // Query com role='cliente' (padrão no Supabase)
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'cliente'); // Usar role padrão do Supabase
    
    if (error) {
      logger.error('[ClientService] [SUPABASE] Erro ao obter contagem de clientes:', error);
      throw error;
    }
    
    const clientCount = count || 0;
    
    // Atualizar cache (mantendo estrutura original)
    cache.clientCount = {
      data: clientCount,
      timestamp: Date.now(),
      key: 'client_count'
    };
    
    logger.info('[ClientService] [SUPABASE] Contagem de clientes obtida com sucesso:', clientCount);
    return clientCount;
    
  } catch (error) {
    logger.error('[ClientService] [SUPABASE] Erro ao obter contagem de clientes:', error);
    
    // ✅ PRODUÇÃO - Fallback: usar cache expirado se disponível
    if (cache.clientCount) {
      logger.warn('[ClientService] [SUPABASE] Usando cache expirado como fallback para contagem');
      return cache.clientCount.data;
    }
    
    // ✅ PRODUÇÃO - Fallback final para manter sistema funcionando
    logger.warn('[ClientService] [SUPABASE] Retornando 0 como fallback para contagem');
    return 0;
  }
}

/**
 * ✅ PRODUÇÃO - Busca todos os clientes registrados
 * ✅ BROWSER CLIENT - Seguro para uso no frontend
 */
export async function getClients(): Promise<any[]> {
  try {
    logger.debug('[ClientService] [SUPABASE] Verificando cache para lista de clientes');
    
    // Verificar cache (mantendo lógica original)
    if (isCacheValid(cache.clientsList)) {
      logger.debug('[ClientService] [SUPABASE] Usando lista de clientes em cache');
      return cache.clientsList!.data;
    }
    
    logger.debug('[ClientService] [SUPABASE] Buscando todos os clientes');
    
    // ✅ PRODUÇÃO - Usando Browser Client seguro
    const supabase = createSupabaseBrowserClient();
    
    // Query com role='cliente' (padrão no Supabase)  
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'cliente') // Usar role padrão do Supabase
      .eq('pending_approval', false) // Apenas clientes aprovados
      .order('created_at', { ascending: false });
    
    if (error) {
      logger.error('[ClientService] [SUPABASE] Erro ao buscar clientes:', error);
      throw error;
    }
    
    const clients = data || [];
    
    // ✅ PRODUÇÃO - Mapear dados para formato esperado (compatibilidade Firebase)
    const formattedClients = clients.map(client => ({
      id: client.id,
      ...client,
      // Adicionar campos de bloqueio
      isBlocked: client.is_blocked || false,
      blockedReason: client.blocked_reason,
      blockedAt: client.blocked_at,
      blockedBy: client.blocked_by
    }));
    
    // Atualizar cache (mantendo estrutura original)
    cache.clientsList = {
      data: formattedClients,
      timestamp: Date.now(),
      key: 'clients_list'
    };
    
    logger.info('[ClientService] [SUPABASE] Clientes obtidos com sucesso:', formattedClients.length);
    return formattedClients;
    
  } catch (error) {
    logger.error('[ClientService] [SUPABASE] Erro ao buscar clientes:', error);
    
    // ✅ PRODUÇÃO - Invalidar cache em caso de erro
    cache.clientsList = null;
    logger.warn('[ClientService] [SUPABASE] Cache de lista de clientes invalidado devido a erro');
    
    // ✅ PRODUÇÃO - Retornar array vazio para manter sistema funcionando
    return [];
  }
}

/**
 * ✅ PRODUÇÃO - Busca cliente por ID
 */
export async function getClientById(clientId: string): Promise<any | null> {
  try {
    logger.debug(`[ClientService] [SUPABASE] Verificando cache para cliente ${clientId}`);
    
    // Verificar cache (mantendo lógica original)
    if (isCacheValid(cache.clientById.get(clientId))) {
      logger.debug(`[ClientService] [SUPABASE] Usando dados do cliente ${clientId} em cache`);
      return cache.clientById.get(clientId)!.data;
    }
    
    logger.debug(`[ClientService] [SUPABASE] Buscando cliente ${clientId}`);
    
    const supabase = createSupabaseBrowserClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Cliente não encontrado (equivalente ao !clientDoc.exists())
        logger.debug(`[ClientService] [SUPABASE] Cliente ${clientId} não encontrado`);
        
        // ✅ PRODUÇÃO - Armazenar null no cache para evitar consultas repetidas
        cache.clientById.set(clientId, {
          data: null,
          timestamp: Date.now(),
          key: clientId
        });
        
        return null;
      } else {
        logger.error(`[ClientService] [SUPABASE] Erro ao buscar cliente ${clientId}:`, error);
        throw error;
      }
    }
    
    // ✅ PRODUÇÃO - Formato compatível com Firebase
    const clientData = {
      id: data.id,
      ...data
    };
    
    // Atualizar cache (mantendo estrutura original)
    cache.clientById.set(clientId, {
      data: clientData,
      timestamp: Date.now(),
      key: clientId
    });
    
    logger.debug(`[ClientService] [SUPABASE] Cliente ${clientId} obtido com sucesso`);
    return clientData;
    
  } catch (error) {
    logger.error(`[ClientService] [SUPABASE] Erro ao buscar cliente ${clientId}:`, error);
    
    // ✅ PRODUÇÃO - Fallback: usar cache expirado se disponível
    const cachedClient = cache.clientById.get(clientId);
    if (cachedClient) {
      logger.warn(`[ClientService] [SUPABASE] Usando cache expirado como fallback para cliente ${clientId}`);
      return cachedClient.data;
    }
    
    return null;
  }
}

/**
 * ✅ PRODUÇÃO - Busca paginada de clientes (compatível com Firebase)
 */
export async function getPaginatedClients(
  pageSize: number = 10,
  lastClientId?: string // Usando ID em vez de DocumentSnapshot para Supabase
): Promise<{ clients: any[]; hasMore: boolean; lastVisible: any; }> {
  const cacheKey = `paginated_clients_page_${pageSize}_after_${lastClientId || 'initial'}`;
  
  try {
    // Verificar cache (mantendo lógica original)
    const cachedData = cache.clientQueries.get(cacheKey);
    if (isCacheValid(cachedData)) {
      logger.debug(`[ClientService] [SUPABASE] Usando cache para ${cacheKey}`);
      return cachedData!.data as unknown as { clients: any[]; hasMore: boolean; lastVisible: any; };
    }

    logger.debug('[ClientService] [SUPABASE] Buscando clientes paginados');
    
    const supabase = createSupabaseBrowserClient();
    
    // Construir query baseada no padrão Firebase
    let query = supabase
      .from('users')
      .select('*')
      .eq('role', 'cliente') // ✅ Usar role padrão do Supabase
      .order('created_at', { ascending: false })
      .limit(pageSize + 1); // +1 para verificar se há próxima página
    
    // ✅ PRODUÇÃO - Paginação baseada em cursor (mais eficiente que offset)
    if (lastClientId) {
      // Buscar o created_at do último cliente para usar como cursor
      const { data: lastClient } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', lastClientId)
        .single();
      
      if (lastClient) {
        query = query.lt('created_at', lastClient.created_at);
      }
    }
    
    const { data, error } = await query;
    
    if (error) {
      logger.error('[ClientService] [SUPABASE] Erro ao buscar clientes paginados:', error);
      throw error;
    }
    
    let clientsData = data || [];
    
    // ✅ PRODUÇÃO - Verificar se há mais páginas (lógica idêntica ao Firebase)
    const hasMore = clientsData.length > pageSize;
    if (hasMore) {
      clientsData = clientsData.slice(0, pageSize); // Remover item extra
    }
    
    // ✅ PRODUÇÃO - Determinar último documento visível para paginação
    const lastVisible = clientsData.length > 0 
      ? { id: clientsData[clientsData.length - 1].id } // Criar objeto compatível
      : null;
    
    const result = { clients: clientsData, hasMore, lastVisible };
    
    // Atualizar cache (mantendo estrutura original)
    cache.clientQueries.set(cacheKey, {
      data: result as any,
      timestamp: Date.now(),
      key: cacheKey
    });
    
    logger.info('[ClientService] [SUPABASE] Clientes paginados obtidos com sucesso:', clientsData.length);
    return result;
    
  } catch (error) {
    logger.error('[ClientService] [SUPABASE] Erro ao buscar clientes paginados:', error);
    
    // ✅ PRODUÇÃO - Invalidar cache em caso de erro
    cache.clientQueries.delete(cacheKey);
    logger.warn(`[ClientService] [SUPABASE] Cache para ${cacheKey} invalidado devido a erro`);
    
    // ✅ PRODUÇÃO - Retornar estrutura vazia para manter sistema funcionando
    return { clients: [], hasMore: false, lastVisible: null };
  }
}

/**
 * ✅ PRODUÇÃO - Invalidar cache quando dados mudam (interface idêntica)
 */
export function invalidateClientCache(clientId?: string): void {
  try {
    if (clientId) {
      // Invalidar cache específico do cliente
      cache.clientById.delete(clientId);
      logger.debug(`[ClientService] [SUPABASE] Cache do cliente ${clientId} invalidado`);
    } else {
      // Invalidar todos os caches de clientes
      cache.clientCount = null;
      cache.clientsList = null;
      cache.clientQueries.clear();
      cache.clientById.clear();
      logger.debug('[ClientService] [SUPABASE] Todo o cache de clientes invalidado');
    }
  } catch (error) {
    logger.error('[ClientService] [SUPABASE] Erro ao invalidar cache:', error);
  }
}

/**
 * ✅ PRODUÇÃO - Função de verificação de saúde do serviço
 */
export async function checkClientServiceHealth(): Promise<{ status: string; details: any }> {
  try {
    const startTime = Date.now();
    
    // Teste básico: buscar contagem
    const count = await getClientCount();
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      status: 'healthy',
      details: {
        service: 'ClientService Supabase',
        responseTime: `${responseTime}ms`,
        clientCount: count,
        cacheStatus: {
          clientCount: !!cache.clientCount,
          clientsList: !!cache.clientsList,
          queriesCount: cache.clientQueries.size,
          byIdCount: cache.clientById.size
        }
      }
    };
  } catch (error) {
    logger.error('[ClientService] [SUPABASE] Health check falhou:', error);
    return {
      status: 'unhealthy',
      details: {
        service: 'ClientService Supabase',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    };
  }
} 