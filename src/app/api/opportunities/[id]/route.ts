import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/opportunities/[id]
 * Atualiza uma oportunidade existente
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[PATCH /api/opportunities/:id] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();

    devLog.log('[PATCH /api/opportunities/:id] Atualizando oportunidade:', id);

    const supabase = createSupabaseServiceRoleClient();

    // Remover campos que não devem ser atualizados diretamente
    const { userId, id: _id, created_at, created_by, tenant_id, ...updateData } = body;

    // Limpar campos UUID vazios
    if (updateData.responsible_id === '' || updateData.responsible_id === null) {
      updateData.responsible_id = null;
    }
    if (updateData.lead_id === '' || updateData.lead_id === null) {
      updateData.lead_id = null;
    }

    // Adicionar updated_at
    updateData.updated_at = new Date().toISOString();

    // Atualizar oportunidade (verificando tenant_id para segurança)
    const { data, error } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        lead:leads(id, name, email, phone, company),
        responsible:users!opportunities_responsible_id_fkey(id, name, email),
        status:opportunity_statuses(id, name, color, position, is_won, is_lost)
      `)
      .single();

    if (error) {
      devLog.error('[PATCH /api/opportunities/:id] Erro ao atualizar oportunidade:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Oportunidade não encontrada ou não pertence ao seu tenant' },
        { status: 404 }
      );
    }

    devLog.log('[PATCH /api/opportunities/:id] Oportunidade atualizada com sucesso:', id);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    devLog.error('[PATCH /api/opportunities/:id] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar oportunidade' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/opportunities/[id]
 * Exclui uma oportunidade permanentemente
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[DELETE /api/opportunities/:id] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const { id } = params;

    devLog.log('[DELETE /api/opportunities/:id] Excluindo oportunidade:', id);

    const supabase = createSupabaseServiceRoleClient();

    // Deletar permanentemente
    const { data, error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      devLog.error('[DELETE /api/opportunities/:id] Erro ao excluir oportunidade:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Oportunidade não encontrada ou não pertence ao seu tenant' },
        { status: 404 }
      );
    }

    devLog.log('[DELETE /api/opportunities/:id] Oportunidade excluída com sucesso:', id);

    return NextResponse.json({
      success: true,
      message: 'Oportunidade excluída com sucesso'
    });

  } catch (error: any) {
    devLog.error('[DELETE /api/opportunities/:id] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir oportunidade' },
      { status: 500 }
    );
  }
}
