import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'
import { devLog } from '@/lib/utils/productionLogger'

/**
 * GET /api/admin/metricas/conclusoes
 * Retorna os eventos em que projetos foram movidos para um status marcado como is_conclusion.
 * Usado na aba Métricas para calcular evolução criados x concluídos e backlog acumulado.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: true, data: [], conclusionSlugs: [] })
    }

    const hdrs = headers()
    const tenantId = hdrs.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant ID não encontrado' }, { status: 400 })
    }

    const supabase = createSupabaseServiceRoleClient()

    // Buscar quais slugs representam conclusão para este tenant
    const { data: conclusionStatuses, error: statusError } = await supabase
      .from('project_statuses')
      .select('slug')
      .eq('tenant_id', tenantId)
      .eq('is_conclusion', true)
      .eq('is_active', true)

    if (statusError) {
      devLog.warn('[metricas/conclusoes] Erro ao buscar status de conclusão:', statusError)
      return NextResponse.json({ success: true, data: [], conclusionSlugs: [] })
    }

    const conclusionSlugs = (conclusionStatuses || []).map(s => s.slug)

    if (conclusionSlugs.length === 0) {
      devLog.log('[metricas/conclusoes] Nenhum status de conclusão configurado')
      return NextResponse.json({ success: true, data: [], conclusionSlugs: [] })
    }

    const { data, error } = await supabase
      .from('project_timeline_events')
      .select('project_id, created_at, new_status')
      .eq('tenant_id', tenantId)
      .eq('type', 'status')
      .in('new_status', conclusionSlugs)
      .order('created_at', { ascending: true })

    if (error) {
      devLog.warn('[metricas/conclusoes] Erro ao consultar timeline_events:', error)
      return NextResponse.json({ success: true, data: [], conclusionSlugs })
    }

    devLog.log('[metricas/conclusoes] Eventos encontrados:', data?.length || 0, 'slugs:', conclusionSlugs)
    return NextResponse.json({ success: true, data: data || [], conclusionSlugs })

  } catch (err) {
    devLog.warn('[metricas/conclusoes] Exceção:', err)
    return NextResponse.json({ success: true, data: [], conclusionSlugs: [] })
  }
}
