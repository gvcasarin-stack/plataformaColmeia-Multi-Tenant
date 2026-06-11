// Tipos para os arrays de equipamentos
export interface ModuloItem {
  catalog_id?: string;
  fabricante: string;
  modelo: string;
  potencia_wp: string;
  quantidade: string;
  voc?: string;
  isc?: string;
  vpmp?: string;
  ipmp?: string;
  eficiencia?: string;
  comprimento_m?: string;
  largura_m?: string;
  area_unitaria_m2?: string;
  peso_kg?: string;
}

export interface InversorItem {
  catalog_id?: string;
  fabricante: string;
  modelo: string;
  potencia: string;
  quantidade: string;
  potencia_max_saida?: string;
  tensao?: string;
  tensao_max_ca?: string;
  tensao_min_ca?: string;
  faixa_tensao?: string;
  vcc_max?: string;
  icc_max?: string;
  vpmp_max?: string;
  vpmp_min?: string;
  vcc_partida?: string;
  corrente_nominal?: string;
  quantidade_mppt?: string;
  entradas_por_mppt?: string;
  tipo_conexao_saida?: string;
  fator_potencia?: string;
  rendimento?: string;
  dht_corrente?: string;
}

function parseNum(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function parseJsonList<T>(raw: any): T[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as T[];
  } catch { /* ignore */ }
  return [];
}

// Retorna todos os módulos do projeto (novo formato ou fallback para campos antigos)
export function getAllModulos(pd: Record<string, any> | undefined): ModuloItem[] {
  if (!pd) return [];
  const lista = parseJsonList<ModuloItem>(pd.modulos_lista);
  if (lista.length > 0) return lista;

  // Fallback: campos individuais antigos
  const fabricante = String(pd.modulos_fabricante || '');
  const modelo = String(pd.modulos_modelo || '');
  const potencia_wp = String(pd.modulos_potencia_wp || '');
  const quantidade = String(pd.modulos_quantidade || '1');
  if (!fabricante && !modelo && !potencia_wp) return [];
  return [{
    fabricante,
    modelo,
    potencia_wp,
    quantidade,
    voc: String(pd.modulos_voc || ''),
    isc: String(pd.modulos_isc || ''),
    vpmp: String(pd.modulos_vpmp || ''),
    ipmp: String(pd.modulos_ipmp || ''),
    eficiencia: String(pd.modulos_eficiencia || ''),
    comprimento_m: String(pd.modulos_comprimento_m || ''),
    largura_m: String(pd.modulos_largura_m || ''),
    area_unitaria_m2: String(pd.modulos_area_unitaria_m2 || ''),
    peso_kg: String(pd.modulos_peso_kg || ''),
  }];
}

// Retorna todos os inversores do projeto (novo formato ou fallback)
export function getAllInversores(pd: Record<string, any> | undefined): InversorItem[] {
  if (!pd) return [];
  const lista = parseJsonList<InversorItem>(pd.inversores_lista);
  if (lista.length > 0) return lista;

  // Fallback: campos individuais antigos
  const fabricante = String(pd.inversores_fabricante || '');
  const modelo = String(pd.inversores_modelo || '');
  const potencia = String(pd.inversores_potencia || '');
  const quantidade = String(pd.inversores_quantidade || '1');
  if (!fabricante && !modelo && !potencia) return [];
  return [{
    fabricante,
    modelo,
    potencia,
    quantidade,
    potencia_max_saida: String(pd.inversores_potencia_max_saida || ''),
    tensao: String(pd.inversores_tensao || ''),
    tensao_max_ca: String(pd.inversores_tensao_max_ca || ''),
    tensao_min_ca: String(pd.inversores_tensao_min_ca || ''),
    faixa_tensao: String(pd.inversores_faixa_tensao || ''),
    vcc_max: String(pd.inversores_vcc_max || ''),
    icc_max: String(pd.inversores_icc_max || ''),
    vpmp_max: String(pd.inversores_vpmp_max || ''),
    vpmp_min: String(pd.inversores_vpmp_min || ''),
    vcc_partida: String(pd.inversores_vcc_partida || ''),
    corrente_nominal: String(pd.inversores_corrente_nominal || ''),
    quantidade_mppt: String(pd.inversores_quantidade_mppt || ''),
    entradas_por_mppt: String(pd.inversores_entradas_por_mppt || ''),
    tipo_conexao_saida: String(pd.inversores_tipo_conexao_saida || ''),
    fator_potencia: String(pd.inversores_fator_potencia || ''),
    rendimento: String(pd.inversores_rendimento || ''),
    dht_corrente: String(pd.inversores_dht_corrente || ''),
  }];
}

// Primeiro módulo (para campos que só exibem um modelo)
export function getPrimaryModulo(pd: Record<string, any> | undefined): ModuloItem | null {
  const list = getAllModulos(pd);
  return list[0] ?? null;
}

// Primeiro inversor
export function getPrimaryInversor(pd: Record<string, any> | undefined): InversorItem | null {
  const list = getAllInversores(pd);
  return list[0] ?? null;
}

// Quantidade total de módulos (soma de todos os modelos × suas quantidades)
export function getTotalModulosQtd(pd: Record<string, any> | undefined): number {
  return getAllModulos(pd).reduce((acc, m) => acc + parseNum(m.quantidade), 0);
}

// Quantidade total de inversores
export function getTotalInversoresQtd(pd: Record<string, any> | undefined): number {
  return getAllInversores(pd).reduce((acc, i) => acc + parseNum(i.quantidade), 0);
}

// Potência de pico total (kWp) — soma de (Wp × qtd) de todos os modelos / 1000
export function getTotalKwp(pd: Record<string, any> | undefined): number {
  // Prioriza campo potencia já calculado
  const potenciaCalc = parseNum(pd?.potencia);
  if (potenciaCalc > 0) return potenciaCalc;
  return getAllModulos(pd).reduce((acc, m) => {
    return acc + (parseNum(m.potencia_wp) * parseNum(m.quantidade)) / 1000;
  }, 0);
}

// Potência nominal total dos inversores (kW) — soma de (kW × qtd) de todos os modelos
export function getTotalInversorKw(pd: Record<string, any> | undefined): number {
  return getAllInversores(pd).reduce((acc, i) => {
    return acc + parseNum(i.potencia) * parseNum(i.quantidade);
  }, 0);
}

// Potência de geração para documentos = min(kWp total, kW inversores total)
export function getPotenciaGeracao(pd: Record<string, any> | undefined): number {
  const kwp = getTotalKwp(pd);
  const invKw = getTotalInversorKw(pd);
  if (kwp <= 0) return 0;
  if (invKw <= 0) return kwp;
  return Math.min(kwp, invKw);
}

// Formata número para padrão BR com N casas decimais
export function fmtBR(val: number, decimals = 2): string {
  if (isNaN(val) || val === 0) return '0,' + '0'.repeat(decimals);
  return val.toFixed(decimals).replace('.', ',');
}
