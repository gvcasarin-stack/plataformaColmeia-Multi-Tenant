import { NextRequest, NextResponse } from 'next/server';
import { addCommentAction } from '@/lib/actions/project-actions';

/**
 * 🔍 TESTE DIRETO das Server Actions que são realmente chamadas pela interface
 */
export async function GET(req: NextRequest) {
  // 🚨 DESABILITADO: Não executar Server Actions automáticas durante build  
  const isManualTest = req.nextUrl.searchParams.get('force') === 'true';
  
  if (!isManualTest) {
    return NextResponse.json({
      success: false,
      message: '🚨 API desabilitada. Use ?force=true para teste manual.',
      note: 'Esta API estava executando Server Actions durante builds automáticos',
      error: 'DESABILITADA_POR_SEGURANÇA - estava criando comentários reais durante build!'
    });
  }

  try {
    // IDs reais do sistema
    const clientUserId = '51eb1649-b2e0-4fd9-aa75-a44d4ba9388b'; // Cliente real
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';    // Projeto real
    
    console.log('[SERVER ACTION TEST] 🔍 Testando addCommentAction diretamente...');
    console.log('[SERVER ACTION TEST] 🔍 DADOS:', {
      clientUserId,
      projectId,
      timestamp: new Date().toISOString()
    });
    
    // Chamar EXATAMENTE a mesma Server Action que a interface chama
    const result = await addCommentAction(
      projectId,
      {
        text: 'TESTE SERVER ACTION: Este comentário testa se a addCommentAction está funcionando e enviando emails para admins.'
      },
      {
        id: clientUserId,
        email: 'cliente.teste@colmeiasolar.com',
        name: 'Cliente Teste Real',
        role: 'client'
      }
    );
    
    console.log('[SERVER ACTION TEST] 🔍 Resultado completo:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Teste de Server Action executado',
      data: {
        clientUserId,
        projectId,
        result,
        timestamp: new Date().toISOString(),
        expectedBehavior: {
          shouldAddComment: true,
          shouldCreateNotification: true,
          shouldSendEmailToAdmins: true,
          shouldUpdateProject: true
        }
      }
    });
    
  } catch (error: any) {
    console.error('[SERVER ACTION TEST] ❌ Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: error.toString()
    }, { status: 500 });
  }
}
