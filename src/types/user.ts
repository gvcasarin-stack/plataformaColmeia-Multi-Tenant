/**
 * Tipos de usuário suportados pelo sistema (roles do banco de dados)
 * @deprecated Use SystemRole ao invés de UserType
 */
export type UserType = 'admin' | 'client' | 'superadmin' | 'colaborador';

/**
 * Roles do sistema (valores da coluna 'role' no banco de dados)
 */
export type SystemRole = 'admin' | 'client' | 'superadmin' | 'colaborador';

/**
 * Funções/cargos de usuário suportados (labels para UI)
 */
export type UserRole = 'Administrador' | 'Cliente' | 'Super Administrador' | 'Técnico' | 'Gerente' | 'Colaborador';

/**
 * Permissões granulares de usuário
 * Armazenado no campo 'permissions' (JSONB) no banco de dados
 */
export interface UserPermissions {
  /** Pode visualizar o painel (dashboard) */
  can_view_dashboard: boolean;

  /** Pode visualizar dados financeiros no painel */
  can_view_dashboard_financials: boolean;

  /** Pode criar novos projetos */
  can_create_projects: boolean;

  /** Pode editar projetos existentes */
  can_edit_projects: boolean;

  /** Pode deletar projetos */
  can_delete_projects: boolean;

  /** Pode visualizar todos os projetos (se false, vê apenas projetos onde é responsável) */
  can_view_all_projects: boolean;

  /** Pode visualizar clientes */
  can_view_clients: boolean;

  /** Pode editar dados de clientes */
  can_edit_clients: boolean;

  /** Pode acessar a aba de Financeiro */
  can_view_financials: boolean;

  /** Pode gerenciar equipe (adicionar/editar/remover membros) */
  can_manage_team: boolean;

  /** Pode editar preferências da organização */
  can_edit_preferences: boolean;

  /** Pode acessar a aba de Dimensionamento */
  can_view_dimensionamento: boolean;

  /** Pode acessar a aba de Assinaturas */
  can_view_assinaturas: boolean;
}

/**
 * Preset padrão de permissões para Administrador
 */
export const ADMIN_PERMISSIONS: UserPermissions = {
  can_view_dashboard: true,
  can_view_dashboard_financials: true,
  can_create_projects: true,
  can_edit_projects: true,
  can_delete_projects: true,
  can_view_all_projects: true,
  can_view_clients: true,
  can_edit_clients: true,
  can_view_financials: true,
  can_manage_team: true,
  can_edit_preferences: true,
  can_view_dimensionamento: true,
  can_view_assinaturas: true,
};

/**
 * Preset padrão de permissões para Colaborador
 */
export const COLABORADOR_PERMISSIONS: UserPermissions = {
  can_view_dashboard: true,
  can_view_dashboard_financials: false, // ❌ Sem acesso a faturamento
  can_create_projects: true,
  can_edit_projects: true,
  can_delete_projects: false,
  can_view_all_projects: true,          // ✅ Por padrão vê todos os projetos (comportamento atual)
  can_view_clients: false,              // ❌ Desmarcado por padrão
  can_edit_clients: false,              // ❌ Desmarcado por padrão
  can_view_financials: false,           // ❌ Sem acesso à aba Financeiro
  can_manage_team: false,               // ❌ Sem acesso à aba Equipe
  can_edit_preferences: false,          // ❌ Desmarcado por padrão
  can_view_dimensionamento: true,
  can_view_assinaturas: false,          // ❌ Sem acesso à aba Assinaturas
};

/**
 * Status de bloqueio de usuário
 */
export interface BlockStatus {
  isBlocked: boolean;
  reason?: string;
  blockedAt?: string;
  blockedBy?: string;
}

/**
 * Representa um usuário no sistema
 */
export interface User {
  /** Identificador único do usuário (UID do Firebase) */
  uid: string;
  
  /** Email do usuário (pode ser nulo) */
  email: string | null;
  
  /** Nome completo do usuário */
  name?: string;
  
  /** Função/cargo do usuário */
  role?: UserRole | string;
  
  /** Tipo de usuário (admin, client, superadmin) */
  userType?: UserType | string;
  
  /** Indica se o usuário tem permissões de administrador */
  isAdmin?: boolean;
  
  /** Indica se o usuário tem permissões de super administrador */
  isSuperAdmin?: boolean;
  
  /** Data e hora do último login */
  lastLogin?: string;
  
  /** Provedor de autenticação utilizado */
  authProvider?: string;
  
  /** Claims personalizadas do Firebase Auth */
  claims?: Record<string, any>;
  
  /** Indica se o usuário está pendente de aprovação */
  pendingApproval?: boolean;

  /** Indica se o usuário está bloqueado */
  isBlocked?: boolean;

  /** Motivo do bloqueio */
  blockedReason?: string;

  /** Data e hora do bloqueio */
  blockedAt?: string;

  /** ID do administrador que bloqueou */
  blockedBy?: string;

  /** Permissões granulares do usuário (JSONB) */
  permissions?: UserPermissions | Record<string, boolean>;

  /** ID do tenant/organização ao qual o usuário pertence */
  tenant_id?: string;
}

/**
 * Usuário com informações completas de bloqueio
 */
export interface UserWithBlockStatus extends User {
  blockStatus: BlockStatus;
}

/**
 * Representa dados para atualização de um usuário
 */
export interface UserUpdate {
  /** Identificador único do usuário */
  uid: string;
  
  /** Email do usuário (opcional para atualização) */
  email?: string;
  
  /** Função/cargo do usuário (obrigatório) */
  role: string;
  
  /** Tipo de usuário (opcional) */
  userType?: string;
} 