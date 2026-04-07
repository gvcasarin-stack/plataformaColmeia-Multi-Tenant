'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';

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
      <line x1={x - 11} y1={y + 7} x2={x + 11} y2={y + 7} stroke="#000" strokeWidth="1.3" />
      <line x1={x - 7}  y1={y + 11} x2={x + 7}  y2={y + 11} stroke="#000" strokeWidth="1.3" />
      <line x1={x - 3}  y1={y + 15} x2={x + 3}  y2={y + 15} stroke="#000" strokeWidth="1.3" />
    </g>
  );
}

function Disjuntor({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 11} y={y - 7} width={22} height={14} fill="white" stroke="#000" strokeWidth="1" />
      <line x1={x - 6} y1={y - 7} x2={x + 6} y2={y + 7} stroke="#000" strokeWidth="0.8" />
    </g>
  );
}

function DPSBox({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 9} y={y - 9} width={18} height={18} fill="white" stroke="#000" strokeWidth="0.8" />
      <polygon points={`${x},${y - 6} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill="#000" />
      <line x1={x - 6} y1={y + 5} x2={x + 6} y2={y + 5} stroke="#000" strokeWidth="0.8" />
    </g>
  );
}

function ChaveSeccionadora({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={3.5} fill="white" stroke="#000" strokeWidth="0.9" />
      <line x1={x} y1={y - 3.5} x2={x + 14} y2={y - 17} stroke="#000" strokeWidth="1" />
      <circle cx={x + 14} cy={y - 17} r={3.5} fill="white" stroke="#000" strokeWidth="0.9" />
    </g>
  );
}

export function DiagramaUnifilarPreview({ projectData }: DiagramaUnifilarPreviewProps) {
  const [printing, setPrinting] = useState(false);
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

  const vpmp        = parseFloat(fv(pd.modulos_vpmp, '0')) || 0;
  const tensaoStr   = vpmp > 0 && modPerStr > 0 ? fn(vpmp * modPerStr, 2) : fv(pd.inversores_tensao);
  const corrStr     = fv(pd.modulos_ipmp);

  const tensaoNom   = fv(pd.tensao_atendimento, '220');
  const tensaoNomN  = parseFloat(tensaoNom.replace(',', '.')) || 220;
  const cargaKw     = fv(pd.carga_declarada_kw);
  const corrCargas  = cargaKw !== '___'
    ? fn(parseFloat(cargaKw.replace(',', '.')) * 1000 / tensaoNomN, 2)
    : '___';

  const invFab      = pd.inversores_fabricante ? String(pd.inversores_fabricante).toUpperCase() : '___';
  const invMod      = fv(pd.inversores_modelo);
  const invPot      = fn(pd.inversores_potencia);
  const invVccMax   = fv(pd.inversores_vcc_max, '600');
  const invIccMax   = fv(pd.inversores_icc_max, '24');
  const invCorrSaida = fv(pd.inversores_corrente_nominal);

  const caboCC      = fv(pd.cabo_cc_secao_mm2, '4,0');
  const caboCA      = fv(pd.cabo_ca_secao_mm2, '10,0');
  const secaoFase   = fv(pd.secao_fase_mm2, '10,0');

  const djPolos     = parseInt(fv(pd.disjuntor_polos, '1')) || 1;
  const djCorr      = fv(pd.disjuntor_corrente_a, '40');
  const djTensao    = fv(pd.disjuntor_tensao_v, '415');
  const djTipo      = djPolos <= 1 ? 'Monopolar' : 'Bipolar';
  const djLabel     = `${djTipo} - ${djCorr} A / ${djTensao} Vca`;

  const owner       = fv(pd.nomeClienteFinal, 'NOME DO PROPRIETÁRIO');
  const endereco    = fv(pd.endereco_local, 'ENDEREÇO DA OBRA');
  const cidade      = fv(pd.client_city, 'Cidade');
  const cep         = fv(pd.cliente_cep, '00.000-000');
  const respNome    = fv(pd.responsavel_nome, 'RESPONSÁVEL TÉCNICO');
  const respCft     = fv(pd.responsavel_registro, '00000000000');
  const dataDoc     = fv(pd.data_documento, new Date().toLocaleDateString('pt-BR'));

  // ── Layout constants ────────────────────────────────────────────────────────
  const CX = 310;  // main vertical centerline
  const BX = 185;  // box left
  const BW = 250;  // box width
  const BR = BX + BW; // box right = 435

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  };

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .unifilar-print-area { display: block !important; }
          @page { size: A2 portrait; margin: 8mm; }
        }
      `}</style>

      <div className="unifilar-print-area overflow-auto">
        <svg
          viewBox="0 0 850 1090"
          width="100%"
          style={{ maxWidth: 850, display: 'block', margin: '0 auto' }}
          xmlns="http://www.w3.org/2000/svg"
          fontFamily="Arial, Helvetica, sans-serif"
        >

          {/* ═══════════════════════════════════════════════════════════════
              REDE DE BAIXA TENSÃO
          ════════════════════════════════════════════════════════════════ */}
          <line x1="60" y1="28" x2="450" y2="28" stroke="#000" strokeWidth="1.5" />
          <text x="255" y="21" fontSize="8" fontWeight="bold" textAnchor="middle">REDE DE BAIXA TENSÃO</text>

          {/* Ponto de entrega arrow */}
          <line x1={CX} y1="28" x2={CX} y2="44" stroke="#000" strokeWidth="1" />
          <polygon points={`${CX - 5},28 ${CX + 5},28 ${CX},40`} fill="#000" />
          <text x={CX + 8} y="37" fontSize="6.5">PONTO DE ENTREGA</text>
          <text x={CX + 8} y="49" fontSize="6.5">ACESSADA</text>
          <text x={CX + 8} y="59" fontSize="6.5">ACESSANTE</text>

          {/* Ramal de Ligação annotation (left) */}
          <line x1={BX} y1="80" x2="130" y2="80" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <line x1="130" y1="28" x2="130" y2="80" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x="5"  y="44" fontSize="5.8">Ramal de Ligação</text>
          <text x="5"  y="53" fontSize="5.8">Alumínio Concêntrico - 1,0 kV</text>
          <text x="5"  y="62" fontSize="5.8">1 #{secaoFase}mm² (F)</text>
          <text x="5"  y="71" fontSize="5.8">1 #{secaoFase}mm² (N)</text>

          {/* ═══════════════════════════════════════════════════════════════
              PADRÃO DE ENTRADA (box)
          ════════════════════════════════════════════════════════════════ */}
          <rect x={BX} y="44" width={BW} height="148" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="60" fontSize="8.5" fontWeight="bold" textAnchor="middle">PADRÃO DE ENTRADA</text>
          <text x={CX} y="72" fontSize="7"   textAnchor="middle">(caixa de medição)</text>

          {/* MEDIDOR inner box */}
          <rect x="242" y="78" width="136" height="38" fill="white" stroke="#000" strokeWidth="1" />
          <text x={CX} y="101" fontSize="9" fontWeight="bold" textAnchor="middle">MEDIDOR</text>

          {/* wire MEDIDOR → D1 */}
          <line x1={CX} y1="116" x2={CX} y2="138" stroke="#000" strokeWidth="1" />

          {/* D1 */}
          <Disjuntor x={CX} y={145} />
          <text x={CX + 15} y="143" fontSize="6.5">D1</text>
          <text x={CX + 15} y="153" fontSize="5.5">{djLabel}</text>

          {/* wire D1 → bottom of PADRÃO */}
          <line x1={CX} y1="152" x2={CX} y2="165" stroke="#000" strokeWidth="1" />

          {/* Ground right side of PADRÃO */}
          <line x1={CX} y1="165" x2="425" y2="165" stroke="#000" strokeWidth="1" />
          <Terra x={425} y={165} />

          {/* wire PADRÃO → QUADRO DISTRIBUIÇÃO */}
          <line x1={CX} y1="165" x2={CX} y2="200" stroke="#000" strokeWidth="1" />

          {/* ═══════════════════════════════════════════════════════════════
              QUADRO DE DISTRIBUIÇÃO
          ════════════════════════════════════════════════════════════════ */}
          <rect x={BX} y="200" width={BW} height="82" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="246" fontSize="8.5" fontWeight="bold" textAnchor="middle">QUADRO DE DISTRIBUIÇÃO</text>

          {/* Left branch → cargas + ground */}
          <line x1={BX} y1="241" x2="105" y2="241" stroke="#000" strokeWidth="1" />
          <line x1="105" y1="241" x2="105" y2="270" stroke="#000" strokeWidth="1" />
          <Terra x={105} y={270} />

          {/* Cargas annotation (left) */}
          <text x="5" y="218" fontSize="5.8">Cargas ({cargaKw !== '___' ? cargaKw : '--'} kW)</text>
          <text x="5" y="227" fontSize="5.8">Tensão Nominal: {tensaoNom} V</text>
          <text x="5" y="236" fontSize="5.8">Corrente: {corrCargas !== '___' ? corrCargas : '--'} A</text>

          {/* wire → QUADRO CA */}
          <line x1={CX} y1="282" x2={CX} y2="318" stroke="#000" strokeWidth="1" />

          {/* CA cable annotation (right) */}
          <line x1={BR} y1="298" x2={BR + 12} y2="298" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={BR + 15} y="294" fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70° - 1,0 kV</text>
          <text x={BR + 15} y="303" fontSize="5.5">1 #{caboCA}mm² (F)</text>
          <text x={BR + 15} y="311" fontSize="5.5">1 #{caboCA}mm² (N)</text>
          <text x={BR + 15} y="319" fontSize="5.5">1 #{caboCA}mm² (T)</text>

          {/* ═══════════════════════════════════════════════════════════════
              QUADRO DE PROTEÇÃO CA
          ════════════════════════════════════════════════════════════════ */}
          <rect x={BX} y="318" width={BW} height="118" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="337" fontSize="8" fontWeight="bold" textAnchor="middle">QUADRO DE</text>
          <text x={CX} y="349" fontSize="8" fontWeight="bold" textAnchor="middle">PROTEÇÃO CA</text>

          {/* DPS CA (left of box) */}
          <text x="196" y="367" fontSize="5.5" fontWeight="bold">2x DPS CA</text>
          <text x="196" y="376" fontSize="5.5">275 Vca, 20-40 kA</text>
          <text x="196" y="385" fontSize="5.5">Classe II</text>

          {/* tap from main wire to DPS CA */}
          <line x1={CX} y1="360" x2="233" y2="360" stroke="#000" strokeWidth="0.8" />
          <line x1="233" y1="360" x2="233" y2="388" stroke="#000" strokeWidth="0.8" />
          <DPSBox x={233} y={397} />
          <line x1="233" y1="406" x2="233" y2="416" stroke="#000" strokeWidth="0.8" />
          <Terra x={233} y={416} />

          {/* D2 on main wire */}
          <line x1={CX} y1="360" x2={CX} y2="393" stroke="#000" strokeWidth="1" />
          <Disjuntor x={CX} y={400} />
          <text x={CX + 15} y="398" fontSize="6.5">D2</text>
          <text x={CX + 15} y="408" fontSize="5.5">Bipolar - {djCorr} A / {djTensao} Vca</text>
          <line x1={CX} y1="407" x2={CX} y2="436" stroke="#000" strokeWidth="1" />

          {/* wire → INVERSOR */}
          <line x1={CX} y1="436" x2={CX} y2="476" stroke="#000" strokeWidth="1" />

          {/* CA cables annotation (left, below QUADRO CA) */}
          <line x1={BX} y1="455" x2={BX - 12} y2="455" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x="5" y="449" fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70° - 1,0 kV</text>
          <text x="5" y="458" fontSize="5.5">1 #{caboCA}mm² (F)</text>
          <text x="5" y="467" fontSize="5.5">1 #{caboCA}mm² (N)</text>
          <text x="5" y="476" fontSize="5.5">1 #{caboCA}mm² (T)</text>

          {/* ═══════════════════════════════════════════════════════════════
              INVERSOR
          ════════════════════════════════════════════════════════════════ */}
          <rect x={BX} y="476" width={BW} height="108" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="534" fontSize="8.5" fontWeight="bold" textAnchor="middle">INVERSOR</text>

          {/* DC = symbol */}
          <line x1={CX - 22} y1="518" x2={CX - 9}  y2="518" stroke="#000" strokeWidth="0.9" />
          <line x1={CX - 22} y1="522" x2={CX - 9}  y2="522" stroke="#000" strokeWidth="0.9" />
          {/* AC ~ symbol */}
          <path d={`M${CX + 9},520 Q${CX + 13},513 ${CX + 17},520 Q${CX + 21},527 ${CX + 25},520`}
                stroke="#000" strokeWidth="0.9" fill="none" />

          {/* Inversor info (left) */}
          <text x="5" y="484" fontSize="5.5">Marca: {invFab}</text>
          <text x="5" y="493" fontSize="5.5">Modelo: {invMod}</text>
          <text x="5" y="502" fontSize="5.5">Potência: {invPot} kW</text>
          <text x="5" y="511" fontSize="5.5">Entrada - Tensão max: {invVccMax} Vcc</text>
          <text x="5" y="520" fontSize="5.5">  - Corrente max: {invIccMax} A</text>
          <text x="5" y="529" fontSize="5.5">Saída - Tensão: {tensaoNom} Vca</text>
          <text x="5" y="538" fontSize="5.5">  - Corrente: {invCorrSaida} A</text>
          <text x="5" y="547" fontSize="5.5" fontStyle="italic">Ver datasheet para mais detalhes</text>

          {/* Protection relay boxes (right) */}
          {[
            { label: '25', sub: '' },
            { label: '27', sub: '' },
            { label: '59', sub: '' },
            { label: '81', sub: 'U/O' },
          ].map(({ label, sub }, i) => (
            <g key={label}>
              <rect x={BR + 6} y={482 + i * 24} width={26} height={20} fill="white" stroke="#000" strokeWidth="0.8" />
              <text x={BR + 19} y={sub ? 493 + i * 24 : 496 + i * 24} fontSize="7" fontWeight="bold" textAnchor="middle">{label}</text>
              {sub && <text x={BR + 19} y={500 + i * 24} fontSize="5.5" textAnchor="middle">{sub}</text>}
            </g>
          ))}
          {/* ANTI-ILHAMENTO */}
          <line x1={BR + 32} y1="579" x2={BR + 55} y2="579" stroke="#000" strokeWidth="0.8" />
          <text x={BR + 57} y="582" fontSize="6">ANTI-ILHAMENTO</text>

          {/* wire INVERSOR → QUADRO CC */}
          <line x1={CX} y1="584" x2={CX} y2="622" stroke="#000" strokeWidth="1" />

          {/* CC cables annotation (right, below INVERSOR) */}
          <line x1={BR} y1="602" x2={BR + 12} y2="602" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={BR + 15} y="597" fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
          <text x={BR + 15} y="605" fontSize="5.5">HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 15} y="613" fontSize="5.5">Para cada string:</text>
          <text x={BR + 15} y="620" fontSize="5.5">1 #{caboCC}mm² (-)</text>
          <text x={BR + 15} y="627" fontSize="5.5">1 #{caboCC}mm² (+)</text>
          <text x={BR + 15} y="635" fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 15} y="642" fontSize="5.5">1 #6,0mm² (T)</text>

          {/* ═══════════════════════════════════════════════════════════════
              QUADRO DE PROTEÇÃO CC
          ════════════════════════════════════════════════════════════════ */}
          <rect x={BX} y="622" width={BW} height="138" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={CX} y="648" fontSize="8" fontWeight="bold" textAnchor="middle">QUADRO DE</text>
          <text x={CX} y="660" fontSize="8" fontWeight="bold" textAnchor="middle">PROTEÇÃO CC</text>

          {/* (ACOPLADO AO INVERSOR FV) annotation left */}
          <text x="5" y="632" fontSize="5.5">(ACOPLADO AO</text>
          <text x="5" y="641" fontSize="5.5">INVERSOR FV)</text>

          {/* DPS CC */}
          <text x="196" y="674" fontSize="5.5" fontWeight="bold">DPS CC</text>
          <text x="196" y="683" fontSize="5.5">1040 Vcc, 18-40 kA</text>
          <text x="196" y="692" fontSize="5.5">Classe II</text>

          {/* tap main → DPS CC */}
          <line x1={CX} y1="640" x2="230" y2="640" stroke="#000" strokeWidth="0.8" />
          <line x1="230" y1="640" x2="230" y2="695" stroke="#000" strokeWidth="0.8" />
          <DPSBox x={230} y={704} />
          <line x1="230" y1="713" x2="230" y2="723" stroke="#000" strokeWidth="0.8" />
          <Terra x={230} y={723} />

          {/* C1 Chave Seccionadora on main wire */}
          <line x1={CX} y1="640" x2={CX} y2="672" stroke="#000" strokeWidth="1" />
          <ChaveSeccionadora x={CX} y={679} />
          <line x1={CX + 14} y1="662" x2={CX + 14} y2="656" stroke="#000" strokeWidth="0.8" />

          <text x={CX + 30} y="670" fontSize="5.5">C1</text>
          <text x={CX + 30} y="680" fontSize="5.5">Chave Seccionadora</text>
          <text x={CX + 30} y="689" fontSize="5.5">(4 polos)</text>
          <text x={CX + 30} y="698" fontSize="5.5">1200 Vcc 32 A</text>

          <line x1={CX} y1="696" x2={CX} y2="760" stroke="#000" strokeWidth="1" />

          {/* DETALHE 1 label */}
          <text x="196" y="752" fontSize="5.5">DETALHE 1</text>

          {/* CC cables annotation below QUADRO CC (right) */}
          <line x1={BR} y1="728" x2={BR + 12} y2="728" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={BR + 15} y="723" fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
          <text x={BR + 15} y="731" fontSize="5.5">HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 15} y="739" fontSize="5.5">Para cada string:</text>
          <text x={BR + 15} y="746" fontSize="5.5">1 #{caboCC}mm² (-)</text>
          <text x={BR + 15} y="753" fontSize="5.5">1 #{caboCC}mm² (+)</text>
          <text x={BR + 15} y="761" fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
          <text x={BR + 15} y="768" fontSize="5.5">1 #6,0mm² (T)</text>

          {/* wire → G */}
          <line x1={CX} y1="760" x2={CX} y2="793" stroke="#000" strokeWidth="1" />

          {/* ═══════════════════════════════════════════════════════════════
              G — GERADOR FOTOVOLTAICO
          ════════════════════════════════════════════════════════════════ */}
          <circle cx={CX} cy="828" r="34" fill="white" stroke="#000" strokeWidth="1.5" />
          <text x={CX} y="834" fontSize="20" fontWeight="bold" textAnchor="middle">G</text>
          <line x1={CX} y1="862" x2={CX} y2="876" stroke="#000" strokeWidth="1.2" />
          <Terra x={CX} y={876} />

          {/* Módulos annotation (right of G) */}
          <line x1={CX + 34} y1="828" x2={CX + 50} y2="828" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 53} y="795" fontSize="5.5" fontWeight="bold">Módulos Fotovoltaicos:</text>
          <text x={CX + 53} y="805" fontSize="5.5">Marca: {fv(pd.modulos_fabricante)}</text>
          <text x={CX + 53} y="814" fontSize="5.5">Modelo: {fv(pd.modulos_modelo)}</text>
          <text x={CX + 53} y="823" fontSize="5.5">Potência do módulo: {fv(pd.modulos_potencia_wp)} W</text>
          <text x={CX + 53} y="832" fontSize="5.5">Tensão do módulo: {fv(pd.modulos_vpmp)} V</text>
          <text x={CX + 53} y="840" fontSize="5.5">Corrente de saída do módulo: {fv(pd.modulos_ipmp)} A</text>
          <text x={CX + 53} y="849" fontSize="5.5">Quantidade: {modQtd > 0 ? `${modQtd} (${strDescr})` : '___'}</text>
          <text x={CX + 53} y="858" fontSize="5.5">Potência total: {potKwp} kWp</text>
          <text x={CX + 53} y="867" fontSize="5.5">Tensão de operação strings: {tensaoStr} V</text>
          <text x={CX + 53} y="876" fontSize="5.5">Corrente de saída das strings: {corrStr} A</text>

          {/* ═══════════════════════════════════════════════════════════════
              LEGENDA (top right)
          ════════════════════════════════════════════════════════════════ */}
          <rect x="482" y="22" width="355" height="210" fill="white" stroke="#000" strokeWidth="1" />
          <text x="659" y="38" fontSize="8" fontWeight="bold" textAnchor="middle">LEGENDA:</text>
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
          ].map((line, i) => (
            <text key={i} x="490" y={52 + i * 13} fontSize="6.5">{line}</text>
          ))}

          {/* ═══════════════════════════════════════════════════════════════
              DETALHE 1 (right panel, below LEGENDA)
          ════════════════════════════════════════════════════════════════ */}
          <text x="601" y="258" fontSize="7.5" fontWeight="bold" textAnchor="middle">DETALHE 1</text>
          <g transform="translate(556, 265)">
            {/* Left arrester */}
            <line x1="35" y1="0"  x2="35" y2="14" stroke="#000" strokeWidth="1" />
            <rect x="24" y="14" width="22" height="18" fill="white" stroke="#000" strokeWidth="0.8" />
            <polygon points={`35,17 29,27 41,27`} fill="#000" />
            <line x1="28" y1="28" x2="42" y2="28" stroke="#000" strokeWidth="0.8" />
            <line x1="35" y1="32" x2="35" y2="40" stroke="#000" strokeWidth="0.8" />
            {/* Right arrester */}
            <line x1="35" y1="14" x2="35" y2="8"  stroke="#000" strokeWidth="1" />
            <line x1="35" y1="8"  x2="65" y2="8"  stroke="#000" strokeWidth="1" />
            <line x1="65" y1="8"  x2="65" y2="14" stroke="#000" strokeWidth="1" />
            <rect x="54" y="14" width="22" height="18" fill="white" stroke="#000" strokeWidth="0.8" />
            <polygon points={`65,17 59,27 71,27`} fill="#000" />
            <line x1="58" y1="28" x2="72" y2="28" stroke="#000" strokeWidth="0.8" />
            <line x1="65" y1="32" x2="65" y2="40" stroke="#000" strokeWidth="0.8" />
            {/* Common ground bar */}
            <line x1="20" y1="40" x2="80" y2="40" stroke="#000" strokeWidth="1" />
            <line x1="50" y1="40" x2="50" y2="50" stroke="#000" strokeWidth="1" />
            <line x1="39" y1="50" x2="61" y2="50" stroke="#000" strokeWidth="1.3" />
            <line x1="43" y1="54" x2="57" y2="54" stroke="#000" strokeWidth="1.3" />
            <line x1="47" y1="58" x2="53" y2="58" stroke="#000" strokeWidth="1.3" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════
              TITLE BLOCK
          ════════════════════════════════════════════════════════════════ */}

          {/* "1 | DIAGRAMA UNIFILAR" bar */}
          <line x1="5" y1="898" x2="845" y2="898" stroke="#000" strokeWidth="1" />
          <rect x="5" y="900" width="30" height="22" fill="white" stroke="#000" strokeWidth="1" />
          <text x="20" y="915" fontSize="13" fontWeight="bold" textAnchor="middle">1</text>
          <line x1="35" y1="900" x2="35" y2="922" stroke="#000" strokeWidth="1" />
          <text x="43" y="915" fontSize="8.5" fontWeight="bold">DIAGRAMA UNIFILAR</text>

          {/* Outer title block border */}
          <rect x="5" y="922" width="840" height="163" fill="white" stroke="#000" strokeWidth="1.2" />

          {/* Vertical dividers */}
          <line x1="170" y1="922" x2="170" y2="1085" stroke="#000" strokeWidth="0.8" />
          <line x1="530" y1="922" x2="530" y2="1085" stroke="#000" strokeWidth="0.8" />
          <line x1="700" y1="922" x2="700" y2="1085" stroke="#000" strokeWidth="0.8" />

          {/* Horizontal dividers */}
          <line x1="5"   y1="950" x2="845" y2="950" stroke="#000" strokeWidth="0.7" />
          <line x1="5"   y1="978" x2="845" y2="978" stroke="#000" strokeWidth="0.7" />
          <line x1="5"   y1="1006" x2="845" y2="1006" stroke="#000" strokeWidth="0.7" />
          <line x1="5"   y1="1034" x2="845" y2="1034" stroke="#000" strokeWidth="0.7" />
          <line x1="5"   y1="1062" x2="845" y2="1062" stroke="#000" strokeWidth="0.7" />

          {/* Left col: labels */}
          <text x="10" y="936" fontSize="5.5" fontWeight="bold">PRODUTO</text>
          <text x="10" y="965" fontSize="8.5" fontWeight="bold">GFV {potKwp} kWp</text>

          {/* Middle col: owner/obra */}
          <text x="175" y="936" fontSize="5.5" fontWeight="bold">Proprietário e Obra:</text>
          <text x="175" y="965" fontSize="6">Nome: {owner}</text>
          <text x="175" y="993" fontSize="6">Endereço: {endereco}</text>
          <text x="175" y="1021" fontSize="6">Cidade: {cidade}</text>
          <text x="175" y="1049" fontSize="6">CEP: {cep}</text>

          {/* Right col 1: título */}
          <text x="535" y="936" fontSize="5.5" fontWeight="bold">TÍTULO</text>
          <text x="617" y="968" fontSize="11" fontWeight="bold" textAnchor="middle">DIAGRAMA UNIFILAR</text>

          {/* Right col 2: data / responsável */}
          <text x="705" y="936" fontSize="5.5" fontWeight="bold">DATA</text>
          <text x="705" y="965" fontSize="6">{dataDoc}</text>

          {/* Revision rows */}
          {['R1:', 'R2:', 'R3:', 'R4:', 'R5:'].map((r, i) => (
            <g key={r}>
              <text x="10"  y={993 + i * 14} fontSize="5.5" fontWeight="bold">{r}</text>
              <text x="175" y={993 + i * 14} fontSize="5.5" fontWeight="bold">{r}</text>
            </g>
          ))}

          {/* Responsável Técnico */}
          <text x="535" y="978" fontSize="5.5" fontWeight="bold">Responsável Técnico:</text>
          <text x="535" y="1000" fontSize="6">{respNome}</text>
          <text x="535" y="1016" fontSize="5.5">TÉCNICO EM ELETROTÉCNICA</text>
          <text x="535" y="1032" fontSize="5.5">CFT: {respCft}</text>

          {/* ESCALA / TAMANHO / FOLHA / REVISÃO */}
          <text x="10"  y="1020" fontSize="5.5" fontWeight="bold">ESCALA</text>
          <text x="10"  y="1034" fontSize="6">S/ ESCALA</text>
          <text x="80"  y="1020" fontSize="5.5" fontWeight="bold">TAMANHO</text>
          <text x="80"  y="1034" fontSize="6">A2</text>
          <text x="10"  y="1050" fontSize="5.5" fontWeight="bold">FOLHA</text>
          <text x="10"  y="1064" fontSize="6">1/1</text>
          <text x="80"  y="1050" fontSize="5.5" fontWeight="bold">REVISÃO</text>
          <text x="80"  y="1064" fontSize="6">R0</text>

        </svg>
      </div>

      {/* Print / PDF button */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handlePrint}
          disabled={printing}
          size="lg"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
        >
          {printing ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Preparando...</>
          ) : (
            <><Printer className="mr-2 h-5 w-5" />Imprimir / Salvar PDF</>
          )}
        </Button>
      </div>
    </>
  );
}
