/**
 * API de Debug para testar a atualização de organizações
 * Simula o que o webhook do Stripe faria
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, tenantId, action = 'activate' } = body;

    devLog.log('[Test Webhook] Simulando atualização:', { organizationId, tenantId, action });

    if (!organizationId || !tenantId) {
      return NextResponse.json({
        success: false,
        error: 'organizationId e tenantId são obrigatórios'
      }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();

    let updateData: any;

    switch (action) {
      case 'activate':
        updateData = {
          stripe_customer_id: `cus_test_${Date.now()}`,
          stripe_subscription_id: `sub_test_${Date.now()}`,
          subscription_status: 'active',
          is_trial: false,
          payment_method_added: true,
          updated_at: new Date().toISOString()
        };
        break;

      case 'cancel':
        updateData = {
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        };
        break;

      case 'past_due':
        updateData = {
          subscription_status: 'past_due',
          updated_at: new Date().toISOString()
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Ação inválida. Use: activate, cancel, ou past_due'
        }, { status: 400 });
    }

    // Atualizar organização
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError) {
      devLog.error('[Test Webhook] Erro ao atualizar organização:', updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message
      }, { status: 500 });
    }

    devLog.log('[Test Webhook] Organização atualizada com sucesso:', updatedOrg);

    return NextResponse.json({
      success: true,
      message: `Organização ${action === 'activate' ? 'ativada' : action === 'cancel' ? 'cancelada' : 'marcada como past_due'} com sucesso`,
      data: {
        organizationId: updatedOrg.id,
        subscriptionStatus: updatedOrg.subscription_status,
        isTrial: updatedOrg.is_trial,
        paymentMethodAdded: updatedOrg.payment_method_added,
        stripeCustomerId: updatedOrg.stripe_customer_id,
        stripeSubscriptionId: updatedOrg.stripe_subscription_id
      }
    });

  } catch (error: any) {
    devLog.error('[Test Webhook] Erro inesperado:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json({
      success: false,
      error: 'organizationId é obrigatório'
    }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();

    // Buscar status atual da organização
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, subscription_status, is_trial, payment_method_added, stripe_customer_id, stripe_subscription_id')
      .eq('id', organizationId)
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: org
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
