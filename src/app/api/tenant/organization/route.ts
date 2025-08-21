import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json({
        error: 'Slug é obrigatório'
      }, { status: 400 })
    }

    const supabase = createSupabaseServiceRoleClient()

    // Buscar organização pelo slug
    const { data: organization, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        plan,
        plan_limits,
        settings,
        status,
        is_trial,
        subscription_status,
        trial_ends_at,
        created_at,
        updated_at
      `)
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error || !organization) {
      devLog.warn('[api/tenant/organization] Organização não encontrada:', { slug, error })
      return NextResponse.json({
        error: 'Organização não encontrada'
      }, { status: 404 })
    }

    devLog.log('[api/tenant/organization] Organização encontrada:', {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan
    })

    return NextResponse.json({
      organization
    })

  } catch (error) {
    devLog.error('[api/tenant/organization] Erro inesperado:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
