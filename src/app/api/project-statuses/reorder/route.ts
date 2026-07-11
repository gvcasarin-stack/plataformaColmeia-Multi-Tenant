import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * PUT /api/project-statuses/reorder
 * Reordena em lote as colunas (status) do Kanban do tenant atual.
 *
 * Body: { orderedIds: string[] } — lista de IDs de todos os status ativos do
 * tenant, na ordem final desejada.
 */
export async function PUT(request: NextRequest) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lista de IDs inválida' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // 🔒 Validar que todos os IDs pertencem ao tenant antes de qualquer alteração
    const { data: existingStatuses, error: fetchError } = await supabase
      .from('project_statuses')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (fetchError) {
      devLog.error('[project-statuses/reorder] Erro ao verificar status existentes:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Erro ao verificar colunas do tenant' },
        { status: 500 }
      );
    }

    const validIds = new Set((existingStatuses || []).map((s) => s.id));
    const allBelongToTenant = orderedIds.every((id: string) => validIds.has(id));

    if (!allBelongToTenant) {
      devLog.error('[project-statuses/reorder] ID(s) fora do tenant informado', { tenantId, orderedIds });
      return NextResponse.json(
        { success: false, error: 'Um ou mais status não pertencem a este tenant' },
        { status: 403 }
      );
    }

    // Fase 1: mover todos para uma faixa temporária alta, evitando qualquer
    // colisão de order_index durante a renumeração
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('project_statuses')
        .update({ order_index: 1000000 + i })
        .eq('id', orderedIds[i])
        .eq('tenant_id', tenantId);

      if (error) {
        devLog.error('[project-statuses/reorder] Erro na fase 1 (offset temporário):', error);
        return NextResponse.json(
          { success: false, error: 'Erro ao reordenar colunas' },
          { status: 500 }
        );
      }
    }

    // Fase 2: aplicar a ordem final sequencial (1..N)
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('project_statuses')
        .update({ order_index: i + 1 })
        .eq('id', orderedIds[i])
        .eq('tenant_id', tenantId);

      if (error) {
        devLog.error('[project-statuses/reorder] Erro na fase 2 (ordem final):', error);
        return NextResponse.json(
          { success: false, error: 'Erro ao reordenar colunas' },
          { status: 500 }
        );
      }
    }

    devLog.log('[project-statuses/reorder] Ordem atualizada com sucesso:', { tenantId, count: orderedIds.length });

    return NextResponse.json({
      success: true,
      message: 'Ordem das colunas atualizada com sucesso',
    });

  } catch (error) {
    devLog.error('[project-statuses/reorder] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
