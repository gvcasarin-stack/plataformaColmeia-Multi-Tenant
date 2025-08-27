/**
 * @file supabase.ts
 * @description Serviços de projetos usando Supabase
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { Project } from '@/types/project';
import logger from '@/lib/utils/logger';

// ✅ CORREÇÃO CRÍTICA: Detectar se está no servidor ou browser e usar cliente apropriado
function getSupabaseClient() {
  // Verificar se está no ambiente servidor (Node.js)
  if (typeof window === 'undefined') {
    // Servidor: usar Service Role Client com permissões completas
    return createSupabaseServiceRoleClient();
  } else {
    // Browser: usar Browser Client com autenticação do usuário
    return createSupabaseBrowserClient();
  }
}

/**
 * Busca um projeto específico por ID
 * @param projectId ID do projeto
 * @param userId ID do usuário (para verificação de permissão)
 * @returns Projeto ou null se não encontrado
 */
export const getProjectById = async (projectId: string, userId: string): Promise<Project | null> => {
  try {
    logger.debug('[getProjectById] Buscando projeto:', { projectId, userId });

    const supabase = getSupabaseClient(); // ✅ Obter cliente dinamicamente
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
      nome_cliente_final: data.nome_cliente_final,
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

    logger.debug('[getProjectById] Projeto encontrado:', { id: project.id, nome_cliente_final: project.nome_cliente_final });
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

    const supabase = getSupabaseClient(); // ✅ Obter cliente dinamicamente
    
    // ✅ SEGURANÇA MULTI-TENANT: Obter tenant_id do usuário primeiro
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();

    if (userError || !userData?.tenant_id) {
      logger.error('[getProjectsByUserId] Erro ao obter tenant do usuário:', userError);
      return [];
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('created_by', userId)
      .eq('tenant_id', userData.tenant_id) // ✅ CRÍTICO: Filtrar por tenant
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
      nome_cliente_final: item.nome_cliente_final,
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
  tenantId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Project[]> => {
  try {
    logger.debug('[getProjectsWithFilters] Buscando projetos com filtros:', filters);

    const supabase = getSupabaseClient(); // ✅ Obter cliente dinamicamente
    let query = supabase
      .from('projects')
      .select('*');

    if (filters.userId) {
      query = query.eq('created_by', filters.userId);
    }

    // ✅ SEGURANÇA MULTI-TENANT: Filtrar por tenant se fornecido
    if (filters.tenantId) {
      query = query.eq('tenant_id', filters.tenantId);
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
      nome_cliente_final: item.nome_cliente_final,
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

/**
 * Função para compatibilidade com código existente - alias para getProjectById
 * @param projectId ID do projeto
 * @returns Projeto ou null se não encontrado
 */
export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    logger.debug('[getProject] Buscando projeto (compatibility alias):', projectId);
    
    const supabase = getSupabaseClient(); // ✅ Obter cliente dinamicamente
    
    // Para manter compatibilidade, buscar sem verificação de userId
    // Mas ainda filtrando por tenant via RLS
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('[getProject] Projeto não encontrado:', projectId);
        return null;
      }
      throw error;
    }

    if (!data) return null;

    // Usar a mesma lógica de mapeamento do getProjectById
    const sanitizeDate = (dateField: any): string => {
      if (!dateField) return new Date().toISOString();
      if (typeof dateField === 'string') return dateField;
      if (dateField instanceof Date) return dateField.toISOString();
      return new Date(dateField).toISOString();
    };

    const project: Project = {
      id: data.id,
      userId: data.created_by,
      nome_cliente_final: data.nome_cliente_final,
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

    logger.debug('[getProject] Projeto encontrado:', { id: project.id, nome_cliente_final: project.nome_cliente_final });
    return project;

  } catch (error) {
    logger.error('[getProject] Erro ao buscar projeto:', error);
    throw new Error(`Erro ao buscar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Atualizar um projeto existente
 * @param projectId ID do projeto
 * @param updateData Dados para atualizar
 * @param userId ID do usuário fazendo a atualização
 * @returns Projeto atualizado
 */
export const updateProject = async (
  projectId: string, 
  updateData: Partial<Project>, 
  userId?: string
): Promise<Project | null> => {
  try {
    logger.debug('[updateProject] Atualizando projeto:', { projectId, userId });

    const supabase = getSupabaseClient(); // ✅ Obter cliente dinamicamente

    // Preparar dados para atualização (mapear de Project para formato DB)
    const updatePayload: any = {};
    
    if (updateData.nome_cliente_final !== undefined) {
      updatePayload.nome_cliente_final = updateData.nome_cliente_final;
    }
    if (updateData.empresaIntegradora !== undefined) {
      updatePayload.empresa_integradora = updateData.empresaIntegradora;
    }
    if (updateData.distribuidora !== undefined) {
      updatePayload.distribuidora = updateData.distribuidora;
    }
    if (updateData.potencia !== undefined) {
      updatePayload.potencia = updateData.potencia;
    }
    if (updateData.dataEntrega !== undefined) {
      updatePayload.data_entrega = updateData.dataEntrega;
    }
    if (updateData.status !== undefined) {
      updatePayload.status = updateData.status;
    }
    if (updateData.prioridade !== undefined) {
      updatePayload.prioridade = updateData.prioridade;
    }
    if (updateData.valorProjeto !== undefined) {
      updatePayload.valor_projeto = updateData.valorProjeto;
    }
    if (updateData.pagamento !== undefined) {
      updatePayload.pagamento = updateData.pagamento;
    }
    if (updateData.timelineEvents !== undefined) {
      updatePayload.timeline_events = updateData.timelineEvents;
    }
    if (updateData.documents !== undefined) {
      updatePayload.documents = updateData.documents;
    }
    if (updateData.files !== undefined) {
      updatePayload.files = updateData.files;
    }
    if (updateData.comments !== undefined) {
      updatePayload.comments = updateData.comments;
    }
    if (updateData.history !== undefined) {
      updatePayload.history = updateData.history;
    }
    if (userId && updateData.lastUpdateBy === undefined) {
      updatePayload.last_update_by = {
        uid: userId,
        timestamp: new Date().toISOString()
      };
    } else if (updateData.lastUpdateBy !== undefined) {
      updatePayload.last_update_by = updateData.lastUpdateBy;
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      logger.error('[updateProject] Erro na atualização:', error);
      throw error;
    }

    if (!data) {
      logger.warn('[updateProject] Nenhum dado retornado após atualização');
      return null;
    }

    // Retornar projeto atualizado usando getProject
    return await getProject(projectId);

  } catch (error) {
    logger.error('[updateProject] Erro ao atualizar projeto:', error);
    throw new Error(`Erro ao atualizar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Buscar todos os projetos para administradores (compatibilidade)
 * @param tenantId ID do tenant (obrigatório para segurança)
 * @returns Lista de projetos do tenant
 */
export const getProjectsAdmin = async (tenantId: string): Promise<Project[]> => {
  try {
    logger.debug('[getProjectsAdmin] Buscando todos os projetos para admin do tenant:', tenantId);

    return await getProjectsWithFilters({ 
      tenantId, 
      limit: 1000 
    });

  } catch (error) {
    logger.error('[getProjectsAdmin] Erro ao buscar projetos para admin:', error);
    throw new Error(`Erro ao buscar projetos para admin: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};

/**
 * Verificar se um número de projeto já está em uso
 * @param projectNumber Número do projeto para verificar
 * @param tenantId ID do tenant (obrigatório)
 * @returns True se já estiver em uso, false caso contrário
 */
export const isProjectNumberAlreadyUsed = async (projectNumber: string, tenantId: string): Promise<boolean> => {
  try {
    logger.debug('[isProjectNumberAlreadyUsed] Verificando número:', { projectNumber, tenantId });

    const supabase = getSupabaseClient(); // ✅ Obter cliente dinamicamente
    
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('number', projectNumber)
      .eq('tenant_id', tenantId)
      .limit(1);

    if (error) {
      logger.error('[isProjectNumberAlreadyUsed] Erro na verificação:', error);
      throw error;
    }

    const isUsed = data && data.length > 0;
    logger.debug('[isProjectNumberAlreadyUsed] Resultado:', { projectNumber, isUsed });
    
    return isUsed;

  } catch (error) {
    logger.error('[isProjectNumberAlreadyUsed] Erro ao verificar número do projeto:', error);
    throw new Error(`Erro ao verificar número do projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};