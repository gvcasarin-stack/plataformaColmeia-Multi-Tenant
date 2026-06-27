import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'
import { devLog } from '@/lib/utils/productionLogger'

/**
 * GET /api/admin/metricas/conclusoes
 * Retorna os eventos em que projetos foram movidos para status 'finalizado'.
 * Usado na aba Métricas para calcular evolução criados x concluídos e backlog acumulado.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, data: [] })
    }

    const hdrs = headers()
    const tenantId = hdrs.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant ID não encontrado' }, { status: 400 })
    }

    const supabase = createSupabaseServiceRoleClient()

    const { data, error } = await supabase
      .from('project_timeline_events')
      .select('project_id, created_at, new_status')
      .eq('tenant_id', tenantId)
      .eq('type', 'status')
      .eq('new_status', 'finalizado')
      .order('created_at', { ascending: true })

    if (error) {
      devLog.warn('[metricas/conclusoes] Erro ao consultar timeline_events:', error)
      return NextResponse.json({ success: true, data: [] })
    }

    devLog.log('[metricas/conclusoes] Eventos encontrados:', data?.length || 0)
    return NextResponse.json({ success: true, data: data || [] })

  } catch (err) {
    devLog.warn('[metricas/conclusoes] Exceção:', err)
    return NextResponse.json({ success: true, data: [] })
  }
}
