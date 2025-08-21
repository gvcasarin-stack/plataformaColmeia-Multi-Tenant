import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
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
      devLog.error('[API] Erro ao atualizar sessão:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar sessão' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    devLog.error('[API] Erro ao atualizar sessão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
