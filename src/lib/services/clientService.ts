import { 
  collection, 
  query, 
  where, 
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import logger from '@/lib/utils/logger';

// Sistema de cache para clientes
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

// Configurações de cache
const CLIENT_CACHE_TTL = 300000; // 5 minutos
const CLIENT_COUNT_CACHE_TTL = 600000; // 10 minutos

// Estrutura de cache
const cache = {
  clientCount: null as CacheEntry<number> | null,
  clientsList: null as CacheEntry<any[]> | null,
  clientQueries: new Map<string, CacheEntry<any[]>>(),
  clientById: new Map<string, CacheEntry<any>>()
};

/**
 * Verifica se um item do cache ainda é válido
 * @param entry Entrada do cache
 * @param ttl Tempo de vida (ms)
 * @returns true se válido, false se expirado
 */
function isCacheValid<T>(entry: CacheEntry<T> | null, ttl: number = CLIENT_CACHE_TTL): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * Limpa o cache com mais de 30 minutos
 * Chamado periodicamente para evitar acúmulo de memória
 */
function cleanupCache(): void {
  const now = Date.now();
  const MAX_AGE = 1800000; // 30 minutos
  
  // Limpar caches
  if (cache.clientCount && now - cache.clientCount.timestamp > MAX_AGE) {
    cache.clientCount = null;
  }
  
  if (cache.clientsList && now - cache.clientsList.timestamp > MAX_AGE) {
    cache.clientsList = null;
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
}

// Configurar limpeza periódica do cache (a cada 15 minutos)
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 900000);
}

/**
 * Get the count of registered clients
 * @returns Promise<number> The count of registered clients
 */
export async function getClientCount(): Promise<number> {
  try {
    logger.debug('[ClientService] Verificando cache para contagem de clientes');
    
    // Verificar cache
    if (isCacheValid(cache.clientCount, CLIENT_COUNT_CACHE_TTL)) {
      logger.debug('[ClientService] Usando contagem de clientes em cache');
      return cache.clientCount!.data;
    }
    
    logger.debug('[ClientService] Iniciando contagem de clientes');
    
    // Query for users with role 'user' (clients)
    const clientQuery = query(
      collection(db, 'users'),
      where('role', '==', 'user'),
      where('pendingApproval', '==', false)
    );
    
    // Get count from server
    logger.debug('[ClientService] Executando getCountFromServer...');
    const snapshot = await getCountFromServer(clientQuery);
    const count = snapshot.data().count;
    
    // Atualizar cache
    cache.clientCount = {
      data: count,
      timestamp: Date.now(),
      key: 'client_count'
    };
    
    logger.debug('[ClientService] Contagem de clientes obtida com sucesso:', count);
    return count;
  } catch (error) {
    logger.error('[ClientService] Erro ao obter contagem de clientes:', error);
    
    // Se há cache, mesmo expirado, usar como fallback
    if (cache.clientCount) {
      logger.warn('[ClientService] Usando cache expirado como fallback para contagem');
      return cache.clientCount.data;
    }
    
    return 0;
  }
}

/**
 * Get all registered clients
 * @returns Promise<any[]> Array of client objects
 */
export async function getClients(): Promise<any[]> {
  try {
    logger.debug('[ClientService] Verificando cache para lista de clientes');
    
    // Verificar cache
    if (isCacheValid(cache.clientsList)) {
      logger.debug('[ClientService] Usando lista de clientes em cache');
      return cache.clientsList!.data;
    }
    
    logger.debug('[ClientService] Buscando todos os clientes');
    
    const clientQuery = query(
      collection(db, 'users'),
      where('role', '==', 'user'),
      where('pendingApproval', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(clientQuery);
    const clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    cache.clientsList = {
      data: clients,
      timestamp: Date.now(),
      key: 'clients_list'
    };
    
    logger.debug('[ClientService] Clientes obtidos com sucesso:', clients.length);
    return clients;
  } catch (error) {
    logger.error('[ClientService] Erro ao buscar clientes:', error);
    cache.clientsList = null; 
    logger.warn('[ClientService] Cache de lista de clientes invalidado devido a erro.');
    return [];
  }
}

/**
 * Get client by ID
 * @param clientId Client ID
 * @returns Promise<any> Client data or null if not found
 */
export async function getClientById(clientId: string): Promise<any | null> {
  try {
    logger.debug(`[ClientService] Verificando cache para cliente ${clientId}`);
    
    // Verificar cache
    if (isCacheValid(cache.clientById.get(clientId))) {
      logger.debug(`[ClientService] Usando dados do cliente ${clientId} em cache`);
      return cache.clientById.get(clientId)!.data;
    }
    
    logger.debug(`[ClientService] Buscando cliente ${clientId}`);
    
    const clientDoc = await getDoc(doc(db, 'users', clientId));
    
    if (!clientDoc.exists()) {
      logger.debug(`[ClientService] Cliente ${clientId} não encontrado`);
      
      // Armazenar null no cache para evitar consultas repetidas para clientes inexistentes
      cache.clientById.set(clientId, {
        data: null,
        timestamp: Date.now(),
        key: clientId
      });
      
      return null;
    }
    
    const clientData = {
      id: clientDoc.id,
      ...clientDoc.data()
    };
    
    // Atualizar cache
    cache.clientById.set(clientId, {
      data: clientData,
      timestamp: Date.now(),
      key: clientId
    });
    
    logger.debug(`[ClientService] Cliente ${clientId} obtido com sucesso`);
    return clientData;
  } catch (error) {
    logger.error(`[ClientService] Erro ao buscar cliente ${clientId}:`, error);
    
    // Se há cache, mesmo expirado, usar como fallback
    const cachedClient = cache.clientById.get(clientId);
    if (cachedClient) {
      logger.warn(`[ClientService] Usando cache expirado como fallback para cliente ${clientId}`);
      return cachedClient.data;
    }
    
    return null;
  }
}

/**
 * Get paginated list of clients with 'user' role and not pending approval
 * @param pageSize Number of clients per page
 * @param startAfterDoc The last document from the previous page (for pagination)
 * @returns Promise<{ clients: any[], hasMore: boolean, lastVisible: any }> Paginated client data
 */
export async function getPaginatedClients(
  pageSize: number = 10, 
  startAfterDoc?: any // Firebase DocumentSnapshot
): Promise<{ clients: any[]; hasMore: boolean; lastVisible: any; }> {
  const cacheKey = `paginated_clients_page_${pageSize}_after_${startAfterDoc?.id || 'initial'}`;
  
  // Check cache
  const cachedData = cache.clientQueries.get(cacheKey);
  if (isCacheValid(cachedData)) {
    logger.debug(`[ClientService] Usando cache para ${cacheKey}`);
    // Correct type assertion
    return cachedData!.data as unknown as { clients: any[]; hasMore: boolean; lastVisible: any; };
  }

  try {
    logger.debug('[ClientService] Buscando clientes paginados');
    let firestoreQuery;

    const baseQuery = [
      where('role', '==', 'user'),
      where('pendingApproval', '==', false),
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1) // Fetch one extra to check if there's a next page
    ];

    if (startAfterDoc) {
      firestoreQuery = query(
        collection(db, 'users'),
        ...baseQuery,
        startAfter(startAfterDoc)
      );
    } else {
      firestoreQuery = query(
        collection(db, 'users'),
        ...baseQuery
      );
    }

    const snapshot = await getDocs(firestoreQuery);
    
    let clientsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as object) // Ensure doc.data() is treated as object for spread
    }));

    const hasMore = clientsData.length > pageSize;
    if (hasMore) {
      clientsData = clientsData.slice(0, pageSize); // Remove the extra item
    }
    
    // Determine the last visible document for pagination
    const lastVisible = snapshot.docs.length > 0 
      ? snapshot.docs[clientsData.length -1] // last doc of current page
      : null;

    const result = { clients: clientsData, hasMore, lastVisible };
    
    // Update cache
    cache.clientQueries.set(cacheKey, {
      // Ensure the data stored in cache conforms to CacheEntry<any[]>
      // For simplicity, we'll cache the result object directly, but this might need adjustment
      // if CacheEntry<any[]> is strictly enforced elsewhere for this map.
      // For now, we assume `data: result` is acceptable for `CacheEntry<any[]>` due to `any`.
      data: result as any, // Using `as any` for cache compatibility for now.
      timestamp: Date.now(),
      key: cacheKey
    });
    
    logger.debug('[ClientService] Clientes paginados obtidos com sucesso:', clientsData.length);
    return result;
  } catch (error) {
    logger.error('[ClientService] Erro ao buscar clientes paginados:', error);
    cache.clientQueries.delete(cacheKey);
    logger.warn(`[ClientService] Cache para ${cacheKey} invalidado devido a erro.`);
    
    return { clients: [], hasMore: false, lastVisible: null };
  }
}

/**
 * Invalidate client cache when data changes
 * @param clientId Optional client ID to invalidate specific client
 */
export function invalidateClientCache(clientId?: string): void {
  if (clientId) {
    // Invalidar cache específico do cliente
    cache.clientById.delete(clientId);
    logger.debug(`[ClientService] Cache do cliente ${clientId} invalidado`);
  } else {
    // Invalidar todos os caches de clientes
    cache.clientCount = null;
    cache.clientsList = null;
    cache.clientQueries.clear();
    cache.clientById.clear();
    logger.debug('[ClientService] Todo o cache de clientes invalidado');
  }
}
