/**
 * @file helpers.ts
 * @description Funções auxiliares para o serviço de projetos.
 */

import { TimelineEvent, Comment } from '@/types/project';
import { ProjectStatus } from '@/types/kanban';
import { TimelineEventData, CommentData } from './types';
import { Timestamp } from 'firebase/firestore';

/**
 * Normaliza o status do projeto para um valor válido
 * 
 * @param status Status do projeto ou undefined
 * @returns Status normalizado
 */
export const normalizeStatus = (status: string | undefined): ProjectStatus => {
  if (!status) {
    return 'Não Iniciado';
  }
  
  const validStatuses: ProjectStatus[] = [
    'Não Iniciado',
    'Em Desenvolvimento',
    'Aguardando Assinaturas',
    'Em Homologação',
    'Projeto Aprovado',
    'Aguardando Solicitar Vistoria',
    'Projeto Pausado',
    'Em Vistoria',
    'Finalizado',
    'Cancelado'
  ];
  
  // Normalizar o status se for um dos válidos
  if (validStatuses.includes(status as ProjectStatus)) {
    return status as ProjectStatus;
  }
  
  // Mapeamento de status legados para novos
  const statusMap: Record<string, ProjectStatus> = {
    'recebido': 'Não Iniciado',
    'em_analise': 'Em Desenvolvimento',
    'aprovado': 'Projeto Aprovado',
    'em_andamento': 'Em Desenvolvimento',
    'concluido': 'Finalizado',
    'cancelado': 'Cancelado',
    'aguardando_cliente': 'Aguardando Assinaturas'
  };
  
  // Tentar mapear pelo status legacy
  if (statusMap[status.toLowerCase()]) {
    return statusMap[status.toLowerCase()];
  }
  
  // Tentar converter status com espaços para formato com underscore e mapear
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  if (statusMap[normalizedStatus]) {
    return statusMap[normalizedStatus];
  }
  
  // Retornar padrão se o status não for reconhecido
  return 'Não Iniciado';
};

/**
 * Mapeia um evento de timeline do Firestore para o formato da aplicação
 * 
 * @param event Evento da timeline do Firestore
 * @param userId ID do usuário atual
 * @returns Evento da timeline formatado
 */
export const mapTimelineEvent = (event: TimelineEventData, userId: string = ''): TimelineEvent => {
  const timelineEvent: TimelineEvent = {
    id: event.id,
    type: event.type,
    user: event.user,
    userId: event.userId,
    timestamp: event.timestamp instanceof Timestamp 
      ? event.timestamp.toDate().toISOString() 
      : event.timestamp,
    content: event.content,
    fileName: event.fileName || '',
    fileUrl: event.fileUrl || '',
    oldStatus: event.oldStatus,
    newStatus: event.newStatus,
    edited: event.edited || false,
    subItems: event.subItems || [],
    title: event.title || '',
    fullMessage: event.fullMessage || '',
    uploadedByName: event.uploadedByName || '',
    uploadedByRole: event.uploadedByRole || '',
    userType: event.userType || 'unknown',
    isStatusChange: event.type === 'status'
  };
  
  // Adicionar data se estamos lidando com um evento de status
  if (event.type === 'status' && (event.oldStatus || event.newStatus)) {
    timelineEvent.data = {
      oldStatus: event.oldStatus,
      newStatus: event.newStatus
    };
  }
  
  return timelineEvent;
};

/**
 * Mapeia um comentário do Firestore para o formato da aplicação
 * 
 * @param comment Comentário do Firestore
 * @returns Comentário formatado
 */
export const mapComment = (comment: CommentData): Comment => {
  return {
    id: comment.id || '',
    text: comment.text || '',
    userId: comment.userId || '',
    userName: comment.userName || comment.userEmail || comment.author || 'Usuário',
    userRole: comment.userRole || 'unknown',
    createdAt: comment.createdAt instanceof Timestamp 
      ? comment.createdAt.toDate().toISOString() 
      : (comment.createdAt || comment.date || new Date().toISOString()),
    updatedAt: comment.updatedAt instanceof Timestamp 
      ? comment.updatedAt.toDate().toISOString() 
      : (comment.updatedAt || comment.createdAt || new Date().toISOString())
  };
};

/**
 * Sanitiza um objeto para armazenamento no Firestore
 * Converte valores undefined para null e remove valores circulares
 * 
 * @param obj Objeto a ser sanitizado
 * @returns Objeto sanitizado para armazenamento no Firestore
 */
export function sanitizeObject(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  
  // Tratar arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  // Tratar objetos
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
}
