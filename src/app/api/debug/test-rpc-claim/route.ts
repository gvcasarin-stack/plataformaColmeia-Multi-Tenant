import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    
    // IDs dos nossos testes
    const adminUserId = '3a94ea97-85ce-49f1-b390-023a22c7975d';
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';
    
    const now = new Date();
    
    console.log('[RPC TEST] 🔍 Testando RPC try_claim_email_slot:', {
      adminUserId,
      projectId,
      currentTime: now.toISOString()
    });
    
    // Testar o RPC exatamente como no código real
    const { data, error } = await supabase.rpc('try_claim_email_slot', {
      p_user_id: adminUserId,
      p_project_id: projectId,
      p_current_time: now.toISOString(),
      p_cooldown_minutes: 5
    });
    
    console.log('[RPC TEST] 🔍 Resultado RPC:', { data, error, hasError: !!error, canSend: data?.can_send });
    
    return NextResponse.json({
      success: true,
      data: {
        rpcResult: { data, error },
        testParams: {
          adminUserId,
          projectId,
          currentTime: now.toISOString(),
          cooldownMinutes: 5
        },
        analysis: {
          hasError: !!error,
          canSend: data?.can_send,
          wouldSendEmail: !error && data && data.can_send,
          reason: data?.can_send ? 'Pode enviar email' : 'Em cooldown - não enviaria email',
          // 🔍 DEBUG adicional para identificar o problema
          rawCanSend: data?.can_send,
          dataExists: !!data,
          lastSentAt: data?.last_sent_at
        }
      }
    });
    
  } catch (error: any) {
    console.error('[RPC TEST] ❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    });
  }
}