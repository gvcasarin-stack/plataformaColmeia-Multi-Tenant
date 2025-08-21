/**
 * @file types.ts
 * @description Definições de tipos para o serviço de comentários.
 */

import { User } from '@/types/user';
import { Comment } from '@/types/project';

/**
 * Parâmetros para adicionar um comentário
 */
export interface AddCommentParams {
  /** ID do projeto */
  projectId: string;
  /** Texto do comentário */
  text: string;
  /** Usuário que está fazendo o comentário */
  user: User;
  /** Se deve notificar o cliente/admin sobre o comentário */
  notify?: boolean;
  /** Se deve enviar email sobre o comentário */
  sendEmail?: boolean;
}

/**
 * Parâmetros para atualizar um comentário
 */
export interface UpdateCommentParams {
  /** ID do projeto */
  projectId: string;
  /** ID do comentário */
  commentId: string;
  /** Novo texto do comentário */
  text: string;
  /** Usuário que está atualizando o comentário */
  user: User;
  /** Se deve notificar sobre a atualização */
  notify?: boolean;
}

/**
 * Parâmetros para excluir um comentário
 */
export interface DeleteCommentParams {
  /** ID do projeto */
  projectId: string;
  /** ID do comentário */
  commentId: string;
  /** Usuário que está excluindo o comentário */
  user: User;
  /** Se deve notificar sobre a exclusão */
  notify?: boolean;
}

/**
 * Resposta da operação de adicionar comentário
 */
export interface AddCommentResult {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  /** O comentário adicionado */
  comment?: Comment;
  /** Mensagem de erro, se houver */
  error?: string;
  /** IDs de notificações criadas */
  notificationIds?: string[];
  /** ID do projeto */
  projectId: string;
}

/**
 * Resultado da operação de atualizar ou excluir comentário
 */
export interface CommentActionResult {
  /** Indica se a operação foi bem-sucedida */
  success: boolean;
  /** Mensagem de erro, se houver */
  error?: string;
  /** ID do projeto */
  projectId: string;
  /** ID do comentário */
  commentId: string;
}

/**
 * Parâmetros para notificação de comentário
 */
export interface CommentNotificationData {
  /** ID do projeto */
  projectId: string;
  /** Número do projeto */
  projectNumber: string;
  /** Nome do projeto */
  projectName?: string;
  /** ID do comentário */
  commentId: string;
  /** ID do autor do comentário */
  authorId: string;
  /** Nome do autor do comentário */
  authorName: string;
  /** Trecho curto do comentário */
  commentSnippet: string;
  /** Texto completo do comentário */
  commentFull: string;
  /** ID de quem criou o comentário */
  createdBy: string;
  /** Data de criação do comentário */
  createdAt: string;
  /** Se é um comentário de cliente */
  isClientComment?: boolean;
  /** Se vem de um cliente */
  fromClient?: boolean;
  /** Se é um comentário de admin */
  isAdminComment?: boolean;
  /** Papel do usuário */
  userRole?: string;
  /** Prioridade da notificação */
  priority?: 'high' | 'normal' | 'low';
  /** Origem da notificação */
  notificationOrigin?: string;
  /** Dados adicionais */
  [key: string]: any;
}
