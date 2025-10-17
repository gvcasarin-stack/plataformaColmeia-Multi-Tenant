import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import { devLog } from '@/lib/utils/productionLogger';

// Interface para faixas de potência
interface FaixaPotenciaPreco {
  potenciaMin: number;
  potenciaMax: number;
  valorBase: number;
}

// Faixas padrão como fallback
const criarFaixasPotenciaPadrao = (): FaixaPotenciaPreco[] => {
  return [
    { potenciaMin: 0, potenciaMax: 5, valorBase: 600 },
    { potenciaMin: 5, potenciaMax: 10, valorBase: 700 },
    { potenciaMin: 10, potenciaMax: 20, valorBase: 800 },
    { potenciaMin: 20, potenciaMax: 30, valorBase: 1000 },
    { potenciaMin: 30, potenciaMax: 40, valorBase: 1200 },
    { potenciaMin: 40, potenciaMax: 50, valorBase: 1750 },
    { potenciaMin: 50, potenciaMax: 75, valorBase: 2500 },
    { potenciaMin: 75, potenciaMax: 150, valorBase: 3000 },
    { potenciaMin: 150, potenciaMax: 300, valorBase: 4000 },
    { potenciaMin: 300, potenciaMax: 999999, valorBase: 4000 },
  ];
};

/**
 * Calcula o valor do projeto com base na potência usando as configurações do tenant
 * @param potencia - Potência do projeto em kWp
 * @param faixasPotencia - Faixas de potência configuradas pelo admin
 * @returns Valor calculado do projeto
 */
const calcularValorPorPotencia = (potencia: number, faixasPotencia: FaixaPotenciaPreco[]): number => {
  // ✅ CORREÇÃO CRÍTICA: Lógica de faixas inclusivas
  // Para faixas como 0-5, 5-10, etc., a lógica deve ser:
  // - Faixa 0-5: potencia >= 0 && potencia <= 5
  // - Faixa 5-10: potencia > 5 && potencia <= 10
  
  devLog.log('[calcularValorPorPotencia] 🔍 INICIANDO CÁLCULO:', {
    potencia,
    quantidadeFaixas: faixasPotencia.length,
    faixasRecebidas: faixasPotencia
  });
  
  // Ordenar faixas por potenciaMin para garantir ordem correta
  const faixasOrdenadas = [...faixasPotencia].sort((a, b) => a.potenciaMin - b.potenciaMin);
  
  devLog.log('[calcularValorPorPotencia] 📊 FAIXAS ORDENADAS:', faixasOrdenadas);
  
  for (let i = 0; i < faixasOrdenadas.length; i++) {
    const faixa = faixasOrdenadas[i];
    let condicaoAtendida = false;
    let tipoComparacao = '';
    
    // Para a primeira faixa (potenciaMin = 0), incluir o limite inferior
    if (faixa.potenciaMin === 0) {
      condicaoAtendida = potencia >= faixa.potenciaMin && potencia <= faixa.potenciaMax;
      tipoComparacao = `${potencia} >= ${faixa.potenciaMin} && ${potencia} <= ${faixa.potenciaMax}`;
    } else {
      // Para outras faixas, excluir o limite inferior (que já foi incluído na faixa anterior)
      condicaoAtendida = potencia > faixa.potenciaMin && potencia <= faixa.potenciaMax;
      tipoComparacao = `${potencia} > ${faixa.potenciaMin} && ${potencia} <= ${faixa.potenciaMax}`;
    }
    
    devLog.log(`[calcularValorPorPotencia] 🧮 TESTANDO FAIXA ${i + 1}:`, {
      faixa,
      tipoComparacao,
      condicaoAtendida,
      valorRetornado: condicaoAtendida ? faixa.valorBase : 'não aplicável'
    });
    
    if (condicaoAtendida) {
      devLog.log('[calcularValorPorPotencia] ✅ FAIXA ENCONTRADA! Retornando valor:', faixa.valorBase);
      return faixa.valorBase;
    }
  }
  
  // Caso não encontre, usar o maior valor como fallback
  const maiorFaixa = faixasOrdenadas.reduce(
    (prev, current) => prev.valorBase > current.valorBase ? prev : current,
    faixasOrdenadas[0]
  );
  
  devLog.log('[calcularValorPorPotencia] ❌ NENHUMA FAIXA ENCONTRADA! Usando fallback:', maiorFaixa?.valorBase || 4000);
  
  return maiorFaixa?.valorBase || 4000; // Valor de fallback final
};

/**
 * POST /api/projects/calculate-cost
 * 
 * Calcula o valor do projeto baseado na potência usando as configurações específicas do tenant
 * 
 * Body: { potencia: number }
 * Response: { valorCalculado: number, faixasUsadas: FaixaPotenciaPreco[], source: string }
 */
export async function POST(request: NextRequest) {
  try {
    devLog.log('[API Calculate Cost] Iniciando cálculo de valor do projeto');

    // ✅ SEGURANÇA MULTI-TENANT: Obter tenant_id dos headers
    const headersList = headers();
    const tenantId = headersList.get('x-tenant-id');

    if (!tenantId) {
      devLog.error('[API Calculate Cost] Tenant ID não encontrado nos headers');
      return NextResponse.json(
        { error: 'Acesso negado: tenant não identificado' },
        { status: 403 }
      );
    }

    // Obter dados do request
    const body = await request.json();
    const { potencia } = body;

    // ✅ CORREÇÃO: Aceitar potência = 0, rejeitar apenas valores negativos, undefined ou null
    if (potencia === undefined || potencia === null || typeof potencia !== 'number' || potencia < 0) {
      devLog.error('[API Calculate Cost] Potência inválida:', potencia);
      return NextResponse.json(
        { error: 'Potência deve ser um número maior ou igual a zero' },
        { status: 400 }
      );
    }

    devLog.log('[API Calculate Cost] Calculando valor para:', { potencia, tenantId });

    const supabase = createSupabaseServiceRoleClient();

    // ✅ DEBUG: Verificar todas as configurações do tenant
    const { data: allConfigs, error: allConfigsError } = await supabase
      .from('configs')
      .select('*')
      .eq('tenant_id', tenantId);

    devLog.log('[API Calculate Cost] [DEBUG] Todas as configs do tenant:', {
      tenantId,
      configsCount: allConfigs?.length || 0,
      configs: allConfigs,
      error: allConfigsError?.message
    });

    // ✅ MULTI-TENANT: Buscar configurações de faixas de potência do tenant específico
    const { data: configData, error: configError } = await supabase
      .from('configs')
      .select('value')
      .eq('key', 'faixas_potencia')
      .eq('tenant_id', tenantId)
      .single();

    devLog.log('[API Calculate Cost] [DEBUG] Config faixas_potencia específica:', {
      tenantId,
      configData,
      error: configError?.message
    });

    let faixasPotencia: FaixaPotenciaPreco[];
    let source: string;

    if (configError || !configData?.value) {
      // Se não encontrou configuração do tenant, verificar se o tenant tem outras configs
      devLog.warn('[API Calculate Cost] Configuração faixas_potencia não encontrada para tenant:', {
        tenantId,
        error: configError?.message,
        hasOtherConfigs: allConfigs && allConfigs.length > 0
      });
      
      // Se o tenant tem outras configurações mas não tem faixas_potencia, 
      // usar configuração baseada nos dados fornecidos pelo usuário
      if (allConfigs && allConfigs.length > 0) {
        // Usar faixas baseadas nos dados reais fornecidos pelo usuário
        faixasPotencia = [
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
        source = 'tenant_based_config';
        
        devLog.log('[API Calculate Cost] Usando configuração baseada no tenant existente:', {
          tenantId,
          faixasCount: faixasPotencia.length
        });
      } else {
        // Tenant sem configurações, usar padrão
        faixasPotencia = criarFaixasPotenciaPadrao();
        source = 'default';
      }
    } else {
      // Usar configuração específica do tenant
      try {
        faixasPotencia = Array.isArray(configData.value) ? configData.value : JSON.parse(configData.value);
        source = 'tenant_config';
        devLog.log('[API Calculate Cost] Usando configuração do tenant:', {
          tenantId,
          faixasCount: faixasPotencia.length
        });
      } catch (parseError) {
        devLog.error('[API Calculate Cost] Erro ao parsear configuração do tenant:', parseError);
        faixasPotencia = criarFaixasPotenciaPadrao();
        source = 'default_fallback';
      }
    }

    // Calcular o valor usando as faixas apropriadas
    const valorCalculado = calcularValorPorPotencia(potencia, faixasPotencia);

    devLog.log('[API Calculate Cost] 🔍 DETALHES COMPLETOS DO CÁLCULO:', {
      potencia,
      valorCalculado,
      source,
      tenantId,
      faixasPotencia,
      quantidadeFaixas: faixasPotencia.length,
      primeiraFaixa: faixasPotencia[0],
      ultimaFaixa: faixasPotencia[faixasPotencia.length - 1]
    });

    return NextResponse.json({
      valorCalculado,
      faixasUsadas: faixasPotencia,
      source,
      potencia,
      tenantId
    });

  } catch (error) {
    devLog.error('[API Calculate Cost] Erro interno:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao calcular valor do projeto' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/calculate-cost?potencia=X
 * 
 * Versão GET para facilitar testes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const potenciaStr = searchParams.get('potencia');

    if (!potenciaStr) {
      return NextResponse.json(
        { error: 'Parâmetro potencia é obrigatório' },
        { status: 400 }
      );
    }

    const potencia = parseFloat(potenciaStr);

    // ✅ CORREÇÃO: Aceitar potência = 0, rejeitar apenas valores negativos ou NaN
    if (isNaN(potencia) || potencia < 0) {
      return NextResponse.json(
        { error: 'Potência deve ser um número maior ou igual a zero' },
        { status: 400 }
      );
    }

    // Redirecionar para o método POST
    const postRequest = new NextRequest(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({ potencia })
    });

    return await POST(postRequest);

  } catch (error) {
    devLog.error('[API Calculate Cost GET] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
