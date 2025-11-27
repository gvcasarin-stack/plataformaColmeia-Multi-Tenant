import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// PATCH: Atualizar pacote
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
    const pacoteId = params.id;

    // Obter dados do body
    const body = await request.json();
    const { nome, quantidade_projetos, valor, validade_dias, potencia_maxima_kwp, ativo } = body;

    // Construir objeto de atualização
    const updates: any = {};
    if (nome !== undefined) updates.nome = nome;
    if (quantidade_projetos !== undefined) {
      if (quantidade_projetos <= 0) {
        return NextResponse.json(
          { success: false, error: 'Quantidade de projetos deve ser maior que zero' },
          { status: 400 }
        );
      }
      updates.quantidade_projetos = quantidade_projetos;
    }
    if (valor !== undefined) {
      if (valor < 0) {
        return NextResponse.json(
          { success: false, error: 'Valor não pode ser negativo' },
          { status: 400 }
        );
      }
      updates.valor = valor;
    }
    if (validade_dias !== undefined) {
      if (validade_dias <= 0) {
        return NextResponse.json(
          { success: false, error: 'Validade deve ser maior que zero' },
          { status: 400 }
        );
      }
      updates.validade_dias = validade_dias;
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

    // Atualizar pacote
    const { data: pacoteAtualizado, error } = await supabase
      .from('pacotes_definicoes')
      .update(updates)
      .eq('id', pacoteId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[API /admin/pacotes/[id] PATCH] Erro ao atualizar:', error);
      throw error;
    }

    if (!pacoteAtualizado) {
      return NextResponse.json(
        { success: false, error: 'Pacote não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API /admin/pacotes/[id] PATCH] Pacote atualizado:', pacoteId);

    return NextResponse.json({
      success: true,
      data: pacoteAtualizado
    });

  } catch (error: any) {
    devLog.error('[API /admin/pacotes/[id] PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar pacote' },
      { status: 500 }
    );
  }
}

// DELETE: Desativar pacote (soft delete)
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
    const pacoteId = params.id;

    // Desativar pacote (soft delete)
    const { data: pacoteDesativado, error } = await supabase
      .from('pacotes_definicoes')
      .update({ ativo: false })
      .eq('id', pacoteId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      devLog.error('[API /admin/pacotes/[id] DELETE] Erro ao desativar:', error);
      throw error;
    }

    if (!pacoteDesativado) {
      return NextResponse.json(
        { success: false, error: 'Pacote não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API /admin/pacotes/[id] DELETE] Pacote desativado:', pacoteId);

    return NextResponse.json({
      success: true,
      data: pacoteDesativado
    });

  } catch (error: any) {
    devLog.error('[API /admin/pacotes/[id] DELETE] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao desativar pacote' },
      { status: 500 }
    );
  }
}
