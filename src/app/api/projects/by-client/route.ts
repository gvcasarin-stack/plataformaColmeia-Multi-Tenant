/**
 * API para buscar outros projetos do mesmo cliente final (mesmo CPF/CNPJ) dentro do tenant.
 * Usada pelo modal "Conferir Informações do Projeto" para oferecer copiar dados de
 * endereço/contato/responsável legal já preenchidos em outro projeto do mesmo cliente.
 *
 * Retorna apenas campos de endereço/contato/responsável legal — nunca dados técnicos
 * ou financeiros do projeto, seguindo o mesmo padrão de segurança de
 * /api/projects/[id]/client-data (header x-tenant-id + filtro tenant_id + service role).
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

const CAMPOS_COPIAVEIS = [
  'id',
  'nomeClienteFinal',
  'endereco_local',
  'client_city',
  'client_state',
  'cliente_cep',
  'cliente_email',
  'cliente_celular',
  'cliente_telefone_fixo',
  'responsavel_legal_nome',
  'responsavel_legal_telefone',
  'responsavel_legal_email',
];

export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID não encontrado' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const cpfCnpj = (searchParams.get('cpf_cnpj') || '').replace(/\D/g, '');
    const excludeProjectId = searchParams.get('exclude_project_id') || '';

    if (!cpfCnpj) {
      return NextResponse.json({ success: true, data: null });
    }

    const supabase = createSupabaseServiceRoleClient();

    const { data, error } = await supabase
      .from('projects')
      .select(CAMPOS_COPIAVEIS.join(', '))
      .eq('tenant_id', tenantId)
      .eq('cpf_cnpj_cliente_final', cpfCnpj)
      .neq('id', excludeProjectId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      devLog.error('[API by-client] Erro ao buscar projeto do mesmo cliente:', error);
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: data || null });
  } catch (error: any) {
    devLog.error('[API by-client] Erro inesperado:', error);
    return NextResponse.json({ success: true, data: null });
  }
}
