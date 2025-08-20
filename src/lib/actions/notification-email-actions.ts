'use server';

import { 
  notifyUserOfNewComment,
  notifyAdminAboutComment,
  notifyUserOfNewDocument,
  notifyAdminAboutDocument,
  notifyAdminAboutNewProject,
  notifyStatusChangeV2
} from '@/lib/services/emailService';
import logger from '@/lib/utils/logger';

/**
 * Server action para enviar e-mail de novo projeto
 */
export async function sendNewProjectEmail(params: {
  clientName: string;
  projectName: string;
  projectNumber: string;
  potencia?: string | number;
  distribuidora?: string;
  projectUrl: string;
  projectId?: string;
}): Promise<boolean> {
  try {
    return await notifyAdminAboutNewProject(
      params.clientName,
      params.projectName,
      params.projectNumber,
      params.potencia,
      params.distribuidora,
      params.projectUrl,
      params.projectId
    );
  } catch (error) {
    logger.error('[sendNewProjectEmail] Erro:', error);
    return false;
  }
}

/**
 * Server action para enviar e-mail de comentário de admin para cliente
 */
export async function sendAdminCommentEmail(params: {
  clientId: string;
  projectName: string;
  projectNumber: string;
  authorName: string;
  commentText: string;
  projectUrl: string;
  projectId?: string;
}): Promise<boolean> {
  try {
    return await notifyUserOfNewComment(
      params.clientId,
      params.projectName,
      params.projectNumber,
      params.authorName,
      params.commentText,
      params.projectUrl,
      params.projectId
    );
  } catch (error) {
    logger.error('[sendAdminCommentEmail] Erro:', error);
    return false;
  }
}

/**
 * Server action para enviar e-mail de comentário de cliente para admins
 */
export async function sendClientCommentEmail(params: {
  commentText: string;
  clientName: string;
  authorName: string;
  projectName: string;
  projectNumber: string;
  projectUrl: string;
  projectId?: string;
}): Promise<boolean> {
  try {
    return await notifyAdminAboutComment(
      params.commentText,
      params.clientName,
      params.authorName,
      params.projectName,
      params.projectNumber,
      params.projectUrl,
      params.projectId
    );
  } catch (error) {
    logger.error('[sendClientCommentEmail] Erro:', error);
    return false;
  }
}

/**
 * Server action para enviar e-mail de documento de admin para cliente
 */
export async function sendAdminDocumentEmail(params: {
  clientId: string;
  projectName: string;
  projectNumber: string;
  documentName: string;
  projectUrl: string;
  projectId?: string;
}): Promise<boolean> {
  try {
    return await notifyUserOfNewDocument(
      params.clientId,
      params.projectName,
      params.projectNumber,
      params.documentName,
      params.projectUrl,
      params.projectId
    );
  } catch (error) {
    logger.error('[sendAdminDocumentEmail] Erro:', error);
    return false;
  }
}

/**
 * Server action para enviar e-mail de documento de cliente para admins
 */
export async function sendClientDocumentEmail(params: {
  documentName: string;
  clientName: string;
  projectName: string;
  projectNumber: string;
  projectUrl: string;
  projectId?: string;
}): Promise<boolean> {
  try {
    return await notifyAdminAboutDocument(
      params.documentName,
      params.clientName,
      params.projectName,
      params.projectNumber,
      params.projectUrl,
      params.projectId
    );
  } catch (error) {
    logger.error('[sendClientDocumentEmail] Erro:', error);
    return false;
  }
}

/**
 * Server action para enviar e-mail de mudança de status
 */
export async function sendStatusChangeEmail(params: {
  clientId: string;
  projectName: string;
  projectNumber: string;
  oldStatus: string;
  newStatus: string;
  projectUrl: string;
  projectId?: string;
}): Promise<boolean> {
  try {
    return await notifyStatusChangeV2(
      params.clientId,
      params.projectName,
      params.projectNumber,
      params.clientId,
      params.oldStatus,
      params.newStatus,
      params.projectUrl,
      params.projectId
    );
  } catch (error) {
    logger.error('[sendStatusChangeEmail] Erro:', error);
    return false;
  }
} 