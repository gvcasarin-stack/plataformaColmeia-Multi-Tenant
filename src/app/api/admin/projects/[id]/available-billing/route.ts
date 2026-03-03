import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

/**
 * GET: Buscar pacotes e assinaturas disponíveis para converter um projeto
 *
 * Retorna apenas pacotes/assinaturas ATIVOS e COM QUOTA DISPONÍVEL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const projectId = params.id;

    // 1. Buscar projeto para validação
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, billing_mode')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // 2. Buscar TODOS os pacotes ativos do tenant (empresa)
    // ✅ CORREÇÃO: Incluir JOINs para pacotes_definicoes e users
    const { data: pacotes, error: pacotesError } = await supabase
      .from('cliente_pacotes')
      .select(`
        *,
        pacote:pacotes_definicoes!pacote_id (
          id,
          nome,
          quantidade_projetos,
          valor,
          potencia_maxima_kwp,
          validade_dias
        ),
        user:users!user_id (
          id,
          name,
          email
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativo');

    // 🔍 DIAGNÓSTICO DETALHADO
    devLog.log('[available-billing] 🔍 DIAGNÓSTICO - Query Supabase:', {
      tenant_id: tenantId,
      total_retornado: pacotes?.length || 0,
      erro: pacotesError?.message || null,
      erro_detalhes: pacotesError?.details || null,
      erro_hint: pacotesError?.hint || null,
    });

    if (pacotes && pacotes.length > 0) {
      devLog.log('[available-billing] 🔍 DIAGNÓSTICO - Pacotes BRUTOS:',
        pacotes.map(p => ({
          id: p.id,
          user_id: p.user_id,
          pacote_id: p.pacote_id,
          status: p.status,
          quota: `${p.projetos_usados}/${p.projetos_inclusos}`,
          tem_pacote_obj: !!p.pacote,
          tem_user_obj: !!p.user,
          pacote_nome: p.pacote?.nome || 'NULL',
          user_nome: p.user?.name || 'NULL',
        }))
      );
    }

    if (pacotesError) {
      devLog.error('[available-billing] ❌ ERRO ao buscar pacotes:', pacotesError);
      // 🆕 RETORNAR ERRO ao invés de continuar silenciosamente
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao buscar pacotes: ${pacotesError.message}`,
          details: pacotesError.details,
          hint: pacotesError.hint
        },
        { status: 500 }
      );
    }

    // Filtrar apenas pacotes com quota disponível
    const pacotesDisponiveis = (pacotes || []).filter(p =>
      p.projetos_usados < p.projetos_inclusos
    );

    devLog.log('[available-billing] 🔍 DIAGNÓSTICO - Após Filtro:', {
      antes_filtro: pacotes?.length || 0,
      depois_filtro: pacotesDisponiveis.length,
    });

    // 3. Buscar TODAS as assinaturas ativas do tenant (empresa)
    // ✅ CORREÇÃO: Usar campo correto 'quantidade_mensal' ao invés de 'projetos_por_mes'
    const { data: assinaturas, error: assinaturasError } = await supabase
      .from('cliente_assinaturas')
      .select(`
        id,
        plano_id,
        user_id,
        status,
        projetos_usados_mes_atual,
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

    // 🔍 DIAGNÓSTICO DETALHADO ASSINATURAS
    devLog.log('[available-billing] 🔍 DIAGNÓSTICO - Assinaturas Query:', {
      tenant_id: tenantId,
      total_retornado: assinaturas?.length || 0,
      erro: assinaturasError?.message || null,
      erro_detalhes: assinaturasError?.details || null,
    });

    if (assinaturas && assinaturas.length > 0) {
      devLog.log('[available-billing] 🔍 DIAGNÓSTICO - Assinaturas BRUTAS:',
        assinaturas.map(a => ({
          id: a.id,
          user_id: a.user_id,
          plano_id: a.plano_id,
          status: a.status,
          quota: `${a.projetos_usados_mes_atual}/${a.plano?.quantidade_mensal || 'NULL'}`,
          tem_plano_obj: !!a.plano,
          tem_user_obj: !!a.user,
          plano_nome: a.plano?.nome || 'NULL',
          user_nome: a.user?.name || 'NULL',
          quantidade_mensal: a.plano?.quantidade_mensal || 'NULL',
        }))
      );
    } else {
      devLog.log('[available-billing] ⚠️ NENHUMA ASSINATURA RETORNADA!');
    }

    if (assinaturasError) {
      devLog.error('[available-billing] ❌ ERRO ao buscar assinaturas:', assinaturasError);
      // 🆕 RETORNAR ERRO ao invés de continuar silenciosamente
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao buscar assinaturas: ${assinaturasError.message}`,
          details: assinaturasError.details,
          hint: assinaturasError.hint
        },
        { status: 500 }
      );
    }

    // Filtrar apenas assinaturas com quota disponível
    // ✅ CORREÇÃO: Usar campo correto 'quantidade_mensal'
    const assinaturasDisponiveis = (assinaturas || []).filter(a => {
      const temPlano = !!a.plano;
      const usados = a.projetos_usados_mes_atual;
      const total = a.plano?.quantidade_mensal;
      const temQuota = temPlano && usados < total;
      
      devLog.log('[available-billing] 🔍 Filtro Assinatura:', {
        id: a.id,
        temPlano,
        usados,
        total,
        temQuota,
        motivo: !temPlano ? 'Sem plano' : !temQuota ? 'Sem quota' : 'OK'
      });
      
      return temQuota;
    });

    devLog.log('[available-billing] 🔍 DIAGNÓSTICO - Após Filtro Assinaturas:', {
      antes_filtro: assinaturas?.length || 0,
      depois_filtro: assinaturasDisponiveis.length,
    });

    devLog.log('[available-billing] Opções disponíveis:', {
      projectId,
      tenantId,
      pacotes: pacotesDisponiveis.length,
      assinaturas: assinaturasDisponiveis.length
    });

    // 🆕 MAPEAMENTO COM PROTEÇÃO CONTRA ERROS
    try {
      const pacotesMapeados = pacotesDisponiveis.map(p => {
        // Validar que objetos aninhados existem antes de acessar
        if (!p.pacote || !p.pacote.nome) {
          devLog.error('[available-billing] ⚠️ Pacote sem definição:', {
            id: p.id,
            pacote_id: p.pacote_id,
            tem_pacote: !!p.pacote
          });
          throw new Error(`Pacote ${p.id} sem definição válida (pacote.nome é NULL)`);
        }

        return {
          id: p.id,
          nome: p.pacote.nome,
          empresa: p.user?.name || 'N/A',
          quota: `${p.projetos_usados || 0}/${p.projetos_inclusos || 0}`,
          vagas_disponiveis: (p.projetos_inclusos || 0) - (p.projetos_usados || 0),
          expira_em: p.data_expiracao
        };
      });

      // ✅ CORREÇÃO: Usar campo correto 'quantidade_mensal' no mapeamento
      const assinaturasMapeadas = assinaturasDisponiveis.map(a => {
        if (!a.plano || !a.plano.nome) {
          devLog.error('[available-billing] ⚠️ Assinatura sem plano:', {
            id: a.id,
            plano_id: a.plano_id,
            tem_plano: !!a.plano
          });
          throw new Error(`Assinatura ${a.id} sem plano válido`);
        }

        return {
          id: a.id,
          nome: a.plano.nome,
          empresa: a.user?.name || 'N/A',
          quota: `${a.projetos_usados_mes_atual}/${a.plano.quantidade_mensal}`,
          vagas_disponiveis: a.plano.quantidade_mensal - a.projetos_usados_mes_atual,
          proximo_reset: a.proximo_reset
        };
      });

      devLog.log('[available-billing] ✅ Mapeamento concluído:', {
        pacotes: pacotesMapeados.length,
        assinaturas: assinaturasMapeadas.length
      });

      // 🔍 LOG DETALHADO DAS ASSINATURAS MAPEADAS
      if (assinaturasMapeadas.length > 0) {
        devLog.log('[available-billing] 🔍 Assinaturas Mapeadas:', assinaturasMapeadas);
      } else {
        devLog.warn('[available-billing] ⚠️ NENHUMA ASSINATURA MAPEADA!');
      }

      const response = {
        success: true,
        data: {
          pacotes: pacotesMapeados,
          assinaturas: assinaturasMapeadas
        }
      };

      devLog.log('[available-billing] 📤 Resposta Final:', response);

      return NextResponse.json(response);
    } catch (mapError: any) {
      devLog.error('[available-billing] ❌ ERRO no mapeamento:', mapError);
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao processar dados: ${mapError.message}`,
          stack: mapError.stack
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    devLog.error('[available-billing] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar opções disponíveis' },
      { status: 500 }
    );
  }
}
