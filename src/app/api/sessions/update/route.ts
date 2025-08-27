import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    let userId: string | undefined;
    try {
      const body = await request.json();
      userId = body?.userId;
    } catch {}

    if (!userId) {
      // No-op completo quando não houver body/JSON válido
      return NextResponse.json({ success: true, note: 'noop: no userId provided' });
    }

    const supabase = createSupabaseServiceRoleClient();
    const now = new Date();

    const { error } = await supabase
      .from('active_sessions')
      .update({
        last_activity: now.toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      const code = (error as any).code;
      devLog.warn('[API] Falha ao atualizar sessão (no-op):', { code, error });
      return NextResponse.json({ success: true, note: 'session update noop' });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    devLog.warn('[API] Exceção ao atualizar sessão (no-op):', error);
    return NextResponse.json({ success: true, note: 'session update noop (exception)' });
  }
} 