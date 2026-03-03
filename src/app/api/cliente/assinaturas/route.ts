import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para buscar assinaturas de um cliente específico
 * GET /api/cliente/assinaturas?userId=xxx
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

    // Buscar assinaturas do cliente com JOIN nos planos
    const { data: assinaturas, error } = await supabase
      .from('cliente_assinaturas')
      .select(`
        *,
        planos_assinatura(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Cliente Assinaturas] Erro ao buscar assinaturas:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao buscar assinaturas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: assinaturas || []
    });

  } catch (error) {
    console.error('[API Cliente Assinaturas] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

