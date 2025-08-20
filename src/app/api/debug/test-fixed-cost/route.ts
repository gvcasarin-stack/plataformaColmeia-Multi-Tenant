import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Iniciando teste de criação de custo fixo...');
    
    const supabase = createSupabaseServiceRoleClient();
    
    // Testar conexão com Supabase
    console.log('[DEBUG] Testando conexão com Supabase...');
    const { data: testConnection, error: connectionError } = await supabase
      .from('fixed_costs')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      console.error('[DEBUG] Erro de conexão:', connectionError);
      return NextResponse.json({ 
        error: 'Erro de conexão com Supabase', 
        details: connectionError 
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Conexão OK, testando inserção...');
    
    // TESTE 1: Verificar estrutura da tabela
    console.log('[DEBUG] Verificando estrutura da tabela...');
    const { data: existingData, error: existingError } = await supabase
      .from('fixed_costs')
      .select('*')
      .limit(1);
    
    console.log('[DEBUG] Dados existentes sample:', existingData);
    console.log('[DEBUG] Erro na consulta:', existingError);
    
    if (existingData && existingData.length > 0) {
      console.log('[DEBUG] Colunas encontradas:', Object.keys(existingData[0]));
      return NextResponse.json({ 
        message: 'Estrutura da tabela descoberta!',
        existingData: existingData[0],
        columns: Object.keys(existingData[0])
      });
    }
    
    // TESTE 2: Se não há dados, tentar inserir apenas campos básicos
    console.log('[DEBUG] Tabela vazia, testando inserção mínima...');
    const testData = {
      category: 'Teste',
      amount: 100.50
    };
    
    console.log('[DEBUG] Dados de teste:', testData);
    
    // Tentar inserir
    const { data, error } = await supabase
      .from('fixed_costs')
      .insert([testData])
      .select()
      .single();
    
    if (error) {
      console.error('[DEBUG] Erro na inserção:', error);
      return NextResponse.json({ 
        error: 'Erro na inserção', 
        details: error,
        testData 
      }, { status: 500 });
    }
    
    console.log('[DEBUG] Inserção bem-sucedida:', data);
    
    // Limpar o teste (deletar o registro criado)
    if (data?.id) {
      await supabase
        .from('fixed_costs')
        .delete()
        .eq('id', data.id);
      console.log('[DEBUG] Registro de teste deletado');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Teste bem-sucedido!',
      testData,
      insertedData: data
    });
    
  } catch (error) {
    console.error('[DEBUG] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] POST - Testando criação via POST...');
    
    const body = await request.json();
    console.log('[DEBUG] Body recebido:', body);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { category, description, name, amount, month, year } = body;
    
    console.log('[DEBUG] Dados extraídos:', { category, description, name, amount, month, year });
    
    // Usar name como description se description não for fornecida
    const finalDescription = description || name;
    
    console.log('[DEBUG] Final description:', finalDescription);
    
    // Validação de campos obrigatórios
    if (!category || !finalDescription || amount === undefined || amount === null || month === undefined || month === null || year === undefined || year === null) {
      console.error('[DEBUG] Campos faltando:', { category, finalDescription, amount, month, year });
      return NextResponse.json(
        { error: 'Campos obrigatórios: category, name/description, amount, month, year' },
        { status: 400 }
      );
    }
    
    // Conversão segura de tipos
    const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));
    const monthNum = typeof month === 'number' ? month : parseInt(String(month));
    const yearNum = typeof year === 'number' ? year : parseInt(String(year));
    
    console.log('[DEBUG] Conversões:', { amountNum, monthNum, yearNum });
    
    // Validação de números
    if (isNaN(amountNum) || isNaN(monthNum) || isNaN(yearNum)) {
      console.error('[DEBUG] Erro na conversão:', { amount, amountNum, month, monthNum, year, yearNum });
      return NextResponse.json(
        { error: 'Valores numéricos inválidos' },
        { status: 400 }
      );
    }
    
    const insertData = {
      category,
      name: finalDescription,
      amount: amountNum,
      month: monthNum,
      year: yearNum,
      is_active: true
    };
    
    console.log('[DEBUG] Dados finais para inserção:', insertData);
    
    const { data, error } = await supabase
      .from('fixed_costs')
      .insert([insertData])
      .select()
      .single();
    
    if (error) {
      console.error('[DEBUG] Erro na inserção:', error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }
    
    console.log('[DEBUG] Inserção bem-sucedida:', data);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('[DEBUG] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor', 
      details: error instanceof Error ? error.message : error 
    }, { status: 500 });
  }
}