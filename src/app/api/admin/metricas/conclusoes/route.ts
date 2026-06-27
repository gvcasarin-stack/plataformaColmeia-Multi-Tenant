import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service'
import { devLog } from '@/lib/utils/productionLogger'

/**
 * GET /api/admin/metricas/conclusoes
 * Retorna eventos de conclusão de projetos combinando duas fontes:
 * 1. project_timeline_events — data exata para projetos movidos após criação da tabela
 * 2. projects com status is_conclusion — fallback de data (status_changed_at || updated_at)
 *    para projetos históricos sem evento registrado
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

    // 1. Buscar slugs de conclusão configurados para este tenant
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

    // 2. Buscar eventos da timeline (projetos movidos após criação da tabela)
    const { data: timelineEvents, error: timelineError } = await supabase
      .from('project_timeline_events')
      .select('project_id, created_at, new_status')
      .eq('tenant_id', tenantId)
      .eq('type', 'status')
      .in('new_status', conclusionSlugs)
      .order('created_at', { ascending: true })

    if (timelineError) {
      devLog.warn('[metricas/conclusoes] Erro ao consultar timeline_events:', timelineError)
    }

    const timelineData = timelineEvents || []
    const projectsWithEvent = new Set(timelineData.map(e => e.project_id))

    // 3. Buscar projetos que já estão em status de conclusão (histórico)
    const { data: conclusionProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, status, status_changed_at, updated_at')
      .eq('tenant_id', tenantId)
      .in('status', conclusionSlugs)
      .is('deleted_at', null)

    if (projectsError) {
      devLog.warn('[metricas/conclusoes] Erro ao buscar projetos históricos:', projectsError)
    }

    // 4. Projetos sem evento na timeline → criar registro sintético com a melhor data disponível
    const historicalEvents = (conclusionProjects || [])
      .filter(p => !projectsWithEvent.has(p.id))
      .map(p => ({
        project_id: p.id,
        created_at: p.status_changed_at || p.updated_at,
        new_status: p.status,
      }))

    const combined = [...timelineData, ...historicalEvents]

    devLog.log('[metricas/conclusoes] Timeline:', timelineData.length, '| Históricos:', historicalEvents.length, '| Total:', combined.length)
    return NextResponse.json({ success: true, data: combined, conclusionSlugs })

  } catch (err) {
    devLog.warn('[metricas/conclusoes] Exceção:', err)
    return NextResponse.json({ success: true, data: [], conclusionSlugs: [] })
  }
}
