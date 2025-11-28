import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

/**
 * PATCH: Converter projeto avulso para pacote ou assinatura
 *
 * Body: {
 *   target_type: 'pacote' | 'assinatura',
 *   target_id: 'uuid-do-pacote-ou-assinatura'
 * }
 */
export async function PATCH(
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
    const body = await request.json();
    const { target_type, target_id } = body;

    // Validar parâmetros
    if (!target_type || !target_id) {
      return NextResponse.json(
        { success: false, error: 'target_type e target_id são obrigatórios' },
        { status: 400 }
      );
    }

    if (target_type !== 'pacote' && target_type !== 'assinatura') {
      return NextResponse.json(
        { success: false, error: 'target_type deve ser "pacote" ou "assinatura"' },
        { status: 400 }
      );
    }

    // 1. Buscar projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .single();

    if (projectError || !project) {
      devLog.error('[convert-billing] Projeto não encontrado:', projectError);
      return NextResponse.json(
        { success: false, error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // 2. Validar se projeto é avulso
    if (project.billing_mode !== 'avulso') {
      return NextResponse.json(
        { success: false, error: `Projeto já está no modo "${project.billing_mode}". Apenas projetos avulsos podem ser convertidos.` },
        { status: 400 }
      );
    }

    // 3. Buscar e validar pacote/assinatura
    if (target_type === 'pacote') {
      // Buscar pacote
      const { data: pacote, error: pacoteError } = await supabase
        .from('cliente_pacotes')
        .select(`
          *,
          pacote:pacotes_definicoes(*)
        `)
        .eq('id', target_id)
        .eq('tenant_id', tenantId)
        .single();

      if (pacoteError || !pacote) {
        return NextResponse.json(
          { success: false, error: 'Pacote não encontrado' },
          { status: 404 }
        );
      }

      // Validar quota
      if (pacote.projetos_usados >= pacote.projetos_inclusos) {
        return NextResponse.json(
          { success: false, error: `Pacote esgotado (${pacote.projetos_usados}/${pacote.projetos_inclusos})` },
          { status: 400 }
        );
      }

      // Validar se pertence ao mesmo usuário
      if (pacote.user_id !== project.owner_id) {
        return NextResponse.json(
          { success: false, error: 'Pacote não pertence ao dono do projeto' },
          { status: 403 }
        );
      }

      // 4. Converter projeto
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          billing_mode: 'pacote',
          cliente_pacote_id: target_id,
          cliente_assinatura_id: null,
          billing_snapshot: {
            ...project.billing_snapshot,
            converted_at: new Date().toISOString(),
            converted_from: 'avulso',
            converted_from_valor: project.billing_snapshot?.valor_projeto || 0,
            converted_from_pagamento: project.pagamento,
            converted_to: 'pacote',
            converted_to_id: target_id,
            pacote_id: target_id,
            pacote_nome: pacote.pacote?.nome || 'Pacote'
          }
        })
        .eq('id', projectId);

      if (updateError) {
        devLog.error('[convert-billing] Erro ao atualizar projeto:', updateError);
        throw updateError;
      }

      // 5. Incrementar contador do pacote
      const { error: pacoteUpdateError } = await supabase
        .from('cliente_pacotes')
        .update({
          projetos_usados: pacote.projetos_usados + 1
        })
        .eq('id', target_id);

      if (pacoteUpdateError) {
        devLog.error('[convert-billing] Erro ao incrementar contador:', pacoteUpdateError);
        throw pacoteUpdateError;
      }

      devLog.log('[convert-billing] Projeto convertido para pacote:', {
        projectId,
        pacoteId: target_id,
        novo_contador: pacote.projetos_usados + 1
      });

      return NextResponse.json({
        success: true,
        data: {
          projectId,
          billing_mode: 'pacote',
          pacote_nome: pacote.pacote?.nome,
          contador: `${pacote.projetos_usados + 1}/${pacote.projetos_inclusos}`
        }
      });

    } else {
      // target_type === 'assinatura'
      const { data: assinatura, error: assinaturaError } = await supabase
        .from('cliente_assinaturas')
        .select(`
          *,
          plano:planos_assinatura(*)
        `)
        .eq('id', target_id)
        .eq('tenant_id', tenantId)
        .single();

      if (assinaturaError || !assinatura) {
        return NextResponse.json(
          { success: false, error: 'Assinatura não encontrada' },
          { status: 404 }
        );
      }

      // Validar quota mensal
      if (assinatura.projetos_usados_mes_atual >= assinatura.plano.projetos_por_mes) {
        return NextResponse.json(
          { success: false, error: `Cota mensal esgotada (${assinatura.projetos_usados_mes_atual}/${assinatura.plano.projetos_por_mes})` },
          { status: 400 }
        );
      }

      // Validar se pertence ao mesmo usuário
      if (assinatura.user_id !== project.owner_id) {
        return NextResponse.json(
          { success: false, error: 'Assinatura não pertence ao dono do projeto' },
          { status: 403 }
        );
      }

      // 4. Converter projeto
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          billing_mode: 'assinatura',
          cliente_assinatura_id: target_id,
          cliente_pacote_id: null,
          billing_snapshot: {
            ...project.billing_snapshot,
            converted_at: new Date().toISOString(),
            converted_from: 'avulso',
            converted_from_valor: project.billing_snapshot?.valor_projeto || 0,
            converted_from_pagamento: project.pagamento,
            converted_to: 'assinatura',
            converted_to_id: target_id,
            assinatura_id: target_id,
            plano_nome: assinatura.plano?.nome || 'Plano'
          }
        })
        .eq('id', projectId);

      if (updateError) {
        devLog.error('[convert-billing] Erro ao atualizar projeto:', updateError);
        throw updateError;
      }

      // 5. Incrementar contador da assinatura
      const { error: assinaturaUpdateError } = await supabase
        .from('cliente_assinaturas')
        .update({
          projetos_usados_mes_atual: assinatura.projetos_usados_mes_atual + 1
        })
        .eq('id', target_id);

      if (assinaturaUpdateError) {
        devLog.error('[convert-billing] Erro ao incrementar contador:', assinaturaUpdateError);
        throw assinaturaUpdateError;
      }

      devLog.log('[convert-billing] Projeto convertido para assinatura:', {
        projectId,
        assinaturaId: target_id,
        novo_contador: assinatura.projetos_usados_mes_atual + 1
      });

      return NextResponse.json({
        success: true,
        data: {
          projectId,
          billing_mode: 'assinatura',
          plano_nome: assinatura.plano?.nome,
          contador: `${assinatura.projetos_usados_mes_atual + 1}/${assinatura.plano.projetos_por_mes}`
        }
      });
    }

  } catch (error: any) {
    devLog.error('[convert-billing] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao converter projeto' },
      { status: 500 }
    );
  }
}
