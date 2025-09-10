import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de debug para testar endpoints de billing
 * 
 * USO:
 * GET /api/debug/test-billing-apis?action=test_organization&userId=ID
 * GET /api/debug/test-billing-apis?action=test_usage_stats&userId=ID
 * GET /api/debug/test-billing-apis?action=test_plans
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    devLog.log('[DEBUG Billing APIs] Ação solicitada:', { action, userId });

    const supabase = createSupabaseServiceRoleClient();

    switch (action) {
      case 'test_organization':
        if (!userId) {
          return NextResponse.json({
            error: 'userId é obrigatório',
            usage: '/api/debug/test-billing-apis?action=test_organization&userId=ID'
          }, { status: 400 });
        }

        // Testar busca de organização diretamente
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', userId)
          .single();

        if (userError || !userData?.tenant_id) {
          return NextResponse.json({
            success: false,
            error: 'Usuário não encontrado ou sem tenant_id',
            details: userError?.message
          });
        }

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', userData.tenant_id)
          .single();

        return NextResponse.json({
          success: !orgError,
          userData,
          organizationData: orgData,
          error: orgError?.message,
          testResult: {
            userFound: !!userData,
            tenantId: userData.tenant_id,
            organizationFound: !!orgData,
            organizationPlan: orgData?.plan
          }
        });

      case 'test_usage_stats':
        if (!userId) {
          return NextResponse.json({
            error: 'userId é obrigatório',
            usage: '/api/debug/test-billing-apis?action=test_usage_stats&userId=ID'
          }, { status: 400 });
        }

        // Simular chamada da API usage-stats com headers corretos
        try {
          // Buscar tenant_id
          const { data: userForStats, error: userStatsError } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', userId)
            .single();

          if (userStatsError || !userForStats?.tenant_id) {
            return NextResponse.json({
              success: false,
              error: 'Usuário não encontrado para stats',
              details: userStatsError?.message
            });
          }

          // Testar as queries que a API usage-stats faz
          const { count: projectsCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', userForStats.tenant_id);

          const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', userForStats.tenant_id);

          const { data: orgForStats } = await supabase
            .from('organizations')
            .select('plan_limits, plan, name')
            .eq('id', userForStats.tenant_id)
            .single();

          return NextResponse.json({
            success: true,
            tenantId: userForStats.tenant_id,
            stats: {
              projectsCount: projectsCount || 0,
              usersCount: usersCount || 0,
              organization: orgForStats
            },
            apiWouldWork: !!orgForStats
          });

        } catch (statsError) {
          return NextResponse.json({
            success: false,
            error: 'Erro ao testar usage stats',
            details: statsError instanceof Error ? statsError.message : 'Erro desconhecido'
          });
        }

      case 'test_plans':
        // Testar se a tabela plans existe e tem dados
        try {
          const { data: plansData, error: plansError } = await supabase
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('sort_order');

          return NextResponse.json({
            success: !plansError,
            plansCount: plansData?.length || 0,
            plans: plansData,
            error: plansError?.message,
            tableExists: !plansError
          });
        } catch (plansTestError) {
          return NextResponse.json({
            success: false,
            error: 'Tabela plans não existe ou erro de acesso',
            details: plansTestError instanceof Error ? plansTestError.message : 'Erro desconhecido'
          });
        }

      default:
        return NextResponse.json({
          error: 'Ação inválida',
          availableActions: ['test_organization', 'test_usage_stats', 'test_plans'],
          usage: {
            testOrg: '/api/debug/test-billing-apis?action=test_organization&userId=ID',
            testStats: '/api/debug/test-billing-apis?action=test_usage_stats&userId=ID',
            testPlans: '/api/debug/test-billing-apis?action=test_plans'
          }
        }, { status: 400 });
    }

  } catch (error) {
    devLog.error('[DEBUG Billing APIs] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
