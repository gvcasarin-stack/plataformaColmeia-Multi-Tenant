import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    let userId: string | undefined;
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    try {
      const body = await request.json();
      userId = body?.userId;
      ipAddress = body?.ipAddress;
      userAgent = body?.userAgent;
    } catch {}

    if (!userId) {
      // No-op completo quando não houver body/JSON válido
      return NextResponse.json({ success: true, sessionId: null, note: 'noop: no userId provided' });
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
      // Qualquer falha vira no-op para não quebrar UX em tenants novos
      const code = (error as any).code;
      devLog.warn('[API] Falha ao criar sessão (no-op):', { code, error });
      return NextResponse.json({ success: true, sessionId: null, note: 'session create noop' });
    }

    return NextResponse.json({ success: true, sessionId: data.id });
  } catch (error) {
    // Também no-op em exceção
    devLog.warn('[API] Exceção ao criar sessão (no-op):', error);
    return NextResponse.json({ success: true, sessionId: null, note: 'session create noop (exception)' });
  }
} 