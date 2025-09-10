/**
 * API para simular fluxo completo de pagamento
 * Testa toda a jornada: Trial Expirado → Pagamento → Ativação
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, tenantId, step = 'start' } = body;

    devLog.log('[Payment Flow Test] Iniciando teste:', { organizationId, tenantId, step });

    if (!organizationId || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'organizationId e tenantId são obrigatórios'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    switch (step) {
      case 'start':
        return await simulateTrialExpired(supabase, organizationId, tenantId);
      
      case 'payment':
        return await simulatePaymentSuccess(supabase, organizationId, tenantId);
      
      case 'reset':
        return await resetToTrial(supabase, organizationId, tenantId);
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Step inválido. Use: start, payment, ou reset'
        }, { status: 400 });
    }

  } catch (error: any) {
    devLog.error('[Payment Flow Test] Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

/**
 * Simular trial expirado
 */
async function simulateTrialExpired(supabase: any, organizationId: string, tenantId: string) {
  const { data: updatedOrg, error } = await supabase
    .from('organizations')
    .update({
      is_trial: true,
      trial_ends_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
      subscription_status: 'trial',
      payment_method_added: false,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '🔴 Trial expirado simulado',
    data: {
      status: 'trial_expired',
      is_trial: updatedOrg.is_trial,
      subscription_status: updatedOrg.subscription_status,
      trial_ends_at: updatedOrg.trial_ends_at
    }
  });
}

/**
 * Simular pagamento bem-sucedido
 */
async function simulatePaymentSuccess(supabase: any, organizationId: string, tenantId: string) {
  const { data: updatedOrg, error } = await supabase
    .from('organizations')
    .update({
      is_trial: false,
      subscription_status: 'active',
      payment_method_added: true,
      stripe_customer_id: `cus_test_${Date.now()}`,
      stripe_subscription_id: `sub_test_${Date.now()}`,
      updated_at: new Date().toISOString()
    })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '✅ Pagamento simulado com sucesso',
    data: {
      status: 'active',
      is_trial: updatedOrg.is_trial,
      subscription_status: updatedOrg.subscription_status,
      payment_method_added: updatedOrg.payment_method_added,
      stripe_customer_id: updatedOrg.stripe_customer_id,
      stripe_subscription_id: updatedOrg.stripe_subscription_id
    }
  });
}

/**
 * Resetar para estado de trial
 */
async function resetToTrial(supabase: any, organizationId: string, tenantId: string) {
  const { data: updatedOrg, error } = await supabase
    .from('organizations')
    .update({
      is_trial: true,
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias à frente
      subscription_status: 'trial',
      payment_method_added: false,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: '🔄 Resetado para trial ativo',
    data: {
      status: 'trial_active',
      is_trial: updatedOrg.is_trial,
      subscription_status: updatedOrg.subscription_status,
      trial_ends_at: updatedOrg.trial_ends_at
    }
  });
}
