import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para descobrir a estrutura REAL da tabela financial_transactions
 * Uso: GET /api/debug/financial-table-schema?debug=true
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ PROTEÇÃO: Só funciona com ?debug=true
    const { searchParams } = new URL(request.url);
    if (searchParams.get('debug') !== 'true') {
      return NextResponse.json({
        error: 'API de debug protegida',
        message: 'Para executar esta API, adicione ?debug=true na URL',
        usage: 'GET /api/debug/financial-table-schema?debug=true'
      }, { status: 403 });
    }

    const timestamp = new Date().toISOString();
    console.log(`🔍 [SCHEMA-DEBUG] ===== INVESTIGANDO ESTRUTURA - ${timestamp} =====`);

    const supabase = createSupabaseServiceRoleClient();
    const results: any = {
      timestamp,
      tableInfo: {},
      schemaDiscovery: {},
      insertTest: {},
      recommendations: []
    };

    // === FASE 1: VERIFICAR SE TABELA EXISTE ===
    console.log('🔍 [SCHEMA-DEBUG] FASE 1: Verificando existência da tabela...');
    
    try {
      const { data: tableExists, error: tableError } = await supabase
        .from('financial_transactions')
        .select('*')
        .limit(0); // Não buscar dados, só verificar estrutura

      results.tableInfo = {
        exists: !tableError,
        error: tableError?.message || null,
        errorCode: tableError?.code || null
      };

    } catch (error: any) {
      results.tableInfo = {
        exists: false,
        error: error.message,
        criticalError: true
      };
    }

    // === FASE 2: TENTAR DESCOBRIR COLUNAS EXISTENTES ===
    console.log('🔍 [SCHEMA-DEBUG] FASE 2: Descobrindo colunas existentes...');

    const possibleColumns = [
      'id', 'tenant_id', 'user_id', 
      'description', 'amount', 'category', 'type',
      'date', 'month', 'year', 'created_at', 'updated_at'
    ];

    results.schemaDiscovery.columnTests = {};

    for (const column of possibleColumns) {
      try {
        const { data, error } = await supabase
          .from('financial_transactions')
          .select(column)
          .limit(1);

        results.schemaDiscovery.columnTests[column] = {
          exists: !error,
          error: error?.message || null
        };

        if (!error) {
          console.log(`✅ [SCHEMA-DEBUG] Coluna '${column}' existe`);
        } else {
          console.log(`❌ [SCHEMA-DEBUG] Coluna '${column}' não existe: ${error.message}`);
        }

      } catch (error: any) {
        results.schemaDiscovery.columnTests[column] = {
          exists: false,
          error: error.message,
          criticalError: true
        };
      }
    }

    // === FASE 3: TENTAR INSERÇÃO MINIMALISTA ===
    console.log('🔍 [SCHEMA-DEBUG] FASE 3: Testando inserção minimalista...');

    // Identificar colunas que existem
    const existingColumns = Object.keys(results.schemaDiscovery.columnTests)
      .filter(col => results.schemaDiscovery.columnTests[col].exists);

    console.log('🔍 [SCHEMA-DEBUG] Colunas existentes:', existingColumns);

    // Tentar inserção apenas com colunas que existem
    const minimalData: any = {};

    // Campos essenciais que tentaremos incluir se existirem
    if (existingColumns.includes('description')) minimalData.description = 'Teste Schema Debug';
    if (existingColumns.includes('amount')) minimalData.amount = 100;
    if (existingColumns.includes('type')) minimalData.type = 'receita';
    if (existingColumns.includes('category')) minimalData.category = 'Teste';
    if (existingColumns.includes('tenant_id')) minimalData.tenant_id = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c';

    console.log('🔍 [SCHEMA-DEBUG] Tentando inserir:', minimalData);

    try {
      const { data: insertedData, error: insertError } = await supabase
        .from('financial_transactions')
        .insert(minimalData)
        .select()
        .single();

      results.insertTest = {
        success: !insertError,
        data: insertedData,
        error: insertError?.message || null,
        inputData: minimalData
      };

      if (!insertError) {
        console.log('✅ [SCHEMA-DEBUG] Inserção bem-sucedida!');
        
        // Deletar o registro de teste
        await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', insertedData.id);
        
        console.log('🔍 [SCHEMA-DEBUG] Registro de teste removido');
      }

    } catch (error: any) {
      results.insertTest = {
        success: false,
        error: error.message,
        inputData: minimalData
      };
    }

    // === FASE 4: GERAR RECOMENDAÇÕES ===
    console.log('🔍 [SCHEMA-DEBUG] FASE 4: Gerando recomendações...');

    if (!results.tableInfo.exists) {
      results.recommendations.push('❌ CRÍTICO: Tabela financial_transactions não existe');
      results.recommendations.push('💡 Criar tabela financial_transactions no Supabase');
    } else {
      results.recommendations.push('✅ Tabela financial_transactions existe');
      
      // Verificar campos essenciais
      const essentialFields = ['description', 'amount', 'type', 'category', 'tenant_id'];
      const missingFields = essentialFields.filter(field => 
        !existingColumns.includes(field)
      );

      if (missingFields.length > 0) {
        results.recommendations.push(`❌ Campos essenciais faltando: ${missingFields.join(', ')}`);
        results.recommendations.push('💡 Adicionar colunas faltantes à tabela');
      }

      if (results.insertTest.success) {
        results.recommendations.push('✅ Inserção funcional - tabela está operacional');
      } else {
        results.recommendations.push('❌ Inserção falhando - verificar permissões ou estrutura');
      }
    }

    // Estrutura recomendada para a tabela
    results.recommendedSchema = {
      columns: [
        { name: 'id', type: 'uuid', default: 'gen_random_uuid()', primary_key: true },
        { name: 'tenant_id', type: 'uuid', nullable: false, references: 'organizations(id)' },
        { name: 'description', type: 'text', nullable: false },
        { name: 'amount', type: 'numeric', nullable: false },
        { name: 'category', type: 'text', nullable: false },
        { name: 'type', type: 'text', nullable: false, check: "type IN ('receita', 'despesa')" },
        { name: 'created_at', type: 'timestamp with time zone', default: 'now()' },
        { name: 'updated_at', type: 'timestamp with time zone', default: 'now()' }
      ]
    };

    console.log(`🔍 [SCHEMA-DEBUG] ===== FIM DA INVESTIGAÇÃO - ${new Date().toISOString()} =====`);
    return NextResponse.json(results);

  } catch (error: any) {
    console.error('🔍 [SCHEMA-DEBUG] ERRO CRÍTICO:', error);
    return NextResponse.json({
      error: 'Erro crítico na investigação da estrutura',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
