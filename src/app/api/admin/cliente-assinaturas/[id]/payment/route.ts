import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { headers } from 'next/headers';

// PUT: Atualizar status de pagamento da assinatura
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const hdrs = headers();
    const tenantId = hdrs.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant não identificado' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const body = await request.json();
    const { payment_status } = body;

    // Validar payment_status
    const validStatuses = ['pendente', 'parcela1', 'pago'];
    if (!payment_status || !validStatuses.includes(payment_status)) {
      return NextResponse.json(
        { success: false, error: 'payment_status inválido. Use: pendente, parcela1 ou pago' },
        { status: 400 }
      );
    }

    // Buscar assinatura para verificar se pertence ao tenant
    const { data: assinatura, error: fetchError } = await supabase
      .from('cliente_assinaturas')
      .select('id, tenant_id, payment_status')
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !assinatura) {
      return NextResponse.json(
        { success: false, error: 'Assinatura não encontrada' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {
      payment_status,
      updated_at: new Date().toISOString()
    };

    // Adicionar timestamp de pagamento conforme o status
    if (payment_status === 'parcela1') {
      updateData.data_pagamento_parcela1 = new Date().toISOString();
    } else if (payment_status === 'pago') {
      updateData.data_pagamento_integral = new Date().toISOString();
      // Se estava em parcela1, manter a data da parcela1
      if (assinatura.payment_status !== 'parcela1') {
        updateData.data_pagamento_parcela1 = new Date().toISOString();
      }
    } else if (payment_status === 'pendente') {
      // Ao voltar para pendente, limpar as datas de pagamento
      updateData.data_pagamento_parcela1 = null;
      updateData.data_pagamento_integral = null;
    }

    // Atualizar payment_status
    const { data, error: updateError } = await supabase
      .from('cliente_assinaturas')
      .update(updateData)
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[API /admin/cliente-assinaturas/payment PUT] Erro ao atualizar:', updateError);
      throw updateError;
    }

    devLog.log('[API /admin/cliente-assinaturas/payment PUT] Status atualizado:', {
      assinaturaId: params.id,
      newStatus: payment_status
    });

    return NextResponse.json({
      success: true,
      data,
      message: 'Status de pagamento atualizado com sucesso'
    });

  } catch (error: any) {
    devLog.error('[API /admin/cliente-assinaturas/payment PUT] Erro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar status de pagamento' },
      { status: 500 }
    );
  }
}
