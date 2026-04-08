'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface DiagramaUnifilarPreviewProps {
  projectData?: Record<string, any>;
}

function fv(val: any, fb = '___'): string {
  if (val === undefined || val === null || val === '') return fb;
  return String(val);
}

function fn(val: any, dec = 2, fb = '___'): string {
  if (val === undefined || val === null || val === '') return fb;
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n) || n === 0) return fb;
  return n.toFixed(dec).replace('.', ',');
}

// ── Electrical Symbols ──────────────────────────────────────────────────────

function Terra({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + 7} stroke="#000" strokeWidth="1" />
      <line x1={x - 11} y1={y + 7}  x2={x + 11} y2={y + 7}  stroke="#000" strokeWidth="1.3" />
      <line x1={x - 7}  y1={y + 11} x2={x + 7}  y2={y + 11} stroke="#000" strokeWidth="1.3" />
      <line x1={x - 3}  y1={y + 15} x2={x + 3}  y2={y + 15} stroke="#000" strokeWidth="1.3" />
    </g>
  );
}

function Disjuntor({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 11} y={y - 7} width={22} height={14} fill="white" stroke="#000" strokeWidth="1" />
      <line x1={x - 7} y1={y - 4} x2={x + 7} y2={y + 4} stroke="#000" strokeWidth="0.8" />
    </g>
  );
}

function DPSSymbol({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 9} y={y - 9} width={18} height={18} fill="white" stroke="#000" strokeWidth="0.8" />
      <polygon points={`${x},${y - 5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill="#000" />
      <line x1={x - 5} y1={y + 5} x2={x + 5} y2={y + 5} stroke="#000" strokeWidth="0.8" />
    </g>
  );
}

function ChaveSeccionadora({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x}      cy={y}      r={3.5} fill="white" stroke="#000" strokeWidth="0.9" />
      <line x1={x} y1={y - 3.5} x2={x + 14} y2={y - 17} stroke="#000" strokeWidth="1" />
      <circle cx={x + 14} cy={y - 17} r={3.5} fill="white" stroke="#000" strokeWidth="0.9" />
    </g>
  );
}

export function DiagramaUnifilarPreview({ projectData }: DiagramaUnifilarPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const pd = projectData || {};

  // ── Derived values ─────────────────────────────────────────────────────────
  const modQtd    = parseInt(fv(pd.modulos_quantidade, '0')) || 0;
  const modWp     = parseFloat(fv(pd.modulos_potencia_wp, '0')) || 0;
  const potRaw    = parseFloat(fv(pd.potencia, '0')) || 0;
  const potTotal  = potRaw > 0 ? potRaw : (modQtd > 0 && modWp > 0 ? (modQtd * modWp) / 1000 : 0);
  const potKwp    = fn(potTotal);

  const strQtd    = parseInt(fv(pd.inversores_quantidade_mppt, '0')) || 0;
  const modPerStr = strQtd > 0 && modQtd > 0 ? Math.round(modQtd / strQtd) : modQtd;
  const strDescr  = strQtd > 1
    ? `${strQtd} (${strQtd}x${String(modPerStr).padStart(2, '0')} módulos)`
    : `${modQtd} módulos`;

  const vpmp       = parseFloat(fv(pd.modulos_vpmp, '0')) || 0;
  const tensaoStr  = vpmp > 0 && modPerStr > 0 ? fn(vpmp * modPerStr) : fv(pd.inversores_tensao);
  const corrStr    = fv(pd.modulos_ipmp);

  const tensaoNom  = fv(pd.tensao_atendimento, '220');
  const tensaoNomN = parseFloat(tensaoNom.replace(',', '.')) || 220;
  const cargaKw    = fv(pd.carga_declarada_kw);
  const corrCargas = cargaKw !== '___'
    ? fn(parseFloat(cargaKw.replace(',', '.')) * 1000 / tensaoNomN)
    : '___';

  const invFab     = pd.inversores_fabricante ? String(pd.inversores_fabricante).toUpperCase() : '___';
  const invMod     = fv(pd.inversores_modelo);
  const invPot     = fn(pd.inversores_potencia);
  const invVccMax  = fv(pd.inversores_vcc_max, '600');
  const invIccMax  = fv(pd.inversores_icc_max, '24');
  const invCorrOut = fv(pd.inversores_corrente_nominal);

  const caboCC     = fv(pd.cabo_cc_secao_mm2, '4,0');
  const caboCA     = fv(pd.cabo_ca_secao_mm2, '10,0');
  const secaoFase  = fv(pd.secao_fase_mm2, '10,0');

  const djPolos    = parseInt(fv(pd.disjuntor_polos, '1')) || 1;
  const djCorr     = fv(pd.disjuntor_corrente_a, '40');
  const djTensao   = fv(pd.disjuntor_tensao_v, '415');
  const djTipo     = djPolos <= 1 ? 'Monopolar' : 'Bipolar';
  const djLabel    = `${djTipo} - ${djCorr} A / ${djTensao} Vca`;

  const owner      = fv(pd.nomeClienteFinal,  'NOME DO PROPRIETÁRIO');
  const endereco   = fv(pd.endereco_local,    'ENDEREÇO DA OBRA');
  const cidade     = fv(pd.client_city,       'Cidade');
  const uf         = fv(pd.client_state,      '');
  const cep        = fv(pd.cliente_cep,       '00.000-000');
  const respNome   = fv(pd.responsavel_nome,  'RESPONSÁVEL TÉCNICO');
  const respCft    = fv(pd.responsavel_registro, '00000000000');
  const dataDoc    = fv(pd.data_documento, new Date().toLocaleDateString('pt-BR'));

  // ── Layout constants ────────────────────────────────────────────────────────
  const CX = 340;        // main vertical centerline X
  const BX = 220;        // box left X
  const BW = 240;        // box width
  const BR = BX + BW;    // box right X = 460

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { DiagramaUnifilarPDF } = await import('./DiagramaUnifilarPDF');
      const React = await import('react');
      const clientName = pd?.nomeClienteFinal || 'projeto';
      const filename = `Diagrama Unifilar - ${clientName}.pdf`;
      const blob = await pdf(React.createElement(DiagramaUnifilarPDF, { projectData })).toBlob();
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

  return (
    <>
      <div style={{ overflow: 'auto' }}>
        <svg
          viewBox="0 0 900 1090"
          width="100%"
          style={{ maxWidth: 900, display: 'block', margin: '0 auto' }}
          xmlns="http://www.w3.org/2000/svg"
          fontFamily="Arial, Helvetica, sans-serif"
        >

          {/* ═══════════════ REDE DE BAIXA TENSÃO ═══════════════ */}
          <line x1="90" y1="28" x2="490" y2="28" stroke="#000" strokeWidth="1.8" />
          <text x={CX} y="21" fontSize="8" fontWeight="bold" textAnchor="middle">REDE DE BAIXA TENSÃO</text>

          {/* Ponto de entrega */}
          <line    x1={CX} y1="28" x2={CX} y2="44" stroke="#000" strokeWidth="1" />
          <polygon points={`${CX - 5},28 ${CX + 5},28 ${CX},40`} fill="#000" />
          <text x={CX + 8} y="37" fontSize="6.5">PONTO DE ENTREGA</text>
          <text x={CX + 8} y="47" fontSize="6.5">ACESSADA</text>
          <text x={CX + 8} y="57" fontSize="6.5">ACESSANTE</text>

          {/* ═══════════════ PADRÃO DE ENTRADA ═══════════════ */}
          <rect x={BX} y="42" width={BW} height="150" fill="white" stroke="#000" strokeWidth="1.2" />
          {/* Label right-shifted inside box */}
          <text x="406" y="57" fontSize="7.5" fontWeight="bold" textAnchor="middle">PADRÃO DE ENTRADA</text>
          <text x="406" y="67" fontSize="6"   textAnchor="middle">(caixa de medição)</text>

          {/* Main vertical — starts at box top (y=42) to close the small gap */}
          <line x1={CX} y1="42" x2={CX} y2="138" stroke="#000" strokeWidth="1" />

          {/* Horizontal tap to MEDIDOR (branch right) */}
          <line x1={CX} y1="85" x2="355" y2="85" stroke="#000" strokeWidth="1" />

          {/* MEDIDOR box — right of main line */}
          <rect x="355" y="71" width="95" height="28" fill="white" stroke="#000" strokeWidth="1" />
          <text x="402" y="88" fontSize="9" fontWeight="bold" textAnchor="middle">MEDIDOR</text>

          {/* Ramal de Ligação — drawn AFTER rects so it's visible over white fills */}
          <text x="228" y="78"  fontSize="5.8" fontWeight="bold">Ramal de Ligação</text>
          <text x="228" y="87"  fontSize="5.8">Alumínio Concêntrico - 1,0 kV</text>
          <text x="228" y="96"  fontSize="5.8">{`1 #${secaoFase}mm² (F)`}</text>
          <text x="228" y="105" fontSize="5.8">{`1 #${secaoFase}mm² (N)`}</text>

          {/* D1 on main vertical line */}
          <Disjuntor x={CX} y={145} />
          <text x={CX + 15} y="143" fontSize="6.5">D1</text>
          <text x={CX + 15} y="152" fontSize="5.5">{djLabel}</text>

          {/* Wire D1 → exit + ground right */}
          <line x1={CX} y1="152" x2={CX} y2="165" stroke="#000" strokeWidth="1" />
          <line x1={CX} y1="165" x2={BR - 18} y2="165" stroke="#000" strokeWidth="1" />
          <Terra x={BR - 18} y={165} />

          {/* Wire out of PADRÃO */}
          <line x1={CX} y1="165" x2={CX} y2="220" stroke="#000" strokeWidth="1" />

          {/* ═══════════════ QUADRO DE DISTRIBUIÇÃO ═══════════════ */}
          {/* Wider box (x=150) — cargas derivation inside the rect */}
          <rect x="150" y="220" width="310" height="82" fill="white" stroke="#000" strokeWidth="1.2" />
          {/* Label — upper right */}
          <text x={BR - 8} y="233" fontSize="8.5" fontWeight="bold" textAnchor="end">QUADRO DE DISTRIBUIÇÃO</text>

          {/* Main vertical line through box */}
          <line x1={CX} y1="220" x2={CX} y2="302" stroke="#000" strokeWidth="1" />

          {/* Barramento horizontal (full width of wider box) */}
          <line x1="150" y1="255" x2={BR} y2="255" stroke="#000" strokeWidth="1" />

          {/* Terra — right branch (short) */}
          <line x1={BR} y1="255" x2={BR + 22} y2="255" stroke="#000" strokeWidth="1" />
          <Terra x={BR + 22} y={255} />

          {/* Cargas derivation — inside box (x=195), drops with arrow */}
          <line x1="195" y1="255" x2="195" y2="315" stroke="#000" strokeWidth="1" />
          <polygon points="190,315 200,315 195,325" fill="#000" />
          <text x="202" y="311" fontSize="5.8">{`Cargas (${cargaKw !== '___' ? cargaKw : '--'} kW)`}</text>
          <text x="202" y="320" fontSize="5.8">{`Tensão Nominal: ${tensaoNom} V`}</text>
          <text x="202" y="329" fontSize="5.8">{`Corrente: ${corrCargas !== '___' ? corrCargas : '--'} A`}</text>

          {/* Wire → QUADRO CA (+10px extra gap) */}
          <line x1={CX} y1="302" x2={CX} y2="358" stroke="#000" strokeWidth="1" />

          {/* CA cables annotation — centered on main line */}
          <line x1={CX} y1="330" x2={CX + 12} y2="330" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 15} y="323" fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70° - 1,0 kV</text>
          <text x={CX + 15} y="331" fontSize="5.5">{`1 #${caboCA}mm² (F)`}</text>
          <text x={CX + 15} y="339" fontSize="5.5">{`1 #${caboCA}mm² (N)`}</text>
          <text x={CX + 15} y="347" fontSize="5.5">{`1 #${caboCA}mm² (T)`}</text>

          {/* ═══════════════ QUADRO DE PROTEÇÃO CA ═══════════════ */}
          <rect x={BX} y="358" width={BW} height="122" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={BR - 8} y="370" fontSize="8" fontWeight="bold" textAnchor="end">QUADRO DE</text>
          <text x={BR - 8} y="382" fontSize="8" fontWeight="bold" textAnchor="end">PROTEÇÃO CA</text>

          {/* DPS CA label (left inside box) */}
          <text x="228" y="396" fontSize="5.5" fontWeight="bold">2x DPS CA</text>
          <text x="228" y="405" fontSize="5.5">275 Vca, 20-40 kA</text>
          <text x="228" y="414" fontSize="5.5">Classe II</text>

          {/* Tap main wire → DPS CA (shifted right for label clearance) */}
          <line x1={CX} y1="365" x2="290" y2="365" stroke="#000" strokeWidth="0.8" />
          <line x1="290" y1="365" x2="290" y2="417" stroke="#000" strokeWidth="0.8" />
          <DPSSymbol x={290} y={426} />
          <line x1="290" y1="435" x2="290" y2="447" stroke="#000" strokeWidth="0.8" />
          <Terra x={290} y={447} />

          {/* D2 on main wire */}
          <line x1={CX} y1="365" x2={CX} y2="397" stroke="#000" strokeWidth="1" />
          <Disjuntor x={CX} y={405} />
          <text x={CX + 15} y="403" fontSize="6.5">D2</text>
          <text x={CX + 15} y="413" fontSize="5.5">Bipolar - {djCorr} A / {djTensao} Vca</text>
          <line x1={CX} y1="412" x2={CX} y2="480" stroke="#000" strokeWidth="1" />

          {/* Wire → INVERSOR */}
          <line x1={CX} y1="480" x2={CX} y2="514" stroke="#000" strokeWidth="1" />

          {/* CA cables annotation LEFT (below QUADRO CA) */}
          <line x1={BX} y1="491" x2={BX - 14} y2="491" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x="5" y="483" fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70° - 1,0 kV</text>
          <text x="5" y="492" fontSize="5.5">1 #{caboCA}mm² (F)</text>
          <text x="5" y="500" fontSize="5.5">1 #{caboCA}mm² (N)</text>
          <text x="5" y="508" fontSize="5.5">1 #{caboCA}mm² (T)</text>

          {/* ═══════════════ INVERSOR ═══════════════ */}
          <rect x={BX} y="514" width={BW} height="110" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="572" fontSize="8.5" fontWeight="bold" textAnchor="middle">INVERSOR</text>

          {/* DC = symbol */}
          <line x1={CX - 24} y1="556" x2={CX - 10} y2="556" stroke="#000" strokeWidth="0.9" />
          <line x1={CX - 24} y1="560" x2={CX - 10} y2="560" stroke="#000" strokeWidth="0.9" />
          {/* AC ~ symbol */}
          <path
            d={`M${CX + 10},558 Q${CX + 14},551 ${CX + 18},558 Q${CX + 22},565 ${CX + 26},558`}
            stroke="#000" strokeWidth="0.9" fill="none"
          />

          {/* Inversor info (left annotation) */}
          <line x1={BX} y1="561" x2={BX - 14} y2="561" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x="5" y="521" fontSize="5.5">Marca: {invFab}</text>
          <text x="5" y="530" fontSize="5.5">Modelo: {invMod}</text>
          <text x="5" y="539" fontSize="5.5">Potência: {invPot} kW</text>
          <text x="5" y="548" fontSize="5.5">Entrada - Tensão max: {invVccMax} Vcc</text>
          <text x="5" y="557" fontSize="5.5">  - Corrente max: {invIccMax} A</text>
          <text x="5" y="566" fontSize="5.5">Saída - Tensão: {tensaoNom} Vca</text>
          <text x="5" y="575" fontSize="5.5">  - Corrente: {invCorrOut} A</text>
          <text x="5" y="584" fontSize="5.5" fontStyle="italic">Ver datasheet para mais detalhes</text>

          {/* Protection relay boxes (right) */}
          {([
            { l: '25', s: '' },
            { l: '27', s: '' },
            { l: '59', s: '' },
            { l: '81', s: 'U/O' },
          ] as { l: string; s: string }[]).map(({ l, s }, i) => (
            <g key={l}>
              <rect x={BR + 8} y={520 + i * 25} width={26} height={20} fill="white" stroke="#000" strokeWidth="0.8" />
              <text
                x={BR + 21}
                y={s ? 531 + i * 25 : 534 + i * 25}
                fontSize="7" fontWeight="bold" textAnchor="middle"
              >{l}</text>
              {s && (
                <text x={BR + 21} y={538 + i * 25} fontSize="5.5" textAnchor="middle">{s}</text>
              )}
            </g>
          ))}
          {/* ANTI-ILHAMENTO line + label */}
          <line x1={BR + 34} y1="614" x2={BR + 56} y2="614" stroke="#000" strokeWidth="0.8" />
          <text x={BR + 58} y="618" fontSize="6">ANTI-ILHAMENTO</text>

          {/* Wire INVERSOR → QUADRO CC */}
          <line x1={CX} y1="624" x2={CX} y2="668" stroke="#000" strokeWidth="1" />

          {/* CC cables annotation RIGHT (inversor→quadro CC) */}
          <line x1={BR} y1="645" x2={BR + 14} y2="645" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={BR + 17} y="639" fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
          <text x={BR + 17} y="647" fontSize="5.5">HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 17} y="655" fontSize="5.5">Para cada string:</text>
          <text x={BR + 17} y="662" fontSize="5.5">1 #{caboCC}mm² (-)</text>
          <text x={BR + 17} y="669" fontSize="5.5">1 #{caboCC}mm² (+)</text>
          <text x={BR + 17} y="677" fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 17} y="684" fontSize="5.5">1 #6,0mm² (T)</text>

          {/* ═══════════════ QUADRO DE PROTEÇÃO CC ═══════════════ */}
          <rect x={BX} y="668" width={BW} height="140" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="692" fontSize="8" fontWeight="bold" textAnchor="middle">QUADRO DE</text>
          <text x={CX} y="704" fontSize="8" fontWeight="bold" textAnchor="middle">PROTEÇÃO CC</text>

          {/* (ACOPLADO AO INVERSOR FV) left annotation */}
          <text x="5" y="677" fontSize="5.5">(ACOPLADO AO</text>
          <text x="5" y="686" fontSize="5.5">INVERSOR FV)</text>

          {/* DPS CC label (left inside box) */}
          <text x="228" y="718" fontSize="5.5" fontWeight="bold">DPS CC</text>
          <text x="228" y="727" fontSize="5.5">1040 Vcc, 18-40 kA</text>
          <text x="228" y="736" fontSize="5.5">Classe II</text>

          {/* Tap main → DPS CC */}
          <line x1={CX} y1="685" x2="257" y2="685" stroke="#000" strokeWidth="0.8" />
          <line x1="257" y1="685" x2="257" y2="740" stroke="#000" strokeWidth="0.8" />
          <DPSSymbol x={257} y={749} />
          <line x1="257" y1="758" x2="257" y2="770" stroke="#000" strokeWidth="0.8" />
          <Terra x={257} y={770} />

          {/* C1 Chave Seccionadora on main wire */}
          <line x1={CX} y1="685" x2={CX} y2="718" stroke="#000" strokeWidth="1" />
          <ChaveSeccionadora x={CX} y={726} />
          {/* second terminal wire up */}
          <line x1={CX + 14} y1="709" x2={CX + 14} y2="703" stroke="#000" strokeWidth="0.8" />
          <text x={CX + 22} y="718" fontSize="5.5">C1</text>
          <text x={CX + 22} y="728" fontSize="5.5">Chave Seccionadora</text>
          <text x={CX + 22} y="737" fontSize="5.5">(4 polos)</text>
          <text x={CX + 22} y="746" fontSize="5.5">1200 Vcc 32 A</text>

          {/* Wire out of QUADRO CC */}
          <line x1={CX} y1="743" x2={CX} y2="808" stroke="#000" strokeWidth="1" />

          {/* CC cables annotation RIGHT (below QUADRO CC) */}
          <line x1={BR} y1="780" x2={BR + 14} y2="780" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={BR + 17} y="775" fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
          <text x={BR + 17} y="783" fontSize="5.5">HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 17} y="791" fontSize="5.5">Para cada string:</text>
          <text x={BR + 17} y="798" fontSize="5.5">1 #{caboCC}mm² (-)</text>
          <text x={BR + 17} y="805" fontSize="5.5">1 #{caboCC}mm² (+)</text>
          <text x={BR + 17} y="813" fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 17} y="820" fontSize="5.5">1 #6,0mm² (T)</text>

          {/* ═══════════════ G — GERADOR ═══════════════ */}
          <line x1={CX} y1="808" x2={CX} y2="845" stroke="#000" strokeWidth="1" />
          <circle cx={CX} cy="881" r="35" fill="white" stroke="#000" strokeWidth="1.5" />
          <text x={CX} y="888" fontSize="22" fontWeight="bold" textAnchor="middle">G</text>
          <line x1={CX} y1="916" x2={CX} y2="930" stroke="#000" strokeWidth="1.2" />
          <Terra x={CX} y={930} />

          {/* Module annotation (right of G) */}
          <line x1={CX + 35} y1="881" x2={CX + 52} y2="881" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 55} y="848" fontSize="5.5" fontWeight="bold">Módulos Fotovoltaicos:</text>
          <text x={CX + 55} y="858" fontSize="5.5">Marca: {fv(pd.modulos_fabricante)}</text>
          <text x={CX + 55} y="867" fontSize="5.5">Modelo: {fv(pd.modulos_modelo)}</text>
          <text x={CX + 55} y="876" fontSize="5.5">Potência do módulo: {fv(pd.modulos_potencia_wp)} W</text>
          <text x={CX + 55} y="885" fontSize="5.5">Tensão do módulo: {fv(pd.modulos_vpmp)} V</text>
          <text x={CX + 55} y="894" fontSize="5.5">Corrente de saída do módulo: {fv(pd.modulos_ipmp)} A</text>
          <text x={CX + 55} y="903" fontSize="5.5">Quantidade: {modQtd > 0 ? `${modQtd} (${strDescr})` : '___'}</text>
          <text x={CX + 55} y="912" fontSize="5.5">Potência total: {potKwp} kWp</text>
          <text x={CX + 55} y="921" fontSize="5.5">Tensão de operação strings: {tensaoStr} V</text>
          <text x={CX + 55} y="930" fontSize="5.5">Corrente de saída das strings: {corrStr} A</text>

          {/* ═══════════════ LEGENDA (top right) ═══════════════ */}
          <rect x="655" y="22" width="238" height="215" fill="white" stroke="#000" strokeWidth="1" />
          <text x="774" y="38" fontSize="8" fontWeight="bold" textAnchor="middle">LEGENDA:</text>
          {[
            'D1: Disjuntor de entrada ou geral da',
            '       unidade consumidora',
            'D2: Disjuntor de proteção do inversor',
            'D3: Disjuntor de proteção do inversor',
            'C1: Chave Seccionadora CC de',
            '       proteção do gerador',
            'D: Disjuntor de proteção da carga',
            'G: Gerador fotovoltaico',
            '25: Sincronismo',
            '27: Subtensão',
            '59: Sobretensão',
            '81 U/O: Sub/sobrefrequência',
            'NP: Número de polos do disjuntor',
            'YYY A: Corrente nominal',
          ].map((ln, i) => (
            <text key={i} x="663" y={52 + i * 13} fontSize="6.5">{ln}</text>
          ))}

          {/* ═══════════════ DETALHE 1 (right panel, below legenda) ═══════════════ */}
          <text x="748" y="262" fontSize="7.5" fontWeight="bold" textAnchor="middle">DETALHE 1</text>
          {/* Two DPS arresters with common ground — absolute coords */}
          {/* Left arrester */}
          <line x1="714" y1="266" x2="714" y2="278" stroke="#000" strokeWidth="1" />
          <rect x="703" y="278" width="22" height="18" fill="white" stroke="#000" strokeWidth="0.8" />
          <polygon points="714,281 708,291 720,291" fill="#000" />
          <line x1="707" y1="292" x2="721" y2="292" stroke="#000" strokeWidth="0.8" />
          <line x1="714" y1="296" x2="714" y2="306" stroke="#000" strokeWidth="0.8" />
          {/* top bridge to right arrester */}
          <line x1="714" y1="278" x2="714" y2="272" stroke="#000" strokeWidth="1" />
          <line x1="714" y1="272" x2="746" y2="272" stroke="#000" strokeWidth="1" />
          <line x1="746" y1="272" x2="746" y2="278" stroke="#000" strokeWidth="1" />
          {/* Right arrester */}
          <rect x="735" y="278" width="22" height="18" fill="white" stroke="#000" strokeWidth="0.8" />
          <polygon points="746,281 740,291 752,291" fill="#000" />
          <line x1="739" y1="292" x2="753" y2="292" stroke="#000" strokeWidth="0.8" />
          <line x1="746" y1="296" x2="746" y2="306" stroke="#000" strokeWidth="0.8" />
          {/* common ground bar */}
          <line x1="700" y1="306" x2="760" y2="306" stroke="#000" strokeWidth="1" />
          <line x1="730" y1="306" x2="730" y2="316" stroke="#000" strokeWidth="1" />
          <line x1="720" y1="316" x2="740" y2="316" stroke="#000" strokeWidth="1.3" />
          <line x1="724" y1="320" x2="736" y2="320" stroke="#000" strokeWidth="1.3" />
          <line x1="728" y1="324" x2="732" y2="324" stroke="#000" strokeWidth="1.3" />

          {/* ═══════════════ TITLE BLOCK ═══════════════ */}
          <rect x="5" y="978" width="885" height="112" fill="white" stroke="#000" strokeWidth="1.2" />

          {/* Vertical dividers: Left|Mid at x=178, Mid|Right at x=700 */}
          <line x1="178" y1="978" x2="178" y2="1090" stroke="#000" strokeWidth="0.8" />
          <line x1="700" y1="978" x2="700" y2="1090" stroke="#000" strokeWidth="0.8" />
          {/* Left sub-col: label area | R values — starts below PRODUTO section */}
          <line x1="118" y1="1008" x2="118" y2="1090" stroke="#000" strokeWidth="0.6" />

          {/* Horizontal dividers */}
          {/* Below PRODUTO section (left + mid cols) */}
          <line x1="5"   y1="1008" x2="700" y2="1008" stroke="#000" strokeWidth="0.7" />
          {/* Left col — 4 equal rows of 16px + last row to 1090 */}
          <line x1="5"   y1="1024" x2="178" y2="1024" stroke="#000" strokeWidth="0.5" />
          <line x1="5"   y1="1040" x2="178" y2="1040" stroke="#000" strokeWidth="0.5" />
          <line x1="5"   y1="1056" x2="178" y2="1056" stroke="#000" strokeWidth="0.5" />
          <line x1="5"   y1="1072" x2="178" y2="1072" stroke="#000" strokeWidth="0.5" />
          {/* Mid col: owner | resp separator (aligns with left col row 3 end) */}
          <line x1="178" y1="1056" x2="700" y2="1056" stroke="#000" strokeWidth="0.5" />

          {/* === LEFT COLUMN — PRODUTO (top, full width, centered) === */}
          <text x="8"  y="987"  fontSize="5.5" fontWeight="bold">PRODUTO</text>
          <text x="92" y="1002" fontSize="9"   fontWeight="bold" textAnchor="middle">GFV {potKwp} kWp</text>

          {/* DATA  (row 1: y=1008–1024) */}
          <text x="8"  y="1015" fontSize="5.5" fontWeight="bold">DATA</text>
          <text x="62" y="1022" fontSize="6"   textAnchor="middle">{dataDoc}</text>
          <text x="148" y="1019" fontSize="5.5" textAnchor="middle">R1:</text>

          {/* ESCALA  (row 2: y=1024–1040) */}
          <text x="8"  y="1031" fontSize="5.5" fontWeight="bold">ESCALA</text>
          <text x="62" y="1038" fontSize="6"   textAnchor="middle">S/ ESCALA</text>
          <text x="148" y="1035" fontSize="5.5" textAnchor="middle">R2:</text>

          {/* TAMANHO  (row 3: y=1040–1056) */}
          <text x="8"  y="1047" fontSize="5.5" fontWeight="bold">TAMANHO</text>
          <text x="62" y="1054" fontSize="6"   textAnchor="middle">A3</text>
          <text x="148" y="1051" fontSize="5.5" textAnchor="middle">R3:</text>

          {/* FOLHA  (row 4: y=1056–1072) */}
          <text x="8"  y="1063" fontSize="5.5" fontWeight="bold">FOLHA</text>
          <text x="62" y="1070" fontSize="6"   textAnchor="middle">1/1</text>
          <text x="148" y="1067" fontSize="5.5" textAnchor="middle">R4:</text>

          {/* REVISÃO  (row 5: y=1072–1090) */}
          <text x="8"  y="1079" fontSize="5.5" fontWeight="bold">REVISÃO</text>
          <text x="62" y="1086" fontSize="6"   textAnchor="middle">R0</text>
          <text x="148" y="1083" fontSize="5.5" textAnchor="middle">R5:</text>

          {/* === MIDDLE COLUMN — TÍTULO (top) === */}
          <text x="185" y="989" fontSize="5.5" fontWeight="bold">TÍTULO</text>
          <text x="439" y="1003" fontSize="11" fontWeight="bold" textAnchor="middle">DIAGRAMA UNIFILAR</text>

          {/* === MIDDLE COLUMN — OWNER BLOCK (y=1008–1056, 5 items equidistant 9px) === */}
          <text x="439" y="1017" fontSize="5.5" fontWeight="bold" textAnchor="middle">Proprietário e Obra:</text>
          <text x="439" y="1026" fontSize="6" textAnchor="middle">Nome: {owner}</text>
          <text x="439" y="1035" fontSize="6" textAnchor="middle">Endereço: {endereco}</text>
          <text x="439" y="1044" fontSize="6" textAnchor="middle">Cidade: {uf ? `${cidade} - ${uf}` : cidade}</text>
          <text x="439" y="1053" fontSize="6" textAnchor="middle">CEP: {cep}</text>

          {/* === MIDDLE COLUMN — RESPONSÁVEL BLOCK (y=1056–1090, 4 items equidistant 8px) === */}
          <text x="439" y="1065" fontSize="5.5" fontWeight="bold" textAnchor="middle">Responsável Técnico:</text>
          <text x="439" y="1073" fontSize="6" fontWeight="bold" textAnchor="middle">{respNome}</text>
          <text x="439" y="1081" fontSize="5.5" textAnchor="middle">TÉCNICO EM ELETROTÉCNICA</text>
          <text x="439" y="1089" fontSize="5.5" textAnchor="middle">CFT: {respCft}</text>

          {/* === RIGHT COLUMN — Logo placeholder === */}
          <text x="792" y="1034" fontSize="6" textAnchor="middle" fill="#999">[Logo]</text>

        </svg>
      </div>

      {/* PDF download button */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleGeneratePdf}
          disabled={generating}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
        >
          {generating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
          ) : (
            <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Diagrama Unifilar</>
          )}
        </Button>
      </div>
    </>
  );
}
