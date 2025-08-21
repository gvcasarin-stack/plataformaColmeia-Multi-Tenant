export interface ProjectHistory {
  type: 'info_update' | 'comment' | 'document'
  content: string
  createdBy: string
  createdAt: string
}

export interface ProjectFile {
  name: string;
  path: string;
  url?: string;
  uploadedAt?: string;
}

export interface TimelineEvent {
  type: 'document' | 'comment' | 'status' | 'checklist';
  user: string;
  timestamp: string;
  fileName?: string;
  fileUrl?: string;
  content?: string;
  oldStatus?: string;
  newStatus?: string;
  edited?: boolean;
  subItems?: string[];
}

export interface Project {
  id: string;
  name: string;
  number?: string;
  /* 
   * Pode ser opcional na interface, mas nunca deve ser undefined durante a criação.
   * Sempre fornecer um valor padrão (ex: "Cliente Individual") 
   */
  empresaIntegradora?: string;
  nomeClienteFinal?: string;
  distribuidora?: string;
  potencia?: string | number;
  dataEntrega?: string;
  prioridade?: string;
  files: ProjectFile[];
  documents?: ProjectFile[];
  timelineEvents?: TimelineEvent[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpandedProjectViewProps {
  project: Project;
  onClose: () => void;
  onUpdate: (project: Project) => Promise<void>;
  currentUserEmail?: string;
}
