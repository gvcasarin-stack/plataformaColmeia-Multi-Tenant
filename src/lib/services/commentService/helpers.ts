/**
 * @file helpers.ts
 * @description Funções auxiliares para o serviço de comentários.
 */

import { User } from '@/types/user';
import { Comment, Project } from '@/types/project';
import logger from '@/lib/utils/logger';

/**
 * Gera um trecho resumido do texto do comentário
 * @param text Texto completo do comentário
 * @param maxLength Tamanho máximo do trecho (padrão: 100 caracteres)
 * @returns Trecho resumido do comentário
 */
export function generateCommentSnippet(text: string, maxLength: number = 100): string {
  if (!text) return '';
  
  const trimmedText = text.trim();
  if (trimmedText.length <= maxLength) return trimmedText;
  
  return `${trimmedText.substring(0, maxLength)}...`;
}

/**
 * Sanitiza o texto do comentário, removendo conteúdo potencialmente perigoso
 * @param text Texto do comentário
 * @returns Texto sanitizado
 */
export function sanitizeCommentText(text: string): string {
  if (!text) return '';
  
  // Remover espaços em branco excessivos
  let sanitized = text.trim();
  
  // Remover scripts potencialmente perigosos (sanitização básica)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  return sanitized;
}

/**
 * Valida se um comentário pode ser modificado por um usuário
 * @param comment Comentário a ser modificado
 * @param user Usuário que está tentando modificar
 * @param project Projeto ao qual o comentário pertence
 * @returns Objeto com resultado da validação e mensagem de erro, se houver
 */
export function validateCommentModification(
  comment: Comment, 
  user: User, 
  project: Project
): { canModify: boolean; errorMessage?: string } {
  // Superadmin pode fazer qualquer coisa
  if (user.role === 'superadmin') return { canModify: true };
  
  // Admin pode fazer qualquer coisa
  if (user.role === 'admin') return { canModify: true };
  
  // O dono do comentário pode modificar seus próprios comentários
  if (comment.userId === user.uid) return { canModify: true };
  
  // O dono do projeto pode modificar qualquer comentário em seu projeto
  if (project.userId === user.uid) return { canModify: true };
  
  logger.warn('[CommentService] Tentativa não autorizada de modificar comentário', {
    commentId: comment.id,
    userId: user.uid,
    projectId: project.id,
    userRole: user.role,
  });
  
  return { 
    canModify: false, 
    errorMessage: 'Você não tem permissão para modificar este comentário'
  };
}

/**
 * Formata a data de um comentário para exibição
 * @param isoDateString Data em formato ISO
 * @returns Data formatada para exibição
 */
export function formatCommentDate(isoDateString: string): string {
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    logger.error('[CommentService] Erro ao formatar data do comentário', { error, date: isoDateString });
    return isoDateString;
  }
}

/**
 * Prepara dados para notificação a partir de um comentário
 * @param comment Comentário
 * @param project Projeto
 * @param user Usuário que fez a ação
 * @param action Tipo de ação (adição, atualização, exclusão)
 * @returns Dados formatados para notificação
 */
export function prepareCommentNotificationData(
  comment: Comment,
  project: Project,
  user: User,
  action: 'add' | 'update' | 'delete'
) {
  const isClientAction = user.role !== 'admin' && user.role !== 'superadmin';
  const commentSnippet = generateCommentSnippet(comment.text);
  
  return {
    projectId: project.id,
    projectNumber: project.number || project.id,
    projectName: project.name || '',
    commentId: comment.id,
    authorId: user.uid,
    authorName: user.name || user.email || 'Usuário',
    commentSnippet,
    commentFull: comment.text,
    createdBy: user.uid,
    createdAt: comment.createdAt,
    actionType: action,
    isClientComment: isClientAction,
    fromClient: isClientAction,
    isAdminComment: !isClientAction,
    userRole: user.role || 'user',
    priority: isClientAction ? 'high' : 'normal',
    notificationOrigin: isClientAction ? 'client_comment' : 'admin_comment'
  };
} 