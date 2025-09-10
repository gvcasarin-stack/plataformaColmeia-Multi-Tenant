import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { devLog } from "@/lib/utils/productionLogger";
import { getUnreadSupabaseNotificationCount } from '@/lib/services/notificationService/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // ✅ CORREÇÃO MULTI-TENANT: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');
    
    devLog.log('[API Notifications Count] Headers multi-tenant:', {
      userId,
      tenantId,
      hostname: headersList.get('host')
    });

    const count = await getUnreadSupabaseNotificationCount(userId, tenantId || undefined);

    return NextResponse.json({ count });
  } catch (error) {
    devLog.error('[API] Erro ao contar notificações (fallback 0):', error);
    return NextResponse.json({ count: 0 });
  }
} 