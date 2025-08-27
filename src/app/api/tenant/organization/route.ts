import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const tenantId = headersList.get('x-tenant-id')
    const tenantSlug = headersList.get('x-tenant-slug')

    if (!tenantId || !tenantSlug) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Informações do tenant não encontradas nos headers' 
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceRoleClient()

    // Buscar informações completas da organização
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        plan,
        plan_limits,
        settings,
        contact_email,
        status,
        is_trial,
        trial_started_at,
        trial_ends_at,
        subscription_status,
        created_at,
        updated_at
      `)
      .eq('id', tenantId)
      .single()

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
      plan: organization.plan,
      isTrial: organization.is_trial
    })

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        plan_limits: organization.plan_limits,
        settings: organization.settings,
        contact_email: organization.contact_email,
        status: organization.status,
        is_trial: organization.is_trial,
        trial_started_at: organization.trial_started_at,
        trial_ends_at: organization.trial_ends_at,
        subscription_status: organization.subscription_status,
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
