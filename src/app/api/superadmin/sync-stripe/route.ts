import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

// Mapeamento do status Stripe → nosso subscription_status
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'active'; // trial gerenciado pelo campo is_trial, não pelo subscription_status
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'suspended';
    case 'paused':
      return 'suspended';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'incomplete':
      return 'past_due';
    default:
      return 'past_due';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticação: aceita CRON_SECRET (cron) ou qualquer admin autenticado (x-tenant-id)
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const tenantId = request.headers.get('x-tenant-id');

    if (!isCronCall && !tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    // Buscar todas as orgs que têm stripe_subscription_id
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, name, slug, stripe_subscription_id, subscription_status, is_trial')
      .not('stripe_subscription_id', 'is', null);

    if (error || !orgs) {
      devLog.error('[SyncStripe] Erro ao buscar orgs:', error);
      return NextResponse.json({ error: 'Erro ao buscar organizações' }, { status: 500 });
    }

    devLog.log(`[SyncStripe] Iniciando sync de ${orgs.length} organizações`);

    const results = {
      total: orgs.length,
      updated: 0,
      unchanged: 0,
      errors: 0,
      details: [] as { name: string; old: string; new: string; stripeStatus: string }[],
      errorDetails: [] as { name: string; error: string }[],
      unchangedDetails: [] as { name: string; stripeStatus: string; cancelAtPeriodEnd: boolean; mappedTo: string }[],
    };

    for (const org of orgs) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        // cancel_at_period_end = true: Stripe mantém status 'active' mas assinatura será cancelada
        const effectiveStatus = (subscription.status === 'active' && subscription.cancel_at_period_end)
          ? 'canceled'
          : subscription.status;
        const newStatus = mapStripeStatus(effectiveStatus);

        if (newStatus !== org.subscription_status) {
          const { error: updateError } = await supabase
            .from('organizations')
            .update({
              subscription_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', org.id);

          if (updateError) {
            results.errors++;
            results.errorDetails.push({ name: org.name, error: `Update falhou: ${updateError.message}` });
          } else {
            results.updated++;
            results.details.push({
              name: org.name,
              old: org.subscription_status,
              new: newStatus,
              stripeStatus: subscription.cancel_at_period_end ? `${subscription.status} (cancel_at_period_end)` : subscription.status,
            });
          }

          devLog.log(`[SyncStripe] Atualizado: ${org.name} | ${org.subscription_status} → ${newStatus} (Stripe: ${subscription.status})`);
        } else {
          results.unchanged++;
          results.unchangedDetails.push({
            name: org.name,
            stripeStatus: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            mappedTo: newStatus,
          });
        }
      } catch (err: any) {
        // Subscription pode ter sido deletada no Stripe sem evento chegar
        if (err?.statusCode === 404 || err?.code === 'resource_missing') {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', org.id);

          results.updated++;
          results.details.push({
            name: org.name,
            old: org.subscription_status,
            new: 'canceled',
            stripeStatus: 'not_found',
          });
        } else {
          devLog.error(`[SyncStripe] Erro ao processar ${org.name}:`, err.message);
          results.errors++;
          results.errorDetails.push({
            name: org.name,
            error: `[${err?.statusCode || err?.status || 'ERR'}] ${err?.message || String(err)}`,
          });
        }
      }
    }

    devLog.log('[SyncStripe] Sync concluído:', results);
    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    devLog.error('[SyncStripe] Erro geral:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: chamada pelo Vercel Cron (crons usam GET por padrão)
export async function GET(request: NextRequest) {
  // Vercel Cron autentica via Authorization: Bearer CRON_SECRET
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  return POST(request);
}
