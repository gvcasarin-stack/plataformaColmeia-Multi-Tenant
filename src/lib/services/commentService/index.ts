/**
 * @file index.ts
 * @description Arquivo barril para o serviço de comentários.
 * Fornece uma API unificada para o serviço e compatibilidade com APIs legadas.
 */

// Exportar tipos
export type { 
  AddCommentParams,
  UpdateCommentParams,
  DeleteCommentParams,
  AddCommentResult,
  CommentActionResult,
  CommentNotificationData
} from './types';

// Exportar funções principais
export { 
  addComment,
  updateComment,
  deleteComment,
  getProject,
  canModifyComment
} from './core';

// Exportar funções auxiliares
export {
  generateCommentSnippet,
  sanitizeCommentText,
  validateCommentModification,
  formatCommentDate,
  prepareCommentNotificationData
} from './helpers';

// Importar funções para compatibilidade
import { 
  addComment,
  updateComment,
  deleteComment,
  getProject,
  canModifyComment
} from './core';

// Classe para compatibilidade com código existente
export class CommentService {
  static async getProject(projectId: string) {
    return getProject(projectId);
  }

  static canModifyComment(comment: any, user: any, project: any) {
    return canModifyComment(comment, user, project);
  }

  static async addComment(params: any) {
    return addComment(params);
  }

  static async updateComment(params: any) {
    return updateComment(params);
  }

  static async deleteComment(params: any) {
    return deleteComment(params);
  }
}

// Exportação padrão para compatibilidade
export default CommentService;
