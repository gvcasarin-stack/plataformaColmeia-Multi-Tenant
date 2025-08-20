/**
 * @file supabase.ts
 * @description Serviços de projetos usando Supabase
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Project } from '@/types/project';
import logger from '@/lib/utils/logger';

// Cliente Supabase para operações no browser
const supabase = createSupabaseBrowserClient();

/**
 * Busca um projeto específico por ID
 * @param projectId ID do projeto
 * @param userId ID do usuário (para verificação de permissão)
 * @returns Projeto ou null se não encontrado
 */
export const getProjectById = async (projectId: string, userId: string): Promise<Project | null> => {
  try {
    logger.debug('[getProjectById] Buscando projeto:', { projectId, userId });

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('created_by', userId) // Garantir que o usuário só vê seus próprios projetos
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('[getProjectById] Projeto não encontrado:', projectId);
        return null;
      }
      throw error;
    }

    if (!data) {
      logger.warn('[getProjectById] Nenhum dado retornado para projeto:', projectId);
      return null;
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear dados do Supabase para o formato Project
    const project: Project = {
      id: data.id,
      userId: data.created_by,
      name: data.name,
      number: data.number,
      empresaIntegradora: data.empresa_integradora || '',
      nomeClienteFinal: data.nome_cliente_final || '',
      distribuidora: data.distribuidora || '',
      potencia: data.potencia || 0,
      dataEntrega: data.data_entrega || '',
      status: data.status || 'Não Iniciado',
      prioridade: data.prioridade || 'Baixa',
      valorProjeto: data.valor_projeto || null,
      pagamento: data.pagamento || undefined,
  
      createdAt: sanitizeDate(data.created_at),
      updatedAt: sanitizeDate(data.updated_at),
      adminResponsibleId: data.admin_responsible_id,
      adminResponsibleName: data.admin_responsible_name,
      adminResponsibleEmail: data.admin_responsible_email,
      adminResponsiblePhone: data.admin_responsible_phone,
      timelineEvents: data.timeline_events || [],
      documents: data.documents || [],
      files: data.files || [],
      comments: data.comments || [],
      history: data.history || [],
      lastUpdateBy: data.last_update_by || undefined,
    };

    logger.debug('[getProjectById] Projeto encontrado:', { id: project.id, name: project.name });
    return project;

  } catch (error) {
    logger.error('[getProjectById] Erro ao buscar projeto:', error);
    throw new Error(`Erro ao buscar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Busca projetos de um usuário
 * @param userId ID do usuário
 * @returns Lista de projetos do usuário
 */
export const getProjectsByUserId = async (userId: string): Promise<Project[]> => {
  try {
    logger.debug('[getProjectsByUserId] Buscando projetos do usuário:', userId);

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      logger.debug('[getProjectsByUserId] Nenhum projeto encontrado para usuário:', userId);
      return [];
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear dados do Supabase para o formato Project
    const projects: Project[] = data.map(item => ({
      id: item.id,
      userId: item.created_by,
      name: item.name,
      number: item.number,
      empresaIntegradora: item.empresa_integradora || '',
      nomeClienteFinal: item.nome_cliente_final || '',
      distribuidora: item.distribuidora || '',
      potencia: item.potencia || 0,
      dataEntrega: item.data_entrega || '',
      status: item.status || 'Não Iniciado',
      prioridade: item.prioridade || 'Baixa',
      valorProjeto: item.valor_projeto || null,
      pagamento: item.pagamento || undefined,
  
      createdAt: sanitizeDate(item.created_at),
      updatedAt: sanitizeDate(item.updated_at),
      adminResponsibleId: item.admin_responsible_id,
      adminResponsibleName: item.admin_responsible_name,
      adminResponsibleEmail: item.admin_responsible_email,
      adminResponsiblePhone: item.admin_responsible_phone,
      timelineEvents: item.timeline_events || [],
      documents: item.documents || [],
      files: item.files || [],
      comments: item.comments || [],
      history: item.history || [],
      lastUpdateBy: item.last_update_by || undefined,
    }));

    logger.debug('[getProjectsByUserId] Projetos encontrados:', projects.length);
    return projects;

  } catch (error) {
    logger.error('[getProjectsByUserId] Erro ao buscar projetos do usuário:', error);
    throw new Error(`Erro ao buscar projetos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Escuta mudanças em tempo real de um projeto específico
 * @param projectId ID do projeto
 * @param userId ID do usuário (para verificação de permissão)
 * @param callback Função chamada quando há mudanças
 * @returns Função para cancelar a escuta
 */
export const subscribeToProject = (
  projectId: string,
  userId: string,
  callback: (project: Project | null) => void
): (() => void) => {
  logger.debug('[subscribeToProject] Iniciando escuta em tempo real:', { projectId, userId });

  const channel = supabase
    .channel(`project-${projectId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `id=eq.${projectId}`,
      },
      async (payload) => {
        logger.debug('[subscribeToProject] Mudança detectada:', payload);

        if (payload.eventType === 'DELETE') {
          callback(null);
          return;
        }

        // Verificar se o projeto pertence ao usuário
        if (payload.new && payload.new.created_by === userId) {
          try {
            const project = await getProjectById(projectId, userId);
            callback(project);
          } catch (error) {
            logger.error('[subscribeToProject] Erro ao buscar projeto atualizado:', error);
            callback(null);
          }
        }
      }
    )
    .subscribe();

  // Retornar função para cancelar a escuta
  return () => {
    logger.debug('[subscribeToProject] Cancelando escuta em tempo real:', projectId);
    supabase.removeChannel(channel);
  };
};

/**
 * Busca projetos com filtros (para uso futuro)
 * @param filters Filtros de busca
 * @returns Lista de projetos filtrados
 */
export const getProjectsWithFilters = async (filters: {
  userId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Project[]> => {
  try {
    logger.debug('[getProjectsWithFilters] Buscando projetos com filtros:', filters);

    let query = supabase
      .from('projects')
      .select('*');

    if (filters.userId) {
      query = query.eq('created_by', filters.userId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // ✅ CORREÇÃO REACT #130: Sanitizar campos de data do Supabase
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    // Mapear dados do Supabase para o formato Project
    const projects: Project[] = data.map(item => ({
      id: item.id,
      userId: item.created_by,
      name: item.name,
      number: item.number,
      empresaIntegradora: item.empresa_integradora || '',
      nomeClienteFinal: item.nome_cliente_final || '',
      distribuidora: item.distribuidora || '',
      potencia: item.potencia || 0,
      dataEntrega: item.data_entrega || '',
      status: item.status || 'Não Iniciado',
      prioridade: item.prioridade || 'Baixa',
      valorProjeto: item.valor_projeto || null,
      pagamento: item.pagamento || undefined,
  
      createdAt: sanitizeDate(item.created_at),
      updatedAt: sanitizeDate(item.updated_at),
      adminResponsibleId: item.admin_responsible_id,
      adminResponsibleName: item.admin_responsible_name,
      adminResponsibleEmail: item.admin_responsible_email,
      adminResponsiblePhone: item.admin_responsible_phone,
      timelineEvents: item.timeline_events || [],
      documents: item.documents || [],
      files: item.files || [],
      comments: item.comments || [],
      history: item.history || [],
      lastUpdateBy: item.last_update_by || undefined,
    }));

    logger.debug('[getProjectsWithFilters] Projetos encontrados:', projects.length);
    return projects;

  } catch (error) {
    logger.error('[getProjectsWithFilters] Erro ao buscar projetos com filtros:', error);
    throw new Error(`Erro ao buscar projetos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}; 