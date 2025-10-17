import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

interface FaixaPotenciaPreco {
  valorBase: number;
  potenciaMin: number;
  potenciaMax: number;
}

function calcularValorPorPotencia(potencia: number, faixas: FaixaPotenciaPreco[]): number {
  console.log(`[calcularValorPorPotencia] Iniciando cálculo para potência: ${potencia}`);

  for (const faixa of faixas) {
    console.log(`[calcularValorPorPotencia] Verificando faixa:`, faixa);
    console.log(`[calcularValorPorPotencia] Condições: ${potencia} >= ${faixa.potenciaMin} && ${potencia} < ${faixa.potenciaMax}`);

    if (potencia >= faixa.potenciaMin && potencia < faixa.potenciaMax) {
      console.log(`[calcularValorPorPotencia] ✅ FAIXA ENCONTRADA! Retornando: ${faixa.valorBase}`);
      return faixa.valorBase;
    }
  }

  console.log(`[calcularValorPorPotencia] ❌ Nenhuma faixa encontrada, retornando 0`);
  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = headers().get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID não encontrado' }, { status: 400 });
    }

    // Simular potência = 0
    const potenciaTeste = 0;

    const supabase = createSupabaseServiceRoleClient();

    // Buscar configuração
    const { data: configData, error: configError } = await supabase
      .from('configs')
      .select('value')
      .eq('key', 'faixas_potencia')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    console.log('📊 CONFIG DATA:', JSON.stringify(configData, null, 2));
    console.log('❌ CONFIG ERROR:', configError);

    let faixasPotencia: FaixaPotenciaPreco[] = [];
    let source = 'unknown';

    if (configError || !configData?.value) {
      return NextResponse.json({
        erro: 'Configuração não encontrada',
        tenantId,
        configError: configError?.message
      }, { status: 500 });
    }

    // Parsear configuração
    try {
      faixasPotencia = Array.isArray(configData.value)
        ? configData.value
        : JSON.parse(configData.value);
      source = 'tenant_config';
    } catch (parseError: any) {
      return NextResponse.json({
        erro: 'Erro ao parsear configuração',
        parseError: parseError?.message
      }, { status: 500 });
    }

    console.log('📋 FAIXAS CARREGADAS:', JSON.stringify(faixasPotencia, null, 2));

    // Calcular valor
    const valorCalculado = calcularValorPorPotencia(potenciaTeste, faixasPotencia);

    // Verificar manualmente qual faixa deveria ser usada
    const faixaEncontrada = faixasPotencia.find(f =>
      potenciaTeste >= f.potenciaMin && potenciaTeste < f.potenciaMax
    );

    return NextResponse.json({
      success: true,
      tenantId,
      potenciaTeste,
      source,
      faixasCount: faixasPotencia.length,
      faixas: faixasPotencia,
      valorCalculado,
      faixaEncontrada,
      detalhesCalculo: {
        primeiraFaixa: faixasPotencia[0],
        condicaoPrimeiraFaixa: {
          potenciaMin: faixasPotencia[0]?.potenciaMin,
          potenciaMax: faixasPotencia[0]?.potenciaMax,
          potenciaTeste,
          condicao1: `${potenciaTeste} >= ${faixasPotencia[0]?.potenciaMin}`,
          resultado1: potenciaTeste >= faixasPotencia[0]?.potenciaMin,
          condicao2: `${potenciaTeste} < ${faixasPotencia[0]?.potenciaMax}`,
          resultado2: potenciaTeste < faixasPotencia[0]?.potenciaMax,
          devePassar: potenciaTeste >= faixasPotencia[0]?.potenciaMin && potenciaTeste < faixasPotencia[0]?.potenciaMax
        }
      }
    });

  } catch (error: any) {
    console.error('❌ ERRO GERAL:', error);
    return NextResponse.json({
      erro: 'Erro interno',
      message: error?.message,
      stack: error?.stack
    }, { status: 500 });
  }
}
