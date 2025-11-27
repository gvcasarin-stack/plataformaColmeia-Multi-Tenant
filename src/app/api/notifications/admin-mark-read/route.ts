import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { markNotificationAsRead } from '@/lib/services/notificationService/queries';

/**
 * API ALTERNATIVA para marcar notificação como lida (admin)
 * POST /api/notifications/admin-mark-read
 * Body: { notificationId: string }
 *
 * Identifica o admin pelo tenant_id dos headers
 */
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API notifications/admin-mark-read] Iniciando...');

    const { notificationId, markAsUnread } = await request.json();

    if (!notificationId) {
      return NextResponse.json({
        success: false,
        error: 'notificationId é obrigatório'
      }, { status: 400 });
    }

    // ✅ MULTI-TENANT: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Tenant ID não encontrado nos headers'
      }, { status: 400 });
    }

    // 🛠️ FALLBACK: Para tenants temporários EM DESENVOLVIMENTO APENAS
    if (process.env.NODE_ENV === 'development' && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.log('[API notifications/admin-mark-read] Tenant temporário detectado (dev), simulando sucesso:', tenantId);
      return NextResponse.json({
        success: true,
        message: 'Notification marked as read (dev mode)'
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/admin-mark-read] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 });
    }

    // Verificar se a notificação pertence a um admin deste tenant
    const supabase = createSupabaseServiceRoleClient();

    const { data: notificationData, error: notifError } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        users!notifications_user_id_fkey (
          id,
          tenant_id,
          role
        )
      `)
      .eq('id', notificationId)
      .single();

    if (notifError || !notificationData) {
      devLog.error('[API notifications/admin-mark-read] Notificação não encontrada:', {
        notificationId,
        error: notifError?.message
      });
      return NextResponse.json({
        success: false,
        error: 'Notificação não encontrada'
      }, { status: 404 });
    }

    const notifUser = notificationData.users as any;
    if (!notifUser || notifUser.tenant_id !== tenantId) {
      devLog.error('[API notifications/admin-mark-read] Notificação não pertence ao tenant atual:', {
        notificationId,
        userTenantId: notifUser?.tenant_id,
        requestTenantId: tenantId
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado a esta notificação'
      }, { status: 403 });
    }

    if (!['admin', 'superadmin', 'colaborador'].includes(notifUser.role)) {
      devLog.error('[API notifications/admin-mark-read] Usuário não tem permissão:', {
        notificationId,
        userRole: notifUser.role
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado - usuário não tem permissão'
      }, { status: 403 });
    }

    // Marcar como lida ou não lida
    if (markAsUnread) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: false })
        .eq('id', notificationId);

      if (updateError) {
        throw updateError;
      }

      devLog.log('[API notifications/admin-mark-read] Marcada como não lida:', {
        notificationId,
        tenantId
      });

      return NextResponse.json({
        success: true,
        message: 'Notification marked as unread'
      });
    } else {
      await markNotificationAsRead(notificationId);

      devLog.log('[API notifications/admin-mark-read] Sucesso:', {
        notificationId,
        tenantId
      });

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    }

  } catch (error) {
    devLog.error('[API notifications/admin-mark-read] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}