import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'users' | 'projects' | 'clients'
    const orgId = searchParams.get('orgId')

    if (!type || !orgId) {
      return NextResponse.json({
        error: 'Tipo de recurso e Organization ID são obrigatórios'
      }, { status: 400 })
    }

    if (!['users', 'projects', 'clients'].includes(type)) {
      return NextResponse.json({
        error: 'Tipo de recurso inválido'
      }, { status: 400 })
    }

    const supabase = createSupabaseServiceRoleClient()

    // Usar função do banco para verificar se pode criar recurso
    const { data: canCreateResult, error } = await supabase
      .rpc('can_create_resource', { 
        org_id: orgId, 
        resource_type: type 
      })

    if (error) {
      devLog.error('[api/tenant/can-create] Erro ao verificar limite:', error)
      return NextResponse.json({
        error: 'Erro ao verificar limite'
      }, { status: 500 })
    }

    // Também obter informações detalhadas do limite
    const { data: limitInfo, error: limitError } = await supabase
      .rpc('check_limit', { 
        org_id: orgId, 
        limit_type: type 
      })

    let limitDetails = null
    if (!limitError && limitInfo && Array.isArray(limitInfo) && limitInfo.length > 0) {
      limitDetails = limitInfo[0]
    }

    devLog.log('[api/tenant/can-create] Verificação de limite:', {
      orgId,
      type,
      canCreate: canCreateResult,
      limitDetails
    })

    return NextResponse.json({
      canCreate: canCreateResult,
      limitDetails
    })

  } catch (error) {
    devLog.error('[api/tenant/can-create] Erro inesperado:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
