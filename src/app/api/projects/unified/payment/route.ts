import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

/**
 * API UNIFICADA PARA PAGAMENTOS
 * Centraliza todas as operações de pagamento em uma única API
 */

const supabase = createSupabaseServiceRoleClient();

/**
 * PUT - Atualizar status de pagamento
 */
export async function PUT(request: NextRequest) {
  try {
    devLog.log('[API Unified Payment] Atualizando status de pagamento');

    const body = await request.json();
    const { projectId, paymentStatus, updatedBy } = body;

    // Validar dados obrigatórios
    if (!projectId || !paymentStatus) {
      return NextResponse.json(
        { error: 'projectId e paymentStatus são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar status de pagamento
    const validStatuses = ['pendente', 'parcela1', 'pago'];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: `Status inválido. Use: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    devLog.log('[API Unified Payment] Atualizando projeto:', {
      projectId,
      paymentStatus,
      updatedBy
    });

    // ✅ REGRA: Atualizar APENAS o campo pagamento
    const { data, error } = await supabase
      .from('projects')
      .update({
        pagamento: paymentStatus,
        updated_at: new Date().toISOString()
        // ✅ CORREÇÃO: Removido updated_by (campo não existe na tabela)
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      devLog.error('[API Unified Payment] Erro ao atualizar pagamento:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar pagamento', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    devLog.log('[API Unified Payment] Pagamento atualizado:', {
      projectId: data.id,
      oldStatus: 'N/A', // Não temos o valor anterior
      newStatus: data.pagamento
    });

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        pagamento: data.pagamento,
        updated_at: data.updated_at
      },
      message: `Pagamento atualizado para: ${paymentStatus}`
    });

  } catch (error) {
    devLog.error('[API Unified Payment] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * GET - Buscar status de pagamento de um projeto
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .select('id, pagamento, valor_projeto, price, updated_at')
      .eq('id', projectId)
      .single();

    if (error) {
      devLog.error('[API Unified Payment] Erro ao buscar projeto:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar projeto', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        pagamento: data.pagamento, // ✅ Valor original sem forçar
        valor_projeto: data.valor_projeto,
    
        updated_at: data.updated_at
      }
    });

  } catch (error) {
    devLog.error('[API Unified Payment] Exceção ao buscar:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 