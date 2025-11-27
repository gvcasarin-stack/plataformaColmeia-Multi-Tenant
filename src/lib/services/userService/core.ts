import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { User } from '@/types/user';
import logger from '@/lib/utils/logger';

/**
 * Busca um usuário pelo seu ID no Supabase.
 * @param userId O ID do usuário a ser buscado.
 * @returns Uma Promise que resolve para o objeto User ou null se não encontrado.
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    if (!userId) {
      logger.warn('[UserService/getUserById] Tentativa de buscar usuário com ID nulo ou indefinido.');
      return null;
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn(`[UserService/getUserById] Usuário com ID ${userId} não encontrado.`);
        return null;
      }
      throw error;
    }

    if (!userData) {
      logger.warn(`[UserService/getUserById] Usuário com ID ${userId} não encontrado.`);
      return null;
    }

    // Mapeamento para o tipo User
    return {
      uid: userData.id, // Supabase usa 'id' como chave primária
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || 'user',
      photoURL: userData.photo_url,
      displayName: userData.display_name || userData.name,
      emailVerified: userData.email_verified || false,
      // Campos adicionais do Supabase
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    } as User;
  } catch (error) {
    logger.error(`[UserService/getUserById] Erro ao buscar usuário ${userId}:`, error);
    return null;
  }
}

/**
 * Busca todos os usuários administradores (admin e superadmin).
 * @returns Uma Promise que resolve para um array de usuários administradores.
 */
export async function getAllAdminUsers(): Promise<User[]> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'superadmin']);

    if (error) {
      throw error;
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      logger.info("[UserService/getAllAdminUsers] Nenhum usuário admin ou superadmin encontrado.");
      return [];
    }
    
    const mappedUsers = adminUsers.map(userData => ({
      uid: userData.id, // Supabase usa 'id' como chave primária
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || 'user',
      photoURL: userData.photo_url,
      displayName: userData.display_name || userData.name,
      emailVerified: userData.email_verified || false,
      // Campos adicionais do Supabase
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    } as User));

    return mappedUsers;
  } catch (error) {
    logger.error("[UserService/getAllAdminUsers] Erro ao buscar usuários administradores:", error);
    return [];
  }
}

/**
 * Busca todos os usuários administradores de uma organização específica (tenant).
 * @param tenantId O ID da organização (tenant).
 * @returns Uma Promise que resolve para um array de usuários administradores do tenant.
 */
export async function getAllAdminUsersByTenant(tenantId: string): Promise<User[]> {
  try {
    if (!tenantId) {
      logger.warn('[UserService/getAllAdminUsersByTenant] Tentativa de buscar admins sem tenant_id.');
      return [];
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId) // FILTRO CRÍTICO: Apenas admins do mesmo tenant
      .in('role', ['admin', 'superadmin']);

    if (error) {
      logger.error(`[UserService/getAllAdminUsersByTenant] Erro ao buscar admins do tenant ${tenantId}:`, error);
      throw error;
    }
    
    if (!adminUsers || adminUsers.length === 0) {
      logger.info(`[UserService/getAllAdminUsersByTenant] Nenhum admin encontrado para tenant ${tenantId}.`);
      return [];
    }
    
    logger.info(`[UserService/getAllAdminUsersByTenant] Encontrados ${adminUsers.length} admins para tenant ${tenantId}.`);
    
    const mappedUsers = adminUsers.map(userData => ({
      uid: userData.id,
      email: userData.email || '',
      name: userData.name || userData.full_name || '', // Suporta ambos os campos
      role: userData.role || 'user',
      photoURL: userData.photo_url,
      displayName: userData.display_name || userData.name || userData.full_name,
      emailVerified: userData.email_verified || false,
      tenant_id: userData.tenant_id, // Incluir tenant_id no retorno
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    } as User));

    return mappedUsers;
  } catch (error) {
    logger.error(`[UserService/getAllAdminUsersByTenant] Erro ao buscar admins do tenant ${tenantId}:`, error);
    return [];
  }
}

/**
 * ✅ NOVO SISTEMA DE NOTIFICAÇÕES
 * Busca apenas admins e superadmins de um tenant (EXCLUI colaboradores).
 * Usado para notificações de projetos novos.
 * @param tenantId O ID da organização (tenant).
 * @returns Uma Promise que resolve para um array de admins + superadmins.
 */
export async function getAdminsAndSuperadminsByTenant(tenantId: string): Promise<User[]> {
  try {
    if (!tenantId) {
      logger.warn('[UserService/getAdminsAndSuperadminsByTenant] Tentativa de buscar sem tenant_id.');
      return [];
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin']); // APENAS admin e superadmin, SEM colaborador

    if (error) {
      logger.error(`[UserService/getAdminsAndSuperadminsByTenant] Erro ao buscar admins do tenant ${tenantId}:`, error);
      throw error;
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.info(`[UserService/getAdminsAndSuperadminsByTenant] Nenhum admin/superadmin encontrado para tenant ${tenantId}.`);
      return [];
    }

    logger.info(`[UserService/getAdminsAndSuperadminsByTenant] Encontrados ${adminUsers.length} admins/superadmins para tenant ${tenantId}.`);

    const mappedUsers = adminUsers.map(userData => ({
      uid: userData.id,
      email: userData.email || '',
      name: userData.name || userData.full_name || '',
      role: userData.role || 'user',
      photoURL: userData.photo_url,
      displayName: userData.display_name || userData.name || userData.full_name,
      emailVerified: userData.email_verified || false,
      tenant_id: userData.tenant_id,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    } as User));

    return mappedUsers;
  } catch (error) {
    logger.error(`[UserService/getAdminsAndSuperadminsByTenant] Erro:`, error);
    return [];
  }
}

/**
 * ✅ NOVO SISTEMA DE NOTIFICAÇÕES
 * Busca TODOS os membros administrativos de um tenant (admins + superadmin + colaboradores).
 * Usado para notificações de projetos sem responsável quando cliente age.
 * @param tenantId O ID da organização (tenant).
 * @returns Uma Promise que resolve para um array de todos os membros administrativos.
 */
export async function getAllAdministrativeRolesByTenant(tenantId: string): Promise<User[]> {
  try {
    if (!tenantId) {
      logger.warn('[UserService/getAllAdministrativeRolesByTenant] Tentativa de buscar sem tenant_id.');
      return [];
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: adminUsers, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin', 'colaborador']); // TODOS os membros administrativos

    if (error) {
      logger.error(`[UserService/getAllAdministrativeRolesByTenant] Erro ao buscar membros do tenant ${tenantId}:`, error);
      throw error;
    }

    if (!adminUsers || adminUsers.length === 0) {
      logger.info(`[UserService/getAllAdministrativeRolesByTenant] Nenhum membro administrativo encontrado para tenant ${tenantId}.`);
      return [];
    }

    logger.info(`[UserService/getAllAdministrativeRolesByTenant] Encontrados ${adminUsers.length} membros administrativos para tenant ${tenantId}.`);

    const mappedUsers = adminUsers.map(userData => ({
      uid: userData.id,
      email: userData.email || '',
      name: userData.name || userData.full_name || '',
      role: userData.role || 'user',
      photoURL: userData.photo_url,
      displayName: userData.display_name || userData.name || userData.full_name,
      emailVerified: userData.email_verified || false,
      tenant_id: userData.tenant_id,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
    } as User));

    return mappedUsers;
  } catch (error) {
    logger.error(`[UserService/getAllAdministrativeRolesByTenant] Erro:`, error);
    return [];
  }
}

// Poderia haver outras funções de serviço de usuário aqui, como:
// export async function updateUserProfile(userId: string, profileData: Partial<User>): Promise<boolean> { ... }
// export async function createUserAccount(userData: NewUserParams): Promise<User | null> { ... }
