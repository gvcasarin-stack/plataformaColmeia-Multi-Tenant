/**
 * Utilitário para verificação de permissões de usuários
 * Usado para controle de acesso em páginas e APIs
 */

import { UserPermissions } from '@/types/user';

export type PermissionKey = keyof UserPermissions;

/**
 * Verifica se um usuário é admin completo (admin ou superadmin)
 */
export function isFullAdmin(user: any): boolean {
  if (!user) return false;

  const role = user.role || user.profile?.role;
  return role === 'admin' || role === 'superadmin';
}

/**
 * Obtém as permissões de um usuário, com fallback para objeto vazio
 */
export function getUserPermissions(user: any): UserPermissions {
  if (!user) return {} as UserPermissions;

  return user.permissions || (user.profile as any)?.permissions || ({} as UserPermissions);
}

/**
 * Verifica se o usuário tem uma permissão específica
 * Admin completo sempre tem todas as permissões
 */
export function hasPermission(user: any, permission: PermissionKey): boolean {
  // Admin completo tem todas as permissões
  if (isFullAdmin(user)) return true;

  const permissions = getUserPermissions(user);
  return permissions[permission] === true;
}

/**
 * Verifica se o usuário tem TODAS as permissões especificadas
 */
export function hasAllPermissions(user: any, requiredPermissions: PermissionKey[]): boolean {
  // Admin completo tem todas as permissões
  if (isFullAdmin(user)) return true;

  const permissions = getUserPermissions(user);
  return requiredPermissions.every(permission => permissions[permission] === true);
}

/**
 * Verifica se o usuário tem QUALQUER UMA das permissões especificadas
 */
export function hasAnyPermission(user: any, requiredPermissions: PermissionKey[]): boolean {
  // Admin completo tem todas as permissões
  if (isFullAdmin(user)) return true;

  const permissions = getUserPermissions(user);
  return requiredPermissions.some(permission => permissions[permission] === true);
}

/**
 * Verifica se o usuário pode acessar a aba Financeiro
 */
export function canViewFinancials(user: any): boolean {
  return hasPermission(user, 'can_view_financials');
}

/**
 * Verifica se o usuário pode gerenciar equipe
 */
export function canManageTeam(user: any): boolean {
  return hasPermission(user, 'can_manage_team');
}

/**
 * Verifica se o usuário pode visualizar projetos
 * Lógica implícita: pode visualizar se pode criar OU editar
 */
export function canViewProjects(user: any): boolean {
  // Admin completo tem acesso total
  if (isFullAdmin(user)) return true;

  // Pode visualizar se tem permissão de criar OU editar
  const permissions = getUserPermissions(user);
  return permissions.can_create_projects === true || permissions.can_edit_projects === true;
}

/**
 * Verifica se o usuário pode criar projetos
 */
export function canCreateProjects(user: any): boolean {
  return hasPermission(user, 'can_create_projects');
}

/**
 * Verifica se o usuário pode editar projetos
 */
export function canEditProjects(user: any): boolean {
  return hasPermission(user, 'can_edit_projects');
}

/**
 * Verifica se o usuário pode deletar projetos
 */
export function canDeleteProjects(user: any): boolean {
  return hasPermission(user, 'can_delete_projects');
}

/**
 * Verifica se o usuário pode visualizar clientes
 */
export function canViewClients(user: any): boolean {
  return hasPermission(user, 'can_view_clients');
}

/**
 * Verifica se o usuário pode editar clientes
 */
export function canEditClients(user: any): boolean {
  return hasPermission(user, 'can_edit_clients');
}

/**
 * Verifica se o usuário pode editar preferências da organização
 */
export function canEditPreferences(user: any): boolean {
  return hasPermission(user, 'can_edit_preferences');
}

/**
 * Verifica se o usuário pode ver dados financeiros no dashboard
 */
export function canViewDashboardFinancials(user: any): boolean {
  return hasPermission(user, 'can_view_dashboard_financials');
}
