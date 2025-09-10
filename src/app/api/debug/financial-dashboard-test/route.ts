import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API de DEBUG para testar o sistema financeiro
 * Uso: GET /api/debug/financial-dashboard-test?debug=true
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ PROTEÇÃO: Só funciona com ?debug=true
    const { searchParams } = new URL(request.url);
    if (searchParams.get('debug') !== 'true') {
      return NextResponse.json({
        error: 'API de debug protegida',
        message: 'Para executar esta API, adicione ?debug=true na URL',
        usage: 'GET /api/debug/financial-dashboard-test?debug=true'
      }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    console.log(`🔍 [FINANCIAL-DEBUG] ===== INÍCIO DO TESTE - ${timestamp} =====`);

    const supabase = createSupabaseServiceRoleClient();
    const testResults: any = {
      timestamp,
      systemCheck: {},
      databaseTables: {},
      tenantData: {},
      apiTests: {},
      summary: {}
    };

    // === FASE 1: VERIFICAR AMBIENTE ===
    console.log('🔍 [FINANCIAL-DEBUG] FASE 1: Verificando ambiente...');
    testResults.systemCheck = {
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
        service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌',
        node_env: process.env.NODE_ENV || 'unknown'
      }
    };

    // === FASE 2: VERIFICAR TABELAS ===
    console.log('🔍 [FINANCIAL-DEBUG] FASE 2: Verificando estrutura das tabelas...');
    
    // Verificar tabela projects
    const { data: projectsSchema, error: projectsSchemaError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    testResults.databaseTables.projects = {
      exists: !projectsSchemaError,
      error: projectsSchemaError?.message || null,
      sampleCount: projectsSchema?.length || 0
    };

    // Verificar tabela financial_transactions
    const { data: transactionsSchema, error: transactionsSchemaError } = await supabase
      .from('financial_transactions')
      .select('*')
      .limit(1);
    
    testResults.databaseTables.financial_transactions = {
      exists: !transactionsSchemaError,
      error: transactionsSchemaError?.message || null,
      sampleCount: transactionsSchema?.length || 0
    };

    // Verificar tabela fixed_costs
    const { data: fixedCostsSchema, error: fixedCostsSchemaError } = await supabase
      .from('fixed_costs')
      .select('*')
      .limit(1);
    
    testResults.databaseTables.fixed_costs = {
      exists: !fixedCostsSchemaError,
      error: fixedCostsSchemaError?.message || null,
      sampleCount: fixedCostsSchema?.length || 0
    };

    // === FASE 3: BUSCAR DADOS DE TENANT CONHECIDO ===
    console.log('🔍 [FINANCIAL-DEBUG] FASE 3: Buscando dados do tenant conhecido...');
    const knownTenantId = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'; // Goiás Solar
    
    // Buscar projetos do tenant (corrigir colunas)
    const { data: tenantProjects, error: tenantProjectsError } = await supabase
      .from('projects')
      .select('id, nome_cliente_final, valor_projeto, pagamento, created_at, tenant_id')
      .eq('tenant_id', knownTenantId)
      .limit(5);

    testResults.tenantData.projects = {
      tenantId: knownTenantId,
      count: tenantProjects?.length || 0,
      error: tenantProjectsError?.message || null,
      sample: tenantProjects?.slice(0, 2) || []
    };

    // Buscar transações do tenant
    const { data: tenantTransactions, error: tenantTransactionsError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', knownTenantId)
      .limit(5);

    testResults.tenantData.transactions = {
      tenantId: knownTenantId,
      count: tenantTransactions?.length || 0,
      error: tenantTransactionsError?.message || null,
      sample: tenantTransactions?.slice(0, 2) || []
    };

    // Buscar custos fixos do tenant (verificar se coluna tenant_id existe)
    let tenantFixedCosts, tenantFixedCostsError;
    try {
      const result = await supabase
        .from('fixed_costs')
        .select('*')
        .eq('tenant_id', knownTenantId)
        .limit(5);
      tenantFixedCosts = result.data;
      tenantFixedCostsError = result.error;
    } catch (error: any) {
      // Se tenant_id não existe, buscar todos os custos fixos
      if (error.message?.includes('tenant_id')) {
        const result = await supabase
          .from('fixed_costs')
          .select('*')
          .limit(5);
        tenantFixedCosts = result.data;
        tenantFixedCostsError = { message: 'Coluna tenant_id não existe na tabela fixed_costs' };
      } else {
        tenantFixedCosts = null;
        tenantFixedCostsError = error;
      }
    }

    testResults.tenantData.fixedCosts = {
      tenantId: knownTenantId,
      count: tenantFixedCosts?.length || 0,
      error: tenantFixedCostsError?.message || null,
      sample: tenantFixedCosts?.slice(0, 2) || []
    };

    // === FASE 4: TESTAR APIS ===
    console.log('🔍 [FINANCIAL-DEBUG] FASE 4: Testando APIs...');
    
    // Testar API tenant-id
    try {
      const tenantIdResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user/tenant-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'c8064568-bc85-4bc6-ad6d-5562049c9865' })
      });
      
      testResults.apiTests.tenantId = {
        status: tenantIdResponse.status,
        success: tenantIdResponse.ok,
        data: tenantIdResponse.ok ? await tenantIdResponse.json() : null,
        error: !tenantIdResponse.ok ? await tenantIdResponse.text() : null
      };
    } catch (apiError: any) {
      testResults.apiTests.tenantId = {
        success: false,
        error: apiError.message
      };
    }

    // Simular chamada para dashboard com headers corretos
    try {
      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/financial/dashboard?month=9&year=2025`;
      const dashboardResponse = await fetch(dashboardUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': knownTenantId
        }
      });

      testResults.apiTests.dashboard = {
        url: dashboardUrl,
        status: dashboardResponse.status,
        success: dashboardResponse.ok,
        data: dashboardResponse.ok ? await dashboardResponse.json() : null,
        error: !dashboardResponse.ok ? await dashboardResponse.text() : null
      };
    } catch (dashboardError: any) {
      testResults.apiTests.dashboard = {
        success: false,
        error: dashboardError.message
      };
    }

    // === FASE 5: RESUMO ===
    console.log('🔍 [FINANCIAL-DEBUG] FASE 5: Gerando resumo...');
    
    const issues = [];
    const recommendations = [];

    // Verificar problemas
    if (!testResults.systemCheck.environment.supabase_url) {
      issues.push('❌ SUPABASE_URL não configurada');
    }
    if (!testResults.systemCheck.environment.service_role_key) {
      issues.push('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
    }
    if (!testResults.databaseTables.projects.exists) {
      issues.push('❌ Tabela projects não existe ou inacessível');
    }
    if (!testResults.databaseTables.financial_transactions.exists) {
      issues.push('⚠️ Tabela financial_transactions não existe');
    }
    if (!testResults.databaseTables.fixed_costs.exists) {
      issues.push('⚠️ Tabela fixed_costs não existe');
    }
    if (!testResults.apiTests.tenantId?.success) {
      issues.push('❌ API /api/user/tenant-id falhando');
    }
    if (!testResults.apiTests.dashboard?.success) {
      issues.push('❌ API /api/financial/dashboard falhando');
    }

    // Gerar recomendações
    if (testResults.tenantData.projects.count === 0) {
      recommendations.push('💡 Criar alguns projetos para teste');
    }
    if (testResults.tenantData.transactions.count === 0) {
      recommendations.push('💡 Criar algumas transações financeiras para teste');
    }
    if (testResults.tenantData.fixedCosts.count === 0) {
      recommendations.push('💡 Criar alguns custos fixos para teste');
    }

    testResults.summary = {
      overallHealth: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 20)),
      criticalIssues: issues.filter(i => i.includes('❌')).length,
      warningIssues: issues.filter(i => i.includes('⚠️')).length,
      issues,
      recommendations,
      recommendedAction: issues.length === 0 ? 
        '✅ Sistema funcional - investigar problemas específicos do frontend' : 
        '🔧 Corrigir problemas identificados antes de continuar'
    };

    console.log(`🔍 [FINANCIAL-DEBUG] ===== FIM DO TESTE - ${new Date().toISOString()} =====`);
    return NextResponse.json(testResults);

  } catch (error: any) {
    console.error('🔍 [FINANCIAL-DEBUG] ERRO CRÍTICO:', error);
    return NextResponse.json({
      error: 'Erro crítico no teste',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
