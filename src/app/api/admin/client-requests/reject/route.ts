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

    const { requestId, reason } = await request.json();
    
    if (!requestId) {
      return NextResponse.json({
        success: false,
        error: 'requestId é obrigatório'
      }, { status: 400 });
    }

    devLog.log('[API] [Admin] [ClientRequests] [Reject] Rejeitando solicitação:', requestId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    // 1. Atualizar pending_approval para false e adicionar motivo da rejeição
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        pending_approval: false,
        rejection_reason: reason || 'Solicitação rejeitada',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
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