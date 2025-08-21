// ❌ FIREBASE - COMENTADO PARA RESOLVER ERRO DE BUILD
// import { Timestamp } from 'firebase/firestore';
import { NotificationType } from '@/types/notification';

/**
 * Tipos de notificação disponíveis no sistema
 */
export type NotificationType = 
  | 'new_project'
  | 'status_change'
  | 'new_comment'
  | 'project_update'
  | 'document_upload'
  | 'task_assigned'
  | 'deadline_reminder'
  | 'system_announcement';

/**
 * ✅ CORREÇÃO REACT #130: Interface padronizada para notificações - usar strings para datas
 */
export interface NotificacaoPadronizada {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;  // ISO string
  updatedAt?: string;  // ISO string
  read: boolean;
  
  // Remetente
  senderId: string;          // ID do usuário que enviou a notificação
  senderName: string;        // Nome do usuário que enviou (para exibição)
  senderType: 'admin' | 'client' | 'system'; // Tipo do remetente
  
  // Destinatário
  userId: string;            // ID do usuário destinatário
  isAdminNotification: boolean; // Se é para todos os admins

  // Referências
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
  link?: string;
  
  // Dados específicos
  data: Record<string, any>;
}

/**
 * Tipo para parâmetros da função createNotification
 */
export interface CreateNotificationParams {
  // Tipo e conteúdo
  type: NotificationType;
  title: string;
  message: string;
  
  // Remetente (obtido automaticamente do usuário logado)
  senderId?: string; // Se não fornecido, usa auth.currentUser
  senderName?: string; // Se não fornecido, busca do perfil
  senderType?: 'admin' | 'client' | 'system';
  
  // Destinatário
  userId: string; // ID específico ou 'all_admins'
  
  // Referências
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
  link?: string;
  
  // Dados adicionais
  data?: Record<string, any>;
}

/**
 * Interface para resposta de notificação enviada
 */
export interface NotificationResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Interface para resultados de envio de notificações para múltiplos destinatários
 */
export interface BatchNotificationResult {
  adminIds: string[];
  clientId: string | null;
}

/**
 * Interface para opções de busca de notificações
 */
export interface NotificationQueryOptions {
  includeRead?: boolean;
  maxResults?: number;
  types?: NotificationType[];
  projectId?: string;
}

/**
 * Interface para informações do remetente
 */
export interface SenderInfo {
  id: string;
  name: string;
  type: 'admin' | 'client' | 'system';
}

/**
 * ✅ CORREÇÃO REACT #130: Estrutura base de uma notificação - usar strings para datas
 */
export interface BaseNotification {
  id: string;
  userId: string; // 'all_admins' para notificações gerais para admins
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;  // ISO string
  read: boolean;
  data?: Record<string, any>; // Dados específicos dependendo do tipo
  projectId?: string;
  projectNumber?: string; 
  projectName?: string;
  senderId?: string;
  senderName?: string;
  senderType?: 'admin' | 'client' | 'system';
}
