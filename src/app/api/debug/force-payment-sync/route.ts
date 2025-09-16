/**
 * API de DEBUG para forçar sincronização de pagamento
 * USAR APENAS PARA TESTES/DEBUG
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    devLog.log('[DEBUG] Force Payment Sync - Iniciando');

    const { organizationId, customerId, sessionId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId é obrigatório' },
        { status: 400 }
      );
    }

    devLog.log('[DEBUG] Forçando atualização da organização:', {
      organizationId,
      customerId,
      sessionId
    });

    const supabase = createSupabaseServiceRoleClient();

    // Buscar organização atual
    const { data: currentOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (fetchError) {
      devLog.error('[DEBUG] Erro ao buscar organização:', fetchError);
      return NextResponse.json(
        { error: 'Erro ao buscar organização', details: fetchError.message },
        { status: 500 }
      );
    }

    devLog.log('[DEBUG] Organização atual:', currentOrg);

    // Forçar atualização para sair do trial
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        is_trial: false,
        subscription_status: 'active',
        payment_method_added: true,
        stripe_customer_id: customerId || currentOrg.stripe_customer_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[DEBUG] Erro ao atualizar organização:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar organização', details: updateError.message },
        { status: 500 }
      );
    }

    devLog.log('[DEBUG] Organização atualizada com sucesso:', updatedOrg);

    return NextResponse.json({
      success: true,
      message: 'Pagamento sincronizado manualmente',
      before: currentOrg,
      after: updatedOrg,
      changes: {
        is_trial: `${currentOrg.is_trial} → ${updatedOrg.is_trial}`,
        subscription_status: `${currentOrg.subscription_status} → ${updatedOrg.subscription_status}`,
        payment_method_added: `${currentOrg.payment_method_added} → ${updatedOrg.payment_method_added}`
      }
    });

  } catch (error: any) {
    devLog.error('[DEBUG] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}