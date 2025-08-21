import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

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
    devLog.log('[API Financial Dashboard] Cliente Supabase criado');
    
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    devLog.log('[API Financial Dashboard] Parâmetros:', { month, year });

    // Buscar projetos do mês
    devLog.log('[API Financial Dashboard] Buscando projetos...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        valor_projeto,
        price,
        pagamento,
        empresa_integradora,
        nome_cliente_final,
        created_at,
        users (
          id,
          full_name,
          email,
          role
        )
      `)
      .gte('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
      .lt('created_at', `${month === 12 ? year + 1 : year}-${(month === 12 ? 1 : month + 1).toString().padStart(2, '0')}-01`);
    
    if (projectsError) {
      devLog.error('[API Financial Dashboard] Erro ao buscar projetos:', projectsError);
      return NextResponse.json({ 
        error: 'Erro ao buscar projetos',
        details: projectsError.message 
      }, { status: 500 });
    }
    
    devLog.log('[API Financial Dashboard] Projetos encontrados:', projects?.length || 0);
    
    // Buscar transações financeiras do mês
    devLog.log('[API Financial Dashboard] Buscando transações financeiras...');
    let transactions = [];
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (transactionsError) {
        devLog.log('[API Financial Dashboard] Tabela financial_transactions não existe:', transactionsError.message);
        transactions = [];
      } else {
        // Filtrar por mês/ano no JavaScript já que os campos não existem na tabela
        const filteredTransactions = transactionsData?.filter(transaction => {
          if (!transaction.date) return false;
          const transactionDate = new Date(transaction.date);
          const transactionMonth = transactionDate.getMonth() + 1;
          const transactionYear = transactionDate.getFullYear();
          return transactionMonth === month && transactionYear === year;
        }) || [];
        
        transactions = filteredTransactions;
        devLog.log('[API Financial Dashboard] Transações encontradas:', transactions.length);
      }
    } catch (transError) {
      devLog.log('[API Financial Dashboard] Erro ao buscar transações:', transError.message);
      transactions = [];
    }
    
    // Buscar custos fixos do mês
    devLog.log('[API Financial Dashboard] Buscando custos fixos...');
    let fixedCosts = [];
    try {
      const { data: fixedCostsData, error: fixedCostsError } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (fixedCostsError) {
        devLog.log('[API Financial Dashboard] Tabela fixed_costs não existe:', fixedCostsError.message);
        fixedCosts = [];
      } else {
        fixedCosts = fixedCostsData || [];
        devLog.log('[API Financial Dashboard] Custos fixos encontrados:', fixedCosts.length);
      }
    } catch (fixedError) {
      devLog.log('[API Financial Dashboard] Erro ao buscar custos fixos:', fixedError.message);
      fixedCosts = [];
    }
    
    devLog.log('[API Financial Dashboard] Calculando métricas...');
    
    // Calcular métricas
    const projectRevenue = projects?.reduce((total, project) => {
      const value = project.valor_projeto || 0;
      if (project.pagamento === 'pago') {
        return total + value;
      } else if (project.pagamento === 'parcela1') {
        return total + (value / 2);
      }
      return total;
    }, 0) || 0;
    
    const projectEstimatedRevenue = projects?.reduce((total, project) => {
              return total + (project.valor_projeto || 0);
    }, 0) || 0;
    
    const transactionRevenue = transactions?.filter(t => t.type === 'receita')
      .reduce((total, t) => total + parseFloat(t.amount || 0), 0) || 0;
    
    const variableExpenses = transactions?.filter(t => t.type === 'despesa')
      .reduce((total, t) => total + parseFloat(t.amount || 0), 0) || 0;
    
    // Aplicar vigência dos custos fixos: considerar apenas os custos válidos para o mês solicitado
    const monthRef = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
    const fixedCostsForPeriod = (fixedCosts || []).filter((c: any) => {
      const start = c.vigencia_inicio ? new Date(c.vigencia_inicio) : null;
      const end = c.vigencia_fim ? new Date(c.vigencia_fim) : null;
      const startsOk = !start || start <= monthRef;
      const endsOk = !end || end >= monthRef;
      return startsOk && endsOk;
    });
    const fixedExpenses = fixedCostsForPeriod.reduce((total: number, cost: any) => total + parseFloat(cost.amount || 0), 0) || 0;
    
    const totalRevenue = projectRevenue + transactionRevenue;
    const totalExpenses = variableExpenses + fixedExpenses;
    const netProfit = totalRevenue - totalExpenses;
    
    // Agrupar transações por categoria
    const transactionsByCategory = transactions?.reduce((acc, transaction) => {
      const category = transaction.category || 'Sem categoria';
      if (!acc[category]) {
        acc[category] = {
          receitas: 0,
          despesas: 0,
          items: []
        };
      }
      
      if (transaction.type === 'receita') {
        acc[category].receitas += parseFloat(transaction.amount || 0);
      } else {
        acc[category].despesas += parseFloat(transaction.amount || 0);
      }
      
      acc[category].items.push(transaction);
      return acc;
    }, {}) || {};
    
    // Agrupar custos fixos por categoria (apenas do período)
    const fixedCostsByCategory = fixedCostsForPeriod.reduce((acc: any, cost: any) => {
      const category = cost.category || 'Sem categoria';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          items: []
        };
      }
      
      acc[category].total += parseFloat(cost.amount || 0);
      acc[category].items.push(cost);
      return acc;
    }, {} as any) || {};
    
    const dashboardData = {
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        fixedCosts: fixedExpenses,
        projectRevenue,
        projectEstimatedRevenue,
        transactionRevenue,
        variableExpenses
      },
      projects: projects || [],
      transactions: transactions || [],
      fixedCosts: fixedCostsForPeriod || [],
      transactionsByCategory,
      fixedCostsByCategory,
      period: {
        month: month,
        year: year
      }
    };
    
    devLog.log('[API Financial Dashboard] Métricas calculadas:', {
      totalRevenue,
      totalExpenses,
      netProfit,
      projectsCount: projects?.length || 0,
      transactionsCount: transactions?.length || 0,
      fixedCostsCount: fixedCosts?.length || 0
    });
    
    devLog.log('[API Financial Dashboard] === SUCESSO ===');
    return NextResponse.json(dashboardData);
    
  } catch (error) {
    devLog.error('[API Financial Dashboard] ERRO CRÍTICO:', error);
    devLog.error('[API Financial Dashboard] Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
