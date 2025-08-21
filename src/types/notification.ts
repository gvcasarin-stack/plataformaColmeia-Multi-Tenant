import { Timestamp } from 'firebase/firestore';

/**
 * Tipos de notificação suportados pelo sistema
 * 
 * status_change: Notificação de mudança de status de projeto
 * payment: Notificação relacionada a pagamentos
 * client_approval: Notificação relacionada a aprovação de cliente
 * new_comment: Notificação de novo comentário em projeto
 * document_upload: Notificação de upload de documento
 * reminder: Lembrete para usuário
 * system_message: Mensagem geral do sistema
 * new_project: Notificação de novo projeto
 * new_client_registration: Notificação de novo cliente registrado
 * deadline_approaching: Notificação de prazo se aproximando
 * project_completed: Notificação de projeto concluído
 * project_update: Notificação de atualização de projeto
 * new_document: Notificação de novo documento (compatiblidade)
 * system: Notificação do sistema (compatibilidade)
 */
export type NotificationType = 
  | 'status_change'
  | 'payment'
  | 'client_approval'
  | 'new_comment'
  | 'document_upload'
  | 'reminder'
  | 'system_message'
  | 'new_project'
  | 'new_client_registration'
  | 'deadline_approaching'
  | 'project_completed'
  | 'project_update'
  | 'new_document'
  | 'system';

/**
 * Tipos legados de notificação (para compatibilidade)
 */
export type LegacyNotificationType = 
  | NotificationType;

/**
 * Interface para notificações padronizadas
 * 
 * id: ID único da notificação
 * type: Tipo da notificação (um dos valores definidos em NotificationType)
 * title: Título da notificação
 * message: Mensagem completa da notificação
 * createdAt: Data e hora de criação
 * updatedAt: Data e hora da última atualização (opcional)
 * read: Se a notificação foi lida pelo usuário
 * userId: ID do usuário para quem a notificação é destinada
 * projectId: ID do projeto associado (opcional)
 * projectNumber: Número do projeto associado (opcional)
 * data: Dados específicos do tipo de notificação
 * 
 * Campos de remetente:
 * senderId: ID do usuário ou sistema que enviou a notificação
 * senderName: Nome de exibição do remetente
 * senderType: Tipo do remetente (admin, client ou system)
 * isAdminNotification: Se é uma notificação destinada a todos os admins
 */
export interface NotificacaoPadrao {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  read: boolean;
  userId: string;
  projectId?: string;
  projectNumber?: string;
  
  // Campos de remetente
  senderId: string;           // ID do usuário que enviou a notificação
  senderName: string;         // Nome do usuário que enviou (para exibição)
  senderType: 'admin' | 'client' | 'system'; // Tipo do remetente
  isAdminNotification?: boolean; // Se é para todos os admins
  
  data: Record<string, any>;
}

/**
 * Interface para o formato legado de notificações (para compatibilidade)
 */
export interface Notification {
  id: string;
  type: LegacyNotificationType | string;
  title: string;
  message: string;
  userId: string;
  read: boolean;
  createdAt: Timestamp | string;
  projectId?: string;
  projectNumber?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  adminId?: string;
}

/**
 * Interface para notificações de mudança de status
 */
export interface StatusChangeNotification extends NotificacaoPadrao {
  type: 'status_change';
  data: {
    oldStatus: string;
    newStatus: string;
    systemMessage?: string;
  };
}

/**
 * Interface para notificações de pagamento
 */
export interface PaymentNotification extends NotificacaoPadrao {
  type: 'payment';
  data: {
    amount: number;
    status: 'pending' | 'paid' | 'partial_paid' | 'overdue';
    installment?: 1 | 2;
    dueDate?: Timestamp;
    method?: string;
    invoiceId?: string;
  };
}

/**
 * Interface para notificações de aprovação de cliente
 */
export interface ClientApprovalNotification extends NotificacaoPadrao {
  type: 'client_approval';
  data: {
    status: 'approved' | 'rejected';
    clientId: string;
    clientName: string;
    isCompany?: boolean;
    companyName?: string;
    approvedBy?: string;
    rejectionReason?: string;
  };
}

/**
 * Interface para notificações de comentário
 */
export interface CommentNotification extends NotificacaoPadrao {
  type: 'new_comment';
  data: {
    commentId: string;
    authorId: string;
    authorName: string;
    commentSnippet: string;
    commentFull?: string;
    clientEmail?: string;
    clientName?: string;
    projectName?: string;
    projectCliente?: string;
    createdAt?: string;
  };
}

/**
 * Interface para notificações de upload de documento
 */
export interface DocumentUploadNotification extends NotificacaoPadrao {
  type: 'document_upload';
  data: {
    documentId: string;
    documentName: string;
    documentType: string;
    uploadedBy: string;
    uploadedByName: string;
    fileSize?: number;
  };
}

/**
 * Interface para notificações de lembrete
 */
export interface ReminderNotification extends NotificacaoPadrao {
  type: 'reminder';
  data: {
    dueDate: Timestamp;
    priority: 'low' | 'medium' | 'high';
    category: string;
  };
}

/**
 * Interface para notificações de mensagem do sistema
 */
export interface SystemMessageNotification extends NotificacaoPadrao {
  type: 'system_message';
  data: {
    severity: 'info' | 'warning' | 'error' | 'success';
    category: string;
    actionUrl?: string;
    actionLabel?: string;
  };
}
