'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Plus, Minus, RotateCcw } from 'lucide-react';

export interface CargaRow {
  id: string;
  descricao: string;
  potencia_w: string;
  quantidade: string;
  fp: string;
  fd: string;
}

const CARGA_TEMPLATE: CargaRow[] = [
  { id: '1', descricao: 'Tomadas Uso Geral',      potencia_w: '100',  quantidade: '30', fp: '0,92', fd: '1' },
  { id: '2', descricao: 'Tomadas Uso Específico', potencia_w: '4500', quantidade: '1',  fp: '0,95', fd: '1' },
  { id: '3', descricao: 'Iluminação Geral',        potencia_w: '50',   quantidade: '10', fp: '0,90', fd: '1' },
];

function parseBR(val: string): number {
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function fmtBR(val: number, decimals = 1): string {
  return val.toFixed(decimals).replace('.', ',');
}

function calcRow(row: CargaRow) {
  const A = parseBR(row.potencia_w);
  const B = parseBR(row.quantidade);
  const D = parseBR(row.fp);
  const F = parseBR(row.fd);
  const C = (A * B) / 1000;                       // CI(kW)
  const E = D > 0 ? C / D : 0;                    // CI(kVA)
  const G = C * F;                                 // D(kW)
  const H = E * F;                                 // D(kVA)
  return { C, E, G, H };
}

interface MemorialDescritivoPreviewProps {
  distribuidora: string;
  projectData?: Record<string, any>;
  onSaveCargaTable?: (rows: CargaRow[]) => Promise<void>;
}

const PLACEHOLDER_MAP: Record<string, string> = {
  '{{classificacao_da_usina}}': 'tipo_fornecimento',
  '{{potencia}}': 'potencia',
  '{{tensao_atendimento}}': 'tensao_atendimento',
  '{{modalidade_compensacao}}': 'modalidade_compensacao',
  '{{cliente_nome}}': 'nomeClienteFinal',
  '{{cliente_cpf}}': 'cpf_cnpj_cliente_final',
  '{{distribuidora}}': 'distribuidora',
  '{{estado}}': 'client_state',
  '{{cidade}}': 'client_city',
  '{{conta_contrato}}': 'conta_contrato',
  '{{classe_uc}}': 'classe_uc',
  '{{endereco}}': 'endereco_local',
  '{{numero_poste_transformador}}': 'numero_poste_transformador',
  '{{coord_utm_x}}': 'coord_utm_x',
  '{{coord_utm_y}}': 'coord_utm_y',
  '{{coord_utm_fuso}}': 'coord_utm_fuso',
  '{{tipo_conexao}}': 'tipo_conexao',
  '{{tipo_ramal}}': 'tipo_ramal',
  '{{disjuntor_polos}}': 'disjuntor_polos',
  '{{disjuntor_tensao_v}}': 'disjuntor_tensao_v',
  '{{disjuntor_corrente_a}}': 'disjuntor_corrente_a',
  '{{disjuntor_ca_corrente_a}}': 'disjuntor_ca_corrente_a',
  '{{secao_fase_mm2}}': 'secao_fase_mm2',
  '{{secao_neutro_mm2}}': 'secao_neutro_mm2',
  '{{modulos_fabricante}}': 'modulos_fabricante',
  '{{modulos_modelo}}': 'modulos_modelo',
  '{{modulos_potencia_wp}}': 'modulos_potencia_wp',
  '{{modulos_voc}}': 'modulos_voc',
  '{{modulos_isc}}': 'modulos_isc',
  '{{modulos_vpmp}}': 'modulos_vpmp',
  '{{modulos_ipmp}}': 'modulos_ipmp',
  '{{modulos_quantidade}}': 'modulos_quantidade',
  '{{inversores_fabricante}}': 'inversores_fabricante',
  '{{inversores_modelo}}': 'inversores_modelo',
  '{{inversores_quantidade}}': 'inversores_quantidade',
  '{{inversores_potencia}}': 'inversores_potencia',
  '{{inversores_potencia_max_saida}}': 'inversores_potencia_max_saida',
  '{{inversores_tensao}}': 'inversores_tensao',
  '{{inversores_vcc_max}}': 'inversores_vcc_max',
  '{{inversores_icc_max}}': 'inversores_icc_max',
  '{{inversores_vpmp_max}}': 'inversores_vpmp_max',
  '{{inversores_vpmp_min}}': 'inversores_vpmp_min',
  '{{inversores_vcc_partida}}': 'inversores_vcc_partida',
  '{{inversores_tensao_max_ca}}': 'inversores_tensao_max_ca',
  '{{inversores_tensao_min_ca}}': 'inversores_tensao_min_ca',
  '{{inversores_corrente_nominal}}': 'inversores_corrente_nominal',
  '{{inversores_faixa_tensao}}': 'inversores_faixa_tensao',
  '{{inversores_quantidade_mppt}}': 'inversores_quantidade_mppt',
  '{{inversores_entradas_por_mppt}}': 'inversores_entradas_por_mppt',
  '{{inversores_tipo_conexao_saida}}': 'inversores_tipo_conexao_saida',
  '{{inversores_fator_potencia}}': 'inversores_fator_potencia',
  '{{inversores_rendimento}}': 'inversores_rendimento',
  '{{inversores_dht_corrente}}': 'inversores_dht_corrente',
  '{{numero_condutores_fase}}': 'numero_condutores_fase',
  '{{disjuntor_padrao_entrada}}': 'disjuntorPadraoEntrada',
  '{{responsavel_nome}}': 'responsavel_nome',
  '{{responsavel_profissao}}': 'responsavel_profissao',
  '{{responsavel_registro}}': 'responsavel_registro',
  '{{data}}': 'data_documento',
  '{{secao_aterramento_mm2}}': 'secao_aterramento_mm2',
  // Módulos — características físicas
  '{{modulos_eficiencia}}': 'modulos_eficiencia',
  '{{modulos_comprimento_m}}': 'modulos_comprimento_m',
  '{{modulos_largura_m}}': 'modulos_largura_m',
  '{{modulos_area_unitaria_m2}}': 'modulos_area_unitaria_m2',
  '{{modulos_peso_kg}}': 'modulos_peso_kg',
  '{{cabo_isolacao_material}}': 'cabo_isolacao_material',
  // Dimensionamento dos Cabos
  '{{cabo_cc_secao_mm2}}': 'cabo_cc_secao_mm2',
  '{{cabo_cc_capacidade_corrente_a}}': 'cabo_cc_capacidade_corrente_a',
  '{{cabo_cc_fator_temperatura}}': 'cabo_cc_fator_temperatura',
  '{{cabo_cc_fator_agrupamento}}': 'cabo_cc_fator_agrupamento',
  '{{cabo_ca_secao_mm2}}': 'cabo_ca_secao_mm2',
  '{{cabo_ca_capacidade_corrente_a}}': 'cabo_ca_capacidade_corrente_a',
  '{{cabo_ca_fator_temperatura}}': 'cabo_ca_fator_temperatura',
  '{{cabo_ca_fator_agrupamento}}': 'cabo_ca_fator_agrupamento',
};

const STATE_NAMES: Record<string, string> = {
  AC: 'ACRE', AL: 'ALAGOAS', AP: 'AMAPÁ', AM: 'AMAZONAS', BA: 'BAHIA',
  CE: 'CEARÁ', DF: 'DISTRITO FEDERAL', ES: 'ESPÍRITO SANTO', GO: 'GOIÁS',
  MA: 'MARANHÃO', MT: 'MATO GROSSO', MS: 'MATO GROSSO DO SUL',
  MG: 'MINAS GERAIS', PA: 'PARÁ', PB: 'PARAÍBA', PR: 'PARANÁ',
  PE: 'PERNAMBUCO', PI: 'PIAUÍ', RJ: 'RIO DE JANEIRO',
  RN: 'RIO GRANDE DO NORTE', RS: 'RIO GRANDE DO SUL', RO: 'RONDÔNIA',
  RR: 'RORAIMA', SC: 'SANTA CATARINA', SP: 'SÃO PAULO', SE: 'SERGIPE',
  TO: 'TOCANTINS',
};

const PAGE_BREAK = 'break-before-page';

const SPACING_STEP = 20;
const MAX_SPACING = 300;

function PageBreakIndicator({ id, spacing, onSpacingChange }: {
  id: string;
  spacing: number;
  onSpacingChange: (id: string, delta: number) => void;
}) {
  return (
    <>
      {spacing > 0 && (
        <div className="memorial-spacer" style={{ height: `${spacing}px` }} />
      )}
      <div className="page-break-indicator relative my-4 flex items-center select-none" aria-hidden="true">
        <div className="flex-1 border-t-2 border-dashed border-blue-300 dark:border-blue-600" />
        <div className="mx-2 flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-400 dark:text-blue-500 whitespace-nowrap">
            quebra de página
          </span>
          <div className="page-break-controls flex items-center gap-0.5 ml-1">
            <button
              type="button"
              onClick={() => onSpacingChange(id, -SPACING_STEP)}
              disabled={spacing <= 0}
              className="w-5 h-5 flex items-center justify-center rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Reduzir espaçamento"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => onSpacingChange(id, SPACING_STEP)}
              disabled={spacing >= MAX_SPACING}
              className="w-5 h-5 flex items-center justify-center rounded border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-800 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Aumentar espaçamento"
            >
              <Plus className="w-3 h-3" />
            </button>
            {spacing > 0 && (
              <button
                type="button"
                onClick={() => onSpacingChange(id, -spacing)}
                className="w-5 h-5 flex items-center justify-center rounded border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-800 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors ml-0.5"
                title="Resetar espaçamento"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            {spacing > 0 && (
              <span className="text-[9px] text-blue-400 dark:text-blue-500 ml-1 tabular-nums">
                +{spacing}px
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 border-t-2 border-dashed border-blue-300 dark:border-blue-600" />
      </div>
    </>
  );
}

export function MemorialDescritivoPreview({ distribuidora, projectData, onSaveCargaTable }: MemorialDescritivoPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [placaAdvertencia, setPlacaAdvertencia] = useState<{ nome: string; imagem_url: string } | null>(null);
  const [spacings, setSpacings] = useState<Record<string, number>>({});

  // --- Tabela de Levantamento de Carga ---
  const [cargaRows, setCargaRows] = useState<CargaRow[]>(() => {
    try {
      const saved = projectData?.carga_levantamento;
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return CARGA_TEMPLATE;
  });
  const [cargaSaving, setCargaSaving] = useState(false);
  const [cargaSaved, setCargaSaved] = useState(false);

  const updateCargaRow = (id: string, field: keyof CargaRow, value: string) => {
    setCargaRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    setCargaSaved(false);
  };

  const addCargaRow = () => {
    const newId = String(Date.now());
    setCargaRows(prev => [...prev, { id: newId, descricao: '', potencia_w: '0', quantidade: '1', fp: '1', fd: '1' }]);
    setCargaSaved(false);
  };

  const removeCargaRow = (id: string) => {
    setCargaRows(prev => prev.filter(r => r.id !== id));
    setCargaSaved(false);
  };

  const saveCarga = async () => {
    if (!onSaveCargaTable) return;
    setCargaSaving(true);
    try {
      await onSaveCargaTable(cargaRows);
      setCargaSaved(true);
    } finally {
      setCargaSaving(false);
    }
  };

  const cargaTotals = cargaRows.reduce(
    (acc, row) => {
      const { C, E, G, H } = calcRow(row);
      return { C: acc.C + C, E: acc.E + E, G: acc.G + G, H: acc.H + H };
    },
    { C: 0, E: 0, G: 0, H: 0 }
  );
  const DECIMAL_FIELDS = [
    'potencia',
    'inversores_potencia',
    'inversores_potencia_max_saida',
    'secao_aterramento_mm2',
    'secao_fase_mm2',
    'secao_neutro_mm2',
    'cabo_cc_secao_mm2',
    'cabo_ca_secao_mm2',
  ];

  const handleSpacingChange = useCallback((id: string, delta: number) => {
    setSpacings(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(MAX_SPACING, current + delta));
      return { ...prev, [id]: next };
    });
  }, []);

  useEffect(() => {
    if (!distribuidora) return;
    const params = new URLSearchParams({ distribuidora, categoria: 'placa_advertencia' });
    fetch(`/api/acervo-tecnico?${params.toString()}`)
      .then(res => res.json())
      .then(result => {
        const items = result.data || [];
        if (items.length > 0 && items[0].imagem_url) {
          setPlacaAdvertencia({ nome: items[0].nome, imagem_url: items[0].imagem_url });
        }
      })
      .catch(() => {});
  }, [distribuidora]);

  const handleGeneratePdf = async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { MemorialDescritivoPDF } = await import('./MemorialDescritivoPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Memorial Descritivo - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(MemorialDescritivoPDF, { projectData, placaAdvertencia })
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  const V = ({ children }: { children: string }) => {
    const placeholder = children;
    const fieldKey = PLACEHOLDER_MAP[placeholder];
    const value = fieldKey && projectData ? projectData[fieldKey] : undefined;
    const hasValue = value !== undefined && value !== null && value !== '' && value !== 0;

    if (hasValue) {
      let displayValue = String(value).toUpperCase();
      if (fieldKey && DECIMAL_FIELDS.includes(fieldKey)) {
        const num = parseFloat(String(value));
        if (!isNaN(num)) displayValue = num.toFixed(2).replace('.', ',');
      }
      if (fieldKey === 'client_state') {
        displayValue = STATE_NAMES[String(value).toUpperCase()] || displayValue;
      }
      return (
        <span className="memorial-val inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mx-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700">
          {displayValue}
        </span>
      );
    }
    return (
      <span className="memorial-placeholder inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mx-0.5">{placeholder}</span>
    );
  };

  // Dimensionamento dos Cabos — Capacidade Final
  const caboCCCapacidade = parseFloat(String(projectData?.cabo_cc_capacidade_corrente_a || '0')) || 0;
  const caboCCFatorTemp = parseFloat(String(projectData?.cabo_cc_fator_temperatura || '1')) || 1;
  const caboCCFatorAgrup = parseFloat(String(projectData?.cabo_cc_fator_agrupamento || '1')) || 1;
  const caboCCFinal = caboCCCapacidade > 0 ? (caboCCCapacidade * caboCCFatorTemp * caboCCFatorAgrup).toFixed(2).replace('.', ',') : null;

  const caboCACapacidade = parseFloat(String(projectData?.cabo_ca_capacidade_corrente_a || '0')) || 0;
  const caboCAFatorTemp = parseFloat(String(projectData?.cabo_ca_fator_temperatura || '1')) || 1;
  const caboCAFatorAgrup = parseFloat(String(projectData?.cabo_ca_fator_agrupamento || '1')) || 1;
  const caboCAFinal = caboCACapacidade > 0 ? (caboCACapacidade * caboCAFatorTemp * caboCAFatorAgrup).toFixed(2).replace('.', ',') : null;

  const tableClass = "w-full border-collapse border border-gray-400 dark:border-gray-500 text-sm mb-6";
  const thClass = "border border-gray-400 dark:border-gray-500 p-2 bg-gray-100 dark:bg-gray-800 font-bold text-left";
  const tdClass = "border border-gray-400 dark:border-gray-500 p-2";
  const tdLabelClass = "border border-gray-400 dark:border-gray-500 p-2 bg-gray-50 dark:bg-gray-800 font-medium";
  const sectionClass = "mb-10";
  const h2Class = "font-bold text-lg mb-4 uppercase tracking-wide";
  const h3Class = "font-bold text-base mb-3";
  const pClass = "mb-4 text-justify leading-relaxed";

  return (
    <>
    <div ref={contentRef} className="text-gray-700 dark:text-gray-300 text-sm memorial-pdf-content mx-auto bg-white dark:bg-gray-900 shadow-md" style={{ lineHeight: '1.9', width: '794px', padding: '56px', boxSizing: 'border-box' }}>

      {/* ==================== CAPA ==================== */}
      <div className="text-center mb-16 py-8">
        <h1 className="font-bold text-2xl tracking-widest mb-8">MEMORIAL TÉCNICO DESCRITIVO</h1>
        <p className="text-base mb-8 px-4 leading-relaxed">
          <V>{`{{classificacao_da_usina}}`}</V> UTILIZANDO UM SISTEMA FOTOVOLTAICO DE <V>{`{{potencia}}`}</V> kWp
          CONECTADO À REDE DE ENERGIA ELÉTRICA DE BAIXA TENSÃO EM <V>{`{{tensao_atendimento}}`}</V> V
          CARACTERIZADO COMO <V>{`{{modalidade_compensacao}}`}</V>
        </p>
        <p className="font-bold text-lg mb-1"><V>{`{{cliente_nome}}`}</V></p>
        <p className="mb-6">CPF: <V>{`{{cliente_cpf}}`}</V></p>
        <p className="font-bold text-lg mb-1"><V>{`{{responsavel_nome}}`}</V></p>
        <p className="mb-1"><V>{`{{responsavel_profissao}}`}</V></p>
        <p className="mb-6">REGISTRO: <V>{`{{responsavel_registro}}`}</V></p>
        <p className="font-bold mb-1"><V>{`{{cidade}}`}</V> – <V>{`{{estado}}`}</V></p>
        <p><V>{`{{data}}`}</V></p>
      </div>

      <PageBreakIndicator id="siglas" spacing={spacings['siglas'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== LISTA DE SIGLAS ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>LISTA DE SIGLAS E ABREVIATURAS</h2>
        <div className="space-y-1">
          <p>ABNT: Associação Brasileira de Normas Técnicas</p>
          <p>ANEEL: Agência Nacional de Energia Elétrica</p>
          <p>BT: Baixa tensão (220/127 V, 380/220 V)</p>
          <p>C.A: Corrente Alternada</p>
          <p>C.C: Corrente Contínua</p>
          <p>CD: Custo de disponibilidade (30 kWh, 50kWh ou 100 kWh em sistemas de baixa tensão monofásicos, bifásicos ou trifásicos, respectivamente)</p>
          <p>CI: Carga Instalada</p>
          <p>DSP: Dispositivo Supressor de Surto</p>
          <p>DSV: Dispositivo de seccionamento visível</p>
          <p>FP: Fator de potência</p>
          <p>FV: Fotovoltaico</p>
          <p>GD: Geração distribuída</p>
          <p>HSP: Horas de sol pleno</p>
          <p>IEC: <em>International Electrotechnical Commission</em></p>
          <p>IN: Corrente Nominal</p>
          <p>IDG: Corrente nominal do disjuntor de entrada da unidade consumidora em ampères (A)</p>
          <p>Ist: Corrente de curto-circuito de módulo fotovoltaico em ampères (A)</p>
          <p>kW: kilo-watt</p>
          <p>kWp: kilo-watt pico</p>
          <p>kWh: kilo-watt-hora</p>
          <p>MicroGD: Microgeração distribuída</p>
          <p>MT: Média tensão (13.8 kV, 34.5 kV)</p>
          <p>NF: Fator referente ao número de fases, igual a 1 para sistemas monofásicos e bifásicos ou √3 para sistemas trifásicos</p>
          <p>PRODIST: Procedimentos de Distribuição</p>
          <p>PD: Potência disponibilizada para a unidade consumidora onde será instalada a geração distribuída</p>
          <p>PR: Pára-raio</p>
          <p>QGD: Quadro Geral de Distribuição</p>
          <p>QGBT: Quadro Geral de Baixa Tensão</p>
          <p>REN: Resolução Normativa</p>
          <p>SPDA: Sistema de Proteção contra Descargas Atmosféricas</p>
          <p>SFV: Sistema Fotovoltaico</p>
          <p>SFVCR: Sistema Fotovoltaico Conectado à Rede</p>
          <p>TC: Transformador de corrente</p>
          <p>TP: Transformador de potencial</p>
          <p>UC: Unidade Consumidora</p>
          <p>UTM: Universal Transversa de Mercator</p>
          <p>VN: Tensão nominal de atendimento em volts (V)</p>
          <p>Voc: Tensão de circuito aberto de módulo fotovoltaico em volts (V)</p>
        </div>
      </div>

      <PageBreakIndicator id="sumario" spacing={spacings['sumario'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== SUMÁRIO ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>SUMÁRIO</h2>
        <div className="space-y-1">
          <p><strong>1.</strong> OBJETIVO</p>
          <p><strong>2.</strong> REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</p>
          <p><strong>3.</strong> DOCUMENTOS OBRIGATÓRIOS</p>
          <p><strong>4.</strong> DADOS DA UNIDADE CONSUMIDORA</p>
          <p><strong>5.</strong> LEVANTAMENTO DE CARGA E CONSUMO</p>
          <p className="pl-6"><strong>5.1.</strong> Levantamento de Carga</p>
          <p><strong>6.</strong> PADRÃO DE ENTRADA</p>
          <p className="pl-6"><strong>6.1.</strong> Tipo de Ligação e Tensão de Atendimento</p>
          <p className="pl-6"><strong>6.2.</strong> Disjuntor de Entrada</p>
          <p className="pl-6"><strong>6.3.</strong> Potência Disponibilizada</p>
          <p className="pl-6"><strong>6.4.</strong> Caixa de Medição</p>
          <p className="pl-6"><strong>6.5.</strong> Ramal de Entrada</p>
          <p><strong>7.</strong> DIMENSIONAMENTO DO GERADOR</p>
          <p><strong>8.</strong> DIMENSIONAMENTO DO INVERSOR</p>
          <p><strong>9.</strong> DIMENSIONAMENTO DA PROTEÇÃO</p>
          <p className="pl-6"><strong>9.1.</strong> Chaves Seccionadoras e Disjuntores</p>
          <p className="pl-6"><strong>9.2.</strong> DPS</p>
          <p className="pl-6"><strong>9.3.</strong> Aterramento</p>
          <p className="pl-6"><strong>9.4.</strong> Requisitos de Proteção</p>
          <p><strong>10.</strong> DIMENSIONAMENTO DOS CABOS</p>
          <p><strong>11.</strong> PLACA DE ADVERTÊNCIA</p>
          <p><strong>12.</strong> ANEXOS</p>
        </div>
      </div>

      <PageBreakIndicator id="objetivo" spacing={spacings['objetivo'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 1. OBJETIVO ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>1. OBJETIVO</h2>
        <p className={pClass}>
          O presente memorial técnico descritivo tem como objetivo apresentar a metodologia utilizada para
          elaboração e apresentação à <V>{`{{distribuidora}}`}</V> - <V>{`{{estado}}`}</V>, dos documentos mínimos
          necessários, em conformidade com a REN 482, com o PRODIST Módulo 3 secção 3.7, e com as normas
          técnicas nacionais (ABNT) ou internacionais (europeia e americana), para <strong>SOLICITAÇÃO DO PARECER DE ACESSO</strong> de
          uma <V>{`{{classificacao_da_usina}}`}</V> conectada à rede de distribuição de energia elétrica através
          sistema fotovoltaico de <strong><V>{`{{potencia}}`}</V></strong> kWp, composto
          por <V>{`{{modulos_quantidade}}`}</V> módulos de <V>{`{{modulos_potencia_wp}}`}</V> Wp
          e <V>{`{{inversores_quantidade}}`}</V> inversor(es) de <V>{`{{inversores_potencia}}`}</V> kW,
          caracterizado como <strong><V>{`{{modalidade_compensacao}}`}</V></strong>.
        </p>
      </div>

      {/* ==================== 2. REFERÊNCIAS NORMATIVAS ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>2. REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</h2>
        <p className={pClass}>
          Para elaboração deste memorial técnico descritivo, no âmbito da área de concessão do estado
          do <strong><V>{`{{estado}}`}</V></strong> foram utilizadas as normas e resoluções, nas respectivas revisões vigentes, conforme descritas abaixo:
        </p>
        <div className="space-y-2 mb-4">
          {[
            'a)\tABNT NBR 5410: Instalações Elétricas de Baixa Tensão.',
            'b)\tABNT NBR 10899: Energia Solar Fotovoltaica – Terminologia.',
            'c)\tABNT NBR 11704: Sistemas Fotovoltaicos – Classificação.',
            'd)\tABNT NBR 16149: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição.',
            'e)\tABNT NBR 16150: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição – Procedimentos de ensaio de conformidade.',
            'f)\tABNT NBR IEC 62116: Procedimento de Ensaio de Anti-ilhamento para Inversores de Sistemas Fotovoltaicos Conectados à Rede Elétrica.',
            'g)\tEQUATORIAL ENERGIA NT.020.EQTL.Normas e Padrões – Conexão de Microgeração Distribuída ao Sistema de Baixa Tensão.',
            'h)\tEQUATORIAL ENERGIA NT.001.EQTL.Normas e Padrões – Fornecimento de Energia Elétrica em Baixa Tensão.',
            'i)\tEQUATORIAL ENERGIA NT.030.EQTL.Normas e Padrões - Padrões Construtivos de Caixas de Medição e Proteção.',
            'j)\tANEEL Procedimentos de Distribuição de Energia Elétrica no Sistema Elétrico Nacional – PRODIST: Módulo 3 – Acesso ao Sistema de Distribuição. Revisão 6. 2016, Seção 3.7.',
            'k)\tANEEL Resolução Normativa nº 1000, de 07 de dezembro de 2021, que estabelece as condições gerais de fornecimento de energia elétrica.',
            'l)\tANEEL Resolução Normativa ANEEL nº 482, de 17 de abril de 2012, que estabelece as condições gerais para o acesso de micro geração e mini geração distribuída aos sistemas de distribuição de energia elétrica e o sistema de compensação de energia elétrica.',
            'm)\tIEC 61727 Photovoltaic (PV) Systems - Characteristics of the Utility Interface.',
            'n)\tIEC 62116:2014 Utility-interconnected photovoltaic inverters - Test procedure of islanding prevention measures.',
          ].map((item, i) => (
            <p key={i}>{item}</p>
          ))}
        </div>
      </div>

      <PageBreakIndicator id="documentos" spacing={spacings['documentos'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 3. DOCUMENTOS OBRIGATÓRIOS ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>3. DOCUMENTOS OBRIGATÓRIOS</h2>
        <p className="mb-3 italic">Tabela 1 – Documentos obrigatórios para a solicitação de acesso de microgeração distribuída</p>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Documentos Obrigatórios</th>
              <th className={thClass + " text-center w-20"}>Até 10 kW</th>
              <th className={thClass + " text-center w-24"}>Acima de 10 kW</th>
              <th className={thClass}>Observações</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={tdClass}>1. Formulário de Solicitação de Acesso</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>2. ART do Responsável Técnico</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>3. Diagrama unifilar do sistema de geração, carga, proteção e medição</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>4. Diagrama de blocos do sistema de geração, carga e proteção</td><td className={tdClass + " text-center"}>NÃO</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}>Até 10kW apenas o diagrama unifilar</td></tr>
            <tr><td className={tdClass}>5. Memorial Técnico Descritivo</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>6. Projeto Elétrico (Planta de Situação, Diagrama Funcional, Arranjos Físicos, Datasheet)</td><td className={tdClass + " text-center"}>NÃO</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}>Itens integrantes do Projeto Elétrico</td></tr>
            <tr><td className={tdClass}>7. Certificados de Conformidade dos Inversores ou registro INMETRO</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}>Inversor acima de 10 kW: apenas certificados de conformidade</td></tr>
            <tr><td className={tdClass}>8. Dados para registro da central geradora (ANEEL)</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>9. Lista de UCs participantes do sistema de compensação</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Apenas para autoconsumo remoto, geração compartilhada e EMUC</td></tr>
            <tr><td className={tdClass}>10. Instrumento jurídico de solidariedade entre integrantes</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Apenas para EMUC e geração compartilhada</td></tr>
            <tr><td className={tdClass}>11. Documento de reconhecimento ANEEL (cogeração qualificada)</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Apenas para cogeração qualificada</td></tr>
            <tr><td className={tdClass}>12. Contrato de aluguel ou arrendamento da UC</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Quando a UC geradora for alugada ou arrendada</td></tr>
            <tr><td className={tdClass}>13. Procuração</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Quando a solicitação for feita por terceiros</td></tr>
            <tr><td className={tdClass}>14. Autorização de uso de área comum em condomínio</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Quando utilizar área comum do condomínio</td></tr>
          </tbody>
        </table>
        <p className="text-xs italic">NOTA 1: Para inversores até 10 kW é obrigatório o registro de concessão do INMETRO.</p>
      </div>

      <PageBreakIndicator id="dados-uc" spacing={spacings['dados-uc'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 4. DADOS DA UC ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>4. DADOS DA UNIDADE CONSUMIDORA</h2>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>Número da Conta Contrato</td><td className={tdClass}><V>{`{{conta_contrato}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Classe</td><td className={tdClass}><V>{`{{classe_uc}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Nome do Titular da CC</td><td className={tdClass}><V>{`{{cliente_nome}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Endereço Completo</td><td className={tdClass}><V>{`{{endereco}}`}</V>, <V>{`{{cidade}}`}</V> - <V>{`{{estado}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Número de identificação do poste e/ou transformador mais próximo</td><td className={tdClass}><V>{`{{numero_poste_transformador}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Coordenadas georreferenciadas</td><td className={tdClass}>X: <V>{`{{coord_utm_x}}`}</V>, Y: <V>{`{{coord_utm_y}}`}</V>, Fuso UTM: <V>{`{{coord_utm_fuso}}`}</V></td></tr>
          </tbody>
        </table>
        {projectData?.planta_situacao_url !== 'nao_incluir' && (
          <>
            <div className="memorial-img-container my-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/50">
              {projectData?.planta_situacao_url && projectData.planta_situacao_url !== 'pending_upload' ? (
                <img
                  src={projectData.planta_situacao_url}
                  alt="Planta de Situação"
                  className="max-h-96 mx-auto rounded-md border border-gray-200 dark:border-gray-700 object-contain"
                />
              ) : (
                <>
                  <span className="memorial-placeholder inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">{`{{planta_situacao_imagem}}`}</span>
                  <p className="text-xs text-gray-400 mt-2">Imagem da planta de situação (se disponível)</p>
                </>
              )}
            </div>
            <p className="text-xs italic text-center mb-4">Figura 1: Localização da unidade consumidora.</p>
          </>
        )}
      </div>

      {/* ==================== 5. LEVANTAMENTO DE CARGA ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>5. LEVANTAMENTO DE CARGA E CONSUMO</h2>

        <h3 className={h3Class}>5.1. Levantamento de Carga</h3>
        <p className="mb-3 italic">Tabela 2 – Levantamento de carga</p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs mb-2">
            <thead>
              <tr className="bg-blue-900 text-white">
                <th className="border border-gray-400 px-1 py-1 text-center w-8">ITEM</th>
                <th className="border border-gray-400 px-1 py-1 text-left">DESCRIÇÃO</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">P (W)<br/>[A]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">QUANT.<br/>[B]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">CI (kW)<br/>[C=(A×B)/1000]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">FP<br/>[D]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">CI (kVA)<br/>[E=C/D]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">FD<br/>[F]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">D(kW)<br/>[G=C×F]</th>
                <th className="border border-gray-400 px-1 py-1 text-center whitespace-nowrap">D(kVA)<br/>[H=E×F]</th>
                {onSaveCargaTable && <th className="border border-gray-400 px-1 py-1 w-6"></th>}
              </tr>
            </thead>
            <tbody>
              {cargaRows.map((row, idx) => {
                const { C, E, G, H } = calcRow(row);
                const inputCls = 'w-full bg-transparent border-0 outline-none text-center text-xs py-0 px-0 focus:bg-blue-50 dark:focus:bg-blue-900/20 rounded';
                const inputDescCls = 'w-full bg-transparent border-0 outline-none text-xs py-0 px-0 focus:bg-blue-50 dark:focus:bg-blue-900/20 rounded';
                const isEditable = !!onSaveCargaTable;
                return (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 px-1 py-0.5">
                      {isEditable
                        ? <input className={inputDescCls} value={row.descricao} onChange={e => updateCargaRow(row.id, 'descricao', e.target.value)} />
                        : row.descricao}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isEditable
                        ? <input className={inputCls} value={row.potencia_w} onChange={e => updateCargaRow(row.id, 'potencia_w', e.target.value)} />
                        : row.potencia_w}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isEditable
                        ? <input className={inputCls} value={row.quantidade} onChange={e => updateCargaRow(row.id, 'quantidade', e.target.value)} />
                        : row.quantidade}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700 dark:text-gray-300">{fmtBR(C)}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isEditable
                        ? <input className={inputCls} value={row.fp} onChange={e => updateCargaRow(row.id, 'fp', e.target.value)} />
                        : row.fp}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700 dark:text-gray-300">{fmtBR(E)}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                      {isEditable
                        ? <input className={inputCls} value={row.fd} onChange={e => updateCargaRow(row.id, 'fd', e.target.value)} />
                        : row.fd}
                    </td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700 dark:text-gray-300">{fmtBR(G)}</td>
                    <td className="border border-gray-300 px-1 py-0.5 text-center text-gray-700 dark:text-gray-300">{fmtBR(H)}</td>
                    {isEditable && (
                      <td className="border border-gray-300 px-1 py-0.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeCargaRow(row.id)}
                          className="text-red-400 hover:text-red-600 text-xs leading-none"
                          title="Remover linha"
                        >✕</button>
                      </td>
                    )}
                  </tr>
                );
              })}
              <tr className="font-semibold bg-blue-50 dark:bg-blue-900/20">
                <td className="border border-gray-300 px-1 py-0.5" colSpan={onSaveCargaTable ? 3 : 3}></td>
                <td className="border border-gray-300 px-1 py-0.5 text-center font-bold" colSpan={1}>TOTAL</td>
                <td className="border border-gray-300 px-1 py-0.5 text-center">{fmtBR(cargaTotals.C)}</td>
                <td className="border border-gray-300 px-1 py-0.5"></td>
                <td className="border border-gray-300 px-1 py-0.5 text-center">{fmtBR(cargaTotals.E)}</td>
                <td className="border border-gray-300 px-1 py-0.5"></td>
                <td className="border border-gray-300 px-1 py-0.5 text-center">{fmtBR(cargaTotals.G)}</td>
                <td className="border border-gray-300 px-1 py-0.5 text-center">{fmtBR(cargaTotals.H)}</td>
                {onSaveCargaTable && <td className="border border-gray-300 px-1 py-0.5"></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {onSaveCargaTable && (
          <div className="flex items-center gap-2 mt-2 no-print">
            <button
              type="button"
              onClick={addCargaRow}
              className="text-xs px-2 py-1 rounded border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >+ Adicionar linha</button>
            <button
              type="button"
              onClick={saveCarga}
              disabled={cargaSaving}
              className="text-xs px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
            >{cargaSaving ? 'Salvando…' : cargaSaved ? '✓ Salvo' : 'Salvar tabela'}</button>
          </div>
        )}

      </div>

      {/* ==================== 6. PADRÃO DE ENTRADA ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>6. PADRÃO DE ENTRADA</h2>

        <h3 className={h3Class}>6.1. Tipo de Ligação e Tensão de Atendimento</h3>
        {(() => {
          const tipoConexao = projectData?.tipo_conexao;
          const secaoFaseRL = projectData?.secao_fase_rl_mm2;
          const secaoNeutroRL = projectData?.secao_neutro_rl_mm2;
          const condutorMap: Record<string, { total: string; nFase: string; nFaseNum: number }> = {
            'Monofásico': { total: 'dois', nFase: 'um', nFaseNum: 1 },
            'Bifásico':   { total: 'três', nFase: 'dois', nFaseNum: 2 },
            'Trifásico':  { total: 'quatro', nFase: 'três', nFaseNum: 3 },
          };
          const cond = tipoConexao ? condutorMap[tipoConexao] : null;
          const hasRL = secaoFaseRL && secaoNeutroRL;

          return (
            <p className={pClass}>
              A unidade consumidora está ligada em ramal de ligação em baixa tensão, através de um
              circuito <strong><V>{`{{tipo_conexao}}`}</V></strong>
              {cond && hasRL ? (
                <> a <strong>{cond.total} condutores</strong>, sendo <strong>{cond.nFase} condutor{cond.nFaseNum > 1 ? 'es' : ''} FASE</strong> de seção transversal
                de <strong>{secaoFaseRL} mm²</strong> e <strong>um condutor NEUTRO</strong> de seção transversal
                de <strong>{secaoNeutroRL} mm²</strong>,</>
              ) : (
                <> <V>{`{{secao_fase_rl_mm2}}`}</V></>
              )}
              {' '}com tensão de atendimento
              em <strong><V>{`{{tensao_atendimento}}`}</V></strong> V, derivado de uma
              rede <strong><V>{`{{tipo_ramal}}`}</V></strong> de distribuição secundária
              da <V>{`{{distribuidora}}`}</V> no estado do <V>{`{{estado}}`}</V>.
            </p>
          );
        })()}

        <h3 className={h3Class}>6.2. Disjuntor de Entrada</h3>
        <p className={pClass}>
          No ponto de entrega/conexão é instalado um disjuntor termomagnético, em conformidade com
          as normas e padrões da <V>{`{{distribuidora}}`}</V>, com as seguintes características:
        </p>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>NÚMERO DE POLOS</td><td className={tdClass}><V>{`{{disjuntor_polos}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>TENSÃO NOMINAL</td><td className={tdClass}><V>{`{{disjuntor_tensao_v}}`}</V> V</td></tr>
            <tr><td className={tdLabelClass}>CORRENTE NOMINAL</td><td className={tdClass}><V>{`{{disjuntor_corrente_a}}`}</V> A</td></tr>
            <tr><td className={tdLabelClass}>FREQUÊNCIA NOMINAL</td><td className={tdClass}>60 Hz</td></tr>
            <tr><td className={tdLabelClass}>ELEMENTO DE PROTEÇÃO</td><td className={tdClass}>TERMOMAGNÉTICO</td></tr>
            <tr><td className={tdLabelClass}>CAPACIDADE MÁXIMA DE INTERRUPÇÃO</td><td className={tdClass}>3,0 kA</td></tr>
            <tr><td className={tdLabelClass}>ACIONAMENTO</td><td className={tdClass}>MANUAL</td></tr>
            <tr><td className={tdLabelClass}>CURVA DE ATUAÇÃO (DISPARO)</td><td className={tdClass}>C</td></tr>
          </tbody>
        </table>

        <h3 className={h3Class}>6.3. Potência Disponibilizada</h3>
        <p className={pClass}>
          A potência disponibilizada para a unidade consumidora onde será instalada
          a <V>{`{{classificacao_da_usina}}`}</V> é igual à:
        </p>
        {(() => {
          const tensaoStr = projectData?.tensao_atendimento;
          const corrente = parseFloat(String(projectData?.disjuntor_corrente_a || 0));
          const tipoConexao = projectData?.tipo_conexao;

          const vn = tensaoStr === '127/220' ? 220 : tensaoStr === '220/380' ? 380 : 0;
          const nf = tipoConexao === 'Trifásico' ? Math.sqrt(3) : 1;
          const nfLabel = tipoConexao === 'Trifásico' ? '√3' : '1';
          const canCalc = vn > 0 && corrente > 0;
          const pdKva = canCalc ? (vn * corrente * nf) / 1000 : 0;
          const pdKw = pdKva * 0.92;

          return (
            <>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4 font-mono text-xs space-y-1">
                <p>PD [kVA] = (VN [V] × IDG [A] × NF) / 1000</p>
                <p>PD [kW] = PD [kVA] × FP</p>
                <p className="mt-2">VN = {vn > 0 ? <span className="memorial-val inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700">{vn} V</span> : <V>{`{{tensao_atendimento}}`}</V>} (tensão de linha)</p>
                <p>IDG = <V>{`{{disjuntor_corrente_a}}`}</V> A</p>
                <p>NF = {tipoConexao ? <span className="memorial-val inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700">{nfLabel}</span> : <span className="memorial-placeholder inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">conforme tipo de ligação</span>} {tipoConexao ? `(${tipoConexao})` : ''}</p>
                <p>FP = 0,92</p>
                {canCalc && (
                  <>
                    <hr className="my-2 border-gray-300 dark:border-gray-600" />
                    <p className="font-bold">PD [kVA] = ({vn} × {corrente} × {nfLabel}) / 1000 = <span className="memorial-val inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700">{pdKva.toFixed(2).replace('.', ',')} kVA</span></p>
                    <p className="font-bold">PD [kW] = {pdKva.toFixed(2).replace('.', ',')} × 0,92 = <span className="memorial-val inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-700">{pdKw.toFixed(3).replace('.', ',')} kW</span></p>
                  </>
                )}
              </div>
              <p className="text-xs italic mb-4">NOTA 2: A potência de geração deve ser menor ou igual à potência disponibilizada PD em kW.</p>
            </>
          );
        })()}

        <PageBreakIndicator id="caixa-medicao" spacing={spacings['caixa-medicao'] || 0} onSpacingChange={handleSpacingChange} />
        <h3 className={`${h3Class} ${PAGE_BREAK} pt-2`}>6.4. Caixa de Medição</h3>
        <p className={pClass}>
          A caixa de medição é polifásica em material polimérico, com dimensões de{' '}
          {projectData?.caixa_medicao_comprimento_mm && projectData?.caixa_medicao_altura_mm && projectData?.caixa_medicao_largura_mm ? (
            <span className="memorial-val inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mx-0.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700">
              {projectData.caixa_medicao_comprimento_mm} mm x {projectData.caixa_medicao_altura_mm} mm x {projectData.caixa_medicao_largura_mm} mm
            </span>
          ) : (
            <span className="memorial-placeholder inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mx-0.5">{`{{dimensoes_caixa_medicao}}`}</span>
          )}
          {' '}(comprimento, altura e largura), está instalada em fachada, no ponto de entrega
          caracterizado como o limite da via pública com a propriedade, atendendo aos requisitos de localização,
          facilidade de acesso e layout, em conformidade com as normas da concessionária NT.001.EQTL e NT.030.EQTL.
        </p>
        <p className={pClass}>
          O aterramento da caixa de medição é com haste(s) de aço cobreado de comprimento 1500 mm e diâmetro
          16 mm (5/8&quot;), condutor de 10 mm² com conector tipo cunha para haste de material protegido contra
          corrosão, sob pressão de parafusos, sem o emprego de solda e acessível à inspeção.
        </p>
        <div className="memorial-img-container my-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/50">
          {projectData?.caixa_medicao_imagem_url ? (
            <>
              <img
                src={projectData.caixa_medicao_imagem_url}
                alt={projectData.caixa_medicao_nome || 'Caixa de Medição'}
                className="max-h-72 mx-auto rounded-md border border-gray-200 dark:border-gray-700 object-contain"
              />
              <p className="text-xs italic text-center mt-3">
                Figura 2: Desenho dimensional da caixa de medição — {projectData.caixa_medicao_nome || 'Modelo selecionado'}.
              </p>
            </>
          ) : (
            <>
              <span className="memorial-placeholder inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">{`{{caixa_medicao_imagem}}`}</span>
              <p className="text-xs text-gray-400 mt-2">Desenho dimensional da caixa de medição (selecione no &quot;Conferir Informações&quot;)</p>
            </>
          )}
        </div>

        <h3 className={h3Class}>6.5. Ramal de Entrada</h3>
        {(() => {
          const tipoConexaoRE = projectData?.tipo_conexao;
          const secaoFaseRE = projectData?.secao_fase_mm2;
          const secaoNeutroRE = projectData?.secao_neutro_mm2;
          const condutorMapRE: Record<string, { total: string; nFase: string; nFaseNum: number }> = {
            'Monofásico': { total: 'dois', nFase: 'um', nFaseNum: 1 },
            'Bifásico':   { total: 'três', nFase: 'dois', nFaseNum: 2 },
            'Trifásico':  { total: 'quatro', nFase: 'três', nFaseNum: 3 },
          };
          const condRE = tipoConexaoRE ? condutorMapRE[tipoConexaoRE] : null;
          const hasRE = secaoFaseRE && secaoNeutroRE;

          return (
            <p className={pClass}>
              O ramal de entrada da unidade consumidora é através de um
              circuito <strong><V>{`{{tipo_conexao}}`}</V></strong>
              {condRE && hasRE ? (
                <> a <strong>{condRE.total} condutores</strong>, sendo <strong>{condRE.nFase} condutor{condRE.nFaseNum > 1 ? 'es' : ''} FASE</strong> de seção transversal
                de <strong>{secaoFaseRE} mm²</strong> e <strong>um condutor NEUTRO</strong> de seção transversal
                de <strong>{secaoNeutroRE} mm²</strong></>
              ) : (
                <>, sendo condutor(es) FASE de seção transversal
                de <V>{`{{secao_fase_mm2}}`}</V> mm² e condutor NEUTRO de seção transversal
                de <V>{`{{secao_neutro_mm2}}`}</V> mm²</>
              )}
              {' '}com isolação em HEPR/XLPE 90ºC e tensão de atendimento
              de <strong><V>{`{{tensao_atendimento}}`}</V></strong> V.
            </p>
          );
        })()}
      </div>

      <PageBreakIndicator id="dim-gerador" spacing={spacings['dim-gerador'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 7. DIMENSIONAMENTO DO GERADOR ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>7. DIMENSIONAMENTO DO GERADOR</h2>
        <p className="mb-3">Características técnicas dos módulos fotovoltaicos:</p>
        <p className="mb-3 italic">Tabela 4 – Características técnicas dos módulos fotovoltaicos</p>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>Fabricante</td><td className={tdClass}><V>{`{{modulos_fabricante}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Modelo</td><td className={tdClass}><V>{`{{modulos_modelo}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Potência nominal – Pn [W]</td><td className={tdClass}><V>{`{{modulos_potencia_wp}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tensão de circuito aberto – Voc [V]</td><td className={tdClass}><V>{`{{modulos_voc}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Corrente de curto-circuito – Isc [A]</td><td className={tdClass}><V>{`{{modulos_isc}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tensão de máxima potência – Vpmp [V]</td><td className={tdClass}><V>{`{{modulos_vpmp}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Corrente de máxima potência – Ipmp [A]</td><td className={tdClass}><V>{`{{modulos_ipmp}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Eficiência [%]</td><td className={tdClass}><V>{`{{modulos_eficiencia}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Comprimento [m]</td><td className={tdClass}><V>{`{{modulos_comprimento_m}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Largura [m]</td><td className={tdClass}><V>{`{{modulos_largura_m}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Área [m²]</td><td className={tdClass}><V>{`{{modulos_area_unitaria_m2}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Peso [kg]</td><td className={tdClass}><V>{`{{modulos_peso_kg}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Quantidade</td><td className={tdClass}><V>{`{{modulos_quantidade}}`}</V></td></tr>
            <tr><td className={tdLabelClass}><strong>Potência total instalada</strong></td><td className={tdClass}><V>{`{{modulos_quantidade}}`}</V> × <V>{`{{modulos_potencia_wp}}`}</V> Wp = <strong><V>{`{{potencia}}`}</V> kWp</strong></td></tr>
          </tbody>
        </table>
      </div>

      {/* ==================== 8. DIMENSIONAMENTO DO INVERSOR ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>8. DIMENSIONAMENTO DO INVERSOR</h2>
        <p className="mb-3">Características técnicas do inversor:</p>
        <p className="mb-3 italic">Tabela 5 – Características técnicas do inversor</p>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>Fabricante</td><td className={tdClass}><V>{`{{inversores_fabricante}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Modelo</td><td className={tdClass}><V>{`{{inversores_modelo}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Quantidade</td><td className={tdClass}><V>{`{{inversores_quantidade}}`}</V></td></tr>
            <tr><td className={tdLabelClass} colSpan={2}><strong>Entrada</strong></td></tr>
            <tr><td className={tdLabelClass}>Máxima tensão CC – Vcc-máx [V]</td><td className={tdClass}><V>{`{{inversores_vcc_max}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Máxima corrente CC – Icc-máx [A]</td><td className={tdClass}><V>{`{{inversores_icc_max}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Máxima tensão MPPT – Vpmp-máx [V]</td><td className={tdClass}><V>{`{{inversores_vpmp_max}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Mínima tensão MPPT – Vpmp-min [V]</td><td className={tdClass}><V>{`{{inversores_vpmp_min}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tensão CC de partida – Vcc-part [V]</td><td className={tdClass}><V>{`{{inversores_vcc_partida}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Quantidade de MPPTs</td><td className={tdClass}><V>{`{{inversores_quantidade_mppt}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Quantidade de entradas por MPPT</td><td className={tdClass}><V>{`{{inversores_entradas_por_mppt}}`}</V></td></tr>
            <tr><td className={tdLabelClass} colSpan={2}><strong>Saída</strong></td></tr>
            <tr><td className={tdLabelClass}>Potência nominal – Pn [kW]</td><td className={tdClass}><V>{`{{inversores_potencia}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Máxima potência na saída CA – Pca-máx [kW]</td><td className={tdClass}><V>{`{{inversores_potencia_max_saida}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tensão nominal CA [V]</td><td className={tdClass}><V>{`{{inversores_tensao}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Máxima tensão CA – Vca-máx [V]</td><td className={tdClass}><V>{`{{inversores_tensao_max_ca}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Mínima tensão CA – Vca-min [V]</td><td className={tdClass}><V>{`{{inversores_tensao_min_ca}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Corrente máxima CA [A]</td><td className={tdClass}><V>{`{{inversores_corrente_nominal}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Frequência [Hz]</td><td className={tdClass}>60</td></tr>
            <tr><td className={tdLabelClass}>THD de corrente [%]</td><td className={tdClass}><V>{`{{inversores_dht_corrente}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Fator de potência</td><td className={tdClass}><V>{`{{inversores_fator_potencia}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tipo de conexão</td><td className={tdClass}><V>{`{{inversores_tipo_conexao_saida}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Eficiência máxima [%]</td><td className={tdClass}><V>{`{{inversores_rendimento}}`}</V></td></tr>
          </tbody>
        </table>
      </div>

      <PageBreakIndicator id="dim-protecao" spacing={spacings['dim-protecao'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 9. DIMENSIONAMENTO DA PROTEÇÃO ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>9. DIMENSIONAMENTO DA PROTEÇÃO</h2>

        <h3 className={h3Class}>9.1. Chaves Seccionadoras e Disjuntores</h3>
        <p className="mb-2"><strong>Chave Seccionadora CC:</strong></p>
        <ul className="list-disc list-inside mb-4"><li>Acoplado ao Inversor Fotovoltaico.</li></ul>
        <p className="mb-2"><strong>Disjuntor CA:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Número de polos: <V>{`{{disjuntor_polos}}`}</V></li>
          <li>Tensão nominal CA [V]: <V>{`{{tensao_atendimento}}`}</V></li>
          <li>Corrente Nominal [A]: <V>{`{{disjuntor_ca_corrente_a}}`}</V></li>
          <li>Frequência [Hz]: 60</li>
          <li>Capacidade máxima de interrupção [kA]: 3,0</li>
          <li>Curva de atuação: C</li>
        </ul>

        <h3 className={h3Class}>9.2. DPS</h3>
        <p className="mb-2"><strong>Tipo CC:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Classe: II</li>
          <li>Tensão CC [V]: 1000</li>
          <li>Corrente nominal [kA]: 20</li>
          <li>Corrente máxima [kA]: 40</li>
        </ul>
        <p className="mb-2"><strong>Tipo CA:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Classe: II</li>
          <li>Tensão CA [V]: 275</li>
          <li>Corrente nominal [kA]: 20</li>
          <li>Corrente máxima [kA]: 40</li>
        </ul>

        <PageBreakIndicator id="aterramento" spacing={spacings['aterramento'] || 0} onSpacingChange={handleSpacingChange} />
        <h3 className={`${h3Class} ${PAGE_BREAK} pt-2`}>9.3. Aterramento</h3>
        <p className={pClass}>
          A geração distribuída deve possuir uma malha de terra, esta malha de terra deve ser conectada ao
          sistema de aterramento existente da unidade consumidora, tornando os sistemas de aterramento equipotencializados.
        </p>
        <ul className="list-disc list-inside mb-4 space-y-1">
          <li>Geometria da malha e distância entre hastes: TN-S;</li>
          <li>Hastes de aterramento: haste cobreada com diâmetro de 3/4&quot; e comprimento de 2400 mm;</li>
          <li>Quantidade de hastes: 1;</li>
          <li>Cabos do aterramento da malha, da interligação com a geração e da equipotencialização: malha de aterramento de cobre com isolação em PVC seção transversal de <V>{`{{secao_aterramento_mm2}}`}</V> mm²;</li>
          <li>Conector tipo cunha para haste;</li>
          <li>Valor da resistência de aterramento: 15 ohms;</li>
          <li>Barramento de equipotencialização: Barramento de cobre de medidas 1/2&quot; x 1/16&quot;.</li>
        </ul>

        <h3 className={h3Class}>9.4. Requisitos de Proteção</h3>
        <p className="font-bold text-center mb-2">Tabela 7 – Características técnicas do gerador</p>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Requisito de Proteção</th>
              <th className={`${thClass} text-center`}>Obrigatório</th>
              <th className={`${thClass} text-center`}>Ajuste</th>
              <th className={`${thClass} text-center`}>Tempo máximo de atuação</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={tdClass}>Elemento de interrupção (52)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>Não aplicável</td>
              <td className={`${tdClass} text-center`}>Não aplicável</td>
            </tr>
            <tr>
              <td className={tdClass}>Proteção de subtensão (27)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>0,8 p. u.</td>
              <td className={`${tdClass} text-center`}>0,4 seg</td>
            </tr>
            <tr>
              <td className={tdClass}>Proteção de sobretensão (59)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>1,1 p. u.</td>
              <td className={`${tdClass} text-center`}>0,2 seg</td>
            </tr>
            <tr>
              <td className={tdClass}>Proteção de subfrequência (81U)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>59,5 Hz</td>
              <td className={`${tdClass} text-center`}>0,2 seg</td>
            </tr>
            <tr>
              <td className={tdClass}>Proteção de sobrefrequência (81O)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>60,5 Hz</td>
              <td className={`${tdClass} text-center`}>0,2 seg</td>
            </tr>
            <tr>
              <td className={tdClass}>Relé de sincronismo (25)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>10º/10% tensão/0,3 Hz</td>
              <td className={`${tdClass} text-center`}>Não aplicável</td>
            </tr>
            <tr>
              <td className={tdClass}>Anti-ilhamento (78 e 81 df/dt – ROCOF)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>-</td>
              <td className={`${tdClass} text-center`}>0,2 seg</td>
            </tr>
            <tr>
              <td className={tdClass}>Proteção de injeção de componente C.C (I<sub>C.C</sub>) na rede elétrica (sistemas com inversor sem transformador para separação galvânica)</td>
              <td className={`${tdClass} text-center`}>Sim</td>
              <td className={`${tdClass} text-center`}>I<sub>c.c</sub> {'>'} 0,5 · I<sub>N</sub></td>
              <td className={`${tdClass} text-center`}>1 seg</td>
            </tr>
            <tr>
              <td className={tdClass}>Tempo de Reconexão (temporizador) (62)</td>
              <td className={`${tdClass} text-center`}>Opcional, quando não usar inversor</td>
              <td className={`${tdClass} text-center`}>Não aplicável</td>
              <td className={`${tdClass} text-center`}>Não aplicável</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PageBreakIndicator id="dim-cabos" spacing={spacings['dim-cabos'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 10. DIMENSIONAMENTO DOS CABOS ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>10. DIMENSIONAMENTO DOS CABOS</h2>

        <p className="mb-2"><strong>Cabos CC:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Isolação: XLPE/XLPO</li>
          <li>Isolamento: 1,8 kV</li>
          <li>Seção Transversal [mm²]: <V>{`{{cabo_cc_secao_mm2}}`}</V></li>
          <li>Método de Instalação: B1 (Cabos instalados ao ar livre), em temperatura ambiente de 40º C, instalação ao ar livre exposta ao sol, modo de instalação 1.</li>
          <li>Capacidade de corrente básica do cabo: <V>{`{{cabo_cc_capacidade_corrente_a}}`}</V> A</li>
          <li>Fator de correção por temperatura: <V>{`{{cabo_cc_fator_temperatura}}`}</V></li>
          <li>Fator de Agrupamento: <V>{`{{cabo_cc_fator_agrupamento}}`}</V></li>
          {caboCCFinal ? (
            <li>
              Capacidade final do cabo (A) = {caboCCCapacidade} × {caboCCFatorTemp.toFixed(2).replace('.', ',')} × {caboCCFatorAgrup.toFixed(2).replace('.', ',')} = <strong>{caboCCFinal} A</strong>
            </li>
          ) : (
            <li className="text-gray-400 italic">Capacidade final do cabo (A) = aguardando preenchimento dos dados</li>
          )}
        </ul>

        <p className="mb-2"><strong>Cabos CA:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Isolação: PVC</li>
          <li>Isolamento: 1,0 kV</li>
          <li>Seção Transversal [mm²]: <V>{`{{cabo_ca_secao_mm2}}`}</V></li>
          <li>Método de Instalação: B1 (cabos unipolares em eletrodutos aparentes), com dois condutores carregados.</li>
          <li>Capacidade de corrente básica do cabo: <V>{`{{cabo_ca_capacidade_corrente_a}}`}</V> A</li>
          <li>Fator de correção por temperatura: <V>{`{{cabo_ca_fator_temperatura}}`}</V></li>
          <li>Fator de Agrupamento: <V>{`{{cabo_ca_fator_agrupamento}}`}</V></li>
          {caboCAFinal ? (
            <li>
              Capacidade final do cabo (A) = {caboCACapacidade} × {caboCAFatorTemp.toFixed(2).replace('.', ',')} × {caboCAFatorAgrup.toFixed(2).replace('.', ',')} = <strong>{caboCAFinal} A</strong>
            </li>
          ) : (
            <li className="text-gray-400 italic">Capacidade final do cabo (A) = aguardando preenchimento dos dados</li>
          )}
        </ul>
      </div>

      <PageBreakIndicator id="placa-advertencia" spacing={spacings['placa-advertencia'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 11. PLACA DE ADVERTÊNCIA ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>11. PLACA DE ADVERTÊNCIA</h2>
        <p className="mb-2">Características da Placa:</p>
        <ul className="list-disc list-inside mb-4">
          <li>Espessura: 2 mm</li>
          <li>Material: Policarbonato com aditivos anti-raios UV (ultravioleta)</li>
          <li>Gravação: As letras devem ser em Arial Black</li>
          <li>Acabamento: Deve possuir cor amarela, obtida por processo de masterização com 2%, assegurando opacidade que permita adequada visualização das marcações pintadas na superfície da placa</li>
        </ul>
        <div className="memorial-img-container my-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/50">
          {placaAdvertencia?.imagem_url ? (
            <>
              <img
                src={placaAdvertencia.imagem_url}
                alt={placaAdvertencia.nome || 'Placa de Advertência'}
                className="max-h-64 mx-auto rounded-md border border-gray-200 dark:border-gray-700 object-contain"
              />
            </>
          ) : (
            <>
              <span className="memorial-placeholder inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">{`{{placa_advertencia_imagem}}`}</span>
              <p className="text-xs text-gray-400 mt-2">Cadastre a placa de advertência no Acervo Técnico da distribuidora</p>
            </>
          )}
        </div>
        <p className="text-xs italic text-center">Figura 4: Placa de advertência.</p>
      </div>

      <PageBreakIndicator id="anexos" spacing={spacings['anexos'] || 0} onSpacingChange={handleSpacingChange} />
      {/* ==================== 12. ANEXOS ==================== */}
      <div className={`${sectionClass} ${PAGE_BREAK}`}>
        <h2 className={h2Class}>12. ANEXOS</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Anexo I - Solicitação de Acesso</li>
          <li>Anexo II - Responsabilidade Técnica</li>
          <li>Anexo III - Datasheet Módulo</li>
          <li>Anexo IV - Registro Inmetro Módulo</li>
          <li>Anexo V - Datasheet Inversor</li>
          <li>Anexo VI - Registro Inmetro Inversor</li>
          <li>Anexo VII - Diagrama Unifilar</li>
          <li>Anexo VIII - Quadros de Proteção</li>
          <li>Anexo IX - Instalação do Sistema</li>
          <li>Anexo X - Diagrama de Blocos</li>
          <li>Anexo XI - Planta de Situação</li>
        </ul>
      </div>

    </div>

    <div className="mt-6 flex justify-center">
      <Button
        onClick={handleGeneratePdf}
        disabled={generating}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FileDown className="mr-2 h-5 w-5" />
            Gerar PDF do Memorial
          </>
        )}
      </Button>
    </div>
    </>
  );
}
