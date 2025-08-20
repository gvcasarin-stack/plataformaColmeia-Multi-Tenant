import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

/**
 * 🔍 TESTE DE TIMEOUT - Simular operação lenta para verificar limites
 */
export async function GET(req: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('[TIMEOUT TEST] 🔍 Iniciando teste de timeout...');
    
    const supabase = createSupabaseServiceRoleClient();
    const projectId = '96e5a3ba-c812-474c-9e66-65fd8aabd8eb';
    
    // TESTE 1: Buscar projeto (operação simples)
    console.log('[TIMEOUT TEST] 🔍 TESTE 1: Buscando projeto...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    const step1Time = Date.now() - startTime;
    console.log(`[TIMEOUT TEST] 🔍 TESTE 1 CONCLUÍDO em ${step1Time}ms`);
    
    if (projectError) {
      throw new Error(`Erro na busca: ${projectError.message}`);
    }
    
    // TESTE 2: Verificar tamanho dos dados
    const projectSize = JSON.stringify(project).length;
    console.log('[TIMEOUT TEST] 🔍 TESTE 2: Analisando tamanho dos dados:', {
      projectSize,
      commentsCount: project?.comments?.length || 0,
      timelineCount: project?.timeline_events?.length || 0,
      filesCount: project?.files?.length || 0
    });
    
    // TESTE 3: Simular atualização com dados grandes
    console.log('[TIMEOUT TEST] 🔍 TESTE 3: Testando atualização...');
    const currentComments = project?.comments || [];
    const newComment = {
      id: crypto.randomUUID(),
      text: `TESTE TIMEOUT: ${new Date().toISOString()}`,
      userId: '51eb1649-b2e0-4fd9-aa75-a44d4ba9388b',
      userName: 'Teste Timeout',
      timestamp: new Date().toISOString()
    };
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        comments: [...currentComments, newComment],
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);
      
    const step3Time = Date.now() - startTime;
    console.log(`[TIMEOUT TEST] 🔍 TESTE 3 CONCLUÍDO em ${step3Time}ms`);
    
    if (updateError) {
      throw new Error(`Erro na atualização: ${updateError.message}`);
    }
    
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'Teste de timeout concluído',
      data: {
        totalTime,
        step1Time,
        step3Time,
        projectSize,
        dataAnalysis: {
          commentsCount: project?.comments?.length || 0,
          timelineCount: project?.timeline_events?.length || 0,
          filesCount: project?.files?.length || 0,
          hasLargeData: projectSize > 50000 // > 50KB
        },
        timestamps: {
          start: new Date(startTime).toISOString(),
          end: new Date().toISOString()
        }
      }
    });
    
  } catch (error: any) {
    const totalTime = Date.now() - Date.now();
    console.error('[TIMEOUT TEST] ❌ Erro:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      totalTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}