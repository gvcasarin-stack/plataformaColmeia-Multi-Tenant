/**
 * ⚠️ TODO: MIGRAR PARA SUPABASE
 * 
 * Roles Utils - STUB TEMPORÁRIO
 * Funções de gerenciamento de roles migradas para Supabase
 */

import { devLog } from "@/lib/utils/productionLogger";

// ⚠️ STUB: setUserRole
export async function setUserRole(userId: string, role: 'admin' | 'client') {
  try {
    devLog.warn(`[Roles] STUB: setUserRole(${userId}, ${role}) - TODO: migrar para Supabase`);
    return true;
  } catch (error) {
    devLog.error('[Roles] STUB: Erro ao definir role do usuário:', error);
    throw error;
  }
}

// ⚠️ STUB: getUserRole
export async function getUserRole(userId: string): Promise<'admin' | 'client' | null> {
  try {
    devLog.warn(`[Roles] STUB: getUserRole(${userId}) - TODO: migrar para Supabase`);
    return 'client'; // Retorno padrão
  } catch (error) {
    devLog.error('[Roles] STUB: Erro ao obter role do usuário:', error);
    return null;
  }
}
