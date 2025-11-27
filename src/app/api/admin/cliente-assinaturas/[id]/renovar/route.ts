import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// PATCH: Renovar mensalidade da assinatura ou alterar plano
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
    const assinaturaId = params.id;
    const body = await request.json().catch(() => ({}));
    const { novo_plano_id } = body;

    // Buscar assinatura atual
    const { data: assinaturaAtual, error: fetchError } = await supabase
      .from('cliente_assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .single();

    if (fetchError || !assinaturaAtual) {
      return NextResponse.json(
        { success: false, error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    // Se for alteração de plano (trocar por novo plano)
    if (novo_plano_id) {
      // Buscar novo plano
      const { data: novoPlano, error: novoPlanoError } = await supabase
        .from('planos_assinatura')
        .select('*')
        .eq('id', novo_plano_id)
        .eq('tenant_id', tenantId)
        .eq('ativo', true)
        .single();

      if (novoPlanoError || !novoPlano) {
        return NextResponse.json(
          { success: false, error: 'Novo plano não encontrado ou inativo' },
          { status: 404 }
        );
      }

      // Cancelar assinatura atual
      await supabase
        .from('cliente_assinaturas')
        .update({ status: 'cancelada' })
        .eq('id', assinaturaId);

      // Calcular próximo reset (adicionar 1 mês)
      const agora = new Date();
      const diaRenovacao = agora.getDate();
      const proximoReset = new Date(agora);
      proximoReset.setMonth(proximoReset.getMonth() + 1);
      proximoReset.setDate(diaRenovacao);

      // Se a data de renovação já passou neste mês, usar próximo mês
      if (proximoReset <= agora) {
        proximoReset.setMonth(proximoReset.getMonth() + 1);
      }

      // Criar nova assinatura com novo plano
      const { data: novaAssinatura, error: createError } = await supabase
        .from('cliente_assinaturas')
        .insert({
          user_id: assinaturaAtual.user_id,
          plano_id: novo_plano_id,
          data_inicio: agora.toISOString(),
          status: 'ativa',
          dia_renovacao: diaRenovacao,
          ultimo_reset: agora.toISOString(),
          proximo_reset: proximoReset.toISOString(),
          projetos_usados_mes_atual: 0,
        })
        .select()
        .single();

      if (createError) {
        devLog.error('[API /admin/cliente-assinaturas/[id]/renovar PATCH] Erro ao alterar plano:', createError);
        throw createError;
      }

      // Garantir que usuário está com billing_mode = 'assinatura'
      await supabase
        .from('users')
        .update({ billing_mode: 'assinatura' })
        .eq('id', assinaturaAtual.user_id);

      devLog.log('[API /admin/cliente-assinaturas/[id]/renovar PATCH] Plano alterado:', novaAssinatura.id);

      return NextResponse.json({
        success: true,
        data: novaAssinatura,
      });
    }

    // Se for apenas renovação (mesmo plano)
    // Calcular próximo reset (adicionar 1 mês)
    const agora = new Date();
    const proximoReset = new Date(agora);
    proximoReset.setMonth(proximoReset.getMonth() + 1);
    proximoReset.setDate(assinaturaAtual.dia_renovacao);

    // Se a data de renovação já passou neste mês, usar próximo mês
    if (proximoReset <= agora) {
      proximoReset.setMonth(proximoReset.getMonth() + 1);
    }

    // Renovar assinatura (resetar contador e atualizar datas)
    const { data: assinaturaRenovada, error: updateError } = await supabase
      .from('cliente_assinaturas')
      .update({
        projetos_usados_mes_atual: 0,
        ultimo_reset: agora.toISOString(),
        proximo_reset: proximoReset.toISOString(),
        status: 'ativa',
      })
      .eq('id', assinaturaId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[API /admin/cliente-assinaturas/[id]/renovar PATCH] Erro ao renovar:', updateError);
      throw updateError;
    }

    // Garantir que usuário está com billing_mode = 'assinatura'
    await supabase
      .from('users')
      .update({ billing_mode: 'assinatura' })
      .eq('id', assinaturaAtual.user_id);

    devLog.log('[API /admin/cliente-assinaturas/[id]/renovar PATCH] Assinatura renovada:', assinaturaId);

    return NextResponse.json({
      success: true,
      data: assinaturaRenovada,
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-assinaturas/[id]/renovar PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao renovar/alterar assinatura' },
      { status: 500 }
    );
  }
}
