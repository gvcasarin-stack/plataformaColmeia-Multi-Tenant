import { NextRequest, NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

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

    const supabase = createSupabaseServiceRoleClient();
    
    const { data, error } = await supabase
      .from('active_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('login_time', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      devLog.error('[API] Erro ao buscar sessão:', error);
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sessionInfo: data });
  } catch (error) {
    devLog.error('[API] Erro ao buscar informações da sessão:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 