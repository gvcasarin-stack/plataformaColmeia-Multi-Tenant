import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
      return 'cancelled';
    case 'incomplete':
      return 'past_due';
    default:
      return 'past_due';
  }
}

async function isSuperAdminByCookies(serviceClient: any): Promise<boolean> {
  try {
    const serverClient = createSupabaseServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return false;
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    return profile?.role === 'superadmin';
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();

    // Autenticação: aceita CRON_SECRET (Vercel cron) ou superadmin logado via cookie
    const authHeader = request.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;
    const isCronCall = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronCall) {
      const adminOk = await isSuperAdminByCookies(supabase);
      if (!adminOk) {
        return NextResponse.json({ error: 'Acesso restrito a superadmin' }, { status: 403 });
      }
    }

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
    };

    for (const org of orgs) {
      try {
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
        const newStatus = mapStripeStatus(subscription.status);

        if (newStatus !== org.subscription_status) {
          await supabase
            .from('organizations')
            .update({
              subscription_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', org.id);

          results.updated++;
          results.details.push({
            name: org.name,
            old: org.subscription_status,
            new: newStatus,
            stripeStatus: subscription.status,
          });

          devLog.log(`[SyncStripe] Atualizado: ${org.name} | ${org.subscription_status} → ${newStatus} (Stripe: ${subscription.status})`);
        } else {
          results.unchanged++;
        }
      } catch (err: any) {
        // Subscription pode ter sido deletada no Stripe sem evento chegar
        if (err?.statusCode === 404 || err?.code === 'resource_missing') {
          await supabase
            .from('organizations')
            .update({
              subscription_status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', org.id);

          results.updated++;
          results.details.push({
            name: org.name,
            old: org.subscription_status,
            new: 'cancelled',
            stripeStatus: 'not_found',
          });
        } else {
          devLog.error(`[SyncStripe] Erro ao processar ${org.name}:`, err.message);
          results.errors++;
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
