import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { headers } from 'next/headers';

// ✅ CORRIGIDO: Forçar runtime dinâmico
export const dynamic = 'force-dynamic';

/**
 * API de DEBUG para verificar notificações no banco
 * GET /api/debug/check-notifications-data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    console.log('🔍 [DEBUG check-notifications-data] Iniciando diagnóstico...');
    console.log('🔍 [DEBUG check-notifications-data] Tenant ID:', tenantId);

    // 1. Buscar usuário admin do tenant
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, name, email, role, tenant_id')
      .eq('tenant_id', tenantId)
      .in('role', ['admin', 'superadmin', 'colaborador'])
      .limit(1);

    if (adminError || !adminUsers || adminUsers.length === 0) {
      return NextResponse.json({
        error: 'Admin não encontrado',
        adminError: adminError?.message,
        tenantId
      });
    }

    const adminUser = adminUsers[0];
    console.log('🔍 [DEBUG check-notifications-data] Admin encontrado:', adminUser);

    // 2. Buscar TODAS as notificações deste admin
    const { data: allNotifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', adminUser.id)
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('🔍 [DEBUG check-notifications-data] Notificações encontradas:', allNotifications?.length);

    // 3. Buscar notificações de new_project especificamente
    const { data: newProjectNotifs, error: newProjectError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', adminUser.id)
      .eq('category', 'project')
      .order('created_at', { ascending: false });

    console.log('🔍 [DEBUG check-notifications-data] Notificações de projeto:', newProjectNotifs?.length);

    // 4. Buscar as 3 notificações mais recentes do sistema (qualquer usuário)
    const { data: recentNotifs, error: recentError } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('🔍 [DEBUG check-notifications-data] Notificações recentes do tenant:', recentNotifs?.length);

    // 5. Verificar estrutura da tabela
    const { data: tableInfo, error: tableError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    return NextResponse.json({
      success: true,
      debug: {
        adminUser: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          tenant_id: adminUser.tenant_id
        },
        allNotificationsCount: allNotifications?.length || 0,
        allNotifications: allNotifications?.map(n => ({
          id: n.id,
          type: n.type,
          category: n.category,
          title: n.title,
          message: n.message?.substring(0, 100),
          user_id: n.user_id,
          tenant_id: n.tenant_id,
          read: n.read,
          created_at: n.created_at,
          data: n.data
        })),
        newProjectNotificationsCount: newProjectNotifs?.length || 0,
        newProjectNotifications: newProjectNotifs,
        recentTenantNotificationsCount: recentNotifs?.length || 0,
        recentTenantNotifications: recentNotifs?.map(n => ({
          id: n.id,
          type: n.type,
          category: n.category,
          title: n.title,
          user_id: n.user_id,
          tenant_id: n.tenant_id,
          created_at: n.created_at,
          data_originalType: n.data?.originalType
        })),
        tableStructureSample: tableInfo?.[0] ? Object.keys(tableInfo[0]) : []
      }
    });

  } catch (error) {
    console.error('🔍 [DEBUG check-notifications-data] ERRO:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
