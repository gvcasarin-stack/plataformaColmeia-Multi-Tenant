import { NextRequest, NextResponse } from 'next/server';
import { notifyNewComment } from '@/lib/services/notificationService/helpers';

/**
 * 🔍 TESTE DO FLUXO COMPLETO de comentário como cliente faria
 */
export async function GET(req: NextRequest) {
  // 🚨 DESABILITADO: Não executar fluxo completo automático durante build
  const isManualTest = req.nextUrl.searchParams.get('force') === 'true';
  
  if (!isManualTest) {
    return NextResponse.json({
      success: false,
      message: '🚨 API desabilitada. Use ?force=true para teste manual.',
      note: 'Esta API estava enviando emails e notificações reais durante builds automáticos',
      error: 'DESABILITADA_POR_SEGURANÇA'
    });
  }

  try {
    // IDs reais do sistema
    const clientUserId = '51eb1649-b2e0-4fd9-aa75-a44d4ba9388b'; // Cliente real
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';    // Projeto real
    
    console.log('[FULL FLOW TEST] 🔍 Testando fluxo completo de comentário...');
    console.log('[FULL FLOW TEST] 🔍 DADOS:', {
      clientUserId,
      projectId,
      isServer: typeof window === 'undefined'
    });
    
    // Chamar EXATAMENTE a mesma função que seria chamada no fluxo real
    const result = await notifyNewComment({
      projectId,
      projectNumber: 'FV-2024-TEST-FULL',
      projectName: 'Projeto Teste Fluxo Completo',
      commentText: 'TESTE FLUXO COMPLETO: Este comentário simula um cliente real postando no sistema.',
      authorId: clientUserId,
      authorName: 'Cliente Teste Real',
      authorRole: 'client',
      clientId: clientUserId,
      clientName: 'Cliente Teste Real'
    });
    
    console.log('[FULL FLOW TEST] 🔍 Resultado completo:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Teste de fluxo completo executado',
      data: {
        clientUserId,
        projectId,
        result,
        timestamp: new Date().toISOString(),
        expectedBehavior: {
          shouldCreateNotifications: true,
          shouldSendEmailToAdmins: true,
          emailType: 'client_comment'
        }
      }
    });
    
  } catch (error: any) {
    console.error('[FULL FLOW TEST] ❌ Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: error.toString()
    }, { status: 500 });
  }
}