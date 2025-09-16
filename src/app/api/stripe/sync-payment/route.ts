/**
 * API para sincronizar pagamento manualmente caso webhook falhe
 * Verifica status no Stripe e atualiza organização
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

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });

    devLog.log('[Stripe Sync] Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      subscription: session.subscription,
      customer: session.customer
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({
        success: false,
        error: 'Pagamento não foi aprovado',
        payment_status: session.payment_status
      });
    }

    // Buscar subscription para obter mais detalhes
    let subscription = session.subscription;
    if (typeof subscription === 'string') {
      subscription = await stripe.subscriptions.retrieve(subscription);
    }

    const supabase = createSupabaseServiceRoleClient();

    devLog.log('[Stripe Sync] Atualizando organização:', {
      organizationId,
      customerId: session.customer,
      subscriptionId: subscription?.id,
      subscriptionStatus: subscription?.status
    });

    // Atualizar organização com dados do Stripe
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: subscription?.id || null,
        subscription_status: subscription?.status === 'active' ? 'active' : subscription?.status || 'inactive',
        is_trial: false, // CRÍTICO: Forçar saída do trial
        payment_method_added: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      devLog.error('[Stripe Sync] Error updating organization:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar organização', details: updateError.message },
        { status: 500 }
      );
    }

    devLog.log('[Stripe Sync] Organization synced successfully:', {
      organizationId,
      customerId: session.customer,
      subscriptionId: session.subscription,
      subscriptionStatus: subscription?.status
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento sincronizado com sucesso',
      data: {
        payment_status: session.payment_status,
        subscription_status: subscription?.status,
        customer_id: session.customer,
        subscription_id: session.subscription
      }
    });

  } catch (error: any) {
    devLog.error('[Stripe Sync] Error syncing payment:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}