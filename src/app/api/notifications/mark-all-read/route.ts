import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { markAllNotificationsAsRead } from '@/lib/services/notificationService/queries';
import { getTenantFromUser } from '@/lib/utils/tenant-security';

/**
 * API para marcar todas as notificações como lidas
 * POST /api/notifications/mark-all-read
 * Body: { userId?: string }
 *
 * COMPATÍVEL COM MULTI-TENANT - Funciona tanto para admin quanto cliente
 */
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API notifications/mark-all-read] Iniciando...');

    // Tentar obter userId do body (compatibilidade)
    let userId: string | undefined;
    try {
      const body = await request.json();
      userId = body.userId;
    } catch {
      // Se não conseguir parsear o body, continua sem userId
    }

    // ✅ MULTI-TENANT: Obter tenant_id dos headers se disponível
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    devLog.log('[API notifications/mark-all-read] Headers multi-tenant:', {
      tenantId,
      hostname: headersList.get('host')
    });

    // 🛠️ FALLBACK: Para tenants temporários EM DESENVOLVIMENTO APENAS
    if (process.env.NODE_ENV === 'development' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.log('[API notifications/mark-all-read] Tenant temporário detectado (dev), simulando sucesso:', tenantId);
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read (dev mode)'
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/mark-all-read] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 });
    }

    // ✅ FALLBACK: Se não tem userId, tentar obter da sessão
    let finalUserId = userId;
    if (!finalUserId) {
      devLog.log('[API notifications/mark-all-read] userId não fornecido, tentando obter da sessão...');

      const supabase = createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        devLog.error('[API notifications/mark-all-read] Erro de autenticação:', authError?.message);
        return NextResponse.json({
          success: false,
          error: 'Usuário não autenticado'
        }, { status: 401 });
      }

      finalUserId = user.id;
      devLog.log('[API notifications/mark-all-read] userId obtido da sessão com sucesso');
    }

    // ✅ SEGURANÇA MULTI-TENANT: Verificar se usuário pode acessar
    const tenantInfo = await getTenantFromUser(finalUserId);
    if (!tenantInfo) {
      devLog.error('[API notifications/mark-all-read] Usuário não encontrado ou sem organização:', finalUserId);
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado ou sem organização'
      }, { status: 403 });
    }

    // Verificar se trial expirou
    if (tenantInfo.organization.is_trial &&
        tenantInfo.organization.subscription_status === 'expired') {
      devLog.warn('[API notifications/mark-all-read] Período de trial expirado:', {
        userId: finalUserId,
        organization: tenantInfo.organization.name
      });
      return NextResponse.json({
        success: false,
        error: 'Período de trial expirado'
      }, { status: 403 });
    }

    devLog.log('[API notifications/mark-all-read] Marcando todas como lidas:', {
      userId: '[REDACTED]',
      tenantId: tenantInfo.tenant_id,
      organization: tenantInfo.organization.name
    });

    // Marcar todas como lidas
    await markAllNotificationsAsRead(finalUserId);

    devLog.log('[API notifications/mark-all-read] Sucesso');

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    devLog.error('[API notifications/mark-all-read] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 