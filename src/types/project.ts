import { User } from '@/types/user';
// Remover a importação circular de kanban.ts
// import { ProjectStatus, ProjectPriority } from './kanban';
import { TimelineEvent } from "./timeline";
import { Comment } from "./comment";
import { Timestamp } from "firebase/firestore";

/**
 * Tipos para o status do projeto
 */
export type ProjectStatus = 
  | 'Não Iniciado'
  | 'Em Desenvolvimento'
  | 'Aguardando Assinaturas'
  | 'Em Homologação'
  | 'Projeto Aprovado'
  | 'Aguardando Solicitar Vistoria'
  | 'Projeto Pausado'
  | 'Em Vistoria'
  | 'Finalizado'
  | 'Cancelado';

/**
 * Prioridade do projeto
 */
export type ProjectPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

// Re-export TimelineEvent
export type { TimelineEvent };

/**
 * Representa um evento no histórico do projeto
 */
export interface ProjectHistory {
  type: 'info_update' | 'comment' | 'document' | 'status_change' | 'file_upload';
  content: string;
  createdBy: string;
  createdAt: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  metadata?: Record<string, any>;
}

/**
 * Representa um arquivo associado a um projeto
 */
export interface ProjectFile {
  name: string;
  path: string;
  url: string;
  uploadedAt: string;
  size?: number;
  type?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  uploadedByRole?: string;
}

/**
 * Interface base para projetos com campos obrigatórios mínimos
 */
export interface BaseProject {
  id: string;
  name: string;
  number: string;
  description?: string;
  userId: string;
  status: ProjectStatus;
  files?: ProjectFile[];
  updatedBy?: string;
  history?: ProjectHistory[];
  timelineEvents?: TimelineEvent[];
  empresaIntegradora: string;
  nomeClienteFinal: string;
  distribuidora: string;
  potencia: number;
  dataEntrega: string;
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  prioridade: ProjectPriority;
  documents?: ProjectFile[];
  valorProjeto?: number;
}

/**
 * Interface completa para projetos com todos os campos
 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  number: string;
  empresaIntegradora: string;
  nomeClienteFinal: string;
  distribuidora: string;
  potencia: number;
  dataEntrega: string;
  listaMateriais?: string;
  disjuntorPadraoEntrada?: string;
  status: ProjectStatus;
  prioridade: ProjectPriority;
  valorProjeto: number | null;
  pagamento?: string;

  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
  adminResponsibleId?: string;
  adminResponsibleName?: string;
  adminResponsibleEmail?: string;
  adminResponsiblePhone?: string;
  timelineEvents: TimelineEvent[];
  documents?: ProjectFile[];
  files?: ProjectFile[];
  comments?: Comment[];
  history?: ProjectHistory[];
  lastUpdateBy?: {
    uid: string;
    email?: string;
    role?: string;
    timestamp?: any;
    preciseTimestamp?: string;
  };
}

/**
 * Tipo para criação de um novo projeto (sem ID ou userId)
 */
export type NewProject = Omit<BaseProject, 'id' | 'userId' | 'updatedBy'> & {
  id?: string;
};

/**
 * Tipo para atualização de projeto (campos parciais + ID obrigatório)
 */
export type UpdatedProject = Partial<Project> & {
  id: string;
  timelineEvents: TimelineEvent[];
  error?: string;
  refresh?: boolean;
  changes?: Record<string, any>;
};

/**
 * Props para o componente de upload de arquivos
 */
export interface FileUploadSectionProps {
  project: Project;
  onUpdate: (files: File[]) => Promise<void>;
}

/**
 * Props para o componente de visualização expandida do projeto
 */
export interface ExpandedProjectViewProps {
  project: Project;
  onClose: () => void;
  onUpdate: (
    updatedProject: UpdatedProject, 
    user: { 
      uid: string; 
      email?: string | null; 
      role?: string; 
      userType?: string; 
    }
  ) => Promise<UpdatedProject>;
  onDelete?: (projectId: string) => Promise<void>;
  currentUser: User;
}

/**
 * Tipo para os dados que o cliente envia ao criar um projeto.
 */
export type CreateProjectClientData = Omit<Project, 
  'id' | 
  'createdAt' | 
  'updatedAt' | 
  'timelineEvents' | 
  'comments' | 
  'files' | 
  'documents' |
  'userId' |
  'number' |
  'lastUpdateBy'
> & {
  status?: ProjectStatus;
  prioridade?: ProjectPriority;
};