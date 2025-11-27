import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunity-statuses/reorder
 * Reordena as colunas do Kanban
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[POST /api/opportunity-statuses/reorder] Tenant ID não encontrado');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { statuses } = body; // Array de { id, position }

    if (!Array.isArray(statuses)) {
      return NextResponse.json(
        { error: 'Formato inválido. Esperado: { statuses: [{ id, position }] }' },
        { status: 400 }
      );
    }

    devLog.log('[POST /api/opportunity-statuses/reorder] Reordenando colunas:', statuses.length);

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar posições em batch
    const updates = statuses.map(({ id, position }) =>
      supabase
        .from('opportunity_statuses')
        .update({ position })
        .eq('id', id)
        .eq('tenant_id', tenantId)
    );

    const results = await Promise.all(updates);

    // Verificar se houve erros
    const errors = results.filter(({ error }) => error);
    if (errors.length > 0) {
      devLog.error('[POST /api/opportunity-statuses/reorder] Erros ao reordenar:', errors);
      return NextResponse.json(
        { error: 'Erro ao reordenar algumas colunas' },
        { status: 500 }
      );
    }

    devLog.log('[POST /api/opportunity-statuses/reorder] Colunas reordenadas com sucesso');

    return NextResponse.json({
      success: true,
      message: 'Colunas reordenadas com sucesso'
    });

  } catch (error: any) {
    devLog.error('[POST /api/opportunity-statuses/reorder] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao reordenar colunas' },
      { status: 500 }
    );
  }
}
