import { NextResponse } from 'next/server';
import { devLog } from "@/lib/utils/productionLogger";
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export async function POST() {
  devLog.log('[Drop Column] Tentando remover coluna detalhePagamento');

  try {
    const supabase = createSupabaseServiceRoleClient();

    // Tentar fazer uma consulta que force a remoção implícita da coluna
    devLog.log('[Drop Column] Testando se a coluna ainda existe...');
    
    // Primeiro, buscar alguns projetos
    const { data: projects, error: selectError } = await supabase
      .from('projects')
      .select('id, pagamento, price')
      .limit(3);

    if (selectError) {
      devLog.error('[Drop Column] Erro ao buscar projetos:', selectError);
      return NextResponse.json({
        success: false,
        error: 'Erro ao buscar projetos',
        details: selectError.message
      });
    }

    devLog.log('[Drop Column] Projetos encontrados:', projects?.length);

    if (projects && projects.length > 0) {
      // Tentar atualizar um projeto sem mencionar detalhePagamento
      const testProject = projects[0];
      devLog.log('[Drop Column] Testando atualização do projeto:', testProject.id);

      const { data: updateResult, error: updateError } = await supabase
        .from('projects')
        .update({
          pagamento: testProject.pagamento || 'pendente',
          updated_at: new Date().toISOString()
        })
        .eq('id', testProject.id)
        .select('id, pagamento, updated_at');

      if (updateError) {
        devLog.error('[Drop Column] Erro na atualização:', updateError);
        
        if (updateError.message.includes('detalhePagamento') || 
            updateError.message.includes('detalhepagamento')) {
          return NextResponse.json({
            success: false,
            error: 'A coluna detalhePagamento ainda existe e está bloqueando operações',
            details: updateError.message,
            recommendation: 'Execute manualmente no Supabase Dashboard: ALTER TABLE public.projects DROP COLUMN IF EXISTS "detalhePagamento";'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Erro durante teste de atualização',
            details: updateError.message
          });
        }
      }

      devLog.log('[Drop Column] ✅ Atualização bem-sucedida:', updateResult);

      // Verificar se conseguimos fazer operações normais
      const { data: finalCheck, error: finalError } = await supabase
        .from('projects')
        .select('id, name, pagamento, price, updated_at')
        .eq('id', testProject.id)
        .single();

      if (finalError) {
        devLog.error('[Drop Column] Erro na verificação final:', finalError);
        return NextResponse.json({
          success: false,
          error: 'Erro na verificação final',
          details: finalError.message
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Sistema funcionando sem detalhePagamento (coluna possivelmente já removida)',
        testResults: {
          projectsFound: projects.length,
          updateSuccessful: true,
          availableColumns: Object.keys(finalCheck),
          recommendation: 'Se ainda houver problemas, execute manualmente: ALTER TABLE public.projects DROP COLUMN IF EXISTS "detalhePagamento";'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Nenhum projeto encontrado para teste'
      });
    }

  } catch (error) {
    devLog.error('[Drop Column] Exceção:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro interno',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
