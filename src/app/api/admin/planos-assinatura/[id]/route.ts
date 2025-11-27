import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// PATCH: Atualizar plano de assinatura
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
    const planoId = params.id;

    // Obter dados do body
    const body = await request.json();
    const { nome, quantidade_mensal, valor_mensal, dia_renovacao, potencia_maxima_kwp, ativo } = body;

    // Construir objeto de atualização
    const updates: any = {};
    if (nome !== undefined) updates.nome = nome;
    if (quantidade_mensal !== undefined) {
      if (quantidade_mensal <= 0) {
        return NextResponse.json(
          { success: false, error: 'Quantidade mensal deve ser maior que zero' },
          { status: 400 }
        );
      }
      updates.quantidade_mensal = quantidade_mensal;
    }
    if (valor_mensal !== undefined) {
      if (valor_mensal < 0) {
        return NextResponse.json(
          { success: false, error: 'Valor não pode ser negativo' },
          { status: 400 }
        );
      }
      updates.valor_mensal = valor_mensal;
    }
    if (dia_renovacao !== undefined) {
      if (dia_renovacao < 1 || dia_renovacao > 31) {
        return NextResponse.json(
          { success: false, error: 'Dia de renovação deve estar entre 1 e 31' },
          { status: 400 }
        );
      }
      updates.dia_renovacao = dia_renovacao;
    }
    if (potencia_maxima_kwp !== undefined) {
      // Aceita NULL (ilimitado) ou valores positivos
      if (potencia_maxima_kwp !== null && potencia_maxima_kwp <= 0) {
        return NextResponse.json(
          { success: false, error: 'Potência máxima deve ser maior que zero ou ilimitado' },
          { status: 400 }
        );
      }
      updates.potencia_maxima_kwp = potencia_maxima_kwp;
    }
    if (ativo !== undefined) updates.ativo = ativo;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum campo para atualizar' },
        { status: 400 }
      );
    }

    // Atualizar plano
    const { data: planoAtualizado, error } = await supabase
      .from('planos_assinatura')
      .update(updates)
      .eq('id', planoId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[API /admin/planos-assinatura/[id] PATCH] Erro ao atualizar:', error);
      throw error;
    }

    if (!planoAtualizado) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API /admin/planos-assinatura/[id] PATCH] Plano atualizado:', planoId);

    return NextResponse.json({
      success: true,
      data: planoAtualizado
    });

  } catch (error: any) {
    devLog.error('[API /admin/planos-assinatura/[id] PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar plano' },
      { status: 500 }
    );
  }
}

// DELETE: Desativar plano (soft delete)
export async function DELETE(
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
    const planoId = params.id;

    // Desativar plano (soft delete)
    const { data: planoDesativado, error } = await supabase
      .from('planos_assinatura')
      .update({ ativo: false })
      .eq('id', planoId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[API /admin/planos-assinatura/[id] DELETE] Erro ao desativar:', error);
      throw error;
    }

    if (!planoDesativado) {
      return NextResponse.json(
        { success: false, error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API /admin/planos-assinatura/[id] DELETE] Plano desativado:', planoId);

    return NextResponse.json({
      success: true,
      data: planoDesativado
    });

  } catch (error: any) {
    devLog.error('[API /admin/planos-assinatura/[id] DELETE] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao desativar plano' },
      { status: 500 }
    );
  }
}
