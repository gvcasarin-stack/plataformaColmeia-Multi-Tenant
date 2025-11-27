import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';
import { markAllNotificationsAsRead } from '@/lib/services/notificationService/queries';

/**
 * API ALTERNATIVA para marcar todas as notificações como lidas (admin)
 * POST /api/notifications/admin-mark-all-read
 * Body: {} (vazio)
 *
 * Identifica o admin pelo tenant_id dos headers
 */
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API notifications/admin-mark-all-read] Iniciando...');

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
      devLog.log('[API notifications/admin-mark-all-read] Tenant temporário detectado (dev), simulando sucesso:', tenantId);
      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read (dev mode)'
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/admin-mark-all-read] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 });
    }

    // Buscar o usuário admin deste tenant
    const supabase = createSupabaseServiceRoleClient();

    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, name, email, role, status')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin', 'colaborador']) // ✅ Incluir colaboradores
      .eq('status', 'active')
      .limit(1);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      devLog.error('[API notifications/admin-mark-all-read] Não foi possível encontrar usuário admin para este tenant:', {
        tenantId,
        error: adminError?.message,
        adminUsersCount: adminUsers?.length || 0
      });
      return NextResponse.json({
        success: false,
        error: 'Usuário admin não encontrado para este tenant'
      }, { status: 404 });
    }

    const adminUser = adminUsers[0];

    devLog.log('[API notifications/admin-mark-all-read] Marcando todas como lidas para admin:', {
      userId: '[REDACTED]',
      role: adminUser.role,
      tenantId
    });

    // Marcar todas como lidas para este admin
    await markAllNotificationsAsRead(adminUser.id);

    devLog.log('[API notifications/admin-mark-all-read] Sucesso');

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      }
    });

  } catch (error) {
    devLog.error('[API notifications/admin-mark-all-read] Erro inesperado:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}