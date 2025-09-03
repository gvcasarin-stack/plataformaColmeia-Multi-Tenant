import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * API DE TESTE ISOLADO - NOTIFICAÇÃO DIRETO
 * Testa APENAS criação de notificação no banco
 */
export async function POST(request: NextRequest) {
  console.log('🔔 [TEST-NOTIFICATION-ISOLATED] =================================');
  console.log('🔔 [TEST-NOTIFICATION-ISOLATED] INÍCIO DO TESTE ISOLADO DE NOTIFICAÇÃO');
  console.log('🔔 [TEST-NOTIFICATION-ISOLATED] Timestamp:', new Date().toISOString());
  
  try {
    const body = await request.json();
    const { userId, title, message, projectId } = body;
    
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] Parâmetros recebidos:', {
      userId,
      title,
      message,
      projectId
    });
    
    // Validação básica
    if (!userId || !title || !message) {
      console.error('❌ [TEST-NOTIFICATION-ISOLATED] Parâmetros faltando');
      return NextResponse.json({ 
        error: 'Parâmetros obrigatórios: userId, title, message' 
      }, { status: 400 });
    }
    
    // TESTE 1: Verificar conexão com Supabase
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] TESTE 1: Conectando ao Supabase...');
    const supabase = createSupabaseServiceRoleClient();
    
    // TESTE 2: Verificar se usuário existe
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] TESTE 2: Verificando usuário...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, role, tenant_id')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      console.error('❌ [TEST-NOTIFICATION-ISOLATED] Usuário não encontrado:', userError);
      return NextResponse.json({ 
        error: 'Usuário não encontrado',
        userId,
        details: userError
      }, { status: 404 });
    }
    
    console.log('✅ [TEST-NOTIFICATION-ISOLATED] Usuário encontrado:', {
      email: userData.email,
      role: userData.role,
      tenant_id: userData.tenant_id
    });
    
    // TESTE 3: Criar notificação diretamente
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] TESTE 3: Criando notificação...');
    const notificationData = {
      type: 'test',
      title,
      message,
      user_id: userId,
      project_id: projectId || null,
      read: false,
      data: {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'test-notification-isolated'
      }
    };
    
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] Dados da notificação:', notificationData);
    
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();
    
    if (notifError) {
      console.error('❌ [TEST-NOTIFICATION-ISOLATED] Erro ao criar notificação:', notifError);
      return NextResponse.json({ 
        error: 'Erro ao criar notificação',
        details: notifError
      }, { status: 500 });
    }
    
    console.log('✅ [TEST-NOTIFICATION-ISOLATED] NOTIFICAÇÃO CRIADA!', {
      id: notifData.id,
      created_at: notifData.created_at
    });
    
    // TESTE 4: Verificar se foi criada
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] TESTE 4: Verificando criação...');
    const { data: checkData, error: checkError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notifData.id)
      .single();
    
    if (checkError || !checkData) {
      console.error('❌ [TEST-NOTIFICATION-ISOLATED] Notificação não encontrada após criação');
      return NextResponse.json({ 
        error: 'Notificação criada mas não encontrada',
        notificationId: notifData.id
      }, { status: 500 });
    }
    
    console.log('✅ [TEST-NOTIFICATION-ISOLATED] Notificação verificada com sucesso!');
    
    return NextResponse.json({ 
      success: true,
      message: 'Notificação criada com sucesso!',
      notification: {
        id: notifData.id,
        type: notifData.type,
        title: notifData.title,
        message: notifData.message,
        user_id: notifData.user_id,
        created_at: notifData.created_at
      },
      user: {
        email: userData.email,
        role: userData.role,
        tenant_id: userData.tenant_id
      }
    });
    
  } catch (error: any) {
    console.error('❌ [TEST-NOTIFICATION-ISOLATED] ERRO GERAL:', error);
    return NextResponse.json({ 
      error: 'Erro no teste de notificação',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] FIM DO TESTE');
    console.log('🔔 [TEST-NOTIFICATION-ISOLATED] =================================');
  }
}