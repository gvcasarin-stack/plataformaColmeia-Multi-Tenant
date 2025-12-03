import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ erro: 'Sem tenant-id' });
    }

    const supabase = createSupabaseServiceRoleClient();

    // 1. Buscar a assinatura
    const { data: assinaturas, error: errAssinatura } = await supabase
      .from('cliente_assinaturas')
      .select('id, user_id, projetos_usados_mes_atual')
      .eq('tenant_id', tenantId)
      .eq('status', 'ativa')
      .limit(1);

    if (errAssinatura || !assinaturas || assinaturas.length === 0) {
      return NextResponse.json({
        erro: 'Nenhuma assinatura encontrada',
        detalhes: errAssinatura
      });
    }

    const assinatura = assinaturas[0];

    // 2. Query EXATAMENTE como na API principal
    const { data: projetos1, error: err1 } = await supabase
      .from('projects')
      .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, payment_status, created_at')
      .eq('cliente_assinatura_id', assinatura.id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // 3. Query SIMPLIFICADA (sem order)
    const { data: projetos2, error: err2 } = await supabase
      .from('projects')
      .select('id, number, nome_cliente_final, potencia, created_at')
      .eq('cliente_assinatura_id', assinatura.id)
      .eq('tenant_id', tenantId);

    // 4. Query SUPER SIMPLES (só count)
    const { count, error: err3 } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_assinatura_id', assinatura.id)
      .eq('tenant_id', tenantId);

    // 5. Query SEM tenant_id (testar se é isso)
    const { data: projetos4, error: err4 } = await supabase
      .from('projects')
      .select('id, number, nome_cliente_final, tenant_id, cliente_assinatura_id')
      .eq('cliente_assinatura_id', assinatura.id);

    return NextResponse.json({
      '✅ TESTE DE QUERIES DIRETAS': '================================',
      'Assinatura ID': assinatura.id,
      'Tenant ID usado': tenantId,
      'Projetos usados (DB)': assinatura.projetos_usados_mes_atual,
      '': '================================',

      'Query 1 (COMPLETA como API)': {
        encontrou: projetos1?.length || 0,
        erro: err1?.message || null,
        projetos: projetos1?.map(p => ({
          numero: p.number,
          cliente: p.nome_cliente_final,
          assinatura_id: assinatura.id
        }))
      },

      'Query 2 (SIMPLIFICADA)': {
        encontrou: projetos2?.length || 0,
        erro: err2?.message || null,
        projetos: projetos2?.map(p => ({
          numero: p.number,
          cliente: p.nome_cliente_final
        }))
      },

      'Query 3 (COUNT)': {
        total: count,
        erro: err3?.message || null
      },

      'Query 4 (SEM filtro tenant)': {
        encontrou: projetos4?.length || 0,
        erro: err4?.message || null,
        projetos: projetos4?.map(p => ({
          numero: p.number,
          tenant: p.tenant_id,
          assinatura: p.cliente_assinatura_id
        }))
      },

      ' ': '================================',
      'DIAGNÓSTICO':
        (projetos1?.length || 0) > 0 ? 'Query completa FUNCIONA! Problema está em outro lugar.' :
        (count || 0) > 0 ? 'Projetos existem mas query completa não retorna. Problema nos SELECTs.' :
        (projetos4?.length || 0) > 0 ? 'Problema é o filtro tenant_id!' :
        'Nenhuma query encontrou. Projeto pode não existir ou cliente_assinatura_id está errado.'
    });

  } catch (error: any) {
    return NextResponse.json({
      erro: 'Erro no teste',
      mensagem: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
