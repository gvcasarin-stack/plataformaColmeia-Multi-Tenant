import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    // Apenas superadmin pode acessar
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Verificar se o usuário logado é superadmin
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role !== 'superadmin') {
          return NextResponse.json({ error: 'Acesso restrito a superadmin' }, { status: 403 });
        }
      }
    }

    const { data: orgs, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        status,
        subscription_status,
        payment_failure_count,
        last_payment_failure_at,
        stripe_customer_id,
        stripe_subscription_id,
        is_trial,
        trial_end_date,
        updated_at,
        plans (
          name,
          price
        )
      `)
      .order('subscription_status', { ascending: false })
      .order('payment_failure_count', { ascending: false });

    if (error) {
      devLog.error('[TenantsBilling] Erro ao buscar orgs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: orgs || [] });
  } catch (error: any) {
    devLog.error('[TenantsBilling] Erro:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
