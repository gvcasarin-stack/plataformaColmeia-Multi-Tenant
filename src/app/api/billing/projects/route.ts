import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

const BILLING_SELECT = `
  id,
  tenant_id,
  number,
  nome_cliente_final,
  empresa_integradora,
  distribuidora,
  status,
  prioridade,
  potencia,
  valor_projeto,
  pagamento,
  billing_mode,
  data_pagamento_parcela1,
  data_pagamento_integral,
  created_at,
  updated_at,
  created_by,
  deleted_at,
  cpf_cnpj_cliente_final,
  endereco_local,
  numero_uc,
  client_city,
  client_state,
  havera_beneficiarias,
  tipo_conexao,
  tipo_ramal,
  tensao_atendimento
`;

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Billing] [Projects] Buscando projetos com informações de cobrança');

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Billing] [Projects] Service Role Key não disponível (provavelmente em build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    if (!tenantId) {
      devLog.warn('[API] [Billing] [Projects] Sem x-tenant-id; retornando vazio');
      return NextResponse.json({ success: true, data: [] });
    }

    const { data, error } = await supabase
      .from('projects')
      .select(`
        ${BILLING_SELECT},
        users!projects_created_by_fkey(
          id,
          email,
          full_name
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.warn('[API] [Billing] [Projects] Join falhou, tentando sem join:', error);

      const { data: projectsOnly, error: projectsError } = await supabase
        .from('projects')
        .select(BILLING_SELECT)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (projectsError) {
        devLog.warn('[API] [Billing] [Projects] Fallback falhou:', projectsError);
        return NextResponse.json({ success: true, data: [] });
      }

      const projectsWithBilling = projectsOnly?.map(project => ({
        ...project,
        client_id: project.created_by,
        client_name: 'Cliente não disponível',
        pagamento: project.pagamento || 'pendente',
        empresaIntegradora: project.empresa_integradora,
        nomeClienteFinal: project.nome_cliente_final,
        distribuidora: project.distribuidora,
        potencia: project.potencia,
        valorProjeto: project.valor_projeto || 0
      })) || [];

      devLog.log('[API] [Billing] [Projects] Projetos mapeados (fallback):', projectsWithBilling.length);
      return NextResponse.json({ success: true, data: projectsWithBilling });
    }

    const projectsWithBilling = data?.map(project => ({
      ...project,
      client_id: project.created_by,
      client_name: project.users?.full_name || project.users?.email || 'Cliente sem nome',
      client_email: project.users?.email,
      pagamento: project.pagamento || 'pendente',
      empresaIntegradora: project.empresa_integradora,
      nomeClienteFinal: project.nome_cliente_final,
      distribuidora: project.distribuidora,
      potencia: project.potencia,
      valorProjeto: project.valor_projeto || 0
    })) || [];

    devLog.log('[API] [Billing] [Projects] Projetos mapeados:', projectsWithBilling.length);
    return NextResponse.json({ success: true, data: projectsWithBilling });

  } catch (error) {
    devLog.warn('[API] [Billing] [Projects] Exceção:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
