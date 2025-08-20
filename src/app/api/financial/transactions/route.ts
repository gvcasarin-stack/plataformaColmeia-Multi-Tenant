import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    
    devLog.log('[API Financial Transactions] Buscando transações:', { month, year });
    
    let query = supabase
      .from('financial_transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (month && year) {
      query = query.eq('month', parseInt(month)).eq('year', parseInt(year));
    }
    
    const { data, error } = await query;
    
    if (error) {
      devLog.error('[API Financial Transactions] Erro ao buscar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Financial Transactions] Transações encontradas:', data?.length || 0);
    return NextResponse.json(data || []);
    
  } catch (error) {
    devLog.error('[API Financial Transactions] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    
    devLog.log('[API Financial Transactions] Criando transação:', body);
    
    const { type, category, description, amount, date } = body;
    
    if (!type || !category || !description || !amount || !date) {
      devLog.log('[API Financial Transactions] Campos faltando:', { type, category, description, amount, date });
      return NextResponse.json(
        { error: 'Campos obrigatórios: type, category, description, amount, date' },
        { status: 400 }
      );
    }
    
    const transactionDate = new Date(date);
    const month = transactionDate.getMonth() + 1;
    const year = transactionDate.getFullYear();
    
    devLog.log('[API Financial Transactions] Data processada:', { date, month, year });
    
    // Primeiro, verificar se a tabela existe tentando uma busca simples
    try {
      const { data: testData, error: testError } = await supabase
        .from('financial_transactions')
        .select('id')
        .limit(1);
      
      if (testError) {
        devLog.error('[API Financial Transactions] Tabela não existe ou sem permissão:', testError);
        return NextResponse.json({ 
          error: 'Tabela de transações não está configurada no banco de dados',
          details: testError.message 
        }, { status: 500 });
      }
      
      devLog.log('[API Financial Transactions] Tabela verificada com sucesso');
    } catch (checkError) {
      devLog.error('[API Financial Transactions] Erro ao verificar tabela:', checkError);
      return NextResponse.json({ 
        error: 'Erro ao verificar configuração do banco de dados',
        details: checkError.message 
      }, { status: 500 });
    }
    
    // Remover campos month e year que não existem na tabela
    const transactionData = {
      type,
      category,
      description,
      amount: parseFloat(amount),
      date
    };
    
    devLog.log('[API Financial Transactions] Dados para inserção:', transactionData);
    
    const { data, error } = await supabase
      .from('financial_transactions')
      .insert([transactionData])
      .select()
      .single();
    
    if (error) {
      devLog.error('[API Financial Transactions] Erro ao criar:', error);
      devLog.error('[API Financial Transactions] Detalhes do erro:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: error.message,
        details: error,
        data: transactionData
      }, { status: 500 });
    }
    
    devLog.log('[API Financial Transactions] Transação criada com sucesso:', data);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    devLog.error('[API Financial Transactions] Erro geral:', error);
    devLog.error('[API Financial Transactions] Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    
    devLog.log('[API Financial Transactions] Atualizando transação:', body);
    
    const { id, description, amount, category } = body;
    
    if (!id || !description || !amount || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: id, description, amount, category' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('financial_transactions')
      .update({
        description,
        amount: parseFloat(amount),
        category
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      devLog.error('[API Financial Transactions] Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Financial Transactions] Transação atualizada:', data);
    return NextResponse.json(data);
    
  } catch (error) {
    devLog.error('[API Financial Transactions] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    devLog.log('[API Financial Transactions] Deletando transação:', id);
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id);
    
    if (error) {
      devLog.error('[API Financial Transactions] Erro ao deletar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Financial Transactions] Transação deletada:', id);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    devLog.error('[API Financial Transactions] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 