import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export async function GET(request: NextRequest) {
  try {
    devLog.log('[DEBUG Financial Table] Iniciando verificação da tabela...');
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Verificar se a tabela existe
    devLog.log('[DEBUG Financial Table] Verificando se a tabela existe...');
    
    let tableExists = false;
    let tableSchema = null;
    let sampleData = null;
    let testInsertError = null;
    
    try {
      // Tentar buscar dados da tabela
      const { data: existingData, error: selectError } = await supabase
        .from('financial_transactions')
        .select('*')
        .limit(1);
      
      if (selectError) {
        devLog.log('[DEBUG Financial Table] Erro ao buscar dados:', selectError);
        return NextResponse.json({
          tableExists: false,
          error: selectError.message,
          details: selectError
        });
      }
      
      tableExists = true;
      sampleData = existingData;
      devLog.log('[DEBUG Financial Table] Tabela existe! Dados encontrados:', existingData?.length || 0);
      
      // Tentar obter schema da tabela
      try {
        const { data: schemaData, error: schemaError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'financial_transactions');
        
        if (!schemaError) {
          tableSchema = schemaData;
          devLog.log('[DEBUG Financial Table] Schema obtido:', schemaData);
        } else {
          devLog.log('[DEBUG Financial Table] Erro ao obter schema:', schemaError);
        }
      } catch (schemaErr) {
        devLog.log('[DEBUG Financial Table] Erro ao acessar schema:', schemaErr);
      }
      
      // Testar inserção de dados
      devLog.log('[DEBUG Financial Table] Testando inserção...');
      
      const testData = {
        type: 'despesa',
        category: 'teste',
        description: 'Teste de inserção',
        amount: 10.00,
        date: new Date().toISOString().split('T')[0]
      };
      
      devLog.log('[DEBUG Financial Table] Dados de teste:', testData);
      
      const { data: insertData, error: insertError } = await supabase
        .from('financial_transactions')
        .insert([testData])
        .select()
        .single();
      
      if (insertError) {
        devLog.log('[DEBUG Financial Table] Erro na inserção de teste:', insertError);
        testInsertError = insertError;
      } else {
        devLog.log('[DEBUG Financial Table] Inserção de teste bem-sucedida:', insertData);
        
        // Deletar o registro de teste
        await supabase
          .from('financial_transactions')
          .delete()
          .eq('id', insertData.id);
        
        devLog.log('[DEBUG Financial Table] Registro de teste deletado');
      }
      
    } catch (tableError) {
      devLog.log('[DEBUG Financial Table] Erro geral ao verificar tabela:', tableError);
      tableExists = false;
      testInsertError = tableError;
    }
    
    // Verificar também a tabela fixed_costs
    devLog.log('[DEBUG Financial Table] Verificando tabela fixed_costs...');
    
    let fixedCostsExists = false;
    let fixedCostsSample = null;
    
    try {
      const { data: fixedCostsData, error: fixedCostsError } = await supabase
        .from('fixed_costs')
        .select('*')
        .limit(3);
      
      if (!fixedCostsError) {
        fixedCostsExists = true;
        fixedCostsSample = fixedCostsData;
        devLog.log('[DEBUG Financial Table] Tabela fixed_costs existe! Registros:', fixedCostsData?.length || 0);
      } else {
        devLog.log('[DEBUG Financial Table] Erro ao acessar fixed_costs:', fixedCostsError);
      }
    } catch (fixedCostsErr) {
      devLog.log('[DEBUG Financial Table] Erro ao verificar fixed_costs:', fixedCostsErr);
    }
    
    const result = {
      timestamp: new Date().toISOString(),
      financial_transactions: {
        exists: tableExists,
        schema: tableSchema,
        sampleData: sampleData,
        testInsertError: testInsertError
      },
      fixed_costs: {
        exists: fixedCostsExists,
        sampleData: fixedCostsSample
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
      }
    };
    
    devLog.log('[DEBUG Financial Table] Resultado completo:', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    devLog.error('[DEBUG Financial Table] Erro geral:', error);
    return NextResponse.json({
      error: 'Erro ao verificar tabela',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
