/**
 * @file queries.ts
 * @description Consultas especializadas para projetos.
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  limit as firestoreLimit,
  getCountFromServer,
  Firestore,
  CollectionReference,
  DocumentData,
  QueryConstraint,
  Timestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project } from '@/types/project';
import { GetProjectsOptions, ProjectSearchResult } from './types';
import { mapTimelineEvent, mapComment, normalizeStatus } from './helpers';
import logger from '@/lib/utils/logger';

// Configuração básica
const firestore: Firestore = db;
const projectsCollection = collection(firestore, 'projects') as CollectionReference<DocumentData>;

// Helper function para formatação de data (similar à de useProjects.ts)
const formatDate = (date: any): string => {
  if (!date) return ''; // Retornar string vazia se a data for nula/undefined para evitar 'N/A' direto
  if (date instanceof Timestamp) return date.toDate().toISOString();
  if (typeof date === 'string') {
    // Tentar parsear para garantir que é uma data válida antes de retornar, ou retornar como está se for um formato já aceitável
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    return date; // Retorna a string original se não puder ser parseada como data válida (pode ser um formato já ok)
  }
  if (date instanceof Date) return date.toISOString();
  // Se for um objeto com segundos e nanossegundos (formato comum do Firestore antes de converter para Timestamp)
  if (typeof date === 'object' && date !== null && typeof date.seconds === 'number' && typeof date.nanoseconds === 'number') {
    return new Timestamp(date.seconds, date.nanoseconds).toDate().toISOString();
  }
  logger.warn('Formato de data desconhecido recebido em formatDate:', date);
  return ''; // Ou lançar um erro, ou retornar um valor padrão mais explícito como 'Data Inválida'
};

// Sistema de cache avançado
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

// Configurações de cache
const CACHE_TTL = 60000; // 1 minuto
const PROJECT_COUNT_TTL = 300000; // 5 minutos
const PROJECTS_CACHE_TTL = 120000; // 2 minutos

// Estrutura de cache
const cache = {
  projectCount: null as CacheEntry<number> | null,
  projectsQueries: new Map<string, CacheEntry<Project[]>>(),
  projectById: new Map<string, CacheEntry<Project | null>>()
};

/**
 * Gera uma chave de cache com base nas opções de consulta
 * @param options Opções de consulta
 * @returns Chave única para o cache
 */
function generateCacheKey(options: GetProjectsOptions = {}): string {
  return JSON.stringify({
    userId: options.userId || '',
    isAdmin: !!options.isAdmin,
    status: options.status || '',
    orderByField: options.orderByField || 'updatedAt',
    orderDirection: options.orderDirection || 'desc',
    limit: options.limit || 0,
    startAfter: options.startAfter || null,
    searchTerm: options.searchTerm || ''
  });
}

/**
 * Verifica se um item do cache ainda é válido
 * @param entry Entrada do cache
 * @param ttl Tempo de vida (ms)
 * @returns true se válido, false se expirado
 */
function isCacheValid<T>(entry: CacheEntry<T> | null, ttl: number = CACHE_TTL): boolean {
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

/**
 * Limpa o cache com mais de 1 hora
 * Chamado periodicamente para evitar acúmulo de memória
 */
function cleanupCache(): void {
  const now = Date.now();
  const MAX_AGE = 3600000; // 1 hora
  
  // Limpar cache de projetos por ID
  cache.projectById.forEach((entry, id) => {
    if (now - entry.timestamp > MAX_AGE) {
      cache.projectById.delete(id);
    }
  });
  
  // Limpar cache de consultas
  cache.projectsQueries.forEach((entry, key) => {
    if (now - entry.timestamp > MAX_AGE) {
      cache.projectsQueries.delete(key);
    }
  });
}

// Configurar limpeza periódica do cache (a cada 30 minutos)
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 1800000);
}

/**
 * Obtém o número total de projetos no sistema
 * @returns Número total de projetos
 */
export const getProjectCount = async (): Promise<number> => {
  try {
    logger.debug('Verificando cache para contagem de projetos');
    
    // Checar cache
    if (isCacheValid(cache.projectCount, PROJECT_COUNT_TTL)) {
      logger.debug('Usando contagem de projetos em cache');
      return cache.projectCount!.data;
    }
    
    logger.debug('Cache expirado ou inexistente para contagem de projetos, buscando nova contagem');
    
    // Executar contagem
    const snapshot = await getCountFromServer(projectsCollection);
    const count = snapshot.data().count;
    
    // Atualizar cache
    cache.projectCount = { 
      data: count, 
      timestamp: Date.now(),
      key: 'project_count'
    };
    
    logger.debug(`Contagem de projetos atualizada: ${count}`);
    return count;
  } catch (error) {
    logger.error('Erro ao obter contagem de projetos:', error);
    // Se há cache, mesmo expirado, usar como fallback
    if (cache.projectCount) {
      logger.warn('Usando cache expirado como fallback para contagem de projetos');
      return cache.projectCount.data;
    }
    return 0;
  }
};

/**
 * Obtém projetos com base em opções de filtro
 * @param options Opções de consulta
 * @returns Lista de projetos que correspondem aos filtros
 */
export const getProjects = async (options: GetProjectsOptions = {}): Promise<Project[]> => {
  try {
    const cacheKey = generateCacheKey(options);
    logger.debug('Buscando projetos com filtros', { ...options, cacheKey });
    
    // Verificar cache
    const cachedProjects = cache.projectsQueries.get(cacheKey);
    if (isCacheValid(cachedProjects, PROJECTS_CACHE_TTL)) {
      logger.debug(`Usando dados em cache para consulta: ${cacheKey}`);
      return cachedProjects!.data;
    }
    
    logger.debug('Cache expirado ou inexistente, executando consulta ao Firestore');
    
    const constraints: QueryConstraint[] = [];
    
    // Filtrar por usuário se não for admin
    if (options.userId && !options.isAdmin) {
      constraints.push(where('userId', '==', options.userId));
    }
    
    // Filtrar por status se especificado
    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }
    
    // Definir ordenação
    const orderField = options.orderByField || 'updatedAt';
    const orderDir = options.orderDirection || 'desc';
    constraints.push(orderBy(orderField, orderDir));
    
    // Aplicar limite se especificado
    if (options.limit && options.limit > 0) {
      constraints.push(firestoreLimit(options.limit));
    }
    
    // Criar e executar a consulta
    const projectsQuery = query(projectsCollection, ...constraints);
    const projectsSnapshot = await getDocs(projectsQuery);
    
    // Mapear documentos para objetos de projeto
    const projects: Project[] = [];
    
    for (const doc of projectsSnapshot.docs) {
      let docData: DocumentData | null = null;
      try {
        docData = doc.data();

        const project: Project = {
          id: doc.id,
          userId: docData.userId || '', 
          name: docData.name || '', 
          number: docData.numero_projeto || docData.number || docData.projectNumber || 'N/A',
          empresaIntegradora: docData.empresa_integradora || docData.empresaIntegradora || 'N/A',
          nomeClienteFinal: docData.nome_cliente_final || docData.nomeClienteFinal || 'N/A',
          distribuidora: docData.distribuidora_nome || docData.distribuidora || 'N/A',
          potencia: docData.potencia_kwp || docData.potenciaKWP || docData.potencia || 0, 
          dataEntrega: formatDate(docData.data_entrega || docData.dataEntrega), 
          status: normalizeStatus(docData.status || 'Não Iniciado'),
          prioridade: docData.prioridade || 'Baixa',
          valorProjeto: typeof docData.valorProjeto === 'number' ? docData.valorProjeto : null,
          pagamento: docData.pagamento || undefined,
          
          createdAt: formatDate(docData.createdAt || new Date()), 
          updatedAt: formatDate(docData.updatedAt || new Date()), 
          
          adminResponsibleId: docData.adminResponsibleId, 
          adminResponsibleName: docData.adminResponsibleName,
          adminResponsibleEmail: docData.adminResponsibleEmail,
          adminResponsiblePhone: docData.adminResponsiblePhone,
          
          timelineEvents: Array.isArray(docData.timelineEvents) ? docData.timelineEvents.map(event => mapTimelineEvent(event)) : [],
          documents: Array.isArray(docData.documents) ? docData.documents : [], 
          files: Array.isArray(docData.files) ? docData.files : [], 
          comments: Array.isArray(docData.comments) ? docData.comments.map(comment => mapComment(comment)) : [],
        };
        
        let potenciaValue = 0;
        if (typeof docData.potencia_kwp === 'number') potenciaValue = docData.potencia_kwp;
        else if (typeof docData.potenciaKWP === 'number') potenciaValue = docData.potenciaKWP;
        else if (typeof docData.potencia === 'number') potenciaValue = docData.potencia;
        else if (typeof docData.power === 'number') potenciaValue = docData.power; 
        project.potencia = potenciaValue;

        projects.push(project);
      } catch (mapError: any) {
        logger.error(`Erro ao mapear projeto ${doc.id} na consulta principal: ${mapError.message}`, { 
          documentId: doc.id, 
          rawData: docData, // Usar docData que foi declarado no escopo do loop
          error: mapError,
          stack: mapError.stack
        });
        // Decidir não adicionar o projeto se o mapeamento falhar para evitar dados inconsistentes
      }
    }
    
    // Atualizar cache
    cache.projectsQueries.set(cacheKey, {
      data: projects,
      timestamp: Date.now(),
      key: cacheKey
    });
    
    logger.debug(`Obtidos ${projects.length} projetos, cache atualizado`);
    return projects;
  } catch (error) {
    logger.error('Erro ao buscar projetos:', error);
    
    // Se há cache, mesmo expirado, usar como fallback
    const cachedProjects = cache.projectsQueries.get(generateCacheKey(options));
    if (cachedProjects) {
      logger.warn('Usando cache expirado como fallback para projetos');
      return cachedProjects.data;
    }
    
    return [];
  }
};

/**
 * Obtém um projeto específico pelo ID
 * @param projectId ID do projeto
 * @returns Projeto ou null se não encontrado
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    // Verificar cache
    const cachedProject = cache.projectById.get(projectId);
    if (isCacheValid(cachedProject)) {
      logger.debug(`Usando dados em cache para projeto ${projectId}`);
      return cachedProject!.data;
    }
    
    logger.debug(`Buscando detalhes do projeto ${projectId}`);
    
    // Buscar do Firestore
    const docRef = doc(projectsCollection, projectId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      logger.debug(`Projeto ${projectId} não encontrado`);
      
      // Atualizar cache com null para evitar consultas repetidas para IDs inexistentes
      cache.projectById.set(projectId, {
        data: null,
        timestamp: Date.now(),
        key: projectId
      });
      
      return null;
    }
    
    const data = docSnap.data();
    const project: Project = {
      id: docSnap.id,
      // Campos obrigatórios com valores padrão
      title: data.title || '',
      description: data.description || '',
      status: normalizeStatus(data.status),
      userId: data.userId || '',
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || data.createdAt || null,
      priority: data.priority || 'medium',
      categoria: data.categoria || 'default',
      timeline: (data.timeline || []).map(mapTimelineEvent),
      comments: (data.comments || []).map(mapComment),
      userName: data.userName || 'Usuário',
      // Campos opcionais
      dueDate: data.dueDate || null,
      tags: data.tags || [],
      assignedTo: data.assignedTo || null,
      metadata: data.metadata || {},
      attachments: data.attachments || [],
      history: data.history || [],
    } as unknown as Project; // Type assertion necessária devido à complexidade do tipo
    
    // Atualizar cache
    cache.projectById.set(projectId, {
      data: project,
      timestamp: Date.now(),
      key: projectId
    });
    
    logger.debug(`Detalhes do projeto ${projectId} obtidos e armazenados em cache`);
    return project;
  } catch (error) {
    logger.error(`Erro ao buscar projeto ${projectId}:`, error);
    
    // Se há cache, mesmo expirado, usar como fallback
    const cachedProject = cache.projectById.get(projectId);
    if (cachedProject) {
      logger.warn(`Usando cache expirado como fallback para projeto ${projectId}`);
      return cachedProject.data;
    }
    
    return null;
  }
};

/**
 * Busca projetos com paginação e opções avançadas
 * @param options Opções de consulta
 * @returns Resultado da pesquisa paginada
 */
export const searchProjects = async (options: GetProjectsOptions = {}): Promise<ProjectSearchResult> => {
  try {
    logger.debug('Executando busca paginada de projetos', options);
    
    const constraints: QueryConstraint[] = [];
    
    // Adicionar filtros conforme necessário
    if (options.userId && !options.isAdmin) {
      constraints.push(where('userId', '==', options.userId));
    }
    
    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }
    
    // Definir ordenação
    const orderField = options.orderByField || 'updatedAt';
    const orderDir = options.orderDirection || 'desc';
    constraints.push(orderBy(orderField, orderDir));
    
    // Criar a consulta
    let projectsQuery = query(projectsCollection, ...constraints);
    
    // Aplicar limite
    const limitValue = options.limit || 10;
    
    // Resultado final
    const result: ProjectSearchResult = {
      projects: [],
      lastVisible: null,
      hasMore: false
    };
    
    // Executar a consulta
    const snapshot = await getDocs(projectsQuery);
    
    if (snapshot.docs.length > 0) {
      // Processar documentos
      result.projects = snapshot.docs
        .slice(0, limitValue)
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            // Campos do projeto com valores padrão
            title: data.title || '',
            description: data.description || '',
            status: normalizeStatus(data.status),
            userId: data.userId || '',
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null,
            priority: data.priority || 'medium',
            categoria: data.categoria || 'default',
            timeline: (data.timeline || []).map(mapTimelineEvent),
            comments: (data.comments || []).map(mapComment),
            userName: data.userName || 'Usuário',
            // Campos opcionais
            dueDate: data.dueDate || null,
            tags: data.tags || [],
            assignedTo: data.assignedTo || null,
            metadata: data.metadata || {},
            attachments: data.attachments || [],
            history: data.history || [],
          } as unknown as Project;
        });
      
      // Verificar se há mais resultados
      result.hasMore = snapshot.docs.length > limitValue;
      
      // Salvar o último documento para paginação
      if (result.hasMore) {
        result.lastVisible = snapshot.docs[limitValue - 1];
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Erro ao buscar projetos com paginação:', error);
    return { projects: [], lastVisible: null, hasMore: false };
  }
};

/**
 * Limpa o cache específico de um projeto (usado após atualizações)
 * @param projectId ID do projeto a ser removido do cache
 */
export const invalidateProjectCache = (projectId: string): void => {
  logger.debug(`Invalidando cache para projeto ${projectId}`);
  cache.projectById.delete(projectId);
  
  // Também precisamos invalidar consultas que podem incluir este projeto
  // Isso é mais complicado porque não sabemos quais consultas incluem o projeto
  // então vamos invalidar todas as consultas que não são muito específicas
  cache.projectsQueries.forEach((entry, key) => {
    try {
      const options = JSON.parse(key);
      // Se não tiver um limite específico ou o limite for grande
      // ou se não tiver um filtro específico de status, invalidar
      if (!options.limit || options.limit > 10 || !options.status) {
        cache.projectsQueries.delete(key);
      }
    } catch (e) {
      // Se não conseguir analisar a chave, apenas ignorar
      logger.warn(`Erro ao analisar chave de cache: ${key}`, e);
    }
  });
  
  logger.debug('Cache de projetos invalidado');
};

/**
 * Limpa todo o cache de projetos (usado após operações que podem afetar múltiplos projetos)
 */
export const clearProjectsCache = (): void => {
  logger.debug('Limpando todo o cache de projetos');
  cache.projectById.clear();
  cache.projectsQueries.clear();
  cache.projectCount = null;
};

// Reexportar funções auxiliares para uso em outros módulos
export { mapTimelineEvent, mapComment, normalizeStatus };

/**
 * Verifica se um número de projeto já está em uso
 * @param projectNumber Número do projeto para verificar
 * @returns true se o número já estiver em uso, false caso contrário
 */
export const isProjectNumberAlreadyUsed = async (projectNumber: string): Promise<boolean> => {
  try {
    logger.debug(`Verificando se número de projeto já está em uso: ${projectNumber}`);
    
    const projectQuery = query(
      projectsCollection,
      where('number', '==', projectNumber),
      firestoreLimit(1)
    );
    
    const snapshot = await getDocs(projectQuery);
    const isUsed = !snapshot.empty;
    
    logger.debug(`Número ${projectNumber} ${isUsed ? 'já está em uso' : 'está disponível'}`);
    return isUsed;
  } catch (error) {
    logger.error(`Erro ao verificar número de projeto: ${error}`);
    // Em caso de erro, presumir que o número está em uso por segurança
    return true;
  }
};

/**
 * Procura um projeto pelo número
 * @param projectNumber Número do projeto
 * @returns O projeto encontrado ou null se não existir
 */
export const findProjectByNumber = async (projectNumber: string): Promise<Project | null> => {
  try {
    logger.debug(`Buscando projeto pelo número: ${projectNumber}`);
    
    const projectQuery = query(
      projectsCollection,
      where('number', '==', projectNumber),
      firestoreLimit(1)
    );
    
    const snapshot = await getDocs(projectQuery);
    
    if (snapshot.empty) {
      logger.debug(`Nenhum projeto encontrado com o número: ${projectNumber}`);
      return null;
    }
    
    const doc = snapshot.docs[0];
    const projectData = doc.data();
    
    const project: Project = {
      id: doc.id,
      ...projectData,
      // Converter timestamps em strings ISO
      createdAt: projectData.createdAt instanceof Timestamp 
        ? projectData.createdAt.toDate().toISOString() 
        : projectData.createdAt,
      updatedAt: projectData.updatedAt instanceof Timestamp 
        ? projectData.updatedAt.toDate().toISOString() 
        : projectData.updatedAt,
      // Normalizar status
      status: normalizeStatus(projectData.status)
    } as Project;
    
    // Processar timeline events e comments para a visualização completa
    if (projectData.timelineEvents && Array.isArray(projectData.timelineEvents)) {
      project.timelineEvents = projectData.timelineEvents
        .map((event: any) => mapTimelineEvent(event))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } else {
      project.timelineEvents = [];
    }
    
    if (projectData.comments && Array.isArray(projectData.comments)) {
      project.comments = projectData.comments
        .map(mapComment)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      project.comments = [];
    }
    
    logger.debug(`Projeto encontrado: ${doc.id}, número: ${projectNumber}`);
    return project;
  } catch (error) {
    logger.error(`Erro ao buscar projeto pelo número: ${error}`);
    throw error;
  }
}; 