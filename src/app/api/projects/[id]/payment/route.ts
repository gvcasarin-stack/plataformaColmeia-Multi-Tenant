import { NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

const supabase = createSupabaseServiceRoleClient();

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  devLog.log(`[Payment API] Atualizando status de pagamento para projeto ${id}`);

  try {
    const body = await request.json();
    const { status } = body;

    // Validação de status
    const validStatuses = ['pendente', 'parcela1', 'pago'];
    if (!validStatuses.includes(status)) {
      devLog.log(`[Payment API] Status inválido: ${status}`);
      return NextResponse.json(
        { success: false, error: 'Status de pagamento inválido' },
        { status: 400 }
      );
    }

    devLog.log(`[Payment API] Alterando projeto ${id} para status: ${status}`);

    // SIMPLIFICADO: Atualizar apenas a coluna pagamento
    const { data, error } = await supabase
      .from('projects')
      .update({
        pagamento: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, pagamento, updated_at')
      .single();

    if (error) {
      devLog.error('[Payment API] Erro ao atualizar:', error);
      return NextResponse.json(
        { success: false, error: `Erro ao atualizar pagamento: ${error.message}` },
        { status: 500 }
      );
    }

    devLog.log(`[Payment API] ✅ Status atualizado com sucesso:`, data);

    return NextResponse.json({
      success: true,
      data,
      message: `Status de pagamento atualizado para ${status}`
    });

  } catch (error) {
    devLog.error('[Payment API] Exceção:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
