// @ts-nocheck — react-pdf SVG props (x, y, fontSize, fill, etc.) não são reconhecidos pelo TS language server mas funcionam corretamente em runtime e na build
import {
  Document,
  Page,
  Svg,
  Line,
  Polygon,
  Rect,
  Circle,
  Path,
  Text,
  Image,
  View,
} from '@react-pdf/renderer';

interface DiagramaUnifilarPDFProps {
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

// ── Electrical symbols — returns arrays (no G wrapper, react-pdf v4 safe) ──

function PDFTerra({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Line x1={x}      y1={y}      x2={x}      y2={y + 7}  stroke="#000" strokeWidth={1} />
      <Line x1={x - 11} y1={y + 7}  x2={x + 11} y2={y + 7}  stroke="#000" strokeWidth={1.3} />
      <Line x1={x - 7}  y1={y + 11} x2={x + 7}  y2={y + 11} stroke="#000" strokeWidth={1.3} />
      <Line x1={x - 3}  y1={y + 15} x2={x + 3}  y2={y + 15} stroke="#000" strokeWidth={1.3} />
    </>
  );
}

function PDFDisjuntor({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Rect x={x - 11} y={y - 7} width={22} height={14} fill="white" stroke="#000" strokeWidth={1} />
      <Line x1={x - 7} y1={y - 4} x2={x + 7} y2={y + 4} stroke="#000" strokeWidth={0.8} />
    </>
  );
}

function PDFDPSSymbol({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Rect x={x - 9} y={y - 9} width={18} height={18} fill="white" stroke="#000" strokeWidth={0.8} />
      <Polygon points={`${x},${y - 5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill="#000" />
      <Line x1={x - 5} y1={y + 5} x2={x + 5} y2={y + 5} stroke="#000" strokeWidth={0.8} />
    </>
  );
}

function PDFChaveSeccionadora({ x, y }: { x: number; y: number }) {
  return (
    <>
      <Circle cx={x}      cy={y}      r={3.5} fill="white" stroke="#000" strokeWidth={0.9} />
      <Line   x1={x}      y1={y - 3.5} x2={x + 14} y2={y - 17} stroke="#000" strokeWidth={1} />
      <Circle cx={x + 14} cy={y - 17}  r={3.5} fill="white" stroke="#000" strokeWidth={0.9} />
    </>
  );
}

// ── PDF Component ───────────────────────────────────────────────────────────

export function DiagramaUnifilarPDF({ projectData }: DiagramaUnifilarPDFProps) {
  const pd = projectData || {};

  const modQtd    = parseInt(fv(pd.modulos_quantidade, '0')) || 0;
  const modWp     = parseFloat(fv(pd.modulos_potencia_wp, '0')) || 0;
  const potRaw    = parseFloat(fv(pd.potencia, '0')) || 0;
  const potTotal  = potRaw > 0 ? potRaw : (modQtd > 0 && modWp > 0 ? (modQtd * modWp) / 1000 : 0);
  const potKwp    = fn(potTotal);

  // Strings data from new fields
  const totalStrings = parseInt(fv(pd.modulos_total_strings, '0')) || 0;
  let stringsModulos: number[] = [];
  try {
    const parsed = JSON.parse(fv(pd.modulos_strings_modulos, '[]'));
    stringsModulos = Array.isArray(parsed) ? parsed.map((v: any) => parseInt(String(v)) || 0).filter((n: number) => n > 0) : [];
  } catch { stringsModulos = []; }

  // Label "1 e 2" or "1, 2 e 3"
  const strNums = totalStrings > 0 ? Array.from({ length: totalStrings }, (_, i) => String(i + 1)) : [];
  const strLabelStr = strNums.length === 0 ? ''
    : strNums.length === 1 ? strNums[0]
    : strNums.slice(0, -1).join(', ') + ' e ' + strNums[strNums.length - 1];

  // Quantity description: "12 (2x06 modulos)" or fallback
  let qtdDescr = modQtd > 0 ? `${modQtd} modulos` : '___';
  if (modQtd > 0 && totalStrings > 0 && stringsModulos.length > 0) {
    const allSameQ = stringsModulos.every(m => m === stringsModulos[0]);
    qtdDescr = allSameQ
      ? `${modQtd} (${totalStrings}x${String(stringsModulos[0]).padStart(2, '0')} modulos)`
      : `${modQtd} (${stringsModulos.map((m, i) => `S${i + 1}: ${m}`).join(' / ')} modulos)`;
  }

  const vpmp = parseFloat(fv(pd.modulos_vpmp, '0')) || 0;
  const corrStr = fv(pd.modulos_ipmp);

  // Tensao label and value per string (sem acentos para PDF)
  let tensaoLabel = 'Tensao de operacao das strings';
  let tensaoStr = vpmp > 0 && modQtd > 0 ? fn(vpmp * modQtd) : fv(pd.inversores_tensao);
  if (totalStrings > 0 && stringsModulos.length > 0 && vpmp > 0) {
    tensaoLabel = `Tensao de operacao das Strings ${strLabelStr}`;
    const tensoes = stringsModulos.map(m => vpmp * m);
    const allSameT = tensoes.every(t => Math.abs(t - tensoes[0]) < 0.01);
    tensaoStr = allSameT ? fn(tensoes[0]) : tensoes.map((t, i) => `S${i + 1}: ${fn(t)}`).join(' / ');
  }

  // Corrente label (sem acentos para PDF)
  const corrLabel = totalStrings > 0 && strLabelStr
    ? `Corrente de saida das Strings ${strLabelStr}`
    : 'Corrente de saida das strings';

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

  const tipoConexao = fv(pd.tipo_conexao, '');
  const isTri      = /trif/i.test(tipoConexao);
  const isBi       = /bif/i.test(tipoConexao);
  const djTipo     = isTri ? 'Tripolar' : isBi ? 'Bipolar' : 'Monopolar';
  const ramalTipo  = isTri ? 'Quadripolar' : isBi ? 'Multiplexado' : 'Concentrico';
  const nFaseRL    = isTri ? 3 : isBi ? 2 : 1;
  const djLabel    = `${djTipo} - ${djCorr} A / ${djTensao} Vca`;

  const tipoConexaoRede  = fv(pd.tipo_conexao_rede_ca, '');
  const isRedeMono       = !/trif/i.test(tipoConexaoRede);
  const is127_220        = fv(pd.tensao_atendimento, '').includes('127');
  const caboCaFCount     = isRedeMono ? 1 : 3;
  const caboCaMidLabel   = (is127_220 && isRedeMono) ? '(F)' : '(N)';
  const djCaPolos        = fv(pd.disjuntor_ca_polos, '2');
  const d2Tipo           = djCaPolos === '3' ? 'Tripolar' : djCaPolos === '1' ? 'Monopolar' : 'Bipolar';
  const dpsLabel         = isRedeMono ? '2x DPS CA' : '4x DPS CA';

  const owner      = fv(pd.nomeClienteFinal,    'NOME DO PROPRIETARIO');
  const endereco   = fv(pd.endereco_local,       'ENDERECO DA OBRA');
  const cidade     = fv(pd.client_city,          'Cidade');
  const uf         = fv(pd.client_state,         '');
  const cep        = fv(pd.cliente_cep,          '00.000-000');
  const respNome   = fv(pd.responsavel_nome,     'RESPONSAVEL TECNICO');
  const respCft    = fv(pd.responsavel_registro, '00000000000');
  const dataDoc    = fv(pd.data_documento, new Date().toLocaleDateString('pt-BR'));

  const CX = 340;
  const BX = 220;
  const BW = 240;
  const BR = BX + BW;

  // Seal column centers
  const MID_CTR = 439; // center of middle col (178-700)

  return (
    <Document>
      <Page size="A3" style={{ padding: 15, backgroundColor: '#FFFFFF' }}>
        <Svg width={812} height={991} viewBox="0 -25 900 1203">

          {/* ═══ REDE DE BAIXA TENSÃO ═══ */}
          <Line x1={90} y1={28} x2={490} y2={28} stroke="#000" strokeWidth={1.8} />
          <Text x={CX} y={21} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">REDE DE BAIXA TENSAO</Text>

          <Line x1={CX} y1={28} x2={CX} y2={44} stroke="#000" strokeWidth={1} />
          <Polygon points={`${CX - 5},28 ${CX + 5},28 ${CX},40`} fill="#000" />
          <Text x={CX + 8} y={37} fontSize={6.5} fill="#000">PONTO DE ENTREGA</Text>
          <Text x={CX + 8} y={47} fontSize={6.5} fill="#000">ACESSADA</Text>
          <Text x={CX + 8} y={57} fontSize={6.5} fill="#000">ACESSANTE</Text>

          {/* Ramal de Ligação — annotation left of MEDIDOR (y=78–105) */}
          {/* ═══ PADRÃO DE ENTRADA ═══ */}
          <Rect x={BX} y={42} width={BW} height={150} fill="white" stroke="#000" strokeWidth={1.2} />
          {/* Label right-shifted inside box */}
          <Text x={406} y={57} fontSize={7.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">PADRAO DE ENTRADA</Text>
          <Text x={406} y={67} fontSize={6} textAnchor="middle" fill="#000">(caixa de medicao)</Text>

          {/* Main vertical — starts at box top (y=42) to close the small gap */}
          <Line x1={CX} y1={42} x2={CX} y2={138} stroke="#000" strokeWidth={1} />

          {/* Horizontal tap to MEDIDOR (branch right) */}
          <Line x1={CX} y1={85} x2={355} y2={85} stroke="#000" strokeWidth={1} />

          {/* MEDIDOR box — right of main line */}
          <Rect x={355} y={71} width={95} height={28} fill="white" stroke="#000" strokeWidth={1} />
          <Text x={402} y={88} fontSize={9} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">MEDIDOR</Text>

          {/* Ramal de Ligação — drawn AFTER rects so visible over white fills */}
          <Text x={244} y={78}  fontSize={5.8} fontFamily="Helvetica-Bold" fill="#000">Ramal de Ligacao</Text>
          <Text x={244} y={87}  fontSize={5.8} fontFamily="Helvetica-Bold" fill="#000">{`Aluminio ${ramalTipo} - 1,0 kV`}</Text>
          <Text x={244} y={96}  fontSize={5.8} fill="#000">{`${nFaseRL} #${secaoFase}mm² (F)`}</Text>
          <Text x={244} y={105} fontSize={5.8} fill="#000">{`1 #${secaoFase}mm² (N)`}</Text>

          {/* D1 on main vertical line */}
          <PDFDisjuntor x={CX} y={145} />
          <Text x={CX + 15} y={143} fontSize={6.5} fill="#000">D1</Text>
          <Text x={CX + 15} y={152} fontSize={5.5} fill="#000">{djLabel}</Text>

          {/* D1 exit → out of PADRÃO (continuous, grounding branch removed) */}
          <Line x1={CX} y1={152} x2={CX} y2={220} stroke="#000" strokeWidth={1} />

          {/* Terra — lower-right corner of PADRAO DE ENTRADA */}
          <PDFTerra x={BR - 18} y={192} />

          {/* ═══ QUADRO DE DISTRIBUIÇÃO ═══ */}
          {/* Wider box — extended both left (x=150) and right (to x=520) */}
          <Rect x={150} y={220} width={370} height={82} fill="white" stroke="#000" strokeWidth={1.2} />
          {/* Label — upper right, clear of center line */}
          <Text x={512} y={233} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE DISTRIBUICAO</Text>

          {/* Main vertical line through box */}
          <Line x1={CX} y1={220} x2={CX} y2={302} stroke="#000" strokeWidth={1} />

          {/* Barramento horizontal — with margin at each end */}
          <Line x1={175} y1={255} x2={495} y2={255} stroke="#000" strokeWidth={1} />

          {/* Terra — grounding symbol at lower-right corner (not connected to barramento internally) */}
          <PDFTerra x={505} y={302} />

          {/* Cargas derivation — inside box (x=195), drops with arrow */}
          <Line x1={195} y1={255} x2={195} y2={315} stroke="#000" strokeWidth={1} />
          <Polygon points="190,315 200,315 195,325" fill="#000" />
          <Text x={215} y={311} fontSize={5.8} fill="#000">{`Cargas (${cargaKw !== '___' ? cargaKw : '--'} kW)`}</Text>
          <Text x={215} y={320} fontSize={5.8} fill="#000">{`Tensao Nominal: ${tensaoNom} V`}</Text>
          <Text x={215} y={329} fontSize={5.8} fill="#000">{`Corrente: ${corrCargas !== '___' ? corrCargas : '--'} A`}</Text>

          <Line x1={CX} y1={302} x2={CX} y2={358} stroke="#000" strokeWidth={1} />

          {/* CA cables annotation — centered on main line */}
          <Line x1={CX} y1={330} x2={CX + 12} y2={330} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={323} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70ºC - 1,0 kV</Text>
          <Text x={CX + 15} y={331} fontSize={5.5} fill="#000">{`${caboCaFCount} #${caboCA}mm² (F)`}</Text>
          <Text x={CX + 15} y={339} fontSize={5.5} fill="#000">{`1 #${caboCA}mm² ${caboCaMidLabel}`}</Text>
          <Text x={CX + 15} y={347} fontSize={5.5} fill="#000">{`1 #${caboCA}mm² (T)`}</Text>

          {/* ═══ QUADRO DE PROTEÇÃO CA ═══ */}
          <Rect x={BX} y={358} width={BW} height={122} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={BR - 8} y={370} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE</Text>
          <Text x={BR - 8} y={382} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">PROTECAO CA</Text>
          <Text x={228} y={396} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">{dpsLabel}</Text>
          <Text x={228} y={405} fontSize={5.5} fill="#000">275 Vca, 20-40 kA</Text>
          <Text x={228} y={414} fontSize={5.5} fill="#000">Classe II</Text>

          {/* Main vertical — continuous from box top (y=358) through D2 */}
          <Line x1={CX} y1={358} x2={CX} y2={408} stroke="#000" strokeWidth={1} />

          {/* DPS CA — slightly lower tap */}
          <Line x1={CX} y1={385} x2={290} y2={385} stroke="#000" strokeWidth={0.8} />
          <Line x1={290} y1={385} x2={290} y2={420} stroke="#000" strokeWidth={0.8} />
          <PDFDPSSymbol x={290} y={429} />
          <Line x1={290} y1={438} x2={290} y2={450} stroke="#000" strokeWidth={0.8} />
          <PDFTerra x={290} y={450} />

          {/* D2 — moved slightly lower to center in box */}
          <PDFDisjuntor x={CX} y={415} />
          <Text x={CX + 15} y={413} fontSize={6.5} fill="#000">D2</Text>
          <Text x={CX + 15} y={423} fontSize={5.5} fill="#000">{`${d2Tipo} - ${djCorr} A / ${djTensao} Vca`}</Text>
          <Line x1={CX} y1={422} x2={CX} y2={554} stroke="#000" strokeWidth={1} />

          {/* CA cables annotation — between QUADRO CA exit and INVERSOR (same style as DIST→CA) */}
          <Line x1={CX} y1={502} x2={CX + 12} y2={502} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={495} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70ºC - 1,0 kV</Text>
          <Text x={CX + 15} y={503} fontSize={5.5} fill="#000">{`${caboCaFCount} #${caboCA}mm² (F)`}</Text>
          <Text x={CX + 15} y={511} fontSize={5.5} fill="#000">{`1 #${caboCA}mm² ${caboCaMidLabel}`}</Text>
          <Text x={CX + 15} y={519} fontSize={5.5} fill="#000">{`1 #${caboCA}mm² (T)`}</Text>

          {/* ═══ INVERSOR ═══ */}
          {/* Label outside box, above upper-right corner */}
          <Text x={400} y={551} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">INVERSOR</Text>
          {/* Reduced to ~1/4 size (w=120, h=55), centered at CX */}
          <Rect x={280} y={554} width={120} height={55} fill="white" stroke="#000" strokeWidth={1.2} />
          {/* Diagonal line across inversor — corner to corner */}
          <Line x1={280} y1={554} x2={400} y2={609} stroke="#000" strokeWidth={0.9} />
          {/* AC ~ symbol — lower-left corner of inversor */}
          <Path d="M284 598 Q288 591 292 598 Q296 605 300 598"
                stroke="#000" strokeWidth={0.9} fill="none" />
          {/* DC = symbol — upper-right corner of inversor */}
          <Line x1={374} y1={560} x2={396} y2={560} stroke="#000" strokeWidth={0.9} />
          <Line x1={374} y1={564} x2={396} y2={564} stroke="#000" strokeWidth={0.9} />

          {/* Horizontal line from right side of inversor → vertical line connecting relay boxes */}
          <Line x1={400} y1={581} x2={467} y2={581} stroke="#000" strokeWidth={1} />
          {/* Vertical line — raised to align column midpoint with inversor horizontal (y=581) */}
          <Line x1={467} y1={534} x2={467} y2={651} stroke="#000" strokeWidth={1} />

          {/* Left annotation — moved closer to inversor (x=150) */}
          <Text x={150} y={557} fontSize={5.5} fill="#000">Marca: {invFab}</Text>
          <Text x={150} y={564} fontSize={5.5} fill="#000">Modelo: {invMod}</Text>
          <Text x={150} y={571} fontSize={5.5} fill="#000">Potencia: {invPot} kW</Text>
          <Text x={150} y={578} fontSize={5.5} fill="#000">Entrada - Tensao max: {invVccMax} Vcc</Text>
          <Text x={150} y={585} fontSize={5.5} fill="#000">  - Corrente max: {invIccMax} A</Text>
          <Text x={150} y={592} fontSize={5.5} fill="#000">Saida - Tensao: {tensaoNom} Vca</Text>
          <Text x={150} y={599} fontSize={5.5} fill="#000">  - Corrente: {invCorrOut} A</Text>
          <Text x={150} y={606} fontSize={5.5} fill="#000">Ver datasheet para mais detalhes</Text>

          {/* Protection relay boxes — raised so column midpoint aligns with inversor horizontal (y=581) */}
          {[
            { l: '25', s: '' }, { l: '27', s: '' },
            { l: '59', s: '' }, { l: '81', s: 'U/O' },
          ].map(({ l, s }, i) => (
            <>
              <Line key={`ln${l}`} x1={467} y1={544 + i * 25} x2={490} y2={544 + i * 25} stroke="#000" strokeWidth={0.8} />
              <Rect key={`r${l}`} x={490} y={534 + i * 25} width={26} height={20} fill="white" stroke="#000" strokeWidth={0.8} />
              <Text key={`t${l}`} x={503} y={s ? 545 + i * 25 : 548 + i * 25}
                    fontSize={7} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{l}</Text>
              {s ? <Text key={`s${l}`} x={503} y={552 + i * 25} fontSize={5.5} textAnchor="middle" fill="#000">{s}</Text> : null}
            </>
          ))}
          {/* ANTI-ILHAMENTO — rectangular block with horizontal connection */}
          <Line x1={467} y1={643} x2={490} y2={643} stroke="#000" strokeWidth={0.8} />
          <Rect x={490} y={635} width={90} height={16} fill="white" stroke="#000" strokeWidth={0.8} />
          <Text x={535} y={646} fontSize={6} textAnchor="middle" fill="#000">ANTI-ILHAMENTO</Text>

          <Line x1={CX} y1={609} x2={CX} y2={708} stroke="#000" strokeWidth={1} />

          {/* CC cables annotation — between INVERSOR and QUADRO CC (tap from main line) */}
          <Line x1={CX} y1={644} x2={CX + 12} y2={644} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={636} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CC Fotovoltaico -</Text>
          <Text x={CX + 15} y={644} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">HEPR/XLPO 1,8 kV:</Text>
          <Text x={CX + 15} y={652} fontSize={5.5} fill="#000">Para cada string:</Text>
          <Text x={CX + 15} y={659} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (-)`}</Text>
          <Text x={CX + 15} y={666} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (+)`}</Text>
          <Text x={CX + 15} y={674} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabo PE - HEPR/XLPO 1,8 kV:</Text>
          <Text x={CX + 15} y={681} fontSize={5.5} fill="#000">1 #6,0mm² (T)</Text>

          {/* ═══ QUADRO DE PROTEÇÃO CC ═══ */}
          <Rect x={BX} y={708} width={BW} height={140} fill="white" stroke="#000" strokeWidth={1.2} />
          {/* Label — upper right (same style as QUADRO CA) */}
          <Text x={BR - 8} y={720} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE</Text>
          <Text x={BR - 8} y={732} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">PROTECAO CC</Text>

          {/* (ACOPLADO AO INVERSOR FV) — inside box, upper-left corner */}
          <Text x={BX + 6} y={721} fontSize={5.5} fill="#000">(ACOPLADO AO</Text>
          <Text x={BX + 6} y={730} fontSize={5.5} fill="#000">INVERSOR FV)</Text>

          <Text x={228} y={758} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DPS CC</Text>
          <Text x={228} y={767} fontSize={5.5} fill="#000">1040 Vcc, 18-40 kA</Text>
          <Text x={228} y={776} fontSize={5.5} fill="#000">Classe II</Text>

          {/* Main vertical — from box top to just above upper circle of C1 (gap = switch open space) */}
          <Line x1={CX} y1={708} x2={CX} y2={745} stroke="#000" strokeWidth={1} />

          {/* Tap main → DPS CC (shifted right to x=290, same as DPS CA) */}
          <Line x1={CX} y1={725} x2={290} y2={725} stroke="#000" strokeWidth={0.8} />
          <Line x1={290} y1={725} x2={290} y2={780} stroke="#000" strokeWidth={0.8} />
          <PDFDPSSymbol x={290} y={789} />
          <Line x1={290} y1={798} x2={290} y2={810} stroke="#000" strokeWidth={0.8} />
          <PDFTerra x={290} y={810} />
          <PDFChaveSeccionadora x={CX} y={766} />
          <Text x={CX + 22} y={758} fontSize={5.5} fill="#000">C1</Text>
          <Text x={CX + 22} y={768} fontSize={5.5} fill="#000">Chave Seccionadora</Text>
          <Text x={CX + 22} y={777} fontSize={5.5} fill="#000">(4 polos)</Text>
          <Text x={CX + 22} y={786} fontSize={5.5} fill="#000">1200 Vcc 32 A</Text>
          {/* Continuous line — starts right after C1 bottom circle (y≈770) */}
          <Line x1={CX} y1={770} x2={CX} y2={848} stroke="#000" strokeWidth={1} />

          {/* CC cables annotation — between QUADRO CC and GERADOR/modules (tap from main line) */}
          <Line x1={CX} y1={872} x2={CX + 12} y2={872} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={865} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CC Fotovoltaico -</Text>
          <Text x={CX + 15} y={873} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">HEPR/XLPO 1,8 kV:</Text>
          <Text x={CX + 15} y={881} fontSize={5.5} fill="#000">Para cada string:</Text>
          <Text x={CX + 15} y={888} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (-)`}</Text>
          <Text x={CX + 15} y={895} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (+)`}</Text>
          <Text x={CX + 15} y={903} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabo PE - HEPR/XLPO 1,8 kV:</Text>
          <Text x={CX + 15} y={910} fontSize={5.5} fill="#000">1 #6,0mm² (T)</Text>

          {/* ═══ G — GERADOR ═══ */}
          <Line x1={CX} y1={848} x2={CX} y2={935} stroke="#000" strokeWidth={1} />
          <Circle cx={CX} cy={971} r={35} fill="white" stroke="#000" strokeWidth={1.5} />
          <Text x={CX} y={978} fontSize={22} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">G</Text>
          <Line x1={CX} y1={1006} x2={CX} y2={1020} stroke="#000" strokeWidth={1.2} />
          <PDFTerra x={CX} y={1020} />

          <Line x1={CX + 35} y1={971} x2={CX + 52} y2={971} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 55} y={938} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Modulos Fotovoltaicos:</Text>
          <Text x={CX + 55} y={948} fontSize={5.5} fill="#000">Marca: {fv(pd.modulos_fabricante)}</Text>
          <Text x={CX + 55} y={957} fontSize={5.5} fill="#000">Modelo: {fv(pd.modulos_modelo)}</Text>
          <Text x={CX + 55} y={966} fontSize={5.5} fill="#000">Potencia do modulo: {fv(pd.modulos_potencia_wp)} W</Text>
          <Text x={CX + 55} y={975} fontSize={5.5} fill="#000">Tensao do modulo: {fv(pd.modulos_vpmp)} V</Text>
          <Text x={CX + 55} y={984} fontSize={5.5} fill="#000">Corrente de saida do modulo: {fv(pd.modulos_ipmp)} A</Text>
          <Text x={CX + 55} y={993} fontSize={5.5} fill="#000">Quantidade: {qtdDescr}</Text>
          <Text x={CX + 55} y={1002} fontSize={5.5} fill="#000">Potencia total: {potKwp} kWp</Text>
          <Text x={CX + 55} y={1011} fontSize={5.5} fill="#000">{tensaoLabel}: {tensaoStr} V</Text>
          <Text x={CX + 55} y={1020} fontSize={5.5} fill="#000">{corrLabel}: {corrStr} A</Text>

          {/* ═══ LEGENDA ═══ */}
          <Rect x={655} y={22} width={238} height={215} fill="white" stroke="#000" strokeWidth={1} />
          <Text x={774} y={38} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">LEGENDA:</Text>
          {[
            'D1: Disjuntor de entrada ou geral da',
            '       unidade consumidora',
            'D2: Disjuntor de protecao do inversor',
            'D3: Disjuntor de protecao do inversor',
            'C1: Chave Seccionadora CC de',
            '       protecao do gerador',
            'D: Disjuntor de protecao da carga',
            'G: Gerador fotovoltaico',
            '25: Sincronismo',
            '27: Subtensao',
            '59: Sobretensao',
            '81 U/O: Sub/sobrefrequencia',
            'NP: Numero de polos do disjuntor',
            'YYY A: Corrente nominal',
          ].map((ln, i) => (
            <Text key={i} x={663} y={52 + i * 13} fontSize={6.5} fill="#000">{ln}</Text>
          ))}


          {/* ═══════════════════════════════════════════
              TITLE BLOCK / SELO
          ═══════════════════════════════════════════ */}

          {/* Seal outer rect */}
          <Rect x={5} y={1058} width={885} height={120} fill="white" stroke="#000" strokeWidth={1.2} />

          {/* === COLUMN DIVIDERS === */}
          {/* Left | Mid */}
          <Line x1={178} y1={1058} x2={178} y2={1178} stroke="#000" strokeWidth={0.8} />
          {/* Mid | Right (logo area) */}
          <Line x1={700} y1={1058} x2={700} y2={1178} stroke="#000" strokeWidth={0.8} />
          {/* Left sub-col: label area | R values — starts below PRODUTO section */}
          <Line x1={118} y1={1088} x2={118} y2={1178} stroke="#000" strokeWidth={0.6} />

          {/* === HORIZONTAL DIVIDERS === */}
          {/* Below PRODUTO section (left + mid cols) */}
          <Line x1={5} y1={1088} x2={700} y2={1088} stroke="#000" strokeWidth={0.7} />
          {/* Left col — 4 equal rows of 16px + last row to 1170 */}
          <Line x1={5} y1={1104} x2={178} y2={1104} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1120} x2={178} y2={1120} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1136} x2={178} y2={1136} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1152} x2={178} y2={1152} stroke="#000" strokeWidth={0.5} />
          {/* Mid col: owner | responsavel separator (aligns with left col row 3 end) */}
          <Line x1={178} y1={1136} x2={700} y2={1136} stroke="#000" strokeWidth={0.5} />

          {/* === LEFT COLUMN — PRODUTO (top, full width, value centered) === */}
          <Text x={8}  y={1067}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">PRODUTO</Text>
          <Text x={92} y={1082} fontSize={9}   fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">GFV {potKwp} kWp</Text>

          {/* DATA  (row 1: y=1088–1104) */}
          <Text x={8}   y={1095} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DATA</Text>
          <Text x={62}  y={1102} fontSize={6}   textAnchor="middle" fill="#000">{dataDoc}</Text>
          <Text x={148} y={1099} fontSize={5.5} textAnchor="middle" fill="#000">R1:</Text>

          {/* ESCALA  (row 2: y=1104–1120) */}
          <Text x={8}   y={1111} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">ESCALA</Text>
          <Text x={62}  y={1118} fontSize={6}   textAnchor="middle" fill="#000">S/ ESCALA</Text>
          <Text x={148} y={1115} fontSize={5.5} textAnchor="middle" fill="#000">R2:</Text>

          {/* TAMANHO  (row 3: y=1120–1136) */}
          <Text x={8}   y={1127} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TAMANHO</Text>
          <Text x={62}  y={1134} fontSize={6}   textAnchor="middle" fill="#000">A3</Text>
          <Text x={148} y={1131} fontSize={5.5} textAnchor="middle" fill="#000">R3:</Text>

          {/* FOLHA  (row 4: y=1136–1152) */}
          <Text x={8}   y={1143} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">FOLHA</Text>
          <Text x={62}  y={1150} fontSize={6}   textAnchor="middle" fill="#000">1/1</Text>
          <Text x={148} y={1147} fontSize={5.5} textAnchor="middle" fill="#000">R4:</Text>

          {/* REVISAO  (row 5: y=1152–1170) */}
          <Text x={8}   y={1159} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">REVISAO</Text>
          <Text x={62}  y={1166} fontSize={6}   textAnchor="middle" fill="#000">R0</Text>
          <Text x={148} y={1163} fontSize={5.5} textAnchor="middle" fill="#000">R5:</Text>

          {/* === MIDDLE COLUMN — TITULO (top) === */}
          <Text x={185} y={1069} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TITULO</Text>
          <Text x={MID_CTR} y={1083} fontSize={11} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">DIAGRAMA UNIFILAR</Text>

          {/* === MIDDLE COLUMN — OWNER BLOCK (y=1088–1136, 5 items equidistant 9px) === */}
          <Text x={MID_CTR} y={1097} fontSize={5.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">Proprietario e Obra:</Text>
          <Text x={MID_CTR} y={1106} fontSize={6} textAnchor="middle" fill="#000">{`Nome: ${owner}`}</Text>
          <Text x={MID_CTR} y={1115} fontSize={6} textAnchor="middle" fill="#000">{`Endereco: ${endereco}`}</Text>
          <Text x={MID_CTR} y={1124} fontSize={6} textAnchor="middle" fill="#000">{`Cidade: ${uf ? `${cidade} - ${uf}` : cidade}`}</Text>
          <Text x={MID_CTR} y={1133} fontSize={6} textAnchor="middle" fill="#000">{`CEP: ${cep}`}</Text>

          {/* === MIDDLE COLUMN — RESPONSAVEL BLOCK (y=1136–1170, 4 items equidistant 8px) === */}
          <Text x={MID_CTR} y={1145} fontSize={5.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">Responsavel Tecnico:</Text>
          <Text x={MID_CTR} y={1153} fontSize={6} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{respNome}</Text>
          <Text x={MID_CTR} y={1161} fontSize={5.5} textAnchor="middle" fill="#000">TECNICO EM ELETROTECNICA</Text>
          <Text x={MID_CTR} y={1169} fontSize={5.5} textAnchor="middle" fill="#000">{`CFT: ${respCft}`}</Text>

        </Svg>

        {/* Logo fora do SVG com posição absoluta sobre a coluna direita do selo */}
        {/* Cálculo: page padding=15, SVG width=812/viewBox=900, height=991/viewBox=1203 (+25 offset y) */}
        {/* Logo da empresa: View com overflow hidden garante que não extrapola o espaço do selo */}
        {/* Coluna direita do selo em coords SVG: x=700–890, y=1058–1178 */}
        {/* Em coords página (padding=15, scale x=812/900, scale y=991/1203+25offset): left=647, top=907, w=171, h=99 */}
        {pd.logo_empresa_url && (
          <View style={{
            position: 'absolute',
            left: 648,
            top: 908,
            width: 169,
            height: 97,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image
              src={pd.logo_empresa_url}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </View>
        )}
      </Page>
    </Document>
  );
}
