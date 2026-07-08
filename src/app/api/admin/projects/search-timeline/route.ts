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

    // Escapar caracteres especiais do ILIKE (% e _) para que a busca seja literal
    const escaped = query.replace(/[%_]/g, (char) => `\\${char}`);

    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .filter('timeline_events::text', 'ilike', `%${escaped}%`);

    if (error) {
      devLog.error('[API search-timeline] Erro ao buscar na timeline:', error);
      // Degradar graciosamente: não quebrar a busca da tela por causa deste filtro extra
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map((p) => p.id),
    });
  } catch (error: any) {
    devLog.error('[API search-timeline] Erro inesperado:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
