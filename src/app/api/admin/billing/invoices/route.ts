import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', tenantId)
      .single();

    if (!org?.stripe_customer_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });

    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 12,
    });

    const data = invoices.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      date: inv.created,
      amount: inv.amount_paid || inv.amount_due,
      currency: inv.currency,
      status: inv.status,
      pdf: inv.invoice_pdf,
      hosted_url: inv.hosted_invoice_url,
    }));

    devLog.log('[BillingInvoices] Faturas carregadas para tenant:', tenantId, '| total:', data.length);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    devLog.error('[BillingInvoices] Erro:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
