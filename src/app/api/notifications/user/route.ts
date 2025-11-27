import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { getUserNotifications } from '@/lib/services/notificationService/queries';
import { getTenantFromUser } from '@/lib/utils/tenant-security';

/**
 * API para buscar notificações do usuário
 * GET /api/notifications/user?userId=ID&limit=20
 * GET /api/notifications/user?limit=20 (usa sessão do usuário)
 *
 * COMPATÍVEL COM MULTI-TENANT - Funciona tanto para admin quanto cliente
 */
export async function GET(request: NextRequest) {
  try {
    devLog.log('[API notifications/user] Iniciando busca de notificações...');

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // ✅ MULTI-TENANT: Obter tenant_id dos headers se disponível
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    devLog.log('[API notifications/user] Headers multi-tenant:', {
      tenantId,
      userId: userId ? '[REDACTED]' : null,
      hostname: headersList.get('host')
    });

    // 🛠️ FALLBACK: Para tenants temporários EM DESENVOLVIMENTO APENAS
    if (process.env.NODE_ENV === 'development' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.log('[API notifications/user] Tenant temporário detectado (dev), retornando notificações simuladas:', tenantId);
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        unreadCount: 0
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/user] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 });
    }

    // ✅ FALLBACK: Se não tem userId, tentar obter da sessão
    if (!userId) {
      devLog.log('[API notifications/user] userId não fornecido, tentando obter da sessão...');

      const supabase = createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        devLog.error('[API notifications/user] Erro de autenticação:', authError?.message);
        return NextResponse.json({
          success: false,
          error: 'Usuário não autenticado'
        }, { status: 401 });
      }

      userId = user.id;
      devLog.log('[API notifications/user] userId obtido da sessão com sucesso');
    }

    // ✅ SEGURANÇA MULTI-TENANT: Verificar se usuário pode acessar
    const tenantInfo = await getTenantFromUser(userId);
    if (!tenantInfo) {
      devLog.error('[API notifications/user] Usuário não encontrado ou sem organização:', userId);
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado ou sem organização'
      }, { status: 403 });
    }

    // Verificar se trial expirou
    if (tenantInfo.organization.is_trial &&
        tenantInfo.organization.subscription_status === 'expired') {
      devLog.warn('[API notifications/user] Período de trial expirado:', {
        userId,
        organization: tenantInfo.organization.name
      });
      return NextResponse.json({
        success: false,
        error: 'Período de trial expirado'
      }, { status: 403 });
    }

    devLog.log('[API notifications/user] Buscando notificações:', {
      userId: '[REDACTED]',
      tenantId: tenantInfo.tenant_id,
      organization: tenantInfo.organization.name,
      limit
    });

    // Buscar notificações usando a função existente
    const notifications = await getUserNotifications(userId, limit);

    devLog.log('[API notifications/user] Notificações encontradas:', {
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length
    });

  } catch (error) {
    devLog.error('[API notifications/user] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 