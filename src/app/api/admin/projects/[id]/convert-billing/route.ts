import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

/**
 * PATCH: Converter projeto entre modalidades de faturamento
 *
 * Cenários suportados:
 * 1. Avulso → Pacote
 * 2. Avulso → Assinatura
 * 3. Pacote → Avulso
 * 4. Assinatura → Avulso
 *
 * Body para conversão PARA pacote/assinatura: {
 *   target_type: 'pacote' | 'assinatura',
 *   target_id: 'uuid-do-pacote-ou-assinatura'
 * }
 *
 * Body para conversão PARA avulso: {
 *   target_type: 'avulso'
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
    if (!target_type) {
      return NextResponse.json(
        { success: false, error: 'target_type é obrigatório' },
        { status: 400 }
      );
    }

    if (target_type !== 'pacote' && target_type !== 'assinatura' && target_type !== 'avulso') {
      return NextResponse.json(
        { success: false, error: 'target_type deve ser "pacote", "assinatura" ou "avulso"' },
        { status: 400 }
      );
    }

    // target_id é obrigatório apenas para conversão PARA pacote/assinatura
    if ((target_type === 'pacote' || target_type === 'assinatura') && !target_id) {
      return NextResponse.json(
        { success: false, error: 'target_id é obrigatório para conversão para pacote/assinatura' },
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

    // 2. CENÁRIO: Converter PARA avulso (Pacote/Assinatura → Avulso)
    if (target_type === 'avulso') {
      // Validar que projeto NÃO é avulso
      if (!project.billing_mode || project.billing_mode === 'avulso') {
        return NextResponse.json(
          { success: false, error: 'Projeto já está no modo avulso' },
          { status: 400 }
        );
      }

      // Caso: Pacote → Avulso
      if (project.billing_mode === 'pacote') {
        const pacoteId = project.cliente_pacote_id;

        if (!pacoteId) {
          return NextResponse.json(
            { success: false, error: 'Projeto sem cliente_pacote_id válido' },
            { status: 400 }
          );
        }

        // Buscar pacote para decrementar contador
        const { data: pacote, error: pacoteError } = await supabase
          .from('cliente_pacotes')
          .select('id, projetos_usados, projetos_inclusos, status')
          .eq('id', pacoteId)
          .eq('tenant_id', tenantId)
          .single();

        if (pacoteError || !pacote) {
          devLog.error('[convert-billing] Pacote não encontrado:', pacoteError);
          return NextResponse.json(
            { success: false, error: 'Pacote não encontrado' },
            { status: 404 }
          );
        }

        // Atualizar projeto para avulso
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            billing_mode: 'avulso',
            cliente_pacote_id: null,
            pagamento: 'pendente', // Resetar para pendente
            billing_snapshot: {
              ...project.billing_snapshot,
              converted_at: new Date().toISOString(),
              converted_from: 'pacote',
              converted_from_id: pacoteId,
              converted_to: 'avulso'
            }
          })
          .eq('id', projectId);

        if (updateError) {
          devLog.error('[convert-billing] Erro ao atualizar projeto:', updateError);
          throw updateError;
        }

        // Decrementar contador do pacote
        const novoContador = Math.max(0, pacote.projetos_usados - 1);
        const { error: pacoteUpdateError } = await supabase
          .from('cliente_pacotes')
          .update({
            projetos_usados: novoContador
          })
          .eq('id', pacoteId);

        if (pacoteUpdateError) {
          devLog.error('[convert-billing] Erro ao decrementar contador:', pacoteUpdateError);
          throw pacoteUpdateError;
        }

        devLog.log('[convert-billing] Projeto convertido de pacote para avulso:', {
          projectId,
          pacoteId,
          contador_anterior: pacote.projetos_usados,
          novo_contador: novoContador
        });

        return NextResponse.json({
          success: true,
          data: {
            projectId,
            billing_mode: 'avulso',
            message: 'Projeto convertido para avulso com sucesso'
          }
        });
      }

      // Caso: Assinatura → Avulso
      if (project.billing_mode === 'assinatura') {
        const assinaturaId = project.cliente_assinatura_id;

        if (!assinaturaId) {
          return NextResponse.json(
            { success: false, error: 'Projeto sem cliente_assinatura_id válido' },
            { status: 400 }
          );
        }

        // Buscar assinatura para decrementar contador
        const { data: assinatura, error: assinaturaError } = await supabase
          .from('cliente_assinaturas')
          .select('id, projetos_usados_mes_atual, projetos_mensais, status')
          .eq('id', assinaturaId)
          .eq('tenant_id', tenantId)
          .single();

        if (assinaturaError || !assinatura) {
          devLog.error('[convert-billing] Assinatura não encontrada:', assinaturaError);
          return NextResponse.json(
            { success: false, error: 'Assinatura não encontrada' },
            { status: 404 }
          );
        }

        // Atualizar projeto para avulso
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            billing_mode: 'avulso',
            cliente_assinatura_id: null,
            pagamento: 'pendente', // Resetar para pendente
            billing_snapshot: {
              ...project.billing_snapshot,
              converted_at: new Date().toISOString(),
              converted_from: 'assinatura',
              converted_from_id: assinaturaId,
              converted_to: 'avulso'
            }
          })
          .eq('id', projectId);

        if (updateError) {
          devLog.error('[convert-billing] Erro ao atualizar projeto:', updateError);
          throw updateError;
        }

        // Decrementar contador da assinatura
        const novoContador = Math.max(0, assinatura.projetos_usados_mes_atual - 1);
        const { error: assinaturaUpdateError } = await supabase
          .from('cliente_assinaturas')
          .update({
            projetos_usados_mes_atual: novoContador
          })
          .eq('id', assinaturaId);

        if (assinaturaUpdateError) {
          devLog.error('[convert-billing] Erro ao decrementar contador:', assinaturaUpdateError);
          throw assinaturaUpdateError;
        }

        devLog.log('[convert-billing] Projeto convertido de assinatura para avulso:', {
          projectId,
          assinaturaId,
          contador_anterior: assinatura.projetos_usados_mes_atual,
          novo_contador: novoContador
        });

        return NextResponse.json({
          success: true,
          data: {
            projectId,
            billing_mode: 'avulso',
            message: 'Projeto convertido para avulso com sucesso'
          }
        });
      }

      // Billing mode desconhecido
      return NextResponse.json(
        { success: false, error: `Modo de faturamento desconhecido: ${project.billing_mode}` },
        { status: 400 }
      );
    }

    // 3. CENÁRIO: Converter DE avulso PARA pacote/assinatura
    // Validar se projeto é avulso
    if (project.billing_mode && project.billing_mode !== 'avulso') {
      return NextResponse.json(
        { success: false, error: `Projeto está no modo "${project.billing_mode}". Apenas projetos avulsos podem ser convertidos para pacote/assinatura.` },
        { status: 400 }
      );
    }

    // 4. Buscar e validar pacote/assinatura
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

      // 6. Incrementar contador do pacote
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
      // ✅ CORREÇÃO: Usar campo correto 'quantidade_mensal' ao invés de 'projetos_por_mes'
      if (assinatura.projetos_usados_mes_atual >= assinatura.plano.quantidade_mensal) {
        return NextResponse.json(
          { success: false, error: `Cota mensal esgotada (${assinatura.projetos_usados_mes_atual}/${assinatura.plano.quantidade_mensal})` },
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

      // 5. Converter projeto
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

      // 6. Incrementar contador da assinatura
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
          // ✅ CORREÇÃO: Usar campo correto 'quantidade_mensal'
          contador: `${assinatura.projetos_usados_mes_atual + 1}/${assinatura.plano.quantidade_mensal}`
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
