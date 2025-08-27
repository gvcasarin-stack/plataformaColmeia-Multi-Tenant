import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

interface TrialStatus {
  is_trial: boolean
  trial_started_at: string | null
  trial_ends_at: string | null
  days_remaining: number
  is_expired: boolean
  can_access: boolean
  message: string
}

export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const tenantId = headersList.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Tenant ID não encontrado nos headers' 
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServiceRoleClient()

    // Usar a função SQL get_trial_status
    const { data: trialStatus, error } = await supabase.rpc('get_trial_status', {
      org_id: tenantId
    })

    if (error) {
      devLog.error('[tenant/trial-status] Erro ao buscar status do trial:', error)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao verificar status do trial' 
        },
        { status: 500 }
      )
    }

    if (!trialStatus) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Organização não encontrada' 
        },
        { status: 404 }
      )
    }

    devLog.log('[tenant/trial-status] Status do trial recuperado:', {
      tenantId,
      isTrial: trialStatus.is_trial,
      daysRemaining: trialStatus.days_remaining,
      isExpired: trialStatus.is_expired
    })

    return NextResponse.json({
      success: true,
      trial_status: trialStatus as TrialStatus
    })

  } catch (error) {
    devLog.error('[tenant/trial-status] Erro inesperado:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}