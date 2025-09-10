import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * Função auxiliar para criar notificação de teste
 */
async function createTestNotification(userId: string, tenantId: string, supabase: any) {
  const testNotification = {
    type: 'info',
    category: 'system', // ✅ CORRIGIDO: Usar categoria válida
    priority: 'normal',
    title: `Teste de Notificação - ${new Date().toLocaleTimeString()}`,
    message: 'Esta é uma notificação de teste para validar o sistema de polling inteligente.',
    user_id: userId,
    tenant_id: tenantId,
    read: false,
    data: {
      testType: 'realtime_polling',
      timestamp: new Date().toISOString(),
      source: 'debug_api'
    },
    created_at: new Date().toISOString()
  };

  const { data: createdNotification, error: createError } = await supabase
    .from('notifications')
    .insert([testNotification])
    .select()
    .single();

  if (createError) {
    return NextResponse.json({
      success: false,
      error: createError.message
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Notificação de teste criada com sucesso',
    data: createdNotification,
    instructions: 'Agora verifique se a notificação aparece automaticamente no painel admin em 5-30 segundos'
  });
}

/**
 * API de teste para validar sistema de notificações em tempo real
 * 
 * Casos de teste:
 * 1. Criar notificação de teste
 * 2. Verificar contagem de não lidas
 * 3. Simular cenários de polling
 * 
 * USO:
 * GET /api/debug/test-realtime-notifications?action=create&userId=ID&tenantId=ID
 * GET /api/debug/test-realtime-notifications?action=count&userId=ID
 * GET /api/debug/test-realtime-notifications?action=status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const tenantId = searchParams.get('tenantId');

    devLog.log('[DEBUG Realtime Notifications] Ação solicitada:', { action, userId, tenantId });

    const supabase = createSupabaseServiceRoleClient();

    switch (action) {
      case 'create':
        if (!userId || !tenantId || userId === 'SEU_USER_ID' || tenantId === 'SEU_TENANT_ID') {
          // Auto-detectar IDs se não fornecidos ou se são placeholders
          const { data: sampleUser, error: userError } = await supabase
            .from('users')
            .select('id, tenant_id, role, name, email')
            .eq('role', 'admin')
            .limit(1)
            .single();

          if (userError || !sampleUser) {
            return NextResponse.json({
              error: 'Não foi possível detectar automaticamente um admin. Forneça userId e tenantId válidos.',
              usage: '/api/debug/test-realtime-notifications?action=create&userId=ID_REAL&tenantId=ID_REAL',
              hint: 'Use action=status para ver usuários disponíveis'
            }, { status: 400 });
          }

          // Usar IDs detectados automaticamente
          const autoUserId = userId && userId !== 'SEU_USER_ID' ? userId : sampleUser.id;
          const autoTenantId = tenantId && tenantId !== 'SEU_TENANT_ID' ? tenantId : sampleUser.tenant_id;

          devLog.log('[DEBUG Realtime Notifications] IDs detectados automaticamente:', {
            autoUserId,
            autoTenantId,
            sampleUser: sampleUser.name || sampleUser.email
          });

          // Continuar com IDs detectados
          return await createTestNotification(autoUserId, autoTenantId, supabase);
        }

        return await createTestNotification(userId, tenantId, supabase);

      case 'count':
        if (!userId) {
          return NextResponse.json({
            error: 'userId é obrigatório para verificar contagem',
            usage: '/api/debug/test-realtime-notifications?action=count&userId=ID'
          }, { status: 400 });
        }

        // Verificar contagem de notificações não lidas
        const { count, error: countError } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('read', false);

        if (countError) {
          return NextResponse.json({
            success: false,
            error: countError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          unreadCount: count || 0,
          userId,
          timestamp: new Date().toISOString()
        });

      case 'status':
        // Verificar status geral do sistema e usuários disponíveis
        const { data: allNotifications, error: statusError } = await supabase
          .from('notifications')
          .select('id, user_id, tenant_id, read, created_at')
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: availableAdmins, error: adminsError } = await supabase
          .from('users')
          .select('id, tenant_id, role, name, email')
          .in('role', ['admin', 'superadmin'])
          .limit(5);

        if (statusError) {
          return NextResponse.json({
            success: false,
            error: statusError.message
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          systemStatus: {
            totalNotifications: allNotifications?.length || 0,
            recentNotifications: allNotifications,
            timestamp: new Date().toISOString()
          },
          availableAdmins: availableAdmins?.map(admin => ({
            userId: admin.id,
            tenantId: admin.tenant_id,
            name: admin.name || admin.email,
            role: admin.role
          })) || [],
          testInstructions: {
            autoCreate: '/api/debug/test-realtime-notifications?action=create (detecta admin automaticamente)',
            manualCreate: '/api/debug/test-realtime-notifications?action=create&userId=ID_REAL&tenantId=ID_REAL',
            checkCount: '/api/debug/test-realtime-notifications?action=count&userId=ID_REAL',
            checkStatus: '/api/debug/test-realtime-notifications?action=status'
          }
        });

      default:
        return NextResponse.json({
          error: 'Ação inválida',
          availableActions: ['create', 'count', 'status'],
          usage: {
            create: '/api/debug/test-realtime-notifications?action=create&userId=ID&tenantId=ID',
            count: '/api/debug/test-realtime-notifications?action=count&userId=ID',
            status: '/api/debug/test-realtime-notifications?action=status'
          }
        }, { status: 400 });
    }

  } catch (error) {
    devLog.error('[DEBUG Realtime Notifications] Erro:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
