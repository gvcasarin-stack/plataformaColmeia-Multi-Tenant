/**
 * @file index.ts
 * @description Arquivo barril para o serviço de projetos.
 * Fornece uma API unificada para o serviço e compatibilidade com APIs legadas.
 */

// Exportações seletivas para evitar duplicação
export type { TimelineEventData, ProjectFileData, CommentData, CreateProjectOptions, UpdateProjectOptions, GetProjectsOptions, ProjectSearchResult, ProjectCountCache } from './types';
export { createProject, getProject, updateProject, deleteProject, addProjectComment, addProjectTimelineEvent, generateUniqueProjectNumber } from './core';
export { getProjects, getProjectCount, isProjectNumberAlreadyUsed, findProjectByNumber } from './queries';
export { mapTimelineEvent, mapComment, normalizeStatus, sanitizeObject } from './helpers';

// Re-exportação para compatibilidade com código existente
import { 
  createProject, 
  getProject, 
  updateProject, 
  deleteProject,
  addProjectComment,
  addProjectTimelineEvent,
  generateUniqueProjectNumber,
} from './core';

import {
  getProjects,
  getProjectCount,
  isProjectNumberAlreadyUsed,
  findProjectByNumber
} from './queries';

import {
  normalizeStatus,
  mapTimelineEvent,
  mapComment,
  sanitizeObject
} from './helpers';

/**
 * O objeto exportado por padrão mantém compatibilidade com o código existente
 * que pode estar importando o serviço de projetos antigo
 */
export default {
  // Funções principais de CRUD
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getProjects,
  
  // Funções auxiliares
  generateUniqueProjectNumber,
  getProjectCount,
  isProjectNumberAlreadyUsed,
  findProjectByNumber,
  
  // Funções de manipulação de dados
  addProjectComment,
  addProjectTimelineEvent,
  
  // Funções de transformação
  normalizeStatus,
  mapTimelineEvent,
  mapComment,
  sanitizeObject
};
