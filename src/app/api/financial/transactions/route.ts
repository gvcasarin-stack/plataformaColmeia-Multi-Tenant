import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Financial Transactions] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    // ✅ PERFORMANCE: callers que só precisam somar valores (ex: total histórico
    // recebido) podem pedir só as colunas necessárias via ?fields=type,amount
    const fields = searchParams.get('fields');
    const selectColumns = fields ? fields.split(',').map(f => f.trim()).join(',') : '*';

    devLog.log('[API Financial Transactions] Buscando transações:', { month, year, tenantId, selectColumns });

    // ✅ SEGURANÇA: Filtrar transações por tenant
    let query = supabase
      .from('financial_transactions')
      .select(selectColumns)
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Filtrar por tenant
      .order('created_at', { ascending: false });
    
    // ✅ CORREÇÃO: Filtro por mês/ano usando transaction_date
    if (month && year) {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = month === 12 
        ? `${year + 1}-01-01` 
        : `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
      
      query = query
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);
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
    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Financial Transactions] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    
    devLog.log('[API Financial Transactions] Criando transação:', body);
    
    const { type, category, description, amount, date, created_by } = body;
    
    if (!type || !category || !description || !amount || !date || !created_by) {
      devLog.log('[API Financial Transactions] Campos faltando:', { type, category, description, amount, date, created_by });
      return NextResponse.json(
        { error: 'Campos obrigatórios: type, category, description, amount, date, created_by' },
        { status: 400 }
      );
    }

    // ✅ VALIDAÇÃO: Verificar se type é válido
    const validTypes = ['income', 'expense', 'transfer'];
    if (!validTypes.includes(type)) {
      devLog.log('[API Financial Transactions] Tipo inválido:', { type, validTypes });
      return NextResponse.json(
        { error: `Tipo inválido. Valores aceitos: ${validTypes.join(', ')}` },
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
    
    // ✅ SEGURANÇA: Incluir tenant_id na transação
    // ✅ CORREÇÃO: Usando estrutura real da tabela
    const transactionData = {
      type,
      category,
      description,
      amount: parseFloat(amount),
      transaction_date: date,  // ✅ CORRETO: transaction_date existe
      tenant_id: tenantId,     // ✅ CRÍTICO: Associar transação ao tenant
      created_by: created_by   // ✅ CORRIGIDO: user_id real da sessão
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
    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Financial Transactions] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();

    devLog.log('[API Financial Transactions] Atualizando transação:', body);

    const { id, description, amount, category, date } = body;

    if (!id || !description || !amount || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: id, description, amount, category' },
        { status: 400 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {
      description,
      amount: parseFloat(amount),
      category
    };

    // Incluir data se fornecida
    if (date) {
      updateData.transaction_date = date;
    }

    // ✅ SEGURANÇA: Atualizar apenas transações do tenant atual
    const { data, error } = await supabase
      .from('financial_transactions')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Verificar tenant
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
    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Financial Transactions] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    devLog.log('[API Financial Transactions] Deletando transação:', id);
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }
    
    // ✅ SEGURANÇA: Deletar apenas transações do tenant atual
    const { error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);  // ✅ CRÍTICO: Verificar tenant
    
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