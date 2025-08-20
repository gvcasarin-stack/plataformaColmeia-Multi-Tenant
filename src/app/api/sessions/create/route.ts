import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const { userId, ipAddress, userAgent } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 horas

    const { data, error } = await supabase
      .from('active_sessions')
      .insert([{
        user_id: userId,
        login_time: now.toISOString(),
        last_activity: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress || 'unknown',
        user_agent: userAgent || 'unknown',
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      devLog.error('[API] Erro ao criar sessão:', error);
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, sessionId: data.id });
  } catch (error) {
    devLog.error('[API] Erro ao criar sessão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 