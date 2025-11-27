import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { deleteNotification } from '@/lib/services/notificationService/queries';

/**
 * API ALTERNATIVA para deletar notificação (admin)
 * DELETE /api/notifications/admin-delete
 * Body: { notificationId: string }
 *
 * Identifica o admin pelo tenant_id dos headers
 */
export async function DELETE(request: NextRequest) {
  try {
    devLog.log('[API notifications/admin-delete] Iniciando...');

    const { notificationId } = await request.json();

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
      devLog.log('[API notifications/admin-delete] Tenant temporário detectado (dev), simulando sucesso:', tenantId);
      return NextResponse.json({
        success: true,
        message: 'Notification deleted (dev mode)'
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/admin-delete] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
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
      devLog.error('[API notifications/admin-delete] Notificação não encontrada:', {
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
      devLog.error('[API notifications/admin-delete] Notificação não pertence ao tenant atual:', {
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
      devLog.error('[API notifications/admin-delete] Usuário não tem permissão:', {
        notificationId,
        userRole: notifUser.role
      });
      return NextResponse.json({
        success: false,
        error: 'Acesso negado - usuário não tem permissão'
      }, { status: 403 });
    }

    // Deletar notificação
    await deleteNotification(notificationId);

    devLog.log('[API notifications/admin-delete] Sucesso:', {
      notificationId,
      tenantId
    });

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    devLog.error('[API notifications/admin-delete] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}