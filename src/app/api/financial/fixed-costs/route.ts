import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    devLog.log('[API Fixed Costs] Buscando custos fixos para usuário:', userId);
    
    let query = supabase
      .from('fixed_costs')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      devLog.error('[API Fixed Costs] Erro ao buscar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Fixed Costs] Custos fixos encontrados:', data?.length || 0);
    return NextResponse.json(data || []);
    
  } catch (error) {
    devLog.error('[API Fixed Costs] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    
    devLog.log('[API Fixed Costs] Criando custo fixo:', body);
    
    const { category, description, name, amount, user_id, vigencia_inicio, vigencia_fim } = body;
    
    devLog.log('[API Fixed Costs] Dados recebidos:', { category, description, name, amount, user_id });
    
    // Usar name ou description como nome final
    const finalName = name || description;
    
    // Validação de campos obrigatórios
    if (!category || !finalName || amount === undefined || amount === null || !user_id) {
      devLog.error('[API Fixed Costs] Campos faltando:', { category, finalName, amount, user_id });
      return NextResponse.json(
        { error: 'Campos obrigatórios: category, name, amount, user_id' },
        { status: 400 }
      );
    }
    
    // Conversão segura de tipos
    const amountNum = typeof amount === 'number' ? amount : parseFloat(String(amount));
    
    // Validação de números
    if (isNaN(amountNum)) {
      devLog.error('[API Fixed Costs] Erro na conversão:', { amount, amountNum });
      return NextResponse.json(
        { error: 'Valor do amount inválido' },
        { status: 400 }
      );
    }
    
    devLog.log('[API Fixed Costs] Inserindo dados:', { category, name: finalName, amount: amountNum, user_id });
    
    const { data, error } = await supabase
      .from('fixed_costs')
      .insert([{
        category,
        name: finalName,
        amount: amountNum,
        user_id,
        is_active: true,
        vigencia_inicio: vigencia_inicio ? new Date(vigencia_inicio) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        vigencia_fim: vigencia_fim ? new Date(vigencia_fim) : null
      }])
      .select()
      .single();
    
    if (error) {
      devLog.error('[API Fixed Costs] Erro ao criar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Fixed Costs] Custo fixo criado:', data);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    devLog.error('[API Fixed Costs] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    
    devLog.log('[API Fixed Costs] Atualizando custo fixo:', body);
    
    const { id, name, amount, category, vigencia_inicio, vigencia_fim } = body;
    
    if (!id || !name || !amount || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: id, name, amount, category' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('fixed_costs')
      .update({
        name,
        amount: parseFloat(amount),
        category,
        vigencia_inicio: vigencia_inicio ? new Date(vigencia_inicio) : undefined,
        vigencia_fim: vigencia_fim === null ? null : (vigencia_fim ? new Date(vigencia_fim) : undefined)
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      devLog.error('[API Fixed Costs] Erro ao atualizar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Fixed Costs] Custo fixo atualizado:', data);
    return NextResponse.json(data);
    
  } catch (error) {
    devLog.error('[API Fixed Costs] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    devLog.log('[API Fixed Costs] Deletando custo fixo:', id);
    
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('fixed_costs')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) {
      devLog.error('[API Fixed Costs] Erro ao deletar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    devLog.log('[API Fixed Costs] Custo fixo deletado:', id);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    devLog.error('[API Fixed Costs] Erro:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 