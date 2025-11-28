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
    const { data: pacotes, error: pacotesError } = await supabase
      .from('cliente_pacotes')
      .select(`
        id,
        pacote_id,
        user_id,
        status,
        projetos_inclusos,
        projetos_usados,
        data_ativacao,
        data_expiracao,
        pacote:pacotes_definicoes(
          id,
          nome,
          quantidade_projetos,
          potencia_maxima
        ),
        user:users!user_id(
          id,
          email,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativo');

    if (pacotesError) {
      devLog.error('[available-billing] Erro ao buscar pacotes:', pacotesError);
    }

    // Filtrar apenas pacotes com quota disponível
    const pacotesDisponiveis = (pacotes || []).filter(p =>
      p.projetos_usados < p.projetos_inclusos
    );

    // 3. Buscar TODAS as assinaturas ativas do tenant (empresa)
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
          projetos_por_mes,
          potencia_maxima
        ),
        user:users!user_id(
          id,
          email,
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'ativa');

    if (assinaturasError) {
      devLog.error('[available-billing] Erro ao buscar assinaturas:', assinaturasError);
    }

    // Filtrar apenas assinaturas com quota disponível
    const assinaturasDisponiveis = (assinaturas || []).filter(a =>
      a.projetos_usados_mes_atual < a.plano.projetos_por_mes
    );

    devLog.log('[available-billing] Opções disponíveis:', {
      projectId,
      tenantId,
      pacotes: pacotesDisponiveis.length,
      assinaturas: assinaturasDisponiveis.length
    });

    return NextResponse.json({
      success: true,
      data: {
        pacotes: pacotesDisponiveis.map(p => ({
          id: p.id,
          nome: p.pacote.nome,
          empresa: p.user?.name || 'N/A',
          quota: `${p.projetos_usados}/${p.projetos_inclusos}`,
          vagas_disponiveis: p.projetos_inclusos - p.projetos_usados,
          expira_em: p.data_expiracao
        })),
        assinaturas: assinaturasDisponiveis.map(a => ({
          id: a.id,
          nome: a.plano.nome,
          empresa: a.user?.name || 'N/A',
          quota: `${a.projetos_usados_mes_atual}/${a.plano.projetos_por_mes}`,
          vagas_disponiveis: a.plano.projetos_por_mes - a.projetos_usados_mes_atual,
          proximo_reset: a.proximo_reset
        }))
      }
    });

  } catch (error: any) {
    devLog.error('[available-billing] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar opções disponíveis' },
      { status: 500 }
    );
  }
}
