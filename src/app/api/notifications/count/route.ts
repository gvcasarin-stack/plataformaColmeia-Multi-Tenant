import { NextRequest, NextResponse } from 'next/server';
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

    const count = await getUnreadSupabaseNotificationCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    devLog.error('[API] Erro ao contar notificações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
