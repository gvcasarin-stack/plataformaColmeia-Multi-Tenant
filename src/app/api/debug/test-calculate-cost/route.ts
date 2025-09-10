import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

/**
 * API de teste para verificar se o cálculo de custo está funcionando
 * Acesse: /api/debug/test-calculate-cost?tenantId=SEU_TENANT_ID&potencia=10
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const potenciaStr = searchParams.get('potencia');

    if (!tenantId) {
      return NextResponse.json({ 
        error: 'Parâmetro tenantId é obrigatório',
        usage: '/api/debug/test-calculate-cost?tenantId=SEU_TENANT_ID&potencia=10'
      }, { status: 400 });
    }

    if (!potenciaStr) {
      return NextResponse.json({ 
        error: 'Parâmetro potencia é obrigatório',
        usage: '/api/debug/test-calculate-cost?tenantId=SEU_TENANT_ID&potencia=10'
      }, { status: 400 });
    }

    const potencia = parseFloat(potenciaStr);

    devLog.log('[DEBUG Test Calculate Cost] Testando cálculo:', { tenantId, potencia });

    const supabase = createSupabaseServiceRoleClient();

    // Buscar todas as configurações do tenant
    const { data: allConfigs, error: allConfigsError } = await supabase
      .from('configs')
      .select('*')
      .eq('tenant_id', tenantId);

    // Buscar configuração específica de faixas de potência
    const { data: configData, error: configError } = await supabase
      .from('configs')
      .select('*')
      .eq('key', 'faixas_potencia')
      .eq('tenant_id', tenantId)
      .single();

    // Simular o cálculo diretamente aqui para evitar problemas de import
    let valorCalculado = 0;
    let faixasUsadas: any[] = [];
    let source = 'debug_calculation';

    if (configData?.value) {
      try {
        faixasUsadas = Array.isArray(configData.value) ? configData.value : JSON.parse(configData.value);
        
        // ✅ CORREÇÃO CRÍTICA: Lógica de faixas inclusivas
        const faixasOrdenadas = [...faixasUsadas].sort((a: any, b: any) => a.potenciaMin - b.potenciaMin);
        
        let faixaCorrespondente = null;
        for (const faixa of faixasOrdenadas) {
          // Para a primeira faixa (potenciaMin = 0), incluir o limite inferior
          if (faixa.potenciaMin === 0) {
            if (potencia >= faixa.potenciaMin && potencia <= faixa.potenciaMax) {
              faixaCorrespondente = faixa;
              break;
            }
          } else {
            // Para outras faixas, excluir o limite inferior
            if (potencia > faixa.potenciaMin && potencia <= faixa.potenciaMax) {
              faixaCorrespondente = faixa;
              break;
            }
          }
        }
        
        if (faixaCorrespondente) {
          valorCalculado = faixaCorrespondente.valorBase;
          source = 'tenant_config';
        } else {
          valorCalculado = 4000; // Fallback
          source = 'fallback';
        }
      } catch (parseError) {
        valorCalculado = 4000;
        source = 'parse_error';
      }
    } else {
      // Usar faixas baseadas nos dados fornecidos pelo usuário
      faixasUsadas = [
        { valorBase: 400, potenciaMax: 5, potenciaMin: 0 },
        { valorBase: 600, potenciaMax: 10, potenciaMin: 5 },
        { valorBase: 700, potenciaMax: 20, potenciaMin: 10 },
        { valorBase: 800, potenciaMax: 30, potenciaMin: 20 },
        { valorBase: 1000, potenciaMax: 40, potenciaMin: 30 },
        { valorBase: 1500, potenciaMax: 50, potenciaMin: 40 },
        { valorBase: 2000, potenciaMax: 75, potenciaMin: 50 },
        { valorBase: 2500, potenciaMax: 150, potenciaMin: 75 },
        { valorBase: 3000, potenciaMax: 300, potenciaMin: 150 },
        { valorBase: 4000, potenciaMax: 999999, potenciaMin: 300 }
      ];
      
      // ✅ CORREÇÃO CRÍTICA: Lógica de faixas inclusivas
      const faixasOrdenadas = [...faixasUsadas].sort((a: any, b: any) => a.potenciaMin - b.potenciaMin);
      
      let faixaCorrespondente = null;
      for (const faixa of faixasOrdenadas) {
        // Para a primeira faixa (potenciaMin = 0), incluir o limite inferior
        if (faixa.potenciaMin === 0) {
          if (potencia >= faixa.potenciaMin && potencia <= faixa.potenciaMax) {
            faixaCorrespondente = faixa;
            break;
          }
        } else {
          // Para outras faixas, excluir o limite inferior
          if (potencia > faixa.potenciaMin && potencia <= faixa.potenciaMax) {
            faixaCorrespondente = faixa;
            break;
          }
        }
      }
      
      if (faixaCorrespondente) {
        valorCalculado = faixaCorrespondente.valorBase;
        source = 'default_ranges';
      } else {
        valorCalculado = 4000;
        source = 'ultimate_fallback';
      }
    }

    const resultData = {
      valorCalculado,
      faixasUsadas,
      source,
      potencia,
      tenantId
    };

    return NextResponse.json({
      debug: {
        tenantId,
        potencia,
        allConfigsCount: allConfigs?.length || 0,
        allConfigs: allConfigs,
        allConfigsError: allConfigsError?.message,
        faixasPotenciaConfig: configData,
        faixasPotenciaError: configError?.message
      },
      calculationResult: resultData
    });

  } catch (error) {
    devLog.error('[DEBUG Test Calculate Cost] Erro:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
