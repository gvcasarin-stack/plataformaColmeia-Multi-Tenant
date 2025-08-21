import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { devLog } from '@/lib/utils/productionLogger'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({
        error: 'Organization ID é obrigatório'
      }, { status: 400 })
    }

    const supabase = createSupabaseServiceRoleClient()

    // Usar função do banco para obter status do trial
    const { data: trialStatus, error } = await supabase
      .rpc('get_trial_status', { org_id: orgId })

    if (error) {
      devLog.error('[api/tenant/trial-status] Erro ao obter status do trial:', error)
      return NextResponse.json({
        error: 'Erro ao obter status do trial'
      }, { status: 500 })
    }

    // A função retorna um array, pegar o primeiro item
    const status = Array.isArray(trialStatus) ? trialStatus[0] : trialStatus

    devLog.log('[api/tenant/trial-status] Status do trial obtido:', {
      orgId,
      isTrialActive: status?.is_trial_active,
      daysRemaining: status?.days_remaining,
      canUseFeatures: status?.can_use_features
    })

    return NextResponse.json({
      trialStatus: status
    })

  } catch (error) {
    devLog.error('[api/tenant/trial-status] Erro inesperado:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
}
