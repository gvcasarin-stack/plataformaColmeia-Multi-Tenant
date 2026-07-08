/**
 * API para buscar projetos cujos eventos de linha do tempo (comentários, ex: número de
 * protocolo) contêm o termo pesquisado. Usada apenas quando o usuário digita uma busca
 * em /admin/projetos — a listagem normal não carrega esses dados.
 *
 * Os eventos são lidos da tabela dedicada `project_timeline_events` (ver migração
 * 20260625_create_project_timeline_events.sql), que substituiu o antigo array JSONB
 * `projects.timeline_events` — comentários novos só são gravados na tabela nova.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

export async function GET(request: NextRequest) {
  try {
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID não encontrado' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    const supabase = createSupabaseServiceRoleClient();

    // Escapar caracteres especiais do ILIKE (% e _) para que a busca seja literal
    const escaped = query.replace(/[%_]/g, (char) => `\\${char}`);

    const { data, error } = await supabase
      .from('project_timeline_events')
      .select('project_id')
      .eq('tenant_id', tenantId)
      .ilike('content', `%${escaped}%`);

    if (error) {
      devLog.error('[API search-timeline] Erro ao buscar na linha do tempo:', error);
      // Degradar graciosamente: não quebrar a busca da tela por causa deste filtro extra
      return NextResponse.json({ success: true, data: [] });
    }

    const matchingIds = Array.from(new Set((data || []).map((row) => row.project_id)));

    return NextResponse.json({
      success: true,
      data: matchingIds,
    });
  } catch (error: any) {
    devLog.error('[API search-timeline] Erro inesperado:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
