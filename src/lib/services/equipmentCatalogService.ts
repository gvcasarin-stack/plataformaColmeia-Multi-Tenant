import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export interface EquipmentCatalogItem {
  id: string;
  tenant_id: string;
  tipo: 'modulo' | 'inversor';
  fabricante: string;
  modelo: string;
  // Módulos
  potencia_wp?: number | null;
  voc?: number | null;
  isc?: number | null;
  vpmp?: number | null;
  ipmp?: number | null;
  eficiencia?: number | null;
  comprimento_m?: number | null;
  largura_m?: number | null;
  area_unitaria_m2?: number | null;
  peso_kg?: number | null;
  // Inversores
  potencia_kw?: number | null;
  tensao?: string | null;
  vcc_max?: number | null;
  icc_max?: number | null;
  vpmp_max?: number | null;
  vpmp_min?: number | null;
  vcc_partida?: number | null;
  faixa_tensao?: string | null;
  corrente_nominal?: number | null;
  fator_potencia?: string | null;
  rendimento?: number | null;
  dht_corrente?: number | null;
  entradas_por_mppt?: number | null;
  quantidade_mppt?: number | null;
  potencia_max_saida?: number | null;
  tensao_max_ca?: number | null;
  tensao_min_ca?: number | null;
  tipo_conexao_saida?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function listEquipment(
  tenantId: string,
  tipo?: string,
  q?: string,
): Promise<EquipmentCatalogItem[]> {
  const supabase = createSupabaseServiceRoleClient();
  let query = supabase
    .from('equipment_catalog')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('fabricante', { ascending: true })
    .order('modelo', { ascending: true });

  if (tipo === 'modulo' || tipo === 'inversor') {
    query = query.eq('tipo', tipo);
  }
  if (q && q.trim()) {
    const search = q.trim().toLowerCase();
    query = query.or(`fabricante.ilike.%${search}%,modelo.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as EquipmentCatalogItem[];
}

// Normaliza texto para comparação robusta (case, espaços duplicados, trim)
function normalizeForComparison(value: string | null | undefined): string {
  return (value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export async function createEquipment(
  tenantId: string,
  payload: Omit<EquipmentCatalogItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>,
): Promise<EquipmentCatalogItem> {
  const supabase = createSupabaseServiceRoleClient();

  const normFabricante = normalizeForComparison(payload.fabricante);
  const normModelo = normalizeForComparison(payload.modelo);

  // Checagem robusta de duplicidade: mesmo tenant + tipo, com fabricante/modelo
  // comparados ignorando maiúsculas/minúsculas e espaços extras. Busca todos os
  // candidatos do mesmo tipo (em vez de um único ilike) para não deixar passar
  // variações óbvias de digitação (espaços duplicados, caixa alta/baixa, etc).
  const { data: candidates, error: candidatesError } = await supabase
    .from('equipment_catalog')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('tipo', payload.tipo);

  if (candidatesError) throw candidatesError;

  const existing = (candidates || []).find(
    (c) =>
      normalizeForComparison(c.fabricante) === normFabricante &&
      normalizeForComparison(c.modelo) === normModelo,
  );

  if (existing) {
    return existing as EquipmentCatalogItem;
  }

  const { data, error } = await supabase
    .from('equipment_catalog')
    .insert({
      ...payload,
      fabricante: (payload.fabricante || '').trim(),
      modelo: (payload.modelo || '').trim(),
      tenant_id: tenantId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as EquipmentCatalogItem;
}

export async function updateEquipment(
  tenantId: string,
  id: string,
  payload: Partial<Omit<EquipmentCatalogItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>,
): Promise<EquipmentCatalogItem> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from('equipment_catalog')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  if (!data) throw new Error('Equipamento não encontrado');
  return data as EquipmentCatalogItem;
}

export async function deleteEquipment(tenantId: string, id: string): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from('equipment_catalog')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}
