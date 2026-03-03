import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

/**
 * API de Diagnóstico: Simula exatamente o que o frontend faz ao carregar assinaturas
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado'
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // ====================================
    // PASSO 1: Buscar assinaturas (igual à API real)
    // ====================================
    const { data: clienteAssinaturas, error: assinaturasError } = await supabase
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

    if (assinaturasError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar assinaturas',
        details: assinaturasError
      });
    }

    if (!clienteAssinaturas || clienteAssinaturas.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma assinatura encontrada',
        tenant_id: tenantId
      });
    }

    // ====================================
    // PASSO 2: Para cada assinatura, buscar projetos (igual à API real)
    // ====================================
    const assinaturasComProjetos = await Promise.all(
      clienteAssinaturas.map(async (assinatura) => {
        // Buscar TODOS os projetos da assinatura
        const { data: todosProjetos, error: projetosError } = await supabase
          .from('projects')
          .select('id, number, empresa_integradora, nome_cliente_final, potencia, status, payment_status, created_at')
          .eq('cliente_assinatura_id', assinatura.id)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false });

        // Aplicar a lógica ATUAL da API (após a correção)
        const projetosDoMesAtual = todosProjetos || [];

        return {
          assinatura_original: assinatura,
          projetos_encontrados: {
            total: todosProjetos?.length || 0,
            lista: todosProjetos || [],
            erro: projetosError || null
          },
          projetos_do_mes_atual: {
            total: projetosDoMesAtual.length,
            lista: projetosDoMesAtual
          }
        };
      })
    );

    // ====================================
    // PASSO 3: Análise dos dados retornados
    // ====================================
    const primeiraAssinatura = assinaturasComProjetos[0];
    const assinatura = primeiraAssinatura.assinatura_original;

    return NextResponse.json({
      success: true,
      diagnostico: {
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),

        // 1. Dados da assinatura
        assinatura: {
          id: assinatura.id,
          status: assinatura.status,
          projetos_mensais: assinatura.projetos_mensais,
          projetos_usados_banco: assinatura.projetos_usados_mes_atual,
          usuario: assinatura.users,
          plano: assinatura.planos_assinatura
        },

        // 2. Projetos encontrados pela query
        projetos_query: {
          total_encontrado: primeiraAssinatura.projetos_encontrados.total,
          lista_completa: primeiraAssinatura.projetos_encontrados.lista,
          teve_erro: !!primeiraAssinatura.projetos_encontrados.erro,
          erro: primeiraAssinatura.projetos_encontrados.erro
        },

        // 3. Projetos após filtro "do mês atual"
        projetos_filtrados: {
          total_filtrado: primeiraAssinatura.projetos_do_mes_atual.total,
          lista_filtrada: primeiraAssinatura.projetos_do_mes_atual.lista
        },

        // 4. Análise final
        analise: {
          banco_diz: assinatura.projetos_usados_mes_atual,
          query_encontrou: primeiraAssinatura.projetos_encontrados.total,
          filtro_retornou: primeiraAssinatura.projetos_do_mes_atual.total,
          problema_identificado: {
            contador_correto: assinatura.projetos_usados_mes_atual === 1,
            query_funciona: primeiraAssinatura.projetos_encontrados.total === 1,
            filtro_correto: primeiraAssinatura.projetos_do_mes_atual.total === 1,
            conclusao: primeiraAssinatura.projetos_do_mes_atual.total === 1
              ? '✅ API retornando dados corretos - problema pode estar no frontend'
              : '❌ API não está retornando projetos - problema na API'
          }
        },

        // 5. Objeto completo que seria retornado ao frontend
        resposta_api_simulada: {
          success: true,
          data: assinaturasComProjetos.map(item => ({
            ...item.assinatura_original,
            projetos: item.projetos_encontrados.lista,
            projetosDoMesAtual: item.projetos_do_mes_atual.lista
          }))
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Erro no diagnóstico',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
