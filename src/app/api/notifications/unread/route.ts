import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { handleTempTenant } from '@/lib/utils/temp-tenant-handler';

/**
 * API PARA BUSCAR NOTIFICAÇÕES NÃO LIDAS
 * GET /api/notifications/unread
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API] [Notifications] [Unread] Buscando notificações não lidas');

    // ✅ SEGURANÇA: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API] [Notifications] [Unread] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // 🛠️ FALLBACK: Lidar com tenants temporários
    const tempTenantResponse = handleTempTenant(tenantId, 'array', 'Notifications');
    if (tempTenantResponse) {
      return tempTenantResponse;
    }

    // Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.warn('[API] [Notifications] [Unread] Service Role Key não disponível (build)');
      return NextResponse.json({
        success: true,
        data: [],
        note: 'Service Role Key não configurada'
      });
    }

    const supabase = createSupabaseServiceRoleClient();

    // ✅ SEGURANÇA: Buscar apenas notificações do tenant atual
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)  // ✅ CRÍTICO: Filtrar por tenant
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) {
      devLog.error('[API] [Notifications] [Unread] Erro ao buscar notificações:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar notificações', details: error.message },
        { status: 500 }
      );
    }

    devLog.log('[API] [Notifications] [Unread] Notificações encontradas:', {
      count: data?.length || 0,
      tenantId
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    devLog.error('[API] [Notifications] [Unread] Exceção:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}