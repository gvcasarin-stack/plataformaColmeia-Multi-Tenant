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

// Poderia haver outras funções de serviço de usuário aqui, como:
// export async function updateUserProfile(userId: string, profileData: Partial<User>): Promise<boolean> { ... }
// export async function createUserAccount(userData: NewUserParams): Promise<User | null> { ... }
