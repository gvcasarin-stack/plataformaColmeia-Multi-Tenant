import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API de DEBUG para testar criação de transações financeiras
 * Testa tanto RECEITA quanto DESPESA
 * Uso: GET /api/debug/financial-transactions-test?debug=true
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ PROTEÇÃO: Só funciona com ?debug=true
    const { searchParams } = new URL(request.url);
    if (searchParams.get('debug') !== 'true') {
      return NextResponse.json({
        error: 'API de debug protegida',
        message: 'Para executar esta API, adicione ?debug=true na URL',
        usage: 'GET /api/debug/financial-transactions-test?debug=true'
      }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    console.log(`🔍 [TRANSACTIONS-DEBUG] ===== INÍCIO DO TESTE - ${timestamp} =====`);

    const supabase = createSupabaseServiceRoleClient();
    const knownTenantId = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'; // Goiás Solar
    const knownUserId = 'c8064568-bc85-4bc6-ad6d-5562049c9865'; // Admin conhecido

    const testResults: any = {
      timestamp,
      systemCheck: {},
      tableStructure: {},
      transactionTests: {},
      apiTests: {},
      summary: {}
    };

    // === FASE 1: VERIFICAR SISTEMA ===
    console.log('🔍 [TRANSACTIONS-DEBUG] FASE 1: Verificando sistema...');
    testResults.systemCheck = {
      environment: {
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
        service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌'
      },
      knownData: {
        tenantId: knownTenantId,
        userId: knownUserId
      }
    };

    // === FASE 2: VERIFICAR ESTRUTURA DA TABELA ===
    console.log('🔍 [TRANSACTIONS-DEBUG] FASE 2: Verificando estrutura da tabela financial_transactions...');
    
    // Buscar estrutura da tabela
    const { data: existingTransactions, error: structureError } = await supabase
      .from('financial_transactions')
      .select('*')
      .limit(1);

    testResults.tableStructure = {
      exists: !structureError,
      error: structureError?.message || null,
      sampleCount: existingTransactions?.length || 0
    };

    // Buscar transações existentes do tenant
    const { data: tenantTransactions, error: tenantError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', knownTenantId)
      .limit(5);

    testResults.tableStructure.tenantData = {
      count: tenantTransactions?.length || 0,
      error: tenantError?.message || null,
      sample: tenantTransactions?.slice(0, 2) || []
    };

    // === FASE 3: TESTAR CRIAÇÃO DE TRANSAÇÕES ===
    console.log('🔍 [TRANSACTIONS-DEBUG] FASE 3: Testando criação de transações...');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Teste 1: Criar DESPESA
    console.log('🔍 [TRANSACTIONS-DEBUG] Teste 1: Criando DESPESA...');
    const despesaData = {
      description: 'Teste de Despesa - Debug API',
      amount: 150.50,
      category: 'Materiais',
      type: 'expense',  // ✅ Testando em inglês
      transaction_date: currentDate.toISOString().split('T')[0],
      tenant_id: knownTenantId,
      created_by: knownUserId
    };

    const { data: despesaCreated, error: despesaError } = await supabase
      .from('financial_transactions')
      .insert(despesaData)
      .select()
      .single();

    testResults.transactionTests.despesa = {
      input: despesaData,
      success: !despesaError,
      result: despesaCreated,
      error: despesaError?.message || null
    };

    // Teste 2: Criar RECEITA
    console.log('🔍 [TRANSACTIONS-DEBUG] Teste 2: Criando RECEITA...');
    const receitaData = {
      description: 'Teste de Receita - Debug API',
      amount: 500.00,
      category: 'Consultoria',
      type: 'income',   // ✅ Testando em inglês
      transaction_date: currentDate.toISOString().split('T')[0],
      tenant_id: knownTenantId,
      created_by: knownUserId
    };

    const { data: receitaCreated, error: receitaError } = await supabase
      .from('financial_transactions')
      .insert(receitaData)
      .select()
      .single();

    testResults.transactionTests.receita = {
      input: receitaData,
      success: !receitaError,
      result: receitaCreated,
      error: receitaError?.message || null
    };

    // === FASE 4: TESTAR APIS ===
    console.log('🔍 [TRANSACTIONS-DEBUG] FASE 4: Testando APIs...');

    // Testar API de criação via frontend
    try {
      const createApiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/financial/transactions`;
      
      // Teste com despesa via API
      const despesaApiResponse = await fetch(createApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': knownTenantId
        },
        body: JSON.stringify({
          description: 'Teste Despesa via API',
          amount: '75.25',
          category: 'Tecnologia',
          type: 'expense',
          date: currentDate.toISOString().split('T')[0],
          created_by: knownUserId // ✅ CORRIGIDO: incluir user_id real
        })
      });

      testResults.apiTests.despesaViaAPI = {
        url: createApiUrl,
        status: despesaApiResponse.status,
        success: despesaApiResponse.ok,
        data: despesaApiResponse.ok ? await despesaApiResponse.json() : null,
        error: !despesaApiResponse.ok ? await despesaApiResponse.text() : null
      };

      // Teste com receita via API
      const receitaApiResponse = await fetch(createApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': knownTenantId
        },
        body: JSON.stringify({
          description: 'Teste Receita via API',
          amount: '300.00',
          category: 'Serviços',
          type: 'income',
          date: currentDate.toISOString().split('T')[0],
          created_by: knownUserId // ✅ CORRIGIDO: incluir user_id real
        })
      });

      testResults.apiTests.receitaViaAPI = {
        url: createApiUrl,
        status: receitaApiResponse.status,
        success: receitaApiResponse.ok,
        data: receitaApiResponse.ok ? await receitaApiResponse.json() : null,
        error: !receitaApiResponse.ok ? await receitaApiResponse.text() : null
      };

    } catch (apiError: any) {
      testResults.apiTests.error = apiError.message;
    }

    // === FASE 5: VERIFICAR RESULTADOS ===
    console.log('🔍 [TRANSACTIONS-DEBUG] FASE 5: Verificando resultados...');
    
    // Buscar transações criadas
    const { data: finalTransactions, error: finalError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', knownTenantId)
      .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Últimos 60 segundos
      .order('created_at', { ascending: false });

    testResults.verification = {
      transactionsCreated: finalTransactions?.length || 0,
      error: finalError?.message || null,
      newTransactions: finalTransactions || []
    };

    // === FASE 6: RESUMO ===
    console.log('🔍 [TRANSACTIONS-DEBUG] FASE 6: Gerando resumo...');

    const issues = [];
    const recommendations = [];

    // Verificar problemas
    if (!testResults.systemCheck.environment.supabase_url) {
      issues.push('❌ SUPABASE_URL não configurada');
    }
    if (!testResults.systemCheck.environment.service_role_key) {
      issues.push('❌ SUPABASE_SERVICE_ROLE_KEY não configurada');
    }
    if (!testResults.tableStructure.exists) {
      issues.push('❌ Tabela financial_transactions não existe');
    }
    if (!testResults.transactionTests.despesa?.success) {
      issues.push('❌ Falha ao criar transação DESPESA');
    }
    if (!testResults.transactionTests.receita?.success) {
      issues.push('❌ Falha ao criar transação RECEITA');
    }
    if (!testResults.apiTests.despesaViaAPI?.success) {
      issues.push('❌ API de criação falhando para DESPESA');
    }
    if (!testResults.apiTests.receitaViaAPI?.success) {
      issues.push('❌ API de criação falhando para RECEITA');
    }

    // Gerar recomendações
    if (testResults.verification.transactionsCreated === 0) {
      recommendations.push('💡 Nenhuma transação foi criada - verificar permissões');
    }
    if (testResults.tableStructure.tenantData.count === 0) {
      recommendations.push('💡 Tenant não possui transações - criar algumas para teste');
    }

    testResults.summary = {
      overallHealth: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 15)),
      criticalIssues: issues.filter(i => i.includes('❌')).length,
      transactionsCreated: testResults.verification.transactionsCreated,
      issues,
      recommendations,
      recommendedAction: issues.length === 0 ? 
        '✅ Sistema de transações funcionando corretamente' : 
        '🔧 Corrigir problemas identificados'
    };

    console.log(`🔍 [TRANSACTIONS-DEBUG] ===== FIM DO TESTE - ${new Date().toISOString()} =====`);
    return NextResponse.json(testResults);

  } catch (error: any) {
    console.error('🔍 [TRANSACTIONS-DEBUG] ERRO CRÍTICO:', error);
    return NextResponse.json({
      error: 'Erro crítico no teste de transações',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
