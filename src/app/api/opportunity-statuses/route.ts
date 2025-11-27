import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/opportunity-statuses
 * Busca todas as colunas do Kanban do tenant atual
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[GET /api/opportunity-statuses] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    devLog.log('[GET /api/opportunity-statuses] Buscando colunas do tenant:', tenantId);

    const supabase = createSupabaseServiceRoleClient();

    // Buscar colunas do Kanban ordenadas por posição
    const { data, error } = await supabase
      .from('opportunity_statuses')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true });

    if (error) {
      devLog.error('[GET /api/opportunity-statuses] Erro ao buscar colunas:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[GET /api/opportunity-statuses] Colunas encontradas:', data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    devLog.error('[GET /api/opportunity-statuses] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar colunas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunity-statuses
 * Cria uma nova coluna no Kanban
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[POST /api/opportunity-statuses] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome da coluna é obrigatório' },
        { status: 400 }
      );
    }

    devLog.log('[POST /api/opportunity-statuses] Criando nova coluna:', { name, tenantId });

    const supabase = createSupabaseServiceRoleClient();

    // Buscar a posição máxima atual para adicionar no final
    const { data: maxPositionData } = await supabase
      .from('opportunity_statuses')
      .select('position')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPositionData?.position ?? -1) + 1;

    // Inserir nova coluna
    const { data, error } = await supabase
      .from('opportunity_statuses')
      .insert({
        tenant_id: tenantId,
        name: name.trim(),
        color: color || '#3B82F6',
        position: nextPosition,
        is_default: false,
        is_final: false,
        is_won: false,
        is_lost: false,
      })
      .select('*')
      .single();

    if (error) {
      devLog.error('[POST /api/opportunity-statuses] Erro ao criar coluna:', error);

      // Verificar se é erro de duplicação
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma coluna com este nome' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[POST /api/opportunity-statuses] Coluna criada com sucesso:', data.id);

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 });

  } catch (error: any) {
    devLog.error('[POST /api/opportunity-statuses] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar coluna' },
      { status: 500 }
    );
  }
}
