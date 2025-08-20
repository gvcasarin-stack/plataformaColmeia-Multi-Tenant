import { NextRequest, NextResponse } from 'next/server';
import { notifyAdminAboutDocument } from '@/lib/services/emailService';

/**
 * 🔍 TESTE DIRETO da função notifyAdminAboutDocument
 */
export async function GET(req: NextRequest) {
  // 🚨 DESABILITADO: Não enviar e-mails automáticos durante build
  const isManualTest = req.nextUrl.searchParams.get('force') === 'true';
  
  if (!isManualTest) {
    return NextResponse.json({
      success: false,
      message: 'API desabilitada. Use ?force=true para teste manual.',
      note: 'Esta API estava enviando e-mails automáticos durante builds'
    });
  }

  try {
    // IDs reais dos testes
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';
    const adminEmail = 'gabriel@colmeiasolar.com';
    
    console.log('[DOCUMENT DIRECT TEST] 🔍 Testando notifyAdminAboutDocument diretamente...');
    
    const result = await notifyAdminAboutDocument(
      'documento-teste-direto.pdf',
      'Cliente Teste Direto',
      'Projeto Solar Teste',
      'FV-2024-TEST-DIRECT',
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/projetos/${projectId}?tab=documents`,
      projectId
    );
    
    console.log('[DOCUMENT DIRECT TEST] 🔍 Resultado:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Teste direto de documento executado',
      data: {
        projectId,
        result,
        timestamp: new Date().toISOString(),
        expectedEmail: adminEmail
      }
    });
    
  } catch (error: any) {
    console.error('[DOCUMENT DIRECT TEST] ❌ Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}