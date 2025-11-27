import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export const dynamic = 'force-dynamic';

/**
 * GET /api/opportunities
 * Busca todas as oportunidades do tenant atual
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[GET /api/opportunities] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    devLog.log('[GET /api/opportunities] Buscando oportunidades do tenant:', tenantId);

    const supabase = createSupabaseServiceRoleClient();

    // Buscar oportunidades do tenant com informações relacionadas
    const { data, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        lead:leads(id, name, email, phone, company),
        responsible:users!opportunities_responsible_id_fkey(id, name, email),
        status:opportunity_statuses(id, name, color, position, is_won, is_lost)
      `)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true });

    if (error) {
      devLog.error('[GET /api/opportunities] Erro ao buscar oportunidades:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[GET /api/opportunities] Oportunidades encontradas:', data?.length || 0);

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    devLog.error('[GET /api/opportunities] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar oportunidades' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunities
 * Cria uma nova oportunidade no sistema
 */
export async function POST(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[POST /api/opportunities] Tenant ID não encontrado no header');
      return NextResponse.json(
        { error: 'Tenant não identificado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, ...opportunityData } = body;

    if (!userId) {
      devLog.error('[POST /api/opportunities] User ID não fornecido');
      return NextResponse.json(
        { error: 'Usuário não identificado' },
        { status: 400 }
      );
    }

    // Validar campo obrigatório: title
    if (!opportunityData.title || opportunityData.title.trim() === '') {
      return NextResponse.json(
        { error: 'Título da oportunidade é obrigatório' },
        { status: 400 }
      );
    }

    // Validar campo obrigatório: status_id
    if (!opportunityData.status_id) {
      return NextResponse.json(
        { error: 'Status é obrigatório' },
        { status: 400 }
      );
    }

    devLog.log('[POST /api/opportunities] Criando oportunidade:', {
      title: opportunityData.title,
      status_id: opportunityData.status_id,
      tenantId,
      userId
    });

    const supabase = createSupabaseServiceRoleClient();

    // Limpar campos UUID vazios
    if (opportunityData.lead_id === '' || opportunityData.lead_id === null) {
      opportunityData.lead_id = null;
    }
    if (opportunityData.responsible_id === '' || opportunityData.responsible_id === null) {
      opportunityData.responsible_id = null;
    }

    // Buscar a posição máxima atual na coluna para adicionar no final
    const { data: maxPositionData } = await supabase
      .from('opportunities')
      .select('position')
      .eq('status_id', opportunityData.status_id)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPositionData?.position ?? -1) + 1;

    // Preparar dados para inserção
    const insertData = {
      ...opportunityData,
      tenant_id: tenantId,
      created_by: userId,
      position: nextPosition,
      probability: opportunityData.probability || 50,
    };

    // Inserir oportunidade no banco
    const { data, error } = await supabase
      .from('opportunities')
      .insert(insertData)
      .select(`
        *,
        lead:leads(id, name, email, phone, company),
        responsible:users!opportunities_responsible_id_fkey(id, name, email),
        status:opportunity_statuses(id, name, color, position, is_won, is_lost)
      `)
      .single();

    if (error) {
      devLog.error('[POST /api/opportunities] Erro ao inserir oportunidade:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    devLog.log('[POST /api/opportunities] Oportunidade criada com sucesso:', data.id);

    return NextResponse.json({
      success: true,
      data
    }, { status: 201 });

  } catch (error: any) {
    devLog.error('[POST /api/opportunities] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar oportunidade' },
      { status: 500 }
    );
  }
}
