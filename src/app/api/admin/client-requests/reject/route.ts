import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export async function POST(request: NextRequest) {
  try {
    devLog.log('[API] [Admin] [ClientRequests] [Reject] Iniciando rejeição');

    // Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.error('[API] [Admin] [ClientRequests] [Reject] Service Role Key não disponível');
      return NextResponse.json({
        success: false,
        error: 'Service Role Key não configurada'
      }, { status: 500 });
    }

    const { requestId } = await request.json();
    
    if (!requestId) {
      return NextResponse.json({
        success: false,
        error: 'requestId é obrigatório'
      }, { status: 400 });
    }

    devLog.log('[API] [Admin] [ClientRequests] [Reject] Rejeitando solicitação:', requestId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    // 1. Rejeitar: definir status='inactive'
    // ('rejected' não é um valor aceito pela constraint users_status_valid — só
    // active/inactive/blocked/pending. 'blocked' não foi usado aqui de propósito:
    // esse valor colidiria conceitualmente com o recurso de "Bloquear usuário",
    // que usa a coluna separada is_blocked. rejection_reason também não existe
    // como coluna na tabela users — não é persistido.)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('role', 'client');
    
    if (updateError) {
      devLog.error('[API] [Admin] [ClientRequests] [Reject] Erro ao atualizar usuário:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao rejeitar solicitação de cliente'
      }, { status: 500 });
    }
    
    // 2. Opcionalmente, desabilitar o usuário no Supabase Auth
    const { error: disableError } = await supabase.auth.admin.updateUserById(
      requestId,
      { ban_duration: 'permanent' }
    );
    
    if (disableError) {
      devLog.error('[API] [Admin] [ClientRequests] [Reject] Erro ao desabilitar usuário:', disableError);
      // Não-bloqueante, apenas log
    }
    
    devLog.log('[API] [Admin] [ClientRequests] [Reject] Solicitação rejeitada com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Solicitação rejeitada com sucesso'
    });
    
  } catch (error: any) {
    devLog.error('[API] [Admin] [ClientRequests] [Reject] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
} 