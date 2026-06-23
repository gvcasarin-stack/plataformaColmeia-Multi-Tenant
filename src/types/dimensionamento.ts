/**
 * @file dimensionamento.ts
 * @description Tipos para dimensionamento de sistemas fotovoltaicos
 */

// =====================================================
// TIPOS DE SISTEMA
// =====================================================

export type TipoSistema = 'on-grid' | 'hibrido' | 'off-grid';
export type TipoConsumidor = 'residencial' | 'comercial';
export type ObjetivoBateria = 'backup' | 'inversao-fluxo';
export type TipoLigacao = 'monofasica-127' | 'monofasica-220' | 'bifasica-127' | 'bifasica' | 'trifasica-127' | 'trifasica';

// =====================================================
// CARGA ELÉTRICA
// =====================================================

export interface Carga {
  nome: string;
  potencia: number; // W
  quantidade: number;
  horasDia: number;
  consumoDiario: number; // kWh
  prioritaria?: boolean; // Para backup
}

// =====================================================
// RESULTADOS DOS SISTEMAS
// =====================================================

export interface SistemaFV {
  potencia: number; // kWp
  modulos: number;
  area: number; // m²
  geracaoDiaria: number; // kWh/dia
  geracaoMensal?: number; // kWh/mês (calculado)
}

export interface SistemaBaterias {
  capacidadeUtil: number; // kWh
  capacidadeTotal: number; // kWh
  modulos: number;
  tensao: number; // V
  correnteMaxima: number; // A
  autonomiaReal: number; // horas
  dod: number; // Depth of Discharge (0-1)
}

export interface SistemaInversor {
  potenciaMinima: number; // kW
  tipo: string;
  entradaFV?: number; // kWp
  entradaBaterias?: number; // V
}

// =====================================================
// DIMENSIONAMENTO COMPLETO
// =====================================================

export interface Dimensionamento {
  id?: string;
  user_id?: string;
  tenant_id?: string;
  
  // Tipo do sistema
  tipo_sistema: TipoSistema;
  tipo_consumidor: TipoConsumidor;
  
  // Configuração (condicional)
  objetivo_bateria?: ObjetivoBateria;
  backup_com_fv?: boolean;
  tipo_ligacao?: TipoLigacao;
  
  // Dados de entrada
  consumo_mensal: number; // kWh
  estado: string; // UF
  irradiacao: number; // HSP
  autonomia_desejada?: number; // horas
  potencia_modulo?: number; // W
  fator_desempenho?: number; // PR 0–1 (ex: 0.85)
  
  // Cargas elétricas
  cargas?: Carga[];
  
  // Resultados
  sistema_fv?: SistemaFV;
  sistema_baterias?: SistemaBaterias;
  sistema_inversor?: SistemaInversor;
  
  // Estimativa financeira
  economia_mensal?: number; // kWh
  
  // Metadados
  created_at?: string;
  updated_at?: string;
}

// =====================================================
// DADOS PARA CRIAÇÃO DE DIMENSIONAMENTO
// =====================================================

export interface DimensionamentoInput {
  tipo_sistema: TipoSistema;
  tipo_consumidor: TipoConsumidor;
  objetivo_bateria?: ObjetivoBateria;
  backup_com_fv?: boolean;
  tipo_ligacao?: TipoLigacao;
  consumo_mensal: number;
  estado: string;
  irradiacao: number;
  autonomia_desejada?: number;
  potencia_modulo?: number;
  fator_desempenho?: number;
  cargas?: Carga[];
}

// =====================================================
// CONSTANTES
// =====================================================

export const LABELS_TIPO_SISTEMA: Record<TipoSistema, string> = {
  'on-grid': 'On-Grid (Conectado à Rede)',
  'hibrido': 'Híbrido (Com Baterias)',
  'off-grid': 'Off-Grid (Isolado)',
};

export const LABELS_TIPO_CONSUMIDOR: Record<TipoConsumidor, string> = {
  'residencial': 'Residencial',
  'comercial': 'Comercial / Industrial',
};

export const LABELS_OBJETIVO_BATERIA: Record<ObjetivoBateria, string> = {
  'backup': 'Backup (Energia de Reserva)',
  'inversao-fluxo': 'Inversão de Fluxo (Evitar Injeção na Rede)',
};

export const LABELS_TIPO_LIGACAO: Record<TipoLigacao, string> = {
  'monofasica-127': 'Monofásica 127V (Sistema 127/220V)',
  'monofasica-220': 'Monofásica 220V (Sistema 220/380V)',
  'bifasica-127': 'Bifásica (127V/220V)',
  'bifasica': 'Bifásica (220V/380V)',
  'trifasica-127': 'Trifásica (127V/220V)',
  'trifasica': 'Trifásica (220V/380V)',
};

// =====================================================
// APARELHOS PRÉ-DEFINIDOS PARA TABELA DE CARGAS
// =====================================================

export interface AparelhoPreDefinido {
  nome: string;
  potencia: number; // W
  categoria: string;
}

export const APARELHOS_PRE_DEFINIDOS: AparelhoPreDefinido[] = [
  // Iluminação
  { nome: 'Lâmpada LED 10W', potencia: 10, categoria: 'Iluminação' },
  { nome: 'Lâmpada LED 15W', potencia: 15, categoria: 'Iluminação' },
  { nome: 'Lâmpada LED 20W', potencia: 20, categoria: 'Iluminação' },
  
  // Refrigeração
  { nome: 'Geladeira', potencia: 150, categoria: 'Refrigeração' },
  { nome: 'Geladeira Duplex', potencia: 200, categoria: 'Refrigeração' },
  { nome: 'Freezer', potencia: 200, categoria: 'Refrigeração' },
  
  // Ar-Condicionado
  { nome: 'Ar-Cond. 9000 BTUs', potencia: 900, categoria: 'Climatização' },
  { nome: 'Ar-Cond. 12000 BTUs', potencia: 1200, categoria: 'Climatização' },
  { nome: 'Ar-Cond. 18000 BTUs', potencia: 1800, categoria: 'Climatização' },
  { nome: 'Ar-Cond. 24000 BTUs', potencia: 2500, categoria: 'Climatização' },
  
  // Aquecimento
  { nome: 'Chuveiro Elétrico 4500W', potencia: 4500, categoria: 'Aquecimento' },
  { nome: 'Chuveiro Elétrico 5500W', potencia: 5500, categoria: 'Aquecimento' },
  { nome: 'Chuveiro Elétrico 7500W', potencia: 7500, categoria: 'Aquecimento' },
  
  // Lavanderia
  { nome: 'Máquina de Lavar', potencia: 500, categoria: 'Lavanderia' },
  { nome: 'Secadora de Roupas', potencia: 1500, categoria: 'Lavanderia' },
  { nome: 'Ferro Elétrico', potencia: 1200, categoria: 'Lavanderia' },
  
  // Cozinha
  { nome: 'Micro-ondas', potencia: 1200, categoria: 'Cozinha' },
  { nome: 'Forno Elétrico', potencia: 1500, categoria: 'Cozinha' },
  { nome: 'Fogão Elétrico', potencia: 2000, categoria: 'Cozinha' },
  { nome: 'Liquidificador', potencia: 400, categoria: 'Cozinha' },
  { nome: 'Cafeteira', potencia: 800, categoria: 'Cozinha' },
  
  // Eletrônicos
  { nome: 'TV LED 32"', potencia: 80, categoria: 'Eletrônicos' },
  { nome: 'TV LED 50"', potencia: 150, categoria: 'Eletrônicos' },
  { nome: 'TV LED 65"', potencia: 200, categoria: 'Eletrônicos' },
  { nome: 'Computador Desktop', potencia: 300, categoria: 'Eletrônicos' },
  { nome: 'Notebook', potencia: 80, categoria: 'Eletrônicos' },
  { nome: 'Roteador Wi-Fi', potencia: 10, categoria: 'Eletrônicos' },
  
  // Outros
  { nome: 'Bomba d\'água 1/2 CV', potencia: 500, categoria: 'Outros' },
  { nome: 'Bomba d\'água 1 CV', potencia: 1000, categoria: 'Outros' },
  { nome: 'Bomba d\'água 2 CV', potencia: 1500, categoria: 'Outros' },
  { nome: 'Ventilador', potencia: 100, categoria: 'Outros' },
  { nome: 'Aspirador de Pó', potencia: 1000, categoria: 'Outros' },
];

