import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

export async function GET(request: NextRequest) {
  try {
    devLog.log('[API Tenant Organization] Iniciando busca de organização...');
    
    const headersList = headers()
    const tenantId = headersList.get('x-tenant-id')
    const tenantSlug = headersList.get('x-tenant-slug')

    devLog.log('[API Tenant Organization] Headers recebidos:', {
      tenantId,
      tenantSlug,
      allHeaders: Object.fromEntries(headersList.entries())
    });

    if (!tenantId && !tenantSlug) {
      devLog.error('[API Tenant Organization] Nem tenant ID nem slug encontrados');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tenant ID ou slug não encontrado nos headers',
          debug: {
            receivedHeaders: Object.fromEntries(headersList.entries()),
            expectedHeaders: ['x-tenant-id', 'x-tenant-slug']
          }
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceRoleClient()

    // Buscar informações completas da organização (estrutura atualizada)
    devLog.log('[API Tenant Organization] Executando query:', { tenantId, tenantSlug });
    
    let query = supabase.from('organizations').select(`
      id,
      name,
      slug,
      plan_id,
      settings,
      contact_email,
      status,
      is_trial,
      trial_start_date,
      trial_end_date,
      subscription_status,
      stripe_customer_id,
      stripe_subscription_id,
      payment_method_added,
      next_billing_date,
      created_at,
      updated_at
    `);

    // Buscar por ID ou slug
    if (tenantId) {
      query = query.eq('id', tenantId);
    } else if (tenantSlug) {
      query = query.eq('slug', tenantSlug);
    }

    const { data: organization, error } = await query.single();

    // Adicionar tenant_id manualmente (já que id = tenant_id neste contexto)
    if (organization) {
      organization.tenant_id = organization.id;
    }

    devLog.log('[API Tenant Organization] Resultado da query:', {
      organization,
      error: error?.message,
      hasOrganization: !!organization
    });

    if (error) {
      devLog.error('[tenant/organization] Erro ao buscar organização:', error)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao buscar informações da organização' 
        },
        { status: 500 }
      )
    }

    if (!organization) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Organização não encontrada' 
        },
        { status: 404 }
      )
    }

    // Verificar se a organização está ativa
    if (organization.status !== 'active') {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Organização não está ativa',
          organization: {
            id: organization.id,
            slug: organization.slug,
            status: organization.status
          }
        },
        { status: 403 }
      )
    }

    devLog.log('[tenant/organization] Informações da organização recuperadas:', {
      id: organization.id,
      slug: organization.slug,
      tenant_id: organization.tenant_id,
      plan: organization.plan,
      isTrial: organization.is_trial,
      hasRequiredFields: !!(organization.id && organization.tenant_id)
    })

    return NextResponse.json({
      success: true,
      data: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        tenant_id: organization.tenant_id, // ✅ ADICIONADO: Campo tenant_id necessário
        plan_id: organization.plan_id,
        settings: organization.settings,
        contact_email: organization.contact_email,
        status: organization.status,
        is_trial: organization.is_trial,
        trial_start_date: organization.trial_start_date,
        trial_end_date: organization.trial_end_date,
        subscription_status: organization.subscription_status,
        stripe_customer_id: organization.stripe_customer_id,
        stripe_subscription_id: organization.stripe_subscription_id,
        payment_method_added: organization.payment_method_added,
        next_billing_date: organization.next_billing_date,
        created_at: organization.created_at,
        updated_at: organization.updated_at
      }
    })

  } catch (error) {
    devLog.error('[tenant/organization] Erro inesperado:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}
