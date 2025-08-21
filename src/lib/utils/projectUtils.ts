// Function to calculate project cost based on power ranges
import { devLog } from "@/lib/utils/productionLogger";
// ✅ SUPABASE - Migrado do Firebase para Supabase
import { getConfiguracaoGeral } from '@/lib/services/configService.supabase';

// Interface para a faixa de potência e preço
interface FaixaPotenciaPreco {
  potenciaMin: number;
  potenciaMax: number;
  valorBase: number;
}

// Cache das faixas de preço para evitar múltiplas chamadas ao Firestore
let cachedPriceRanges: FaixaPotenciaPreco[] | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos em milissegundos

// Função para criar uma tabela de faixas de potência padrão (para fallback)
export const criarFaixasPotenciaPadrao = (): FaixaPotenciaPreco[] => {
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

// Função para obter as faixas de preço do Supabase
export const getProjectPriceRanges = async (): Promise<FaixaPotenciaPreco[]> => {
  // Verificar se o cache ainda é válido
  const now = Date.now();
  if (cachedPriceRanges && (now - lastCacheTime < CACHE_DURATION)) {
    return cachedPriceRanges;
  }

  try {
    // ✅ SUPABASE - Buscar configurações do Supabase
    const configData = await getConfiguracaoGeral();
    
    if (configData?.faixasPotencia) {
      const faixas = configData.faixasPotencia;
      
      // Atualizar o cache
      cachedPriceRanges = faixas;
      lastCacheTime = now;
      
      return faixas;
    }
    
    // Se não existir no banco, retornar valores padrão
    const faixasPadrao = criarFaixasPotenciaPadrao();
    
    // Atualizar o cache
    cachedPriceRanges = faixasPadrao;
    lastCacheTime = now;
    
    return faixasPadrao;
  } catch (error) {
    devLog.error('Erro ao obter faixas de preço:', error);
    
    // Em caso de erro, retornar valores padrão
    return criarFaixasPotenciaPadrao();
  }
};

// Versão síncrona que usa o cache ou valores padrão
export const getProjectPriceRangesSync = (): FaixaPotenciaPreco[] => {
  if (cachedPriceRanges) {
    return cachedPriceRanges;
  }
  
  // Se não tiver cache, retornar valores padrão
  return criarFaixasPotenciaPadrao();
};

// Função principal para calcular o custo do projeto com base na potência
export const calculateProjectCost = (potencia: number): number => {
  const faixasPotencia = getProjectPriceRangesSync();
  
  // Encontrar a faixa apropriada para a potência
  // Vamos primeiro procurar por limites exatos
  for (const faixa of faixasPotencia) {
    // Caso especial para o limite exato (ex: potência = 5)
    if (potencia === faixa.potenciaMin) {
      return faixa.valorBase;
    }
  }
  
  // Se não encontrou nos limites exatos, procurar por faixa
  const faixaCorrespondente = faixasPotencia.find(
    faixa => potencia > faixa.potenciaMin && potencia <= faixa.potenciaMax
  );
  
  // Se encontrou uma faixa, retornar o valor base correspondente
  if (faixaCorrespondente) {
    return faixaCorrespondente.valorBase;
  }
  
  // Caso não encontre (improvável com a configuração atual), usar o maior valor
  const maiorFaixa = faixasPotencia.reduce(
    (prev, current) => prev.valorBase > current.valorBase ? prev : current,
    faixasPotencia[0]
  );
  
  return maiorFaixa?.valorBase || 4000; // Valor de fallback
};
