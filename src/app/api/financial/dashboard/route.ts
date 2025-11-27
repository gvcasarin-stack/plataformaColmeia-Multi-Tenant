import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
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
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');
    
    // Extrair parâmetros antes de usar
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    
    if (!tenantId) {
      devLog.warn('[API Financial Dashboard] Sem x-tenant-id; retornando estrutura vazia');
      return NextResponse.json({
        metrics: { totalRevenue: 0, totalExpenses: 0, netProfit: 0, fixedCosts: 0, projectRevenue: 0, projectEstimatedRevenue: 0, transactionRevenue: 0, variableExpenses: 0 },
        projects: [], transactions: [], fixedCosts: [], transactionsByCategory: {}, fixedCostsByCategory: {},
        period: { month, year }
      });
    }
    devLog.log('[API Financial Dashboard] Cliente Supabase criado');
    devLog.log('[API Financial Dashboard] Parâmetros:', { month, year, tenantId });

    // Buscar TODOS os projetos do tenant (filtraremos por data de pagamento depois)
    devLog.log('[API Financial Dashboard] Buscando projetos...');
    const { data: allProjects, error: projectsError } = await supabase
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

    if (projectsError) {
      devLog.error('[API Financial Dashboard] Erro ao buscar projetos:', projectsError);
      return NextResponse.json({
        error: 'Erro ao buscar projetos',
        details: projectsError.message
      }, { status: 500 });
    }

    // ✅ FILTRAR projetos pela data de PAGAMENTO (não criação)
    const projects = (allProjects || []).filter(project => {
      const paymentStatus = project.pagamento || 'pendente';

      // Não contabilizar projetos pendentes
      if (paymentStatus === 'pendente') {
        return false;
      }

      // Verificar data do pagamento conforme o status
      let paymentDate = null;

      if (paymentStatus === 'pago' && project.data_pagamento_integral) {
        paymentDate = project.data_pagamento_integral;
      } else if (paymentStatus === 'parcela1' && project.data_pagamento_parcela1) {
        paymentDate = project.data_pagamento_parcela1;
      }

      // Se não tem data de pagamento registrada, não contabilizar
      if (!paymentDate) {
        return false;
      }

      try {
        const date = new Date(paymentDate);
        const paymentMonth = date.getMonth() + 1;
        const paymentYear = date.getFullYear();

        return paymentMonth === month && paymentYear === year;
      } catch (e) {
        return false;
      }
    });

    devLog.log('[API Financial Dashboard] Projetos filtrados por data de pagamento:', {
      total: allProjects?.length || 0,
      filtered: projects.length,
      month,
      year
    });
    
    // Buscar transações financeiras do mês
    devLog.log('[API Financial Dashboard] Buscando transações financeiras...');
    let transactions = [];
    try {
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        devLog.log('[API Financial Dashboard] Tabela financial_transactions não existe:', transactionsError.message);
        transactions = [];
      } else {
        // ✅ CORREÇÃO: Filtrar por transaction_date que existe na tabela
        const filteredTransactions = transactionsData?.filter(transaction => {
          if (!transaction.transaction_date) return false;
          const transactionDate = new Date(transaction.transaction_date);
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
      // ✅ CONFIRMADO: fixed_costs tem tenant_id
      const { data: fixedCostsData, error: fixedCostsError } = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
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
    
    const transactionRevenue = transactions?.filter(t => t.type === 'income')
      .reduce((total, t) => total + parseFloat(t.amount || 0), 0) || 0;
    
    const variableExpenses = transactions?.filter(t => t.type === 'expense')
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
      
      if (transaction.type === 'income') {
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