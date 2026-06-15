import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

// Price IDs do Stripe por plano (fallback caso não esteja no banco)
const PRICE_IDS: Record<string, string> = {
  basico: 'price_1RLRppAkIzZurozaQOxPIBAL',
  profissional: 'price_1RLSWCAkIzZurozaH6jYWzQW',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body as { slug: string };

    if (!slug) {
      return NextResponse.json({ error: 'Parâmetro "slug" obrigatório' }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar organização pelo slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, plan, plan_id, stripe_customer_id, subscription_status')
      .eq('slug', slug)
      .single();

    if (orgError || !org) {
      devLog.error('[ReactivateCheckout] Org não encontrada:', slug, orgError?.message);
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 });
    }

    if (org.subscription_status !== 'canceled') {
      devLog.log('[ReactivateCheckout] Tentativa de reativação para status:', org.subscription_status);
      return NextResponse.json({ error: 'Assinatura não está cancelada' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    // Determinar price ID: tentar banco de dados primeiro, depois fallback
    let priceId: string | null = null;

    if (org.plan_id) {
      const { data: planData } = await supabase
        .from('plans')
        .select('stripe_price_id, plan_code')
        .eq('id', org.plan_id)
        .single();

      if (planData?.stripe_price_id) {
        priceId = planData.stripe_price_id;
      }
    }

    // Fallback para PRICE_IDS hardcoded
    if (!priceId) {
      const planCode = org.plan || 'basico';
      priceId = PRICE_IDS[planCode] || PRICE_IDS.basico;
    }

    const baseUrl = `https://${slug}.gerenciamentofotovoltaico.com.br`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/admin/assinaturas?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/account-canceled`,
      metadata: {
        organizationId: org.id,
        tenantId: org.id,
        planType: org.plan || 'basico',
      },
    };

    // Reaproveitar o customer Stripe existente se houver
    if (org.stripe_customer_id) {
      sessionParams.customer = org.stripe_customer_id;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    devLog.log('[ReactivateCheckout] Checkout criado para:', org.name, session.id);
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    devLog.error('[ReactivateCheckout] Erro:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
