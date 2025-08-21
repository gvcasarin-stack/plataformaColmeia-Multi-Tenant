import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceRoleClient();
    
    // IDs dos nossos testes
    const adminUserId = '3a94ea97-85ce-49f1-b390-023a22c7975d';
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';
    
    const now = new Date();
    
    console.log('[COOLDOWN TEST FIXED] 🔍 Testando novo fluxo corrigido:', {
      adminUserId,
      projectId,
      currentTime: now.toISOString()
    });
    
    // ✅ STEP 1: Verificar cooldown (sem atualizar)
    console.log('[COOLDOWN TEST FIXED] 🔍 STEP 1: Verificando cooldown...');
    const { data: checkData, error: checkError } = await supabase.rpc('verify_email_cooldown_status', {
      user_uuid: adminUserId,
      project_uuid: projectId,
      check_time: now.toISOString(),
      cooldown_mins: 5
    });
    
    console.log('[COOLDOWN TEST FIXED] 🔍 STEP 1 RESULTADO:', { 
      checkData, 
      checkError, 
      canSend: checkData?.allowed,
      minutesRemaining: checkData?.remaining_mins 
    });

    let simulatedEmailSent = false;
    let updateResult = null;

    if (!checkError && checkData && checkData.allowed) {
      // ✅ STEP 2: Simular envio de email (seria enviado aqui)
      console.log('[COOLDOWN TEST FIXED] ✅ STEP 2: Simulando envio de email...');
      simulatedEmailSent = true; // Simular sucesso
      
      if (simulatedEmailSent) {
        // ✅ STEP 3: Atualizar cooldown APENAS após "envio" bem-sucedido
        console.log('[COOLDOWN TEST FIXED] ✅ STEP 3: Atualizando cooldown após envio...');
        const { data: updateData, error: updateError } = await supabase.rpc('update_email_sent_timestamp', {
          user_uuid: adminUserId,
          project_uuid: projectId,
          sent_time: now.toISOString()
        });
        
        updateResult = { updateData, updateError };
        console.log('[COOLDOWN TEST FIXED] ✅ STEP 3 RESULTADO:', updateResult);
      }
    }

    // ✅ STEP 4: Verificar estado final
    console.log('[COOLDOWN TEST FIXED] 🔍 STEP 4: Verificando estado final...');
    const { data: finalCheckData, error: finalCheckError } = await supabase.rpc('verify_email_cooldown_status', {
      user_uuid: adminUserId,
      project_uuid: projectId,
      check_time: now.toISOString(),
      cooldown_mins: 5
    });
    
    return NextResponse.json({
      success: true,
      message: "✅ Teste do fluxo corrigido concluído",
      data: {
        testParams: {
          adminUserId,
          projectId,
          currentTime: now.toISOString(),
          cooldownMinutes: 5
        },
        step1_check: {
          data: checkData,
          error: checkError,
          canSend: checkData?.allowed,
          minutesRemaining: checkData?.remaining_mins
        },
        step2_email: {
          simulated: true,
          success: simulatedEmailSent
        },
        step3_update: updateResult,
        step4_finalCheck: {
          data: finalCheckData,
          error: finalCheckError,
          nowInCooldown: finalCheckData ? !finalCheckData.allowed : null,
          minutesRemaining: finalCheckData?.remaining_mins
        },
        analysis: {
          flowWorkedCorrectly: !checkError && checkData?.allowed && simulatedEmailSent && !finalCheckError,
          problemFixed: simulatedEmailSent ? "Timestamp atualizado APENAS após envio confirmado" : "Não enviou, não atualizou",
          oldProblem: "❌ RPC antiga atualizava timestamp ANTES do envio",
          newSolution: "✅ Separamos: verificar → enviar → atualizar"
        }
      }
    });
    
  } catch (error: any) {
    console.error('[COOLDOWN TEST FIXED] ❌ Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    });
  }
}
