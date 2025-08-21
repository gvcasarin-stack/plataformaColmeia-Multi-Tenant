/**
 * @file types.ts
 * @description Definições de tipos para o serviço de projetos.
 */

import { 
  Project,
  TimelineEvent // Import TimelineEvent to use its type
} from '@/types/project';

/**
 * Interface para os dados de timeline
 */
export interface TimelineEventData {
  type: 'document' | 'comment' | 'status' | 'checklist';
  user: string;
  timestamp: any;
  userId: string;
  fileName?: string;
  fileUrl?: string;
  content: string;
  oldStatus?: string;
  newStatus?: string;
  edited?: boolean;
  subItems?: string[];
  id: string;
  title?: string;
  fullMessage?: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  userType?: string;
}

/**
 * Interface para os dados de arquivos
 */
export interface ProjectFileData {
  name: string;
  path: string;
  url: string;
  uploadedAt: any;
}

/**
 * Interface para os dados de comentários
 */
export interface CommentData {
  id?: string;
  text: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  createdAt?: any;
  updatedAt?: any;
  author?: string;
  authorId?: string;
  date?: string;
}

/**
 * Interface para dados não processados do Firestore
 */
export interface FirestoreData {
  [key: string]: any;
  createdAt?: any;
  updatedAt?: any;
  comments?: any[];
  files?: any[];
  timelineEvents?: any[];
}

/**
 * Interface para as opções de criação de projeto
 */
export interface CreateProjectOptions {
  /** Se deve ou não notificar administradores sobre novo projeto */
  notifyAdmins?: boolean;
  /** Se deve ou não gerar número automaticamente */
  generateNumber?: boolean;
  /** Nome do usuário que criou o projeto (opcional) */
  createdByName?: string;
}

/**
 * Interface para o cache de contagem de projetos
 */
export interface ProjectCountCache {
  count: number;
  timestamp: number;
}

/**
 * Opções de consulta para listar projetos
 */
export interface GetProjectsOptions {
  userId?: string;
  isAdmin?: boolean;
  status?: string;
  priority?: string;
  orderByField?: string;
  sortBy?: string;
  orderDirection?: 'asc' | 'desc';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  startAfter?: string | null;
  offset?: number;
  searchTerm?: string;
}

/**
 * Interface para as opções de atualização de projeto
 */
export interface UpdateProjectOptions {
  /** Notificar clientes sobre atualização */
  notifyClient?: boolean;
  /** Registrar evento na timeline */
  addTimelineEvent?: boolean;
  /** Mensagem personalizada para timeline (opcional) - Usar timelineEventContent */
  timelineMessage?: string; // This can perhaps be deprecated in favor of timelineEventContent
  /** Conteúdo do evento da timeline, se addTimelineEvent for true */
  timelineEventContent?: string; // Added this field
  /** Tipo de evento na timeline - usa o tipo de TimelineEvent */
  timelineEventType?: TimelineEvent['type']; // Changed to use TimelineEvent type
  /** Dados do usuário que está fazendo a atualização */
  user?: { uid: string; email: string; role: string; name?: string };
}

/**
 * Resultado de uma consulta paginada de projetos
 */
export interface ProjectSearchResult {
  projects: Project[];
  lastVisible: any | null;
  hasMore: boolean;
}
