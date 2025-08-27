import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

interface ResourceCheck {
  can_proceed: boolean
  current_usage: number
  limit_value: number
  usage_percentage: string
  message: string
}

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const tenantId = headersList.get('x-tenant-id')
    
    const { searchParams } = new URL(request.url)
    const resourceType = searchParams.get('type')

    if (!tenantId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tenant ID não encontrado nos headers' 
        },
        { status: 400 }
      )
    }

    if (!resourceType) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tipo de recurso é obrigatório' 
        },
        { status: 400 }
      )
    }

    // Validar tipos de recursos suportados
    const validResourceTypes = ['projects', 'users', 'clients', 'storage_gb']
    if (!validResourceTypes.includes(resourceType)) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Tipo de recurso inválido. Suportados: ${validResourceTypes.join(', ')}` 
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceRoleClient()

    // Usar a função SQL can_create_resource
    const { data: resourceCheck, error } = await supabase.rpc('can_create_resource', {
      org_id: tenantId,
      resource_type: resourceType
    })

    if (error) {
      devLog.error('[tenant/can-create] Erro ao verificar limites:', error)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao verificar limites do plano' 
        },
        { status: 500 }
      )
    }

    if (!resourceCheck) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Organização não encontrada' 
        },
        { status: 404 }
      )
    }

    devLog.log('[tenant/can-create] Verificação de limite:', {
      tenantId,
      resourceType,
      canProceed: resourceCheck.can_proceed,
      currentUsage: resourceCheck.current_usage,
      limitValue: resourceCheck.limit_value
    })

    return NextResponse.json({
      success: true,
      resource_check: resourceCheck as ResourceCheck,
      resource_type: resourceType
    })

  } catch (error) {
    devLog.error('[tenant/can-create] Erro inesperado:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}
