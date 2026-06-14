/**
 * 🎯 WEBHOOK UNIVERSAL DO STRIPE - MULTI-TENANT
 *
 * ✅ DOMÍNIO DEDICADO: api.gerenciamentofotovoltaico.com.br
 * ✅ SEMPRE ONLINE: Independente das tenants individuais
 * ✅ MULTI-TENANT: Serve todas as organizações usando metadata
 *
 * Como funciona:
 * 1. Stripe envia eventos para: https://api.gerenciamentofotovoltaico.com.br/api/webhooks/stripe
 * 2. Webhook usa metadata.organizationId para identificar qual tenant atualizar
 * 3. Atualiza automaticamente o status das organizações após pagamento
 *
 * Eventos processados:
 * - checkout.session.completed (pagamento concluído)
 * - customer.subscription.* (mudanças de assinatura)
 * - invoice.payment_* (pagamentos de faturas)
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

const SUPERADMIN_EMAIL = 'atendimento.colmeiasolar@gmail.com';
const SUPPORT_EMAIL = process.env.SES_SENDER_EMAIL || process.env.EMAIL_FROM || 'noreply@gerenciamentofotovoltaico.com.br';
const MAX_FAILURES_BEFORE_SUSPEND = 3;

function getSESClient() {
  return new SESClient({
    region: process.env.AWS_REGION || 'sa-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });
}

async function sendBillingSES(to: string, subject: string, bodyHtml: string) {
  try {
    const ses = getSESClient();
    await ses.send(new SendEmailCommand({
      Source: SUPPORT_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: bodyHtml, Charset: 'UTF-8' } },
      },
    }));
    devLog.log('[StripeWebhook] E-mail de billing enviado para:', to);
  } catch (err: any) {
    devLog.error('[StripeWebhook] Falha ao enviar e-mail de billing:', err.message);
  }
}

function mapStripeStatusToLocal(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':    return 'active';
    case 'trialing':  return 'active';
    case 'past_due':  return 'past_due';
    case 'unpaid':    return 'suspended';
    case 'paused':    return 'suspended';
    case 'canceled':
    case 'incomplete_expired': return 'cancelled';
    case 'incomplete': return 'past_due';
    default:          return 'past_due';
  }
}

async function getOrgOwnerEmail(supabase: any, orgId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
      .limit(1)
      .single();
    return data?.email || null;
  } catch {
    return null;
  }
}

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

    // Verificar idempotência - evitar processar o mesmo evento duas vezes
    const supabase = createSupabaseServiceRoleClient();

    const { data: existingEvent } = await supabase
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();

    if (existingEvent) {
      devLog.log('[Stripe Webhook] Event already processed:', { eventId: event.id });
      return NextResponse.json({ received: true, status: 'already_processed' });
    }

    // Processar eventos do Stripe
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session, event.id, supabase);
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
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, eventId: string, supabase: any) {
  try {
    devLog.log('[Stripe Webhook] Processing checkout.session.completed:', {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
      metadata: session.metadata
    });

    const { organizationId, tenantId, planType } = session.metadata || {};

    if (!organizationId || !tenantId) {
      devLog.error('[Stripe Webhook] Missing organization metadata in session');
      return;
    }

    // Buscar plan_id correto do banco de dados com base no planType
    let planId = null;
    if (planType) {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('plan_code', planType)
        .eq('is_active', true)
        .single();

      if (plan && !planError) {
        planId = plan.id;
        devLog.log('[Stripe Webhook] Plan encontrado:', { planType, planId });
      } else {
        devLog.error('[Stripe Webhook] Plan não encontrado no banco:', { planType, error: planError });
      }
    }

    // Preparar dados de atualização
    const updateData: any = {
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
      is_trial: false,
      payment_method_added: true,
      updated_at: new Date().toISOString()
    };

    // Adicionar plan_id se foi encontrado
    if (planId) {
      updateData.plan_id = planId;
    }

    // Atualizar organização com dados do Stripe
    const { error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating organization:', updateError);
      return;
    }

    // Registrar evento como processado (idempotência)
    await supabase
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: eventId,
        event_type: 'checkout.session.completed',
        organization_id: organizationId,
        metadata: {
          session_id: session.id,
          customer_id: session.customer,
          subscription_id: session.subscription
        }
      });

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

    const { organizationId, tenantId, planType } = subscription.metadata || {};

    if (!organizationId || !tenantId) {
      devLog.error('[Stripe Webhook] Missing organization metadata in subscription');
      return;
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar plan_id correto do banco de dados com base no planType
    let planId = null;
    if (planType) {
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('plan_code', planType)
        .eq('is_active', true)
        .single();

      if (plan && !planError) {
        planId = plan.id;
        devLog.log('[Stripe Webhook] Plan encontrado em subscription.created:', { planType, planId });
      } else {
        devLog.error('[Stripe Webhook] Plan não encontrado no banco:', { planType, error: planError });
      }
    }

    // Preparar dados de atualização
    const updateData: any = {
      stripe_subscription_id: subscription.id,
      subscription_status: mapStripeStatusToLocal(subscription.status),
      is_trial: false,
      payment_method_added: true,
      updated_at: new Date().toISOString()
    };

    // Adicionar plan_id se foi encontrado
    if (planId) {
      updateData.plan_id = planId;
    }

    // Atualizar status da subscription
    const { error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
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

    // Atualizar status da subscription usando mapeamento correto
    const mappedStatus = mapStripeStatusToLocal(subscription.status);
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: mappedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating subscription status:', updateError);
      return;
    }

    devLog.log('[Stripe Webhook] Subscription status updated:', {
      subscriptionId: subscription.id,
      stripeStatus: subscription.status,
      mappedStatus,
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

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, payment_failure_count')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single();

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: 'active',
        payment_method_added: true,
        payment_failure_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', invoice.subscription as string);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating after payment success:', updateError);
      return;
    }

    // Notificar o admin da tenant somente se estava inadimplente (havia falhas)
    if (org && (org.payment_failure_count ?? 0) > 0) {
      const ownerEmail = await getOrgOwnerEmail(supabase, org.id);
      if (ownerEmail) {
        const amountBrl = ((invoice.amount_paid || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        await sendBillingSES(
          ownerEmail,
          'Pagamento confirmado — acesso restaurado',
          `<p>Olá,</p><p>O pagamento de <strong>${amountBrl}</strong> da assinatura de <strong>${org.name}</strong> foi confirmado com sucesso. Seu acesso está totalmente restaurado.</p><p>Obrigado por regularizar!</p>`
        );
      }
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

    // Buscar org atual para saber o count anterior
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, payment_failure_count')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single();

    if (!org) {
      devLog.error('[Stripe Webhook] Org não encontrada para subscription:', invoice.subscription);
      return;
    }

    const newCount = (org.payment_failure_count ?? 0) + 1;
    const isSuspended = newCount >= MAX_FAILURES_BEFORE_SUSPEND;
    const amountBrl = ((invoice.amount_due || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const portalUrl = 'https://gerenciamentofotovoltaico.com.br/admin/assinaturas';

    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_status: isSuspended ? 'suspended' : 'past_due',
        payment_failure_count: newCount,
        last_payment_failure_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', org.id);

    if (updateError) {
      devLog.error('[Stripe Webhook] Error updating after payment failure:', updateError);
      return;
    }

    // E-mail para o admin da tenant
    const ownerEmail = await getOrgOwnerEmail(supabase, org.id);
    if (ownerEmail) {
      let subject = '';
      let body = '';

      if (newCount === 1) {
        subject = 'Problema no pagamento da sua assinatura';
        body = `<p>Olá,</p><p>A cobrança de <strong>${amountBrl}</strong> da assinatura de <strong>${org.name}</strong> não foi aprovada.</p><p>Por favor, <a href="${portalUrl}">atualize sua forma de pagamento</a> para evitar a interrupção do serviço. Faremos novas tentativas nos próximos dias.</p>`;
      } else if (newCount === 2) {
        subject = 'Segunda tentativa de cobrança falhou — ação necessária';
        body = `<p>Olá,</p><p>A segunda tentativa de cobrança de <strong>${amountBrl}</strong> da assinatura de <strong>${org.name}</strong> também falhou.</p><p><strong>Atenção:</strong> na próxima falha o acesso ao painel será suspenso automaticamente. <a href="${portalUrl}">Atualize seu cartão agora</a>.</p>`;
      } else {
        subject = 'Acesso suspenso por inadimplência';
        body = `<p>Olá,</p><p>Após ${newCount} tentativas sem sucesso, o acesso ao painel de <strong>${org.name}</strong> foi <strong>suspenso</strong>.</p><p>Para restaurar o acesso, <a href="${portalUrl}">atualize sua forma de pagamento</a>. O acesso será restaurado automaticamente após o pagamento ser aprovado.</p>`;
      }

      await sendBillingSES(ownerEmail, subject, body);
    }

    // Notificação ao superadmin em todas as falhas
    await sendBillingSES(
      SUPERADMIN_EMAIL,
      `[Billing] Falha de pagamento — ${org.name} (tentativa ${newCount})`,
      `<p><strong>Tenant:</strong> ${org.name}<br/>
      <strong>Tentativa nº:</strong> ${newCount}${isSuspended ? ' — <span style="color:red">SUSPENSO</span>' : ''}<br/>
      <strong>Valor:</strong> ${amountBrl}<br/>
      <strong>E-mail admin:</strong> ${ownerEmail || 'não encontrado'}<br/>
      ${org.id ? `<a href="https://dashboard.stripe.com/customers/${invoice.customer}">Ver no Stripe</a>` : ''}</p>`
    );

    devLog.log('[Stripe Webhook] Payment failed processed:', {
      subscriptionId: invoice.subscription,
      orgId: org.id,
      failureCount: newCount,
      suspended: isSuspended,
    });

  } catch (error) {
    devLog.error('[Stripe Webhook] Error in handleInvoicePaymentFailed:', error);
  }
}
