/**
 * @file index.ts
 * @description Arquivo barril para o serviço de projetos - MIGRADO PARA SUPABASE
 * ✅ CORREÇÃO CRÍTICA: Exporta apenas funções do Supabase (Firebase removido)
 */

// ✅ MIGRAÇÃO COMPLETA: Exportações apenas do supabase.ts
export type { TimelineEventData, ProjectFileData, CommentData, CreateProjectOptions, UpdateProjectOptions, GetProjectsOptions, ProjectSearchResult, ProjectCountCache } from './types';

// ✅ SUPABASE: Exportar todas as funções do supabase.ts
export { 
  getProjectById,
  getProjectsByUserId,
  getProjectsWithFilters,
  subscribeToProject,
  getProject,
  updateProject,
  getProjectsAdmin,
  isProjectNumberAlreadyUsed
} from './supabase';

// ✅ HELPERS: Manter helpers utilitários
export { mapTimelineEvent, mapComment, normalizeStatus, sanitizeObject } from './helpers';

// ✅ COMPATIBILIDADE: Re-exportar funções principais do supabase
import { 
  getProject, 
  updateProject, 
  getProjectById,
  getProjectsByUserId,
  getProjectsWithFilters,
  getProjectsAdmin,
  isProjectNumberAlreadyUsed,
  subscribeToProject
} from './supabase';

import {
  normalizeStatus,
  mapTimelineEvent,
  mapComment,
  sanitizeObject
} from './helpers';

/**
 * ✅ MIGRADO PARA SUPABASE: Objeto default atualizado com funções Supabase
 * Mantém compatibilidade com código existente
 */
export default {
  // ✅ Funções principais SUPABASE
  getProject,
  updateProject,
  getProjectById,
  getProjects: getProjectsWithFilters, // Alias para compatibilidade
  getProjectsByUserId,
  getProjectsAdmin,
  
  // ✅ Funções auxiliares SUPABASE  
  isProjectNumberAlreadyUsed,
  subscribeToProject,
  
  // ✅ Funções de transformação (mantidas)
  normalizeStatus,
  mapTimelineEvent,
  mapComment,
  sanitizeObject
}; 