/**
 * @file dimensionamentoCalculos.ts
 * @description Lógicas de cálculo para dimensionamento de sistemas fotovoltaicos
 * Suporta: On-Grid, Híbrido e Off-Grid
 */

import {
  TipoSistema,
  TipoLigacao,
  SistemaFV,
  SistemaBaterias,
  SistemaInversor,
  Carga,
} from '@/types/dimensionamento';

// =====================================================
// CONSTANTES DE CÁLCULO
// =====================================================

const EFICIENCIA_SISTEMA = 0.95; // 95% de eficiência do sistema
const DOD_LITIO = 0.8; // Depth of Discharge para baterias de lítio (80%)
const AREA_POR_MODULO = 2.2; // m² por módulo (aproximação)
const FATOR_SEGURANCA_INVERSOR = 1.25; // 25% de margem de segurança
const CAPACIDADE_MODULO_BATERIA = 5.12; // kWh por módulo de bateria (padrão)
const TENSAO_BATERIA = 51.2; // V (padrão para sistemas 48V)
const CORRENTE_MAXIMA_BATERIA = 200; // A

// =====================================================
// CÁLCULO SISTEMA ON-GRID (Sistema básico)
// =====================================================

export function calcularSistemaOnGrid(
  consumoMensal: number, // kWh
  irradiacao: number, // HSP (horas de sol pico)
  potenciaModulo: number = 550, // W
  fatorDesempenho: number = 0.85 // PR — Performance Ratio (0–1)
): SistemaFV {
  // Consumo diário
  const consumoDiario = consumoMensal / 30;

  // Potência necessária do sistema (kWp), já descontando o PR
  const potenciaNecessaria = consumoDiario / (irradiacao * fatorDesempenho);

  // Número de módulos
  const potenciaModuloKw = potenciaModulo / 1000;
  const numeroModulos = Math.ceil(potenciaNecessaria / potenciaModuloKw);

  // Área necessária
  const areaTotal = numeroModulos * AREA_POR_MODULO;

  // Geração diária e mensal estimadas
  const geracaoDiaria = numeroModulos * potenciaModuloKw * irradiacao * fatorDesempenho;
  const geracaoMensal = geracaoDiaria * 30;

  return {
    potencia: parseFloat((numeroModulos * potenciaModuloKw).toFixed(2)),
    modulos: numeroModulos,
    area: parseFloat(areaTotal.toFixed(2)),
    geracaoDiaria: parseFloat(geracaoDiaria.toFixed(2)),
    geracaoMensal: parseFloat(geracaoMensal.toFixed(1)),
  };
}

// =====================================================
// CÁLCULO INVERSO: a partir da potência desejada (kWp)
// =====================================================

export function calcularPorPotenciaKwp(
  potenciaDesejadaKwp: number, // kWp que o usuário quer instalar
  irradiacao: number, // HSP
  potenciaModulo: number = 550, // W
  fatorDesempenho: number = 0.85
): SistemaFV {
  const potenciaModuloKw = potenciaModulo / 1000;
  const numeroModulos = Math.ceil(potenciaDesejadaKwp / potenciaModuloKw);
  const potenciaReal = numeroModulos * potenciaModuloKw;
  const areaTotal = numeroModulos * AREA_POR_MODULO;
  const geracaoDiaria = potenciaReal * irradiacao * fatorDesempenho;
  const geracaoMensal = geracaoDiaria * 30;

  return {
    potencia: parseFloat(potenciaReal.toFixed(2)),
    modulos: numeroModulos,
    area: parseFloat(areaTotal.toFixed(2)),
    geracaoDiaria: parseFloat(geracaoDiaria.toFixed(2)),
    geracaoMensal: parseFloat(geracaoMensal.toFixed(1)),
  };
}

// =====================================================
// CÁLCULO SISTEMA DE BATERIAS
// =====================================================

export function calcularSistemaBaterias(
  consumoDiario: number, // kWh
  autonomiaHoras: number, // horas
  cargasPrioritarias?: Carga[] // Se definido, usa apenas cargas prioritárias
): SistemaBaterias {
  // Se houver cargas prioritárias, calcular consumo apenas delas
  let consumoParaBackup = consumoDiario;
  
  if (cargasPrioritarias && cargasPrioritarias.length > 0) {
    consumoParaBackup = cargasPrioritarias.reduce(
      (total, carga) => total + carga.consumoDiario,
      0
    );
  }

  // Consumo durante a autonomia desejada
  const consumoAutonomia = (consumoParaBackup / 24) * autonomiaHoras;

  // Capacidade necessária considerando DoD e eficiência
  const capacidadeNecessaria = consumoAutonomia / (DOD_LITIO * EFICIENCIA_SISTEMA);

  // Número de módulos de bateria necessários
  const numeroModulos = Math.ceil(capacidadeNecessaria / CAPACIDADE_MODULO_BATERIA);

  // Capacidade total instalada
  const capacidadeTotal = numeroModulos * CAPACIDADE_MODULO_BATERIA;

  // Capacidade útil (considerando DoD)
  const capacidadeUtil = capacidadeTotal * DOD_LITIO;

  // Autonomia real com a capacidade instalada
  const autonomiaReal = (capacidadeUtil * EFICIENCIA_SISTEMA * 24) / consumoParaBackup;

  return {
    capacidadeUtil: parseFloat(capacidadeUtil.toFixed(2)),
    capacidadeTotal: parseFloat(capacidadeTotal.toFixed(2)),
    modulos: numeroModulos,
    tensao: TENSAO_BATERIA,
    correnteMaxima: CORRENTE_MAXIMA_BATERIA,
    autonomiaReal: parseFloat(autonomiaReal.toFixed(2)),
    dod: DOD_LITIO,
  };
}

// =====================================================
// CÁLCULO INVERSOR HÍBRIDO/OFF-GRID
// =====================================================

export function calcularInversorHibrido(
  consumoDiario: number, // kWh
  potenciaFV: number, // kWp
  capacidadeBaterias: number, // kWh
  tipoLigacao?: TipoLigacao,
  cargasPrioritarias?: Carga[]
): SistemaInversor {
  // Calcular potência de pico das cargas
  let potenciaPicoCargas = 0;
  
  if (cargasPrioritarias && cargasPrioritarias.length > 0) {
    potenciaPicoCargas = cargasPrioritarias.reduce(
      (total, carga) => total + (carga.potencia * carga.quantidade / 1000), // Converter para kW
      0
    );
  } else {
    // Se não houver cargas definidas, estimar baseado no consumo diário
    // Assumindo 4 horas de pico de consumo
    potenciaPicoCargas = consumoDiario / 4;
  }

  // Potência baseada na geração FV
  const potenciaBaseFV = potenciaFV;

  // Potência para carregamento de baterias (C-rate típico de 0.5C)
  const potenciaCarregamentoBaterias = capacidadeBaterias * 0.5;

  // Potência mínima do inversor (maior valor entre as três)
  const potenciaMinima = Math.max(
    potenciaPicoCargas * FATOR_SEGURANCA_INVERSOR,
    potenciaBaseFV,
    potenciaCarregamentoBaterias
  );

  // Tipo de inversor baseado na ligação
  let tipoInversor = 'Monofásico';
  if (tipoLigacao === 'trifasica' || tipoLigacao === 'trifasica-127') {
    tipoInversor = 'Trifásico';
  } else if (tipoLigacao === 'bifasica' || tipoLigacao === 'bifasica-127') {
    tipoInversor = 'Bifásico';
  }

  return {
    potenciaMinima: parseFloat(potenciaMinima.toFixed(2)),
    tipo: tipoInversor,
    entradaFV: potenciaFV > 0 ? parseFloat(potenciaFV.toFixed(2)) : undefined,
    entradaBaterias: capacidadeBaterias > 0 ? TENSAO_BATERIA : undefined,
  };
}

// =====================================================
// CÁLCULO SISTEMA HÍBRIDO (Backup com FV)
// =====================================================

export function calcularSistemaHibrido(
  consumoMensal: number, // kWh
  irradiacao: number, // HSP
  autonomiaHoras: number, // horas
  potenciaModulo: number = 550, // W
  tipoLigacao?: TipoLigacao,
  cargas?: Carga[],
  fatorDesempenho: number = 0.85
) {
  const consumoDiario = consumoMensal / 30;

  // 1. Dimensionar sistema fotovoltaico para consumo normal
  const sistemaFV = calcularSistemaOnGrid(consumoMensal, irradiacao, potenciaModulo, fatorDesempenho);

  // 2. Dimensionar baterias para autonomia desejada
  const cargasPrioritarias = cargas?.filter(c => c.prioritaria);
  const sistemaBaterias = calcularSistemaBaterias(
    consumoDiario,
    autonomiaHoras,
    cargasPrioritarias
  );

  // 3. Dimensionar inversor híbrido
  const sistemaInversor = calcularInversorHibrido(
    consumoDiario,
    sistemaFV.potencia,
    sistemaBaterias.capacidadeTotal,
    tipoLigacao,
    cargasPrioritarias
  );

  // 4. Economia estimada (85% do consumo)
  const economiaMensal = consumoMensal * 0.85;

  return {
    sistema_fv: sistemaFV,
    sistema_baterias: sistemaBaterias,
    sistema_inversor: sistemaInversor,
    economia_mensal: parseFloat(economiaMensal.toFixed(2)),
  };
}

// =====================================================
// CÁLCULO SISTEMA HÍBRIDO (Backup sem FV)
// =====================================================

export function calcularSistemaHibridoSemFV(
  consumoMensal: number, // kWh
  autonomiaHoras: number, // horas
  tipoLigacao?: TipoLigacao,
  cargas?: Carga[]
) {
  const consumoDiario = consumoMensal / 30;

  // 1. Dimensionar baterias para autonomia desejada
  const cargasPrioritarias = cargas?.filter(c => c.prioritaria);
  const sistemaBaterias = calcularSistemaBaterias(
    consumoDiario,
    autonomiaHoras,
    cargasPrioritarias
  );

  // 2. Dimensionar inversor (sem entrada FV)
  const sistemaInversor = calcularInversorHibrido(
    consumoDiario,
    0, // Sem FV
    sistemaBaterias.capacidadeTotal,
    tipoLigacao,
    cargasPrioritarias
  );

  // Sem economia, pois não há geração FV
  return {
    sistema_baterias: sistemaBaterias,
    sistema_inversor: sistemaInversor,
    economia_mensal: 0,
  };
}

// =====================================================
// CÁLCULO SISTEMA OFF-GRID
// =====================================================

export function calcularSistemaOffGrid(
  consumoMensal: number, // kWh
  irradiacao: number, // HSP
  autonomiaDias: number = 2, // dias (típico para off-grid)
  potenciaModulo: number = 550, // W
  tipoLigacao?: TipoLigacao,
  cargas?: Carga[],
  fatorDesempenho: number = 0.85
) {
  const consumoDiario = consumoMensal / 30;

  // 1. Dimensionar sistema FV com margem maior (20% extra para perdas e dias nublados)
  const consumoAjustado = consumoMensal * 1.2;
  const sistemaFV = calcularSistemaOnGrid(consumoAjustado, irradiacao, potenciaModulo, fatorDesempenho);

  // 2. Dimensionar baterias para autonomia de X dias
  const sistemaBaterias = calcularSistemaBaterias(
    consumoDiario,
    autonomiaDias * 24, // Converter dias em horas
    cargas // Todas as cargas são prioritárias em off-grid
  );

  // 3. Dimensionar inversor off-grid
  const sistemaInversor = calcularInversorHibrido(
    consumoDiario,
    sistemaFV.potencia,
    sistemaBaterias.capacidadeTotal,
    tipoLigacao,
    cargas
  );

  // Sistema off-grid gera 100% do consumo
  const economiaMensal = consumoMensal;

  return {
    sistema_fv: sistemaFV,
    sistema_baterias: sistemaBaterias,
    sistema_inversor: sistemaInversor,
    economia_mensal: parseFloat(economiaMensal.toFixed(2)),
  };
}

// =====================================================
// FUNÇÃO PRINCIPAL DE DIMENSIONAMENTO
// =====================================================

export function calcularDimensionamento(params: {
  tipoSistema: TipoSistema;
  consumoMensal: number;
  irradiacao: number;
  potenciaModulo?: number;
  autonomiaHoras?: number;
  backupComFV?: boolean;
  tipoLigacao?: TipoLigacao;
  cargas?: Carga[];
  fatorDesempenho?: number;
}) {
  const {
    tipoSistema,
    consumoMensal,
    irradiacao,
    potenciaModulo = 550,
    autonomiaHoras = 24,
    backupComFV = true,
    tipoLigacao,
    cargas,
    fatorDesempenho = 0.85,
  } = params;

  switch (tipoSistema) {
    case 'on-grid':
      const sistemaFV = calcularSistemaOnGrid(consumoMensal, irradiacao, potenciaModulo, fatorDesempenho);
      return {
        sistema_fv: sistemaFV,
        economia_mensal: parseFloat((consumoMensal * 0.85).toFixed(2)),
      };

    case 'hibrido':
      if (backupComFV) {
        return calcularSistemaHibrido(
          consumoMensal,
          irradiacao,
          autonomiaHoras,
          potenciaModulo,
          tipoLigacao,
          cargas,
          fatorDesempenho
        );
      } else {
        return calcularSistemaHibridoSemFV(
          consumoMensal,
          autonomiaHoras,
          tipoLigacao,
          cargas
        );
      }

    case 'off-grid':
      return calcularSistemaOffGrid(
        consumoMensal,
        irradiacao,
        2,
        potenciaModulo,
        tipoLigacao,
        cargas,
        fatorDesempenho
      );

    default:
      throw new Error('Tipo de sistema inválido');
  }
}

