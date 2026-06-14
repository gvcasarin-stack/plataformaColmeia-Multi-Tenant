import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe não configurado' }, { status: 500 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: org, error } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', tenantId)
      .single();

    if (error || !org?.stripe_customer_id) {
      devLog.error('[BillingPortal] Customer Stripe não encontrado para tenant:', tenantId);
      return NextResponse.json({ error: 'Customer Stripe não encontrado' }, { status: 404 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    let body: { returnUrl?: string } = {};
    try { body = await request.json(); } catch {}

    const origin = request.headers.get('origin') || request.nextUrl.origin;
    const returnUrl = body.returnUrl || `${origin}/admin/assinaturas`;

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl,
    });

    devLog.log('[BillingPortal] Portal criado para:', org.name);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    devLog.error('[BillingPortal] Erro:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
