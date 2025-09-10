/**
 * Webhook do Stripe para capturar eventos de pagamento
 * Atualiza automaticamente o status das organizações após pagamento
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    // Inicializar Stripe apenas quando necessário
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey) {
      devLog.error('[Stripe Webhook] STRIPE_SECRET_KEY não configurada');
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    if (!endpointSecret) {
      devLog.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET não configurada');
      return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      devLog.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verificar assinatura do webhook
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      devLog.log('[Stripe Webhook] Event verified:', { type: event.type, id: event.id });
    } catch (err: any) {
      devLog.error('[Stripe Webhook] Signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Processar eventos do Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        devLog.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    devLog.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Processar checkout session completed
 * Ativado quando o pagamento é confirmado
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    devLog.log('[Stripe Webhook] Processing checkout.session.completed:', {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
      metadata: session.metadata
    });

    const { organizationId, tenantId } = session.metadata || {};

    if (!organizationId || !tenantId) {
      devLog.error('[Stripe Webhook] Missing organization metadata in session');
      return;
    }

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar organização com dados do Stripe
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_status: 'active',
        is_trial: false,
        payment_method_added: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating organization:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Organization updated successfully:', {
      organizationId,
      customerId: session.customer,
      subscriptionId: session.subscription
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleCheckoutSessionCompleted:', error);
  }
}

/**
 * Processar subscription created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    devLog.log('[Stripe Webhook] Processing customer.subscription.created:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata
    });

    const { organizationId, tenantId } = subscription.metadata || {};

    if (!organizationId || !tenantId) {
      devLog.error('[Stripe Webhook] Missing organization metadata in subscription');
      return;
    }

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar status da subscription
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
        is_trial: false,
        payment_method_added: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', organizationId);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating subscription:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Subscription created and organization updated:', {
      organizationId,
      subscriptionId: subscription.id,
      status: subscription.status
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleSubscriptionCreated:', error);
  }
}

/**
 * Processar subscription updated
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    devLog.log('[Stripe Webhook] Processing customer.subscription.updated:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      metadata: subscription.metadata
    });

    const { organizationId, tenantId } = subscription.metadata || {};

    if (!organizationId || !tenantId) {
      devLog.error('[Stripe Webhook] Missing organization metadata in subscription update');
      return;
    }

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar status da subscription
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating subscription status:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Subscription status updated:', {
      subscriptionId: subscription.id,
      newStatus: subscription.status
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleSubscriptionUpdated:', error);
  }
}

/**
 * Processar subscription deleted (cancelamento)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    devLog.log('[Stripe Webhook] Processing customer.subscription.deleted:', {
      subscriptionId: subscription.id,
      metadata: subscription.metadata
    });

    const supabase = createSupabaseServiceRoleClient();

    // Atualizar status para cancelado
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating cancelled subscription:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Subscription cancelled:', {
      subscriptionId: subscription.id
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleSubscriptionDeleted:', error);
  }
}

/**
 * Processar invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    devLog.log('[Stripe Webhook] Processing invoice.payment_succeeded:', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid
    });

    if (!invoice.subscription) return;

    const supabase = createSupabaseServiceRoleClient();

    // Garantir que subscription está ativa após pagamento bem-sucedido
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: 'active',
        payment_method_added: true,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription as string);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating after payment success:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Payment succeeded, organization activated:', {
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleInvoicePaymentSucceeded:', error);
  }
}

/**
 * Processar invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    devLog.log('[Stripe Webhook] Processing invoice.payment_failed:', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_due
    });

    if (!invoice.subscription) return;

    const supabase = createSupabaseServiceRoleClient();

    // Marcar como payment failed (mas não desativar imediatamente)
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription as string);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating after payment failure:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Payment failed, organization marked as past_due:', {
      subscriptionId: invoice.subscription,
      amount: invoice.amount_due
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleInvoicePaymentFailed:', error);
  }
}
