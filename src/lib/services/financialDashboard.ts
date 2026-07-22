/**
 * @file financialDashboard.ts
 * @description Lógica compartilhada de cálculo do dashboard financeiro (usada por
 * /api/financial/dashboard e /api/financial/dashboard/range). Extraída para permitir
 * buscar os dados brutos (projetos/transações/custos fixos) UMA única vez e calcular
 * métricas de vários meses em memória, em vez de refazer as mesmas queries a cada mês
 * (ex: o gráfico de 12 meses do painel de histórico financeiro).
 */

import { devLog } from '@/lib/utils/productionLogger';

export interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  fixedCosts: number;
  projectRevenue: number;
  projectEstimatedRevenue: number;
  transactionRevenue: number;
  variableExpenses: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  projects: any[];
  transactions: any[];
  fixedCosts: any[];
  transactionsByCategory: Record<string, any>;
  fixedCostsByCategory: Record<string, any>;
  period: { month: number; year: number };
}

const EMPTY_METRICS: DashboardMetrics = {
  totalRevenue: 0, totalExpenses: 0, netProfit: 0, fixedCosts: 0,
  projectRevenue: 0, projectEstimatedRevenue: 0, transactionRevenue: 0, variableExpenses: 0,
};

/**
 * Busca projetos (opcional), transações e custos fixos brutos do tenant, já filtrando
 * transações por um intervalo de datas no banco (em vez de trazer o histórico inteiro).
 */
export async function fetchDashboardRawData(
  supabase: any,
  tenantId: string,
  options: { rangeStart: string; rangeEndExclusive: string; includeProjects: boolean }
): Promise<{ allProjects: any[]; allTransactions: any[]; allFixedCosts: any[] }> {
  const { rangeStart, rangeEndExclusive, includeProjects } = options;

  let allProjects: any[] = [];
  if (includeProjects) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        id,
        nome_cliente_final,
        valor_projeto,
        price,
        pagamento,
        empresa_integradora,
        created_at,
        data_pagamento_integral,
        data_pagamento_parcela1
      `)
      .eq('tenant_id', tenantId);

    if (error) {
      devLog.error('[financialDashboard] Erro ao buscar projetos:', error);
    } else {
      allProjects = data || [];
    }
  }

  let allTransactions: any[] = [];
  try {
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', rangeStart)
      .lt('transaction_date', rangeEndExclusive)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.log('[financialDashboard] Tabela financial_transactions não existe:', error.message);
    } else {
      allTransactions = data || [];
    }
  } catch (transError: any) {
    devLog.log('[financialDashboard] Erro ao buscar transações:', transError?.message);
  }

  let allFixedCosts: any[] = [];
  try {
    const { data, error } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.log('[financialDashboard] Tabela fixed_costs não existe:', error.message);
    } else {
      allFixedCosts = data || [];
    }
  } catch (fixedError: any) {
    devLog.log('[financialDashboard] Erro ao buscar custos fixos:', fixedError?.message);
  }

  return { allProjects, allTransactions, allFixedCosts };
}

/**
 * Calcula as métricas de um mês específico a partir de arrays já buscados
 * (mesma lógica de negócio que já existia em /api/financial/dashboard, apenas
 * reaproveitável para vários meses sem refazer as queries).
 */
export function computeMonthDashboardData(
  allProjects: any[],
  allTransactions: any[],
  allFixedCosts: any[],
  month: number,
  year: number,
  includeProjects: boolean
): DashboardData {
  const projects = !includeProjects ? [] : allProjects.filter(project => {
    const paymentStatus = project.pagamento || 'pendente';
    if (paymentStatus === 'pendente') return false;

    let paymentDate: string | null = null;
    if (paymentStatus === 'pago' && project.data_pagamento_integral) {
      paymentDate = project.data_pagamento_integral;
    } else if (paymentStatus === 'parcela1' && project.data_pagamento_parcela1) {
      paymentDate = project.data_pagamento_parcela1;
    }
    if (!paymentDate) return false;

    try {
      const date = new Date(paymentDate);
      return (date.getMonth() + 1) === month && date.getFullYear() === year;
    } catch {
      return false;
    }
  });

  // As transações já chegam filtradas pelo intervalo de datas buscado no banco;
  // aqui refinamos apenas para o mês exato (o intervalo buscado pode cobrir vários meses).
  const transactions = allTransactions.filter(transaction => {
    if (!transaction.transaction_date) return false;
    const d = new Date(transaction.transaction_date);
    return (d.getMonth() + 1) === month && d.getFullYear() === year;
  });

  const monthRef = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
  const fixedCostsForPeriod = allFixedCosts.filter((c: any) => {
    const start = c.vigencia_inicio ? new Date(c.vigencia_inicio) : null;
    const end = c.vigencia_fim ? new Date(c.vigencia_fim) : null;
    const startsOk = !start || start <= monthRef;
    const endsOk = !end || end >= monthRef;
    return startsOk && endsOk;
  });

  if (!includeProjects) {
    // Modo leve: caller só precisa de transactions/fixedCosts (ex: carga inicial da
    // página financeira, que já calcula suas próprias métricas a partir de `projects`
    // vindos de /api/projects/unified).
    const transactionsByCategory = transactions.reduce((acc: any, t: any) => {
      const category = t.category || 'Sem categoria';
      if (!acc[category]) acc[category] = { receitas: 0, despesas: 0, items: [] };
      if (t.type === 'income') acc[category].receitas += parseFloat(t.amount || 0);
      else acc[category].despesas += parseFloat(t.amount || 0);
      acc[category].items.push(t);
      return acc;
    }, {});

    const fixedCostsByCategory = fixedCostsForPeriod.reduce((acc: any, cost: any) => {
      const category = cost.category || 'Sem categoria';
      if (!acc[category]) acc[category] = { total: 0, items: [] };
      acc[category].total += parseFloat(cost.amount || 0);
      acc[category].items.push(cost);
      return acc;
    }, {});

    return {
      metrics: EMPTY_METRICS,
      projects: [],
      transactions,
      fixedCosts: fixedCostsForPeriod,
      transactionsByCategory,
      fixedCostsByCategory,
      period: { month, year },
    };
  }

  const projectRevenue = projects.reduce((total, project) => {
    const value = project.valor_projeto || 0;
    if (project.pagamento === 'pago') return total + value;
    if (project.pagamento === 'parcela1') return total + (value / 2);
    return total;
  }, 0);

  const projectEstimatedRevenue = projects.reduce((total, project) => total + (project.valor_projeto || 0), 0);

  const transactionRevenue = transactions.filter(t => t.type === 'income')
    .reduce((total, t) => total + parseFloat(t.amount || 0), 0);

  const variableExpenses = transactions.filter(t => t.type === 'expense')
    .reduce((total, t) => total + parseFloat(t.amount || 0), 0);

  const fixedExpenses = fixedCostsForPeriod.reduce((total: number, cost: any) => total + parseFloat(cost.amount || 0), 0);

  const totalRevenue = projectRevenue + transactionRevenue;
  const totalExpenses = variableExpenses + fixedExpenses;
  const netProfit = totalRevenue - totalExpenses;

  const transactionsByCategory = transactions.reduce((acc: any, transaction: any) => {
    const category = transaction.category || 'Sem categoria';
    if (!acc[category]) acc[category] = { receitas: 0, despesas: 0, items: [] };
    if (transaction.type === 'income') acc[category].receitas += parseFloat(transaction.amount || 0);
    else acc[category].despesas += parseFloat(transaction.amount || 0);
    acc[category].items.push(transaction);
    return acc;
  }, {});

  const fixedCostsByCategory = fixedCostsForPeriod.reduce((acc: any, cost: any) => {
    const category = cost.category || 'Sem categoria';
    if (!acc[category]) acc[category] = { total: 0, items: [] };
    acc[category].total += parseFloat(cost.amount || 0);
    acc[category].items.push(cost);
    return acc;
  }, {});

  return {
    metrics: {
      totalRevenue, totalExpenses, netProfit,
      fixedCosts: fixedExpenses,
      projectRevenue, projectEstimatedRevenue, transactionRevenue, variableExpenses,
    },
    projects,
    transactions,
    fixedCosts: fixedCostsForPeriod,
    transactionsByCategory,
    fixedCostsByCategory,
    period: { month, year },
  };
}
