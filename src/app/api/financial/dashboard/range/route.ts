import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { fetchDashboardRawData, computeMonthDashboardData } from '@/lib/services/financialDashboard';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Retorna as métricas financeiras dos últimos N meses (padrão 12) a partir de um
 * mês/ano de referência, em uma única resposta — substitui o antigo loop client-side
 * que chamava /api/financial/dashboard uma vez por mês (12 round-trips sequenciais).
 * Busca os dados brutos (projetos, transações, custos fixos) apenas uma vez e calcula
 * cada mês em memória, reaproveitando exatamente a mesma lógica de
 * /api/financial/dashboard (src/lib/services/financialDashboard.ts).
 */
export async function GET(request: NextRequest) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const count = Math.min(parseInt(searchParams.get('count') || '12'), 24);

    if (!tenantId) {
      return NextResponse.json({ data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Lista dos `count` meses, do mais antigo para o mais recente (mesma ordem do loop original)
    const monthsToFetch: { month: number; year: number }[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      monthsToFetch.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const oldest = monthsToFetch[0];
    const newest = monthsToFetch[monthsToFetch.length - 1];
    const rangeStart = `${oldest.year}-${oldest.month.toString().padStart(2, '0')}-01`;
    const rangeEndExclusive = newest.month === 12
      ? `${newest.year + 1}-01-01`
      : `${newest.year}-${(newest.month + 1).toString().padStart(2, '0')}-01`;

    const { allProjects, allTransactions, allFixedCosts } = await fetchDashboardRawData(supabase, tenantId, {
      rangeStart,
      rangeEndExclusive,
      includeProjects: true,
    });

    const data = monthsToFetch
      .map(({ month: m, year: y }) => {
        const monthData = computeMonthDashboardData(allProjects, allTransactions, allFixedCosts, m, y, true);
        const revenue = monthData.metrics.totalRevenue;
        const expenses = monthData.metrics.totalExpenses;
        return {
          month: `${monthNames[m - 1]}/${y}`,
          lucroLiquido: Math.round(revenue - expenses),
          isCurrentMonth: m === month && y === year,
          revenue,
          expenses,
        };
      })
      .filter(entry => entry.revenue > 0 || entry.expenses > 0);

    return NextResponse.json({ data });
  } catch (error: any) {
    devLog.error('[API Financial Dashboard Range] Erro:', error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
