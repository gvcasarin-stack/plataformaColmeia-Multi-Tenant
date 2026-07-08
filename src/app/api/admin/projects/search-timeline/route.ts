/**
 * API para buscar projetos cujo timeline_events (comentários/eventos, ex: número de
 * protocolo) contém o termo pesquisado. Usada apenas quando o usuário digita uma busca
 * em /admin/projetos — a listagem normal não carrega essa coluna JSONB pesada.
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

    // Buscar timeline_events do tenant e filtrar em JS — evita depender de sintaxe de
    // filtro do PostgREST (cast + ilike em coluna JSONB) que não é usada em nenhum outro
    // lugar do projeto e cujo comportamento não é garantido nesta versão do PostgREST
    const { data, error } = await supabase
      .from('projects')
      .select('id, timeline_events')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      devLog.error('[API search-timeline] Erro ao buscar projetos para busca na timeline:', error);
      // Degradar graciosamente: não quebrar a busca da tela por causa deste filtro extra
      return NextResponse.json({ success: true, data: [] });
    }

    const searchLower = query.toLowerCase();

    const matchingIds = (data || [])
      .filter((p) =>
        Array.isArray(p.timeline_events) &&
        p.timeline_events.some((event: any) =>
          typeof event?.content === 'string' && event.content.toLowerCase().includes(searchLower)
        )
      )
      .map((p) => p.id);

    return NextResponse.json({
      success: true,
      data: matchingIds,
    });
  } catch (error: any) {
    devLog.error('[API search-timeline] Erro inesperado:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
