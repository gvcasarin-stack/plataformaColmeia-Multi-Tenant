/**
 * Tipo de eventos possíveis na linha do tempo de um projeto
 */
export type TimelineEventType = 'document' | 'comment' | 'status' | 'checklist' | 'file';

/**
 * Representa um evento no timeline do projeto
 */
export interface TimelineEvent {
  /** Identificador único do evento */
  id: string;
  
  /** Tipo do evento na timeline */
  type: 'status' | 'document' | 'comment' | 'info_update' | 'file_upload' | 'checklist' | 'file' | 'status_change' | 'system_message' | 'general' | 'responsibility';
  
  /** Identificador do usuário que criou o evento */
  userId: string;
  
  /** Nome do usuário que criou o evento */
  user: string;
  
  /** Data e hora da criação do evento, em formato ISO */
  timestamp: string;
  
  /** Tipo de usuário (admin, client, etc.) */
  userType?: string;
  
  /** Nome completo do usuário */
  fullName?: string;
  
  /** Nome do arquivo, se o evento for relacionado a um arquivo */
  fileName?: string;
  
  /** URL do arquivo, se o evento for relacionado a um arquivo */
  fileUrl?: string;
  
  /** Conteúdo principal do evento */
  content?: string;
  
  /** Status anterior, se o evento for uma mudança de status */
  oldStatus?: string;
  
  /** Novo status, se o evento for uma mudança de status */
  newStatus?: string;
  
  /** Indica se o evento foi editado após sua criação */
  edited?: boolean;
  
  /** Itens secundários relacionados ao evento */
  subItems?: string[];
  
  /** Indica se o evento é uma mudança de status */
  isStatusChange?: boolean;
  
  /** Nome de quem fez o upload, se aplicável */
  uploadedByName?: string;
  
  /** Função/cargo de quem fez o upload */
  uploadedByRole?: string;
  
  /** Nome do cliente, quando aplicável */
  clientName?: string;
  
  /** Título do evento */
  title?: string;
  
  /** Mensagem completa do evento */
  fullMessage?: string;
  
  /** Dados adicionais específicos do tipo de evento */
  data?: {
    source?: string;
    preserveAdminName?: boolean;
    updatedBy?: string;
    oldStatus?: string;
    newStatus?: string;
    [key: string]: any;
  };
  
  /** Indica se o evento foi gerado pelo sistema */
  isSystemGenerated?: boolean;
  
  /** ID do comentário relacionado, se aplicável */
  commentId?: string;
  
  /** Metadados adicionais do evento */
  metadata?: Record<string, any>;
}
