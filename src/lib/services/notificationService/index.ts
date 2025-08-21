/**
 * Serviço de Notificações
 * 
 * Este módulo centraliza todas as funções relacionadas a notificações
 * Organizado em:
 * - core: Funções básicas de criação de notificações
 * - helpers: Funções específicas para tipos de notificações
 * - queries: Funções de busca e manipulação de notificações
 * - types: Definições de tipos
 */

// Re-exportar tipos
export * from './types';

// Re-exportar funções principais do core
export {
  createNotification,
  createNotificationForAllAdmins,
  getOrCreateSenderInfo,
  createNotificationDirectly
} from './core';

// Re-exportar funções integradas de notificação + e-mail dos helpers
export {
  createNotificationForProjectClient,
  notifyNewProject,
  notifyNewComment,
  notifyNewDocument,
  notifyStatusChange,
  notifyProjectUpdate // deprecated
} from './helpers';

// Re-exportar funções de queries
export {
  getUserNotifications,
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  hasUnreadNotifications,
  getRecentSystemNotifications,
  cleanupOldNotifications
} from './queries';

// Importar funções para criar aliases
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  hasUnreadNotifications
} from './queries';

// Exportar aliases para compatibilidade com código existente
export const getNotifications = getUserNotifications;
export const getUnreadNotificationsCount = getUnreadNotificationCount;

// Aliases para compatibilidade com código legado (versão anterior da refatoração)
export const getUserNotificationsPadrao = getUserNotifications;
export const markNotificationAsReadPadrao = markNotificationAsRead;
export const markAllNotificationsAsReadPadrao = markAllNotificationsAsRead;
export const deleteNotificationPadrao = deleteNotification;
