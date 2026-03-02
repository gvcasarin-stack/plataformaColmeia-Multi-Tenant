/**
 * @file dimensionamentoService.ts
 * @description Service para gerenciar dimensionamentos de sistemas fotovoltaicos
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { Dimensionamento, DimensionamentoInput } from '@/types/dimensionamento';
import { devLog } from '@/lib/utils/productionLogger';

// ✅ Detectar ambiente e usar cliente apropriado
function getSupabaseClient() {
  if (typeof window === 'undefined') {
    return createSupabaseServiceRoleClient();
  } else {
    return createSupabaseBrowserClient();
  }
}

// =====================================================
// CRIAR DIMENSIONAMENTO
// =====================================================

export async function createDimensionamento(
  input: DimensionamentoInput,
  userId: string,
  tenantId: string,
  resultados: {
    sistema_fv?: any;
    sistema_baterias?: any;
    sistema_inversor?: any;
    economia_mensal?: number;
  }
): Promise<Dimensionamento | null> {
  try {
    devLog.log('[createDimensionamento] Criando dimensionamento:', { input, userId, tenantId });

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('dimensionamentos')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        tipo_sistema: input.tipo_sistema,
        tipo_consumidor: input.tipo_consumidor,
        objetivo_bateria: input.objetivo_bateria || null,
        backup_com_fv: input.backup_com_fv || false,
        tipo_ligacao: input.tipo_ligacao || null,
        consumo_mensal: input.consumo_mensal,
        estado: input.estado,
        irradiacao: input.irradiacao,
        autonomia_desejada: input.autonomia_desejada || null,
        potencia_modulo: input.potencia_modulo || 550,
        cargas: input.cargas || [],
        sistema_fv: resultados.sistema_fv || null,
        sistema_baterias: resultados.sistema_baterias || null,
        sistema_inversor: resultados.sistema_inversor || null,
        economia_mensal: resultados.economia_mensal || null,
      })
      .select()
      .single();

    if (error) {
      devLog.error('[createDimensionamento] Erro ao criar dimensionamento:', error);
      throw error;
    }

    devLog.log('[createDimensionamento] Dimensionamento criado com sucesso:', data);
    return data as Dimensionamento;
  } catch (error) {
    devLog.error('[createDimensionamento] Erro inesperado:', error);
    throw error;
  }
}

// =====================================================
// LISTAR DIMENSIONAMENTOS DO USUÁRIO
// =====================================================

export async function getDimensionamentos(
  userId: string,
  filters?: {
    tipo_sistema?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Dimensionamento[]> {
  try {
    devLog.log('[getDimensionamentos] Buscando dimensionamentos:', { userId, filters });

    const supabase = getSupabaseClient();
    let query = supabase
      .from('dimensionamentos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.tipo_sistema) {
      query = query.eq('tipo_sistema', filters.tipo_sistema);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(
        filters.offset,
        filters.offset + (filters.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      devLog.error('[getDimensionamentos] Erro ao buscar dimensionamentos:', error);
      throw error;
    }

    devLog.log('[getDimensionamentos] Dimensionamentos encontrados:', data?.length || 0);
    return (data || []) as Dimensionamento[];
  } catch (error) {
    devLog.error('[getDimensionamentos] Erro inesperado:', error);
    throw error;
  }
}

// =====================================================
// BUSCAR DIMENSIONAMENTO POR ID
// =====================================================

export async function getDimensionamentoById(
  id: string,
  userId: string
): Promise<Dimensionamento | null> {
  try {
    devLog.log('[getDimensionamentoById] Buscando dimensionamento:', { id, userId });

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('dimensionamentos')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        devLog.warn('[getDimensionamentoById] Dimensionamento não encontrado:', id);
        return null;
      }
      throw error;
    }

    devLog.log('[getDimensionamentoById] Dimensionamento encontrado');
    return data as Dimensionamento;
  } catch (error) {
    devLog.error('[getDimensionamentoById] Erro inesperado:', error);
    throw error;
  }
}

// =====================================================
// DELETAR DIMENSIONAMENTO
// =====================================================

export async function deleteDimensionamento(
  id: string,
  userId: string
): Promise<boolean> {
  try {
    devLog.log('[deleteDimensionamento] Deletando dimensionamento:', { id, userId });

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('dimensionamentos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      devLog.error('[deleteDimensionamento] Erro ao deletar dimensionamento:', error);
      throw error;
    }

    devLog.log('[deleteDimensionamento] Dimensionamento deletado com sucesso');
    return true;
  } catch (error) {
    devLog.error('[deleteDimensionamento] Erro inesperado:', error);
    throw error;
  }
}

// =====================================================
// ATUALIZAR DIMENSIONAMENTO
// =====================================================

export async function updateDimensionamento(
  id: string,
  userId: string,
  updates: Partial<DimensionamentoInput> & {
    sistema_fv?: any;
    sistema_baterias?: any;
    sistema_inversor?: any;
    economia_mensal?: number;
  }
): Promise<Dimensionamento | null> {
  try {
    devLog.log('[updateDimensionamento] Atualizando dimensionamento:', { id, userId, updates });

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('dimensionamentos')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      devLog.error('[updateDimensionamento] Erro ao atualizar dimensionamento:', error);
      throw error;
    }

    devLog.log('[updateDimensionamento] Dimensionamento atualizado com sucesso');
    return data as Dimensionamento;
  } catch (error) {
    devLog.error('[updateDimensionamento] Erro inesperado:', error);
    throw error;
  }
}

// =====================================================
// CONTAR DIMENSIONAMENTOS DO USUÁRIO
// =====================================================

export async function countDimensionamentos(
  userId: string,
  tipo_sistema?: string
): Promise<number> {
  try {
    devLog.log('[countDimensionamentos] Contando dimensionamentos:', { userId, tipo_sistema });

    const supabase = getSupabaseClient();
    let query = supabase
      .from('dimensionamentos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (tipo_sistema) {
      query = query.eq('tipo_sistema', tipo_sistema);
    }

    const { count, error } = await query;

    if (error) {
      devLog.error('[countDimensionamentos] Erro ao contar dimensionamentos:', error);
      throw error;
    }

    devLog.log('[countDimensionamentos] Total de dimensionamentos:', count);
    return count || 0;
  } catch (error) {
    devLog.error('[countDimensionamentos] Erro inesperado:', error);
    throw error;
  }
}

