/**
 * @file core.ts
 * @description Funções principais do serviço de comentários.
 */

import { 
  doc, 
  updateDoc, 
  getDoc, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '@/types/project';
import { Comment } from '@/types/comment';
import { User } from '@/types/user';
import { 
  AddCommentParams,
  UpdateCommentParams,
  DeleteCommentParams,
  AddCommentResult,
  CommentActionResult,
  CommentNotificationData
} from './types';
import { createNotificationDirectly, NotificationResult } from '../notificationService';
import { sendEmailNotificationForComment } from '../emailService';
import logger from '@/lib/utils/logger';
import {
  validateCommentModification
} from './helpers';

/**
 * Obtém um projeto pelo ID
 * @param projectId ID do projeto
 * @returns O projeto encontrado ou null
 */
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      logger.error(`[CommentService] Project ${projectId} not found`);
      return null;
    }
    
    return { id: projectSnap.id, ...projectSnap.data() } as Project;
  } catch (error) {
    logger.error('[CommentService] Error getting project:', error);
    throw new Error('Failed to get project');
  }
}

/**
 * Verifica se um usuário pode modificar um comentário
 * @param comment Comentário a ser modificado
 * @param user Usuário que está tentando modificar
 * @param project Projeto ao qual o comentário pertence
 * @returns Verdadeiro se o usuário pode modificar o comentário
 */
export function canModifyComment(comment: Comment, user: User, project: Project): boolean {
  const result = validateCommentModification(comment, user, project);
  return result.canModify;
}

/**
 * Adiciona um comentário a um projeto
 * @param params Parâmetros para adicionar o comentário
 * @returns Resultado da operação
 */
export async function addComment(params: AddCommentParams): Promise<AddCommentResult> {
  const { projectId, text, user, notify = true, sendEmail: shouldSendEmail = true } = params;
  
  try {
    if (!text || !text.trim()) {
      return {
        success: false,
        error: 'O texto do comentário não pode estar vazio',
        projectId
      };
    }
    
    logger.debug('[CommentService] Adding comment to project', { projectId, userId: user.uid });
    
    const projectRef = doc(db, 'projects', projectId);
    const projectSnapshot = await getDoc(projectRef);
    
    if (!projectSnapshot.exists()) {
      return {
        success: false,
        error: 'Projeto não encontrado',
        projectId
      };
    }
    
    const project = { id: projectId, ...projectSnapshot.data() } as Project;
    
    const timestamp = new Date().toISOString();
    const commentId = uuidv4();
    
    const newComment: Comment = {
      id: commentId,
      text: text.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      userId: user.uid,
      userEmail: user.email || '',
      userName: user.name || user.email || 'Usuário',
      userRole: user.role || 'user'
    };
    
    await updateDoc(projectRef, {
      comments: arrayUnion(newComment),
      updatedAt: serverTimestamp(),
      lastUpdateBy: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        timestamp: serverTimestamp(),
        preciseTimestamp: timestamp
      }
    });
    
    const notificationIds: string[] = [];
    
    if (notify) {
      try {
        const projectOwnerUserId = project.userId;
        const projectNumberForNotif = project.number || projectId;
        const isClientComment = user.role !== 'admin' && user.role !== 'superadmin';

        let notificationOutcome: NotificationResult | { success: boolean, ids?: string[] } | undefined;

        if (isClientComment) {
          notificationOutcome = await createNotificationDirectly({
            type: 'new_comment',
            title: `Novo Comentário no Projeto ${projectNumberForNotif}`,
            message: `${user.name || 'Cliente'} comentou: "${newComment.text.substring(0, 50)}..."`,
            notifyAllAdmins: true,
            link: `/admin/projetos/${projectId}?tab=comments&commentId=${newComment.id}`,
            projectId: projectId,
            projectNumber: projectNumberForNotif,
            data: { 
              commentId: newComment.id, 
              authorId: user.uid,
              commentFull: newComment.text,
              commentSnippet: newComment.text.substring(0, 150) + (newComment.text.length > 150 ? "..." : ""),
              authorName: user.name || user.email || 'Cliente'
            }
          });
        } else if (projectOwnerUserId && user.uid !== projectOwnerUserId) {
          notificationOutcome = await createNotificationDirectly({
            type: 'new_comment',
            title: `Novo Comentário no Seu Projeto ${projectNumberForNotif}`,
            message: `${user.name || 'Admin'} comentou: "${newComment.text.substring(0, 50)}..."`,
            userId: projectOwnerUserId,
            link: `/cliente/projetos/${projectId}?tab=comments&commentId=${newComment.id}`,
            projectId: projectId,
            projectNumber: projectNumberForNotif,
            data: { 
              commentId: newComment.id, 
              authorId: user.uid,
              commentFull: newComment.text,
              commentSnippet: newComment.text.substring(0, 150) + (newComment.text.length > 150 ? "..." : ""),
              authorName: user.name || user.email || 'Admin'
            }
          });
        }
        
        if (notificationOutcome?.success) {
          if ('id' in notificationOutcome && notificationOutcome.id) {
            notificationIds.push(notificationOutcome.id);
          } else if ('ids' in notificationOutcome && Array.isArray(notificationOutcome.ids)) {
            notificationIds.push(...notificationOutcome.ids);
          }
        }

      } catch (notificationError) {
        logger.error('[CommentService] Error sending in-app notifications:', notificationError);
      }
    }

    if (shouldSendEmail) {
      try {
        await sendEmailNotificationForComment(
          projectId,
          newComment.id,
          newComment.text,
          user,
          project.userId
        );
      } catch (emailError) {
        logger.error('[CommentService] Error sending email notifications:', emailError);
      }
    }
    
    return {
      success: true,
      comment: newComment,
      projectId,
      notificationIds
    };
  } catch (error) {
    logger.error('[CommentService] Error adding comment:', error);
    return {
      success: false,
      error: 'Erro ao adicionar comentário',
      projectId
    };
  }
}

/**
 * Atualiza um comentário existente
 * @param params Parâmetros para atualizar o comentário
 * @returns Resultado da operação
 */
export async function updateComment(params: UpdateCommentParams): Promise<CommentActionResult> {
  const { projectId, commentId, text, user, notify = true } = params;
  
  try {
    if (!text || !text.trim()) {
      return {
        success: false,
        error: 'O texto do comentário não pode estar vazio',
        projectId,
        commentId
      };
    }
    
    logger.debug('[CommentService] Updating comment', { projectId, commentId, userId: user.uid });
    
    // 1. Buscar o projeto para verificar o comentário
    const project = await getProject(projectId);
    if (!project) {
      return {
        success: false,
        error: 'Projeto não encontrado',
        projectId,
        commentId
      };
    }
    
    // 2. Encontrar o comentário no array de comentários
    const comments = project.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return {
        success: false,
        error: 'Comentário não encontrado',
        projectId,
        commentId
      };
    }
    
    const existingComment = comments[commentIndex];
    
    // 3. Verificar permissões
    if (!canModifyComment(existingComment, user, project)) {
      return {
        success: false,
        error: 'Sem permissão para atualizar este comentário',
        projectId,
        commentId
      };
    }
    
    // 4. Atualizar o comentário
    const updatedComment = {
      ...existingComment,
      text: text.trim(),
      updatedAt: new Date().toISOString()
    };
    
    comments[commentIndex] = updatedComment;
    
    // 5. Atualizar o projeto no Firestore
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      comments,
      updatedAt: serverTimestamp(),
      lastUpdateBy: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        timestamp: serverTimestamp(),
        preciseTimestamp: new Date().toISOString()
      }
    });
    
    // 6. Enviar notificações se solicitado
    if (notify) {
      await sendUpdateNotifications(project, updatedComment, text, user);
    }
    
    return {
      success: true,
      projectId,
      commentId
    };
  } catch (error) {
    logger.error('[CommentService] Error updating comment:', error);
    return {
      success: false,
      error: 'Erro ao atualizar comentário',
      projectId,
      commentId
    };
  }
}

/**
 * Envia notificações sobre atualização de comentário
 * @param project Projeto que contém o comentário
 * @param comment Comentário atualizado
 * @param text Novo texto do comentário
 * @param user Usuário que fez a atualização
 */
async function sendUpdateNotifications(
  project: Project, 
  comment: Comment, 
  text: string,
  user: User
): Promise<void> {
  try {
    // Caso 1: Admin atualizando -> Notificar o cliente
    if ((user.role === 'admin' || user.role === 'superadmin') && 
        project.userId && project.userId !== user.uid) {
      await createNotificationDirectly({
        projectId: project.id,
        projectName: project.name || '',
        projectNumber: project.number || '',
        message: `Um comentário foi atualizado no seu projeto: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
        notificationType: 'comment_update',
        receiverId: project.userId,
        senderName: user.name || 'Administrador',
        fromAdmin: true,
        commentId: comment.id,
        commentText: text
      });
    }
    // Caso 2: Cliente atualizando -> Notificar admins
    else if (user.role !== 'admin' && user.role !== 'superadmin') {
      await createNotificationDirectly({
        projectId: project.id,
        projectName: project.name || '',
        projectNumber: project.number || '',
        message: `Um cliente atualizou um comentário no projeto: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
        notificationType: 'comment_update',
        receiverId: 'all_admins',
        fromClient: true,
        senderName: user.name || 'Cliente',
        commentId: comment.id,
        commentText: text
      });
    }
  } catch (error) {
    logger.error('[CommentService] Error sending update notifications:', error);
  }
}

/**
 * Exclui um comentário de um projeto
 * @param params Parâmetros para excluir o comentário
 * @returns Resultado da operação
 */
export async function deleteComment(params: DeleteCommentParams): Promise<CommentActionResult> {
  const { projectId, commentId, user, notify = true } = params;
  
  try {
    logger.debug('[CommentService] Deleting comment', { projectId, commentId, userId: user.uid });
    
    // 1. Buscar o projeto para verificar o comentário
    const project = await getProject(projectId);
    if (!project) {
      return {
        success: false,
        error: 'Projeto não encontrado',
        projectId,
        commentId
      };
    }
    
    // 2. Encontrar o comentário no array de comentários
    const comments = project.comments || [];
    const comment = comments.find(c => c.id === commentId);
    
    if (!comment) {
      return {
        success: false,
        error: 'Comentário não encontrado',
        projectId,
        commentId
      };
    }
    
    // 3. Verificar permissões
    if (!canModifyComment(comment, user, project)) {
      return {
        success: false,
        error: 'Sem permissão para excluir este comentário',
        projectId,
        commentId
      };
    }
    
    // 4. Remover o comentário
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      comments: arrayRemove(comment),
      updatedAt: serverTimestamp(),
      lastUpdateBy: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        timestamp: serverTimestamp(),
        preciseTimestamp: new Date().toISOString()
      }
    });
    
    // 5. Enviar notificações se solicitado
    if (notify) {
      try {
        // Enviar notificação sobre a exclusão do comentário
        // Notificar apenas em caso de admin excluindo comentário de cliente
        // ou cliente excluindo seu próprio comentário
        if ((user.role === 'admin' || user.role === 'superadmin') && 
            comment.userId !== user.uid &&
            project.userId === comment.userId) {
          // Admin excluindo comentário do cliente -> Notificar cliente
          await createNotificationDirectly({
            projectId,
            projectName: project.name || '',
            projectNumber: project.number || '',
            message: 'Um administrador removeu seu comentário no projeto',
            notificationType: 'comment_deleted',
            receiverId: comment.userId,
            senderName: user.name || 'Administrador',
            fromAdmin: true
          });
        } else if (user.role !== 'admin' && user.role !== 'superadmin' && 
                 comment.userId === user.uid) {
          // Cliente excluindo seu próprio comentário -> Notificar admins
          await createNotificationDirectly({
            projectId,
            projectName: project.name || '',
            projectNumber: project.number || '',
            message: 'Um cliente removeu seu comentário no projeto',
            notificationType: 'comment_deleted',
            receiverId: 'all_admins',
            fromClient: true,
            senderName: user.name || 'Cliente'
          });
        }
      } catch (notificationError) {
        logger.error('[CommentService] Error sending delete notifications:', notificationError);
      }
    }
    
    return {
      success: true,
      projectId,
      commentId
    };
  } catch (error) {
    logger.error('[CommentService] Error deleting comment:', error);
    return {
      success: false,
      error: 'Erro ao excluir comentário',
      projectId,
      commentId
    };
  }
}
