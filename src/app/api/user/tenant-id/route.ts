import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API para buscar o tenant_id de um usuário
 * Usado pelo frontend para obter o tenant_id necessário para headers x-tenant-id
 */
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
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .single();
    
    if (error || !userData?.tenant_id) {
      console.error('[API /user/tenant-id] Erro ao buscar tenant:', error);
      return NextResponse.json(
        { error: 'Usuário não encontrado ou sem tenant' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      tenantId: userData.tenant_id 
    });
    
  } catch (error) {
    console.error('[API /user/tenant-id] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
