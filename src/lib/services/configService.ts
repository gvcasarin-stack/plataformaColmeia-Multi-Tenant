// ✅ SUPABASE - Serviço de configurações do sistema
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import logger from '@/lib/utils/logger';

export interface SystemConfig {
  id?: string;
  key: string;
  value: any;
  description?: string;
  category?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca uma configuração específica por chave
 */
export async function getConfig(key: string): Promise<any | null> {
  try {
    logger.info('[ConfigService] Buscando configuração:', key);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('configs')
      .select('value')
      .eq('key', key)
      .eq('is_active', true)
      .single();

    if (error) {
      logger.error('[ConfigService] Erro ao buscar configuração:', error);
      return null;
    }

    logger.info('[ConfigService] Configuração encontrada:', { key, value: data.value });
    return data.value;
  } catch (error) {
    logger.error('[ConfigService] Exceção ao buscar configuração:', error);
    return null;
  }
}

/**
 * Busca todas as configurações de uma categoria
 */
export async function getConfigsByCategory(category: string): Promise<SystemConfig[]> {
  try {
    logger.info('[ConfigService] Buscando configurações da categoria:', category);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('configs')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .order('key');

    if (error) {
      logger.error('[ConfigService] Erro ao buscar configurações:', error);
      return [];
    }

    logger.info('[ConfigService] Configurações encontradas:', data?.length || 0);
    return data || [];
  } catch (error) {
    logger.error('[ConfigService] Exceção ao buscar configurações:', error);
    return [];
  }
}

/**
 * Busca todas as configurações ativas
 */
export async function getAllConfigs(): Promise<SystemConfig[]> {
  try {
    logger.info('[ConfigService] Buscando todas as configurações');
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('configs')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      logger.error('[ConfigService] Erro ao buscar todas as configurações:', error);
      return [];
    }

    logger.info('[ConfigService] Total de configurações encontradas:', data?.length || 0);
    return data || [];
  } catch (error) {
    logger.error('[ConfigService] Exceção ao buscar todas as configurações:', error);
    return [];
  }
}

/**
 * Atualiza uma configuração existente
 */
export async function updateConfig(
  key: string, 
  value: any, 
  updatedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[ConfigService] Atualizando configuração:', { key, value });
    
    const supabase = createSupabaseServiceRoleClient();
    
    const updateData: any = {
      value,
      updated_at: new Date().toISOString()
    };
    
    if (updatedBy) {
      updateData.updated_by = updatedBy;
    }
    
    const { error } = await supabase
      .from('configs')
      .update(updateData)
      .eq('key', key);

    if (error) {
      logger.error('[ConfigService] Erro ao atualizar configuração:', error);
      return { success: false, error: error.message };
    }

    logger.info('[ConfigService] Configuração atualizada com sucesso:', key);
    return { success: true };
  } catch (error) {
    logger.error('[ConfigService] Exceção ao atualizar configuração:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Cria uma nova configuração
 */
export async function createConfig(
  config: Omit<SystemConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    logger.info('[ConfigService] Criando nova configuração:', config.key);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('configs')
      .insert([{
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      logger.error('[ConfigService] Erro ao criar configuração:', error);
      return { success: false, error: error.message };
    }

    logger.info('[ConfigService] Configuração criada com sucesso:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    logger.error('[ConfigService] Exceção ao criar configuração:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Remove uma configuração (marca como inativa)
 */
export async function deleteConfig(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    logger.info('[ConfigService] Removendo configuração:', key);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { error } = await supabase
      .from('configs')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('key', key);

    if (error) {
      logger.error('[ConfigService] Erro ao remover configuração:', error);
      return { success: false, error: error.message };
    }

    logger.info('[ConfigService] Configuração removida com sucesso:', key);
    return { success: true };
  } catch (error) {
    logger.error('[ConfigService] Exceção ao remover configuração:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// ============================================================================
// CONFIGURAÇÕES ESPECÍFICAS DO SISTEMA
// ============================================================================

/**
 * Busca configurações de segurança
 */
export async function getSecurityConfigs() {
  const configs = await getConfigsByCategory('security');
  return {
    sessionTimeoutMinutes: configs.find(c => c.key === 'session_timeout_minutes')?.value || 20,
    maxSessionHours: configs.find(c => c.key === 'max_session_hours')?.value || 8,
  };
}

/**
 * Busca configurações de limites
 */
export async function getLimitConfigs() {
  const configs = await getConfigsByCategory('limits');
  return {
    maxProjectsPerClient: configs.find(c => c.key === 'max_projects_per_client')?.value || 10,
  };
}

/**
 * Busca configurações de funcionalidades
 */
export async function getFeatureConfigs() {
  const configs = await getConfigsByCategory('features');
  return {
    enableNotifications: configs.find(c => c.key === 'enable_notifications')?.value || true,
    enableEmailNotifications: configs.find(c => c.key === 'enable_email_notifications')?.value || true,
  };
}

/**
 * Busca configurações do Kanban
 */
export async function getKanbanConfigs() {
  const configs = await getConfigsByCategory('kanban');
  return {
    columns: configs.find(c => c.key === 'kanban_columns')?.value || 
      ['backlog', 'planejamento', 'em_andamento', 'revisao', 'concluido'],
  };
} 