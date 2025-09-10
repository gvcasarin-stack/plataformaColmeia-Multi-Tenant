/**
 * API de Debug para verificar se a organização existe no banco
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, tenantId } = body;

    devLog.log('[Check-Organization] Verificando organização:', { organizationId, tenantId });

    const supabase = createSupabaseServiceRoleClient();

    // Teste 1: Buscar por ID apenas
    const { data: orgById, error: errorById } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    // Teste 2: Buscar todas as organizações (limitado a 10)
    const { data: allOrgs, error: allOrgsError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .limit(10);

    // Teste 3: Contar organizações
    const { count, error: countError } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    const result = {
      searchCriteria: { organizationId, tenantId },
      tests: {
        byId: {
          success: !errorById,
          error: errorById?.message,
          found: !!orgById,
          data: orgById ? {
            id: orgById.id,
            name: orgById.name,
            slug: orgById.slug,
            status: orgById.status
          } : null
        },
        allOrganizations: {
          success: !allOrgsError,
          error: allOrgsError?.message,
          count: allOrgs?.length || 0,
          organizations: allOrgs?.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug
          })) || []
        },
        totalCount: {
          success: !countError,
          error: countError?.message,
          total: count || 0
        }
      }
    };

    devLog.log('[Check-Organization] Resultado dos testes:', result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error: any) {
    devLog.error('[Check-Organization] Erro:', error);

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
