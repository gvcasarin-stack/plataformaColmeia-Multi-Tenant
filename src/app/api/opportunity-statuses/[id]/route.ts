import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/opportunity-statuses/[id]
 * Atualiza uma coluna do Kanban
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[PATCH /api/opportunity-statuses/:id] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    devLog.log('[PATCH /api/opportunity-statuses/:id] Atualizando coluna:', id);

    const supabase = createSupabaseServiceRoleClient();

    // Remover campos que não devem ser atualizados diretamente
    const { id: _id, created_at, tenant_id, ...updateData } = body;

    // Adicionar updated_at
    updateData.updated_at = new Date().toISOString();

    // Atualizar coluna
    const { data, error } = await supabase
      .from('opportunity_statuses')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      devLog.error('[PATCH /api/opportunity-statuses/:id] Erro ao atualizar coluna:', error);

      // Verificar se é erro de duplicação
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma coluna com este nome ou posição' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Coluna não encontrada ou não pertence ao seu tenant' },
        { status: 404 }
      );
    }

    devLog.log('[PATCH /api/opportunity-statuses/:id] Coluna atualizada com sucesso:', id);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    devLog.error('[PATCH /api/opportunity-statuses/:id] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar coluna' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/opportunity-statuses/[id]
 * Exclui uma coluna do Kanban
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[DELETE /api/opportunity-statuses/:id] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const { id } = params;

    devLog.log('[DELETE /api/opportunity-statuses/:id] Excluindo coluna:', id);

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se há oportunidades nesta coluna
    const { count } = await supabase
      .from('opportunities')
      .select('id', { count: 'exact', head: true })
      .eq('status_id', id)
      .eq('tenant_id', tenantId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir esta coluna pois ela contém ${count} oportunidade(s)` },
        { status: 400 }
      );
    }

    // Deletar coluna
    const { data, error } = await supabase
      .from('opportunity_statuses')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      devLog.error('[DELETE /api/opportunity-statuses/:id] Erro ao excluir coluna:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Coluna não encontrada ou não pertence ao seu tenant' },
        { status: 404 }
      );
    }

    devLog.log('[DELETE /api/opportunity-statuses/:id] Coluna excluída com sucesso:', id);

    return NextResponse.json({
      success: true,
      message: 'Coluna excluída com sucesso'
    });

  } catch (error: any) {
    devLog.error('[DELETE /api/opportunity-statuses/:id] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir coluna' },
      { status: 500 }
    );
  }
}
