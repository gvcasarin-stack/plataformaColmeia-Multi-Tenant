import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";
import { fetchDashboardRawData, computeMonthDashboardData } from '@/lib/services/financialDashboard';

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Financial Dashboard] === INÍCIO ===');

    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      devLog.error('[API Financial Dashboard] Variáveis de ambiente não configuradas');
      return NextResponse.json({
        error: 'Configuração do banco de dados não encontrada',
        details: 'Variáveis de ambiente não configuradas'
      }, { status: 500 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    // Extrair parâmetros antes de usar
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    // ✅ PERFORMANCE: callers que não usam `projects`/`metrics` da resposta (ex: carga
    // inicial da página financeira, que já busca projetos via /api/projects/unified)
    // podem pedir para pular essa busca com ?includeProjects=false.
    const includeProjects = searchParams.get('includeProjects') !== 'false';

    if (!tenantId) {
      devLog.warn('[API Financial Dashboard] Sem x-tenant-id; retornando estrutura vazia');
      return NextResponse.json({
        metrics: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, fixedCosts: 0, projectRevenue: 0, projectEstimatedRevenue: 0, transactionRevenue: 0, variableExpenses: 0 },
        projects: [], transactions: [], fixedCosts: [], transactionsByCategory: {}, fixedCostsByCategory: {},
        period: { month, year }
      });
    }
    devLog.log('[API Financial Dashboard] Parâmetros:', { month, year, tenantId, includeProjects });

    const rangeStart = `${year}-${month.toString().padStart(2, '0')}-01`;
    const rangeEndExclusive = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;

    const { allProjects, allTransactions, allFixedCosts } = await fetchDashboardRawData(supabase, tenantId, {
      rangeStart,
      rangeEndExclusive,
      includeProjects,
    });

    const dashboardData = computeMonthDashboardData(allProjects, allTransactions, allFixedCosts, month, year, includeProjects);

    devLog.log('[API Financial Dashboard] Métricas calculadas:', {
      ...dashboardData.metrics,
      projectsCount: dashboardData.projects.length,
      transactionsCount: dashboardData.transactions.length,
      fixedCostsCount: dashboardData.fixedCosts.length
    });

    devLog.log('[API Financial Dashboard] === SUCESSO ===');
    return NextResponse.json(dashboardData);

  } catch (error: any) {
    devLog.error('[API Financial Dashboard] ERRO CRÍTICO:', error);
    devLog.error('[API Financial Dashboard] Stack trace:', error.stack);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
