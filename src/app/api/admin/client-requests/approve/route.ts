import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from "@/lib/utils/productionLogger";

export async function POST(request: NextRequest) {
  try {
    devLog.log('[API] [Admin] [ClientRequests] [Approve] Iniciando aprovação');

    // Verificar se estamos em contexto de build
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      devLog.error('[API] [Admin] [ClientRequests] [Approve] Service Role Key não disponível');
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

    devLog.log('[API] [Admin] [ClientRequests] [Approve] Aprovando solicitação:', requestId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    // 1. Atualizar pending_approval para false
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        pending_approval: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);
    
    if (updateError) {
      devLog.error('[API] [Admin] [ClientRequests] [Approve] Erro ao atualizar usuário:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao aprovar solicitação de cliente'
      }, { status: 500 });
    }
    
    // 2. Confirmar email no Supabase Auth
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      requestId,
      { email_confirm: true }
    );
    
    if (confirmError) {
      devLog.error('[API] [Admin] [ClientRequests] [Approve] Erro ao confirmar email:', confirmError);
      // Não-bloqueante, apenas log
    }
    
    devLog.log('[API] [Admin] [ClientRequests] [Approve] Solicitação aprovada com sucesso');
    
    return NextResponse.json({
      success: true,
      message: 'Solicitação aprovada com sucesso'
    });
    
  } catch (error: any) {
    devLog.error('[API] [Admin] [ClientRequests] [Approve] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
} 