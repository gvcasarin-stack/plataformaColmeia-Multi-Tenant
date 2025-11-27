import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * POST /api/opportunities/move
 * Move uma oportunidade para outra coluna ou posição
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[POST /api/opportunities/move] Tenant ID não encontrado');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { opportunityId, newStatusId, newPosition } = body;

    if (!opportunityId || !newStatusId || newPosition === undefined) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: opportunityId, newStatusId, newPosition' },
        { status: 400 }
      );
    }

    devLog.log('[POST /api/opportunities/move] Movendo oportunidade:', {
      opportunityId,
      newStatusId,
      newPosition
    });

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar a oportunidade
    const { data, error } = await supabase
      .from('opportunities')
      .update({
        status_id: newStatusId,
        position: newPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', opportunityId)
      .eq('tenant_id', tenantId)
      .select(`
        *,
        lead:leads(id, name, email, phone, company),
        responsible:users!opportunities_responsible_id_fkey(id, name, email),
        status:opportunity_statuses(id, name, color, position, is_won, is_lost)
      `)
      .single();

    if (error) {
      devLog.error('[POST /api/opportunities/move] Erro ao mover oportunidade:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Oportunidade não encontrada' },
        { status: 404 }
      );
    }

    devLog.log('[POST /api/opportunities/move] Oportunidade movida com sucesso');

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    devLog.error('[POST /api/opportunities/move] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao mover oportunidade' },
      { status: 500 }
    );
  }
}
