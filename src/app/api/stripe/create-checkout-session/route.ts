/**
 * API Route para criar sessão de checkout do Stripe
 * Sistema SaaS - SGF Multi-Tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeConfig, STRIPE_PLANS, getStripeUrls, PlanType } from '@/lib/stripe/config';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function POST(request: NextRequest) {
  try {
    // Inicializar Stripe com validação detalhada
    const stripeConfig = getStripeConfig();
    
    devLog.log('[Stripe] Verificando configuração:', {
      hasPublishableKey: !!stripeConfig.publishableKey,
      hasSecretKey: !!stripeConfig.secretKey,
      publishableKeyStart: stripeConfig.publishableKey?.substring(0, 10),
      secretKeyStart: stripeConfig.secretKey?.substring(0, 10)
    });
    
    if (!stripeConfig.secretKey) {
      devLog.error('[Stripe] Secret key não configurada');
      return NextResponse.json(
        { 
          error: 'Stripe não configurado. Entre em contato com o suporte.',
          debug: {
            hasPublishableKey: !!stripeConfig.publishableKey,
            hasSecretKey: !!stripeConfig.secretKey
          }
        },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
    const body = await request.json();
    const { planType, organizationId, tenantId } = body;

    devLog.log('[Stripe] Criando checkout session:', {
      planType,
      organizationId,
      tenantId
    });

    // Validação dos dados
    if (!planType || !organizationId || !tenantId) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      );
    }

    // Verificar se o plano existe
    if (!STRIPE_PLANS[planType as PlanType]) {
      return NextResponse.json(
        { error: 'Plano não encontrado' },
        { status: 404 }
      );
    }

    const plan = STRIPE_PLANS[planType as PlanType];
    const supabase = createSupabaseServiceRoleClient();

    // Buscar dados da organização
    devLog.log('[Stripe] Buscando organização:', { organizationId, tenantId });
    
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();
      
    // Verificar se os IDs coincidem (segurança multi-tenant)
    if (organization && organization.id !== tenantId) {
      devLog.error('[Stripe] Mismatch de tenant:', { 
        organizationId: organization.id, 
        expectedTenantId: tenantId 
      });
      return NextResponse.json(
        { error: 'Organização não encontrada' },
        { status: 404 }
      );
    }

    if (orgError || !organization) {
      devLog.error('[Stripe] Organização não encontrada:', {
        organizationId,
        tenantId,
        error: orgError,
        errorCode: orgError?.code,
        errorMessage: orgError?.message,
        errorDetails: orgError?.details,
        hasOrganization: !!organization
      });
      
      return NextResponse.json(
        { 
          error: 'Organização não encontrada',
          debug: {
            organizationId,
            tenantId,
            errorCode: orgError?.code,
            errorMessage: orgError?.message
          }
        },
        { status: 404 }
      );
    }

    // Criar ou buscar customer no Stripe
    let customerId = organization.stripe_customer_id;
    
    // Se customer ID existir mas for inválido (teste), criar novo
    if (customerId && customerId.startsWith('cus_test_')) {
      devLog.log('[Stripe] Customer de teste detectado, criando novo:', customerId);
      customerId = null;
    }
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: organization.contact_email,
        name: organization.name,
        metadata: {
          organizationId: organization.id,
          tenantId: organization.id, // Usar organization.id como tenant_id
          slug: organization.slug
        }
      });
      
      customerId = customer.id;
      
      // Atualizar organização com customer ID
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId);
        
      devLog.log('[Stripe] Customer criado:', customerId);
    }

    // Obter URLs de redirecionamento
    const { successUrl, cancelUrl } = getStripeUrls(organization.slug);

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organization.id,
        tenantId: organization.id, // Usar organization.id como tenantId
        planType,
        slug: organization.slug
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          tenantId: organization.id, // Usar organization.id como tenantId
          planType
        }
      }
    });

    devLog.log('[Stripe] Checkout session criada:', {
      sessionId: session.id,
      url: session.url
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error: any) {
    devLog.error('[Stripe] Erro ao criar checkout session:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      type: error.type,
      fullError: error
    });
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message,
        debug: {
          errorType: error.name,
          errorCode: error.code,
          message: error.message
        }
      },
      { status: 500 }
    );
  }
}
