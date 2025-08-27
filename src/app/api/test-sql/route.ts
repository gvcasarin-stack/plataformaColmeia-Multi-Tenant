import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient()
    
    console.log('🧪 TESTANDO FUNÇÃO SQL initialize_new_organization')
    
    // 1. Verificar se a função existe
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'initialize_new_organization')
    
    console.log('📋 Funções encontradas:', functions)
    
    if (funcError) {
      console.error('❌ Erro ao buscar funções:', funcError)
      return NextResponse.json({ 
        error: 'Erro ao verificar funções',
        details: funcError
      }, { status: 500 })
    }
    
    // 2. Testar a função com dados fictícios
    console.log('🚀 Testando função com dados fictícios...')
    
    const { data: testResult, error: testError } = await supabase.rpc('initialize_new_organization', {
      org_name: 'Teste SQL Function',
      org_slug: 'teste-sql-' + Date.now(),
      admin_email: 'teste@example.com',
      admin_name: 'Teste Admin',
      plan_type: 'basico',
      start_trial: true
    })
    
    if (testError) {
      console.error('❌ Erro no teste da função:', testError)
      return NextResponse.json({
        functions_found: functions,
        test_error: testError,
        error_details: {
          code: testError.code,
          message: testError.message,
          details: testError.details,
          hint: testError.hint
        }
      }, { status: 500 })
    }
    
    console.log('✅ Teste da função bem-sucedido:', testResult)
    
    // 3. Limpar o teste (remover organização criada)
    if (testResult) {
      await supabase
        .from('organizations')
        .delete()
        .eq('id', testResult)
    }
    
    return NextResponse.json({
      success: true,
      functions_found: functions,
      test_result: testResult,
      message: 'Função SQL está funcionando corretamente'
    })
    
  } catch (error) {
    console.error('💥 Erro inesperado no teste:', error)
    return NextResponse.json({ 
      error: 'Erro inesperado',
      details: error
    }, { status: 500 })
  }
}
