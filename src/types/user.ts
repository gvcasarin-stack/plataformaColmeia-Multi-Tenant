/**
 * Tipos de usuário suportados pelo sistema
 */
export type UserType = 'admin' | 'client' | 'superadmin';

/**
 * Funções/cargos de usuário suportados
 */
export type UserRole = 'Administrador' | 'Cliente' | 'Super Administrador' | 'Técnico' | 'Gerente';

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
