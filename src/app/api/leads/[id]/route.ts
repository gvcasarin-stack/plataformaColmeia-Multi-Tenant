import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/leads/[id]
 * Atualiza um lead existente
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[PATCH /api/leads/:id] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    devLog.log('[PATCH /api/leads/:id] Atualizando lead:', id);

    const supabase = createSupabaseServiceRoleClient();

    // Remover campos que não devem ser atualizados diretamente
    const { userId, id: _id, created_at, created_by, tenant_id, ...updateData } = body;

    // Limpar campos UUID vazios
    if (updateData.responsible_id === '' || updateData.responsible_id === null) {
      updateData.responsible_id = null;
    }

    // Adicionar updated_at
    updateData.updated_at = new Date().toISOString();

    // Atualizar lead (verificando tenant_id para segurança)
    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId) // Segurança: só atualiza se for do mesmo tenant
      .select('*')
      .single();

    if (error) {
      devLog.error('[PATCH /api/leads/:id] Erro ao atualizar lead:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lead não encontrado ou não pertence ao seu tenant' },
        { status: 404 }
      );
    }

    devLog.log('[PATCH /api/leads/:id] Lead atualizado com sucesso:', id);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    devLog.error('[PATCH /api/leads/:id] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar lead' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id]
 * Exclui um lead (soft delete - marca como arquivado)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[DELETE /api/leads/:id] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const { id } = params;

    devLog.log('[DELETE /api/leads/:id] Excluindo lead:', id);

    const supabase = createSupabaseServiceRoleClient();

    // Soft delete: marcar como arquivado ao invés de deletar
    const { data, error } = await supabase
      .from('leads')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId) // Segurança: só deleta se for do mesmo tenant
      .select('*')
      .single();

    if (error) {
      devLog.error('[DELETE /api/leads/:id] Erro ao excluir lead:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Lead não encontrado ou não pertence ao seu tenant' },
        { status: 404 }
      );
    }

    devLog.log('[DELETE /api/leads/:id] Lead excluído com sucesso:', id);

    return NextResponse.json({
      success: true,
      message: 'Lead excluído com sucesso'
    });

  } catch (error: any) {
    devLog.error('[DELETE /api/leads/:id] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir lead' },
      { status: 500 }
    );
  }
}
