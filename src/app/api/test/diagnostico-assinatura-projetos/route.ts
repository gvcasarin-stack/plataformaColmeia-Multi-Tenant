import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

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

    // 1. Buscar assinaturas do tenant
    const { data: assinaturas, error: assinaturasError } = await supabase
      .from('cliente_assinaturas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'ativa');

    if (assinaturasError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar assinaturas',
        details: assinaturasError
      });
    }

    if (!assinaturas || assinaturas.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma assinatura ativa encontrada',
        tenant_id: tenantId
      });
    }

    // Pegar a primeira assinatura
    const assinatura = assinaturas[0];

    // 2. Buscar TODOS os projetos vinculados a essa assinatura
    const { data: todosProjetos, error: projetosError } = await supabase
      .from('projects')
      .select('id, number, nome_cliente_final, potencia, status, created_at, cliente_assinatura_id')
      .eq('cliente_assinatura_id', assinatura.id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (projetosError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar projetos',
        details: projetosError
      });
    }

    // 3. Analisar as datas
    const agora = new Date();
    const ultimoReset = assinatura.ultimo_reset ? new Date(assinatura.ultimo_reset) : null;
    const proximoReset = assinatura.proximo_reset ? new Date(assinatura.proximo_reset) : null;
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

    // 4. Testar filtro em cada projeto
    const analiseProjetosPorProjeto = (todosProjetos || []).map((projeto) => {
      const dataCriacao = new Date(projeto.created_at);

      let dentroDoRangeReset = false;
      let dentroDosTrintaDias = false;
      let motivoExclusao = '';

      // Teste 1: Range de reset
      if (ultimoReset && proximoReset) {
        dentroDoRangeReset = dataCriacao >= ultimoReset && dataCriacao < proximoReset;
        if (!dentroDoRangeReset) {
          motivoExclusao = `Data ${dataCriacao.toISOString()} não está entre ${ultimoReset.toISOString()} e ${proximoReset.toISOString()}`;
        }
      } else {
        motivoExclusao = 'Sem datas de reset definidas';
      }

      // Teste 2: Últimos 30 dias (fallback)
      dentroDosTrintaDias = dataCriacao >= trintaDiasAtras;

      const incluido = dentroDoRangeReset || (!ultimoReset && !proximoReset && dentroDosTrintaDias);

      return {
        projeto_id: projeto.id,
        numero: projeto.number,
        cliente: projeto.nome_cliente_final,
        potencia: projeto.potencia,
        data_criacao: projeto.created_at,
        data_criacao_parsed: dataCriacao.toISOString(),
        dentro_range_reset: dentroDoRangeReset,
        dentro_30_dias: dentroDosTrintaDias,
        incluido_no_filtro: incluido,
        motivo_exclusao: incluido ? null : motivoExclusao
      };
    });

    // 5. Aplicar o filtro real (mesmo código da API)
    const projetosDoMesAtual = (todosProjetos || []).filter((projeto) => {
      const dataCriacao = new Date(projeto.created_at);

      // ✅ CORREÇÃO: Se tem as datas de reset, usar elas
      if (ultimoReset && proximoReset) {
        return dataCriacao >= ultimoReset && dataCriacao < proximoReset;
      }

      // ✅ CORREÇÃO: Se não tem datas, considerar projetos do mês atual (últimos 30 dias)
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      return dataCriacao >= trintaDiasAtras;
    });

    return NextResponse.json({
      success: true,
      diagnostico: {
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        assinatura: {
          id: assinatura.id,
          user_id: assinatura.user_id,
          projetos_mensais: assinatura.projetos_mensais,
          projetos_usados_mes_atual: assinatura.projetos_usados_mes_atual,
          data_inicio: assinatura.data_inicio,
          ultimo_reset: assinatura.ultimo_reset,
          proximo_reset: assinatura.proximo_reset,
          status: assinatura.status
        },
        datas_calculadas: {
          agora: agora.toISOString(),
          ultimo_reset: ultimoReset ? ultimoReset.toISOString() : null,
          proximo_reset: proximoReset ? proximoReset.toISOString() : null,
          trinta_dias_atras: trintaDiasAtras.toISOString(),
          tem_datas_reset: !!(ultimoReset && proximoReset)
        },
        projetos: {
          total_vinculados: todosProjetos?.length || 0,
          lista_todos: todosProjetos || [],
          analise_por_projeto: analiseProjetosPorProjeto,
          filtrados_como_mes_atual: projetosDoMesAtual.length,
          lista_filtrada: projetosDoMesAtual
        },
        conclusao: {
          problema_identificado: projetosDoMesAtual.length === 0 && (todosProjetos?.length || 0) > 0,
          total_projetos_banco: todosProjetos?.length || 0,
          total_projetos_filtrados: projetosDoMesAtual.length,
          projetos_usados_banco: assinatura.projetos_usados_mes_atual
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
