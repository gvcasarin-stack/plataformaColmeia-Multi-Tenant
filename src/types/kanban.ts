import { Project, ProjectStatus, ProjectPriority } from './project';

// Reexportar ProjectStatus e ProjectPriority usando 'export type'
export type { ProjectStatus, ProjectPriority };

/**
 * Props para o componente KanbanBoard
 */
export interface KanbanBoardProps {
  onProjectClick: (project: Project) => void;
  searchQuery: string;
}

/**
 * Lista de prioridades possíveis para projetos
 */
export const PROJECT_PRIORITIES = [
  'Baixa',
  'Média',
  'Alta',
  'Urgente'
] as const;

/**
 * ✅ CORREÇÃO REACT #130: Tipo para um card no quadro Kanban - apenas strings para datas
 */
export interface KanbanCard {
  id: string;
  projectId: string;  // ID do projeto associado ao card
  title: string | number;
  clientName?: string;
  description: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  dueDate?: string;  // Apenas string ISO
  createdAt?: string;  // Apenas string ISO
  updatedAt?: string;  // Apenas string ISO
}

/**
 * Tipo para uma coluna do quadro Kanban
 */
export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

/**
 * Tipo para o quadro completo
 */
export type Board = {
  columns: { [key: string]: Column };
  columnOrder: string[];
};

/**
 * Representa dados do quadro Kanban
 */
export interface KanbanData {
  columns: { [key: string]: KanbanColumn };
  columnOrder: string[];
}

/**
 * Tipo para uma coluna no Board
 */
export interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

// Alias do tipo Priority para compatibilidade
export type Priority = ProjectPriority; 