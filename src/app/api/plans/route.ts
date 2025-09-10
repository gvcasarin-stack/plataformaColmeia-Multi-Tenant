import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API para buscar planos disponíveis da tabela plans
 * GET /api/plans - Todos os planos
 * GET /api/plans?current=basico - Planos para upgrade do plano atual
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Plans] Buscando planos disponíveis...');

    const { searchParams } = new URL(request.url);
    const currentPlan = searchParams.get('current');

    const supabase = createSupabaseServiceRoleClient();

    // Buscar todos os planos ativos
    const { data: plans, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      devLog.error('[API Plans] Erro ao buscar planos:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar planos disponíveis' },
        { status: 500 }
      );
    }

    if (!plans || plans.length === 0) {
      devLog.warn('[API Plans] Nenhum plano encontrado');
      return NextResponse.json(
        { error: 'Nenhum plano disponível' },
        { status: 404 }
      );
    }

    // Se foi solicitado planos para upgrade, filtrar apenas superiores
    if (currentPlan) {
      const currentPlanData = plans.find(p => p.plan_code === currentPlan);
      
      if (!currentPlanData) {
        devLog.warn('[API Plans] Plano atual não encontrado:', currentPlan);
        return NextResponse.json(
          { error: 'Plano atual não encontrado' },
          { status: 404 }
        );
      }

      // Filtrar apenas planos com sort_order maior (upgrades)
      const upgradeOptions = plans.filter(p => p.sort_order > currentPlanData.sort_order);

      devLog.log('[API Plans] Opções de upgrade encontradas:', {
        currentPlan,
        currentSortOrder: currentPlanData.sort_order,
        upgradeOptionsCount: upgradeOptions.length,
        upgradeOptions: upgradeOptions.map(p => p.plan_code)
      });

      return NextResponse.json({
        success: true,
        data: upgradeOptions,
        currentPlan: currentPlanData,
        upgradeAvailable: upgradeOptions.length > 0
      });
    }

    // Retornar todos os planos
    devLog.log('[API Plans] Todos os planos encontrados:', {
      count: plans.length,
      planCodes: plans.map(p => p.plan_code)
    });

    return NextResponse.json({
      success: true,
      data: plans
    });

  } catch (error) {
    devLog.error('[API Plans] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar planos' },
      { status: 500 }
    );
  }
}
