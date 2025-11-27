import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { getUserNotifications } from '@/lib/services/notificationService/queries';
import { getTenantFromUser } from '@/lib/utils/tenant-security';

/**
 * API ALTERNATIVA para buscar notificações do admin
 * GET /api/notifications/admin-user?limit=50
 *
 * Esta API usa uma abordagem diferente:
 * 1. Identifica o usuário admin pelo tenant_id dos headers
 * 2. Não depende da sessão do Supabase Server Client
 * 3. Busca notificações diretamente com Service Role
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API notifications/admin-user] Iniciando busca alternativa...');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const userIdFromQuery = searchParams.get('userId'); // ✅ Receber userId do query param

    // ✅ MULTI-TENANT: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    const host = headersList.get('host');

    devLog.log('[API notifications/admin-user] Headers recebidos:', {
      tenantId,
      host,
      limit
    });

    if (!tenantId) {
      devLog.error('[API notifications/admin-user] tenant_id não encontrado nos headers');
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado nos headers'
      }, { status: 400 });
    }

    // 🛠️ FALLBACK: Para tenants temporários EM DESENVOLVIMENTO APENAS
    if (process.env.NODE_ENV === 'development' && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.log('[API notifications/admin-user] Tenant temporário detectado (dev), retornando notificações simuladas:', tenantId);
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        unreadCount: 0,
        source: 'dev-mode-simulation'
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/admin-user] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 });
    }

    // ✅ CORREÇÃO SEGURA: Usar userId do query param (enviado pelo componente)
    if (!userIdFromQuery) {
      devLog.error('[API notifications/admin-user] userId não fornecido no query param');
      return NextResponse.json({
        success: false,
        error: 'Usuário não identificado'
      }, { status: 401 });
    }

    devLog.log('[API notifications/admin-user] User ID recebido:', userIdFromQuery);

    // Buscar o usuário específico que está logado
    const supabase = createSupabaseServiceRoleClient();
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, name, email, role, status')
      .eq('id', userIdFromQuery)
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin', 'colaborador'])
      .eq('status', 'active')
      .single();

    if (adminError || !adminUser) {
      devLog.error('[API notifications/admin-user] Não foi possível encontrar usuário:', {
        userId: userIdFromQuery,
        tenantId,
        error: adminError?.message
      });
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado ou sem permissão'
      }, { status: 404 });
    }
    devLog.log('[API notifications/admin-user] Usuário admin encontrado:', {
      userId: adminUser.id,
      role: adminUser.role,
      tenantId
    });

    // Verificar se usuário pode acessar (usando getTenantFromUser para consistência)
    const tenantInfo = await getTenantFromUser(adminUser.id);
    if (!tenantInfo) {
      devLog.error('[API notifications/admin-user] Não foi possível obter informações do tenant para o admin:', adminUser.id);
      return NextResponse.json({
        success: false,
        error: 'Não foi possível verificar permissões do usuário'
      }, { status: 403 });
    }

    // Verificar se trial expirou
    if (tenantInfo.organization.is_trial &&
        tenantInfo.organization.subscription_status === 'expired') {
      devLog.warn('[API notifications/admin-user] Período de trial expirado:', {
        userId: adminUser.id,
        organization: tenantInfo.organization.name
      });
      return NextResponse.json({
        success: false,
        error: 'Período de trial expirado'
      }, { status: 403 });
    }

    // Buscar notificações para este admin
    devLog.log('[API notifications/admin-user] Buscando notificações para admin:', {
      userId: '[REDACTED]',
      tenantId: tenantInfo.tenant_id,
      organization: tenantInfo.organization.name,
      limit
    });

    const notifications = await getUserNotifications(adminUser.id, limit);

    devLog.log('[API notifications/admin-user] Notificações encontradas:', {
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length,
      source: 'service-role-direct'
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length,
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      },
      tenant: {
        id: tenantInfo.tenant_id,
        organization: tenantInfo.organization.name
      }
    });

  } catch (error) {
    devLog.error('[API notifications/admin-user] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}