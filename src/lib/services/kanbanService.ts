"use client"

import { devLog } from "@/lib/utils/productionLogger";

// ✅ MIGRADO PARA SUPABASE - Interfaces do novo sistema de status
export interface ProjectStatusInfo {
  id: string;
  name: string;
  slug: string;
  color: string;
  order: number;
  isDefault: boolean;
  projectCount: number;
  slaDays?: number | null;
  slaExcludeWeekends?: boolean;
  isConclusion?: boolean;
  visibleInRoadmap?: boolean;
}

// ✅ NOVO: Buscar status de projetos do tenant atual
export async function getKanbanColumnTitles(): Promise<Record<string, string>> {
  try {
    devLog.log('[KanbanService] Buscando status de projetos via nova API');

    const response = await fetch('/api/project-statuses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar status');
    }

    // Converter para formato legado (slug -> name) ordenado por order_index
    const sortedStatuses = result.data.sort((a: any, b: any) => a.order_index - b.order_index);
    const titles: Record<string, string> = {};
    sortedStatuses.forEach((status: ProjectStatusInfo) => {
      titles[status.slug] = status.name;
    });

    devLog.log('[KanbanService] Status carregados e ordenados:', {
      count: sortedStatuses.length,
      titles
    });

    return titles;

  } catch (error) {
    devLog.error('[KanbanService] Erro ao carregar status:', error);

    // Fallback para títulos padrão
    return {
      'nao-iniciado': 'Não Iniciado',
      'em-desenvolvimento': 'Em Desenvolvimento',
      'aguardando-assinaturas': 'Aguardando Assinaturas',
      'em-homologacao': 'Em Homologação',
      'projeto-aprovado': 'Projeto Aprovado',
      'aguardando-solicitar-vistoria': 'Aguardando Solicitar Vistoria',
      'projeto-pausado': 'Projeto Pausado',
      'em-vistoria': 'Em Vistoria',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    };
  }
}

// ✅ NOVO: Atualizar título de uma coluna (status)
export async function updateKanbanColumnTitle(
  columnId: string,
  newTitle: string,
  originalStatus?: string
): Promise<void> {
  try {
    devLog.log('[KanbanService] Atualizando título da coluna:', {
      columnId,
      newTitle
    });

    const response = await fetch(`/api/project-statuses/${columnId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newTitle
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao atualizar status');
    }

    devLog.log('[KanbanService] Título da coluna atualizado com sucesso');

  } catch (error) {
    devLog.error('[KanbanService] Erro ao atualizar título da coluna:', error);
    throw error; // Propagar erro para o componente tratar
  }
}

// ✅ NOVO: Obter cores das colunas do tenant atual
export async function getKanbanColumnColors(): Promise<Record<string, string>> {
  try {
    devLog.log('[KanbanService] Buscando cores dos status via nova API');

    const response = await fetch('/api/project-statuses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar status');
    }

    // Converter para formato legado (slug -> color) ordenado por order_index
    const sortedStatuses = result.data.sort((a: any, b: any) => a.order_index - b.order_index);
    const colors: Record<string, string> = {};
    sortedStatuses.forEach((status: ProjectStatusInfo) => {
      colors[status.slug] = status.color;
    });

    devLog.log('[KanbanService] Cores carregadas e ordenadas:', {
      count: sortedStatuses.length,
      colors
    });

    return colors;

  } catch (error) {
    devLog.error('[KanbanService] Erro ao carregar cores:', error);

    // Fallback para cores padrão
    return {
      'nao-iniciado': '#f59e0b',
      'em-desenvolvimento': '#3b82f6',
      'aguardando-assinaturas': '#8b5cf6',
      'em-homologacao': '#06b6d4',
      'projeto-aprovado': '#10b981',
      'aguardando-solicitar-vistoria': '#f97316',
      'projeto-pausado': '#eab308',
      'em-vistoria': '#0ea5e9',
      'finalizado': '#22c55e',
      'cancelado': '#ef4444'
  };
  }
}

// ✅ NOVO: Adicionar nova coluna (status) ao Kanban
export async function addKanbanColumn(
  columnId: string,
  title: string,
  color: string,
  originalStatus?: string
): Promise<void> {
  try {
    devLog.log('[KanbanService] Adicionando nova coluna:', {
      title,
      color
    });

    const response = await fetch('/api/project-statuses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title,
        color: color || '#6b7280'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar novo status');
    }

    devLog.log('[KanbanService] Nova coluna criada com sucesso:', result.data.id);

  } catch (error) {
    devLog.error('[KanbanService] Erro ao adicionar coluna:', error);
    throw error;
  }
}

// ✅ NOVO: Deletar coluna (status) do Kanban
export async function deleteKanbanColumn(columnId: string): Promise<void> {
  try {
    devLog.log('[KanbanService] Deletando coluna:', columnId);

    const response = await fetch(`/api/project-statuses/${columnId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao deletar status');
    }

    devLog.log('[KanbanService] Coluna deletada com sucesso');

  } catch (error) {
    devLog.error('[KanbanService] Erro ao deletar coluna:', error);
    throw error;
  }
}

// ✅ NOVO: Buscar todos os status completos do tenant
export async function getProjectStatuses(): Promise<ProjectStatusInfo[]> {
  try {
    devLog.log('[KanbanService] Buscando status completos via API');

    const response = await fetch('/api/project-statuses', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao buscar status');
    }

    // Mapear para interface padronizada e ORDENAR por order_index
    const statuses: ProjectStatusInfo[] = result.data
      .map((status: any) => ({
        id: status.id,
        name: status.name,
        slug: status.slug,
        color: status.color,
        order: status.order_index,
        isDefault: status.is_default,
        projectCount: status.project_count || 0,
        slaDays: status.sla_days ?? null,
        slaExcludeWeekends: status.sla_exclude_weekends !== undefined ? status.sla_exclude_weekends : true,
        isConclusion: status.is_conclusion === true,
        visibleInRoadmap: status.visible_in_roadmap !== undefined ? status.visible_in_roadmap : true
      }))
      .sort((a, b) => a.order - b.order); // ✅ CORREÇÃO: Ordenar por order_index

    devLog.log('[KanbanService] Status completos carregados e ordenados:', {
      count: statuses.length,
      statuses: statuses.map(s => ({ slug: s.slug, name: s.name, order: s.order }))
    });

    return statuses;

  } catch (error) {
    devLog.error('[KanbanService] Erro ao carregar status completos:', error);
    return []; // Retornar array vazio em caso de erro
  }
}

// ✅ NOVO: Função para obter nome de exibição do status (dinâmica)
export function getDisplayStatus(status: string): string {
  // Esta função agora é principalmente para compatibilidade
  // O ideal é usar getProjectStatuses() para dados completos
  const fallbackMap: Record<string, string> = {
    'nao-iniciado': 'Não Iniciado',
    'em-desenvolvimento': 'Em Desenvolvimento',
    'aguardando-assinaturas': 'Aguardando Assinaturas',
    'em-homologacao': 'Em Homologação',
    'projeto-aprovado': 'Projeto Aprovado',
    'aguardando-solicitar-vistoria': 'Aguardando Solicitar Vistoria',
    'projeto-pausado': 'Projeto Pausado',
    'em-vistoria': 'Em Vistoria',
    'finalizado': 'Finalizado',
    'cancelado': 'Cancelado'
  };

  return fallbackMap[status] || status;
}

// Marcar/desmarcar status como "representa conclusão de projeto"
export async function updateStatusConclusion(statusId: string, isConclusion: boolean): Promise<void> {
  try {
    const response = await fetch(`/api/project-statuses/${statusId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_conclusion: isConclusion }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Erro ao atualizar');

    devLog.log('[KanbanService] is_conclusion atualizado:', { statusId, isConclusion });
  } catch (error) {
    devLog.error('[KanbanService] Erro ao atualizar is_conclusion:', error);
    throw error;
  }
}

// Marcar/desmarcar status como visível no roadmap exibido ao cliente
export async function updateStatusRoadmapVisibility(statusId: string, visible: boolean): Promise<void> {
  try {
    const response = await fetch(`/api/project-statuses/${statusId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_in_roadmap: visible }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Erro ao atualizar');

    devLog.log('[KanbanService] visible_in_roadmap atualizado:', { statusId, visible });
  } catch (error) {
    devLog.error('[KanbanService] Erro ao atualizar visible_in_roadmap:', error);
    throw error;
  }
}

// ✅ NOVO: Atualizar configurações de SLA de um status
export async function updateStatusSLA(
  statusId: string,
  slaDays: number | null,
  slaExcludeWeekends: boolean
): Promise<void> {
  try {
    devLog.log('[KanbanService] Atualizando SLA do status:', {
      statusId,
      slaDays,
      slaExcludeWeekends
    });

    const response = await fetch(`/api/project-statuses/${statusId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sla_days: slaDays,
        sla_exclude_weekends: slaExcludeWeekends
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro ao atualizar SLA');
    }

    devLog.log('[KanbanService] SLA atualizado com sucesso');

  } catch (error) {
    devLog.error('[KanbanService] Erro ao atualizar SLA:', error);
    throw error;
  }
} 