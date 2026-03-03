import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

/**
 * API DE TESTE - Diagnóstico de Assinaturas Disponíveis
 * 
 * Acesse: /api/test/assinaturas-disponiveis
 * 
 * Esta API testa diretamente a busca de assinaturas sem depender de um projeto específico
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tenant não identificado',
          ajuda: 'Faça login como admin para que o tenant_id seja identificado'
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // ========================================
    // 1. BUSCAR PLANOS DO TENANT
    // ========================================
    const { data: planos, error: planosError } = await supabase
      .from('planos_assinatura')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ativo', true);

    // ========================================
    // 2. BUSCAR ASSINATURAS ATIVAS DO TENANT
    // ========================================
    const { data: assinaturas, error: assinaturasError } = await supabase
      .from('cliente_assinaturas')
      .select(`
        id,
        plano_id,
        user_id,
        status,
        projetos_usados_mes_atual,
        projetos_mensais,
        data_inicio,
        proximo_reset,
        plano:planos_assinatura(
          id,
          nome,
          quantidade_mensal,
          potencia_maxima_kwp
        ),
        user:users!user_id(
          id,
          email,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativa');

    // ========================================
    // 3. FILTRAR ASSINATURAS COM QUOTA
    // ========================================
    const assinaturasComQuota = (assinaturas || []).filter(a => {
      const temPlano = !!a.plano;
      const temQuota = temPlano && a.projetos_usados_mes_atual < a.plano.quantidade_mensal;
      return temQuota;
    });

    // ========================================
    // 4. MAPEAR PARA FORMATO DO MODAL
    // ========================================
    const assinaturasMapeadas = assinaturasComQuota.map(a => ({
      id: a.id,
      nome: a.plano.nome,
      empresa: a.user?.name || 'N/A',
      quota: `${a.projetos_usados_mes_atual}/${a.plano.quantidade_mensal}`,
      vagas_disponiveis: a.plano.quantidade_mensal - a.projetos_usados_mes_atual,
      proximo_reset: a.proximo_reset
    }));

    // ========================================
    // 5. DIAGNÓSTICO COMPLETO
    // ========================================
    const diagnostico = {
      tenant_id: tenantId,
      planos: {
        total: planos?.length || 0,
        erro: planosError?.message || null,
        lista: planos?.map(p => ({
          id: p.id,
          nome: p.nome,
          quantidade_mensal: p.quantidade_mensal,
          ativo: p.ativo
        })) || []
      },
      assinaturas_brutas: {
        total: assinaturas?.length || 0,
        erro: assinaturasError?.message || null,
        lista: assinaturas?.map(a => ({
          id: a.id,
          status: a.status,
          user_id: a.user_id,
          user_name: a.user?.name || 'NULL',
          plano_id: a.plano_id,
          plano_nome: a.plano?.nome || 'NULL',
          quantidade_mensal: a.plano?.quantidade_mensal || 'NULL',
          projetos_usados: a.projetos_usados_mes_atual,
          projetos_mensais: a.projetos_mensais,
          tem_plano: !!a.plano,
          tem_user: !!a.user,
        })) || []
      },
      assinaturas_com_quota: {
        total: assinaturasComQuota.length,
        lista: assinaturasComQuota.map(a => ({
          id: a.id,
          plano_nome: a.plano.nome,
          cliente: a.user?.name,
          quota: `${a.projetos_usados_mes_atual}/${a.plano.quantidade_mensal}`,
          vagas: a.plano.quantidade_mensal - a.projetos_usados_mes_atual
        }))
      },
      assinaturas_mapeadas: {
        total: assinaturasMapeadas.length,
        lista: assinaturasMapeadas
      }
    };

    // ========================================
    // 6. VERIFICAÇÕES
    // ========================================
    const verificacoes = {
      tem_planos: (planos?.length || 0) > 0,
      tem_assinaturas: (assinaturas?.length || 0) > 0,
      tem_assinaturas_com_quota: assinaturasComQuota.length > 0,
      problema_identificado: []
    };

    if (!verificacoes.tem_planos) {
      verificacoes.problema_identificado.push('❌ Não há planos cadastrados para este tenant');
    }
    if (!verificacoes.tem_assinaturas) {
      verificacoes.problema_identificado.push('❌ Não há assinaturas ativas para este tenant');
    }
    if (verificacoes.tem_assinaturas && !verificacoes.tem_assinaturas_com_quota) {
      verificacoes.problema_identificado.push('⚠️ Há assinaturas, mas todas estão com quota esgotada ou sem plano vinculado');
    }
    if (verificacoes.tem_assinaturas_com_quota) {
      verificacoes.problema_identificado.push('✅ Tudo está correto! As assinaturas devem aparecer no modal');
    }

    // ========================================
    // RESPOSTA FINAL
    // ========================================
    return NextResponse.json({
      success: true,
      mensagem: verificacoes.tem_assinaturas_com_quota 
        ? '✅ Assinaturas encontradas e prontas para uso!'
        : '⚠️ Nenhuma assinatura disponível encontrada',
      verificacoes,
      diagnostico,
      solucao: verificacoes.tem_assinaturas_com_quota 
        ? 'As assinaturas devem aparecer no modal. Se não aparecerem, limpe o cache do navegador.'
        : 'Execute o script scripts/criar-assinatura-teste.sql para criar uma assinatura de teste.',
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro ao buscar assinaturas',
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

