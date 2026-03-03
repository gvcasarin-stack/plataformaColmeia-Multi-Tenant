import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para buscar pacotes de um cliente específico
 * GET /api/cliente/pacotes?userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceRoleClient();

    // Buscar pacotes do cliente com JOIN nas definições
    const { data: pacotes, error } = await supabase
      .from('cliente_pacotes')
      .select(`
        *,
        pacotes_definicoes(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Cliente Pacotes] Erro ao buscar pacotes:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar pacotes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pacotes || []
    });

  } catch (error) {
    console.error('[API Cliente Pacotes] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

