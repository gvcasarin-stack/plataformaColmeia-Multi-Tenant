/**
 * API simplificada para sincronizar pagamento sem buscar subscription
 * Usado quando a chave do Stripe tem permissões limitadas
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/stripe/config';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, organizationId } = await request.json();

    if (!sessionId || !organizationId) {
      return NextResponse.json(
        { error: 'sessionId e organizationId são obrigatórios' },
        { status: 400 }
      );
    }

    // Inicializar Stripe
    const stripeConfig = getStripeConfig();
    if (!stripeConfig.secretKey) {
      return NextResponse.json(
        { error: 'Stripe não configurado' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Buscar apenas a sessão, sem expandir subscription
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    devLog.log('[Simple Stripe Sync] Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      customer: session.customer,
      // NÃO expandir subscription para evitar erro de permissão
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Pagamento não foi aprovado',
        payment_status: session.payment_status
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    devLog.log('[Simple Stripe Sync] Atualizando organização:', {
      organizationId,
      customerId: session.customer,
      paymentStatus: session.payment_status
    });

    // Atualizar organização - assumir subscription ativa já que pagamento foi aprovado
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_customer_id: session.customer as string,
        subscription_status: 'active', // Assumir ativo já que pagamento foi aprovado
        is_trial: false, // CRÍTICO: Forçar saída do trial
        payment_method_added: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      devLog.error('[Simple Stripe Sync] Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar organização', details: updateError.message },
        { status: 500 }
      );
    }

    devLog.log('[Simple Stripe Sync] Organization synced successfully:', {
      organizationId,
      customerId: session.customer,
      paymentStatus: session.payment_status
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento sincronizado com sucesso (versão simplificada)',
      data: {
        payment_status: session.payment_status,
        subscription_status: 'active', // Assumido
        customer_id: session.customer,
        session_id: session.id
      }
    });

  } catch (error: any) {
    devLog.error('[Simple Stripe Sync] Error syncing payment:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}