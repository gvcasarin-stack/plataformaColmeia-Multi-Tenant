import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { devLog } from "@/lib/utils/productionLogger";
import { deleteNotification } from '@/lib/services/notificationService/queries';
import { getTenantFromUser } from '@/lib/utils/tenant-security';

/**
 * API para deletar notificação
 * DELETE /api/notifications/delete
 * Body: { notificationId: string, userId?: string }
 *
 * COMPATÍVEL COM MULTI-TENANT - Funciona tanto para admin quanto cliente
 */
export async function DELETE(request: NextRequest) {
  try {
    devLog.log('[API notifications/delete] Iniciando...');

    // Obter dados do body
    const { notificationId, userId } = await request.json();

    // ✅ MULTI-TENANT: Obter tenant_id dos headers se disponível
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    devLog.log('[API notifications/delete] Headers multi-tenant:', {
      tenantId,
      hostname: headersList.get('host')
    });

    // 🛠️ FALLBACK: Para tenants temporários EM DESENVOLVIMENTO APENAS
    if (process.env.NODE_ENV === 'development' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.log('[API notifications/delete] Tenant temporário detectado (dev), simulando sucesso:', tenantId);
      return NextResponse.json({
        success: true,
        message: 'Notification deleted (dev mode)'
      });
    }

    // 🚨 PRODUÇÃO: Se é tenant temporário em produção, isso é um problema crítico
    if (process.env.NODE_ENV === 'production' && tenantId && (tenantId.startsWith('temp-') || tenantId.startsWith('fallback-'))) {
      devLog.error('[API notifications/delete] ERRO CRÍTICO: Tenant temporário em produção!', { tenantId });
      return NextResponse.json({
        error: 'Sistema em modo temporário - contacte o administrador'
      }, { status: 503 });
    }

    // ✅ FALLBACK: Se não tem userId, tentar obter da sessão
    let finalUserId = userId;
    if (!finalUserId) {
      devLog.log('[API notifications/delete] userId não fornecido, tentando obter da sessão...');

      const supabase = createSupabaseServerClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        devLog.error('[API notifications/delete] Erro de autenticação:', authError?.message);
        return NextResponse.json({
          success: false,
          error: 'Usuário não autenticado'
        }, { status: 401 });
      }

      finalUserId = user.id;
      devLog.log('[API notifications/delete] userId obtido da sessão com sucesso');
    }

    // ✅ SEGURANÇA MULTI-TENANT: Verificar se usuário pode acessar
    const tenantInfo = await getTenantFromUser(finalUserId);
    if (!tenantInfo) {
      return NextResponse.json({
        success: false,
        error: 'Usuário não encontrado ou sem organização'
      }, { status: 403 });
    }
    
    if (!notificationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Notification ID required' 
      }, { status: 400 });
    }
    
    devLog.log('[API notifications/delete] Deletando notificação:', {
      notificationId,
      userId: '[REDACTED]'
    });
    
    // Deletar notificação
    await deleteNotification(notificationId);
    
    devLog.log('🔍 [API notifications/delete] Sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });
    
  } catch (error) {
    devLog.error('🔍 [API notifications/delete] Erro:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 