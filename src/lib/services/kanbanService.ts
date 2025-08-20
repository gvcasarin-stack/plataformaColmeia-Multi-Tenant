"use client"

// ⚠️ TODO: MIGRAR PARA SUPABASE
// Este serviço ainda precisa ser migrado do Firebase para Supabase
// Por enquanto, usando stubs para não quebrar o build

import { devLog } from "@/lib/utils/productionLogger";

// ⚠️ STUB: Função para obter títulos personalizados das colunas do kanban
export async function getKanbanColumnTitles(): Promise<Record<string, string>> {
  devLog.warn('[KanbanService] STUB: getKanbanColumnTitles - TODO: migrar para Supabase');
  
  return {
      'nao-iniciados': 'Não Iniciado',
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

// ⚠️ STUB: Função para atualizar o título de uma coluna do kanban
export async function updateKanbanColumnTitle(
  columnId: string, 
  newTitle: string,
  originalStatus?: string
): Promise<void> {
  devLog.warn('[KanbanService] STUB: updateKanbanColumnTitle - TODO: migrar para Supabase');
}

// ⚠️ STUB: Função para obter cores das colunas do kanban
export async function getKanbanColumnColors(): Promise<Record<string, string>> {
  devLog.warn('[KanbanService] STUB: getKanbanColumnColors - TODO: migrar para Supabase');
  
  return {
    'nao-iniciados': '#ef4444',
    'em-desenvolvimento': '#f97316', 
    'aguardando-assinaturas': '#eab308',
    'em-homologacao': '#3b82f6',
    'projeto-aprovado': '#10b981',
    'aguardando-solicitar-vistoria': '#8b5cf6',
    'projeto-pausado': '#6b7280',
    'em-vistoria': '#06b6d4',
    'finalizado': '#059669',
    'cancelado': '#dc2626'
  };
}

// ⚠️ STUB: Função para adicionar coluna do kanban
export async function addKanbanColumn(
  columnId: string,
  title: string,
  color: string,
  originalStatus: string
): Promise<void> {
  devLog.warn('[KanbanService] STUB: addKanbanColumn - TODO: migrar para Supabase');
}

// ⚠️ STUB: Função para deletar coluna do kanban
export async function deleteKanbanColumn(columnId: string): Promise<void> {
  devLog.warn('[KanbanService] STUB: deleteKanbanColumn - TODO: migrar para Supabase');
}

// ⚠️ STUB: Função para obter status de exibição
export function getDisplayStatus(status: string): string {
  const statusMap: Record<string, string> = {
      'nao-iniciados': 'Não Iniciado',
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
  
  return statusMap[status] || status;
} 