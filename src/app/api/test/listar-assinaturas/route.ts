import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

/**
 * API DE TESTE - Diagnóstico de Listagem de Assinaturas
 * Acesse: /api/test/listar-assinaturas
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    const supabase = createSupabaseServiceRoleClient();

    // 1. Verificar tenant
    const diagnostico: any = {
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    };

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant não identificado',
        diagnostico
      });
    }

    // 2. Buscar TODAS as assinaturas (sem filtro)
    const { data: todasAssinaturas, error: errorTodas } = await supabase
      .from('cliente_assinaturas')
      .select('*')
      .order('created_at', { ascending: false });

    diagnostico.todas_assinaturas = {
      total: todasAssinaturas?.length || 0,
      erro: errorTodas?.message || null,
      lista: todasAssinaturas?.map(a => ({
        id: a.id,
        tenant_id: a.tenant_id,
        status: a.status,
        user_id: a.user_id,
        plano_id: a.plano_id,
        created_at: a.created_at
      })) || []
    };

    // 3. Buscar assinaturas do tenant
    const { data: assinaturasTenant, error: errorTenant } = await supabase
      .from('cliente_assinaturas')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    diagnostico.assinaturas_do_tenant = {
      total: assinaturasTenant?.length || 0,
      erro: errorTenant?.message || null,
      lista: assinaturasTenant?.map(a => ({
        id: a.id,
        tenant_id: a.tenant_id,
        status: a.status,
        user_id: a.user_id,
        plano_id: a.plano_id,
        projetos_mensais: a.projetos_mensais,
        projetos_usados_mes_atual: a.projetos_usados_mes_atual,
        created_at: a.created_at
      })) || []
    };

    // 4. Simular EXATAMENTE a query da API real
    // ✅ CORREÇÃO: Removido 'data_cancelamento' que não existe
    const { data: assinaturasAPI, error: errorAPI } = await supabase
      .from('cliente_assinaturas')
      .select(`
        id,
        user_id,
        plano_id,
        tenant_id,
        data_inicio,
        dia_renovacao,
        projetos_mensais,
        projetos_usados_mes_atual,
        ultimo_reset,
        proximo_reset,
        status,
        payment_status,
        data_pagamento_parcela1,
        data_pagamento_integral,
        created_at,
        updated_at,
        users:user_id (
          id,
          name,
          email,
          company_name,
          tenant_id
        ),
        planos_assinatura:plano_id (
          id,
          nome,
          quantidade_mensal,
          valor_mensal,
          dia_renovacao,
          potencia_maxima_kwp
        )
      `)
      .eq('tenant_id', tenantId)
      .order('data_inicio', { ascending: false });

    diagnostico.query_api_real = {
      total: assinaturasAPI?.length || 0,
      erro: errorAPI?.message || null,
      erro_detalhes: errorAPI?.details || null,
      erro_hint: errorAPI?.hint || null,
      lista: assinaturasAPI?.map(a => ({
        id: a.id,
        tenant_id: a.tenant_id,
        status: a.status,
        user_id: a.user_id,
        user_name: a.users?.name || 'NULL',
        plano_id: a.plano_id,
        plano_nome: a.planos_assinatura?.nome || 'NULL',
        plano_valor_mensal: a.planos_assinatura?.valor_mensal || 'NULL',
        tem_user: !!a.users,
        tem_plano: !!a.planos_assinatura,
        projetos_mensais: a.projetos_mensais,
        projetos_usados: a.projetos_usados_mes_atual
      })) || []
    };

    // 5. Verificações
    const verificacoes = {
      tenant_id_valido: !!tenantId,
      tem_assinaturas_no_banco: (todasAssinaturas?.length || 0) > 0,
      tem_assinaturas_no_tenant: (assinaturasTenant?.length || 0) > 0,
      query_api_retorna_dados: (assinaturasAPI?.length || 0) > 0,
      problemas: [] as string[]
    };

    if (!verificacoes.tenant_id_valido) {
      verificacoes.problemas.push('❌ Tenant ID não identificado');
    }
    if (!verificacoes.tem_assinaturas_no_banco) {
      verificacoes.problemas.push('❌ Não há NENHUMA assinatura no banco de dados');
    }
    if (verificacoes.tem_assinaturas_no_banco && !verificacoes.tem_assinaturas_no_tenant) {
      verificacoes.problemas.push('❌ Há assinaturas no banco, mas nenhuma com o tenant_id: ' + tenantId);
    }
    if (verificacoes.tem_assinaturas_no_tenant && !verificacoes.query_api_retorna_dados) {
      verificacoes.problemas.push('⚠️ Há assinaturas do tenant, mas a query com JOINs não retorna dados (problema nos JOINs)');
    }
    if (verificacoes.query_api_retorna_dados) {
      verificacoes.problemas.push('✅ Tudo está funcionando! A API deveria estar retornando dados.');
    }

    return NextResponse.json({
      success: true,
      mensagem: verificacoes.problemas[0] || 'Diagnóstico concluído',
      verificacoes,
      diagnostico
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

