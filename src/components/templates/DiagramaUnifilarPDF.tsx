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
  G,
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

// ── Electrical Symbols (react-pdf SVG) ─────────────────────────────────────

function PDFTerra({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Line x1={x}      y1={y}      x2={x}      y2={y + 7}  stroke="#000" strokeWidth={1} />
      <Line x1={x - 11} y1={y + 7}  x2={x + 11} y2={y + 7}  stroke="#000" strokeWidth={1.3} />
      <Line x1={x - 7}  y1={y + 11} x2={x + 7}  y2={y + 11} stroke="#000" strokeWidth={1.3} />
      <Line x1={x - 3}  y1={y + 15} x2={x + 3}  y2={y + 15} stroke="#000" strokeWidth={1.3} />
    </G>
  );
}

function PDFDisjuntor({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect x={x - 11} y={y - 7} width={22} height={14} fill="white" stroke="#000" strokeWidth={1} />
      <Line x1={x - 7} y1={y - 4} x2={x + 7} y2={y + 4} stroke="#000" strokeWidth={0.8} />
    </G>
  );
}

function PDFDPSSymbol({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Rect x={x - 9} y={y - 9} width={18} height={18} fill="white" stroke="#000" strokeWidth={0.8} />
      <Polygon points={`${x},${y - 5} ${x - 5},${y + 4} ${x + 5},${y + 4}`} fill="#000" />
      <Line x1={x - 5} y1={y + 5} x2={x + 5} y2={y + 5} stroke="#000" strokeWidth={0.8} />
    </G>
  );
}

function PDFChaveSeccionadora({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Circle cx={x}      cy={y}      r={3.5} fill="white" stroke="#000" strokeWidth={0.9} />
      <Line   x1={x}      y1={y - 3.5} x2={x + 14} y2={y - 17} stroke="#000" strokeWidth={1} />
      <Circle cx={x + 14} cy={y - 17}  r={3.5} fill="white" stroke="#000" strokeWidth={0.9} />
    </G>
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

  const strQtd    = parseInt(fv(pd.inversores_quantidade_mppt, '0')) || 0;
  const modPerStr = strQtd > 0 && modQtd > 0 ? Math.round(modQtd / strQtd) : modQtd;
  const strDescr  = strQtd > 1
    ? `${strQtd} (${strQtd}x${String(modPerStr).padStart(2, '0')} modulos)`
    : `${modQtd} modulos`;

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

  const owner      = fv(pd.nomeClienteFinal,     'NOME DO PROPRIETARIO');
  const endereco   = fv(pd.endereco_local,        'ENDERECO DA OBRA');
  const cidade     = fv(pd.client_city,           'Cidade');
  const cep        = fv(pd.cliente_cep,           '00.000-000');
  const respNome   = fv(pd.responsavel_nome,      'RESPONSAVEL TECNICO');
  const respCft    = fv(pd.responsavel_registro,  '00000000000');
  const dataDoc    = fv(pd.data_documento, new Date().toLocaleDateString('pt-BR'));

  const CX = 340;
  const BX = 220;
  const BW = 240;
  const BR = BX + BW; // 460

  // A3 portrait: 841.89 x 1190.55 pt → usable with 15pt padding: ~812 x 1161
  // viewBox 900 x 1090 → scale 812/900 ≈ 0.902 → height 983 < 1161 ✓
  const SVG_W = 812;
  const SVG_H = 983;

  return (
    <Document>
      <Page size="A3" style={{ padding: 15, backgroundColor: '#FFFFFF' }}>
        <Svg width={SVG_W} height={SVG_H} viewBox="0 0 900 1090">

          {/* ═══ REDE DE BAIXA TENSÃO ═══ */}
          <Line x1={90} y1={28} x2={490} y2={28} stroke="#000" strokeWidth={1.8} />
          <Text x={290} y={21} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">REDE DE BAIXA TENSAO</Text>

          <Line x1={CX} y1={28} x2={CX} y2={44} stroke="#000" strokeWidth={1} />
          <Polygon points={`${CX - 5},28 ${CX + 5},28 ${CX},40`} fill="#000" />
          <Text x={CX + 8} y={37} fontSize={6.5} fill="#000">PONTO DE ENTREGA</Text>
          <Text x={CX + 8} y={47} fontSize={6.5} fill="#000">ACESSADA</Text>
          <Text x={CX + 8} y={57} fontSize={6.5} fill="#000">ACESSANTE</Text>

          {/* Ramal annotation */}
          <Line x1={BX} y1={76} x2={140} y2={76} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Line x1={140} y1={28} x2={140} y2={76} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={5} y={42} fontSize={5.8} fill="#000">Ramal de Ligacao</Text>
          <Text x={5} y={51} fontSize={5.8} fill="#000">Aluminio Concentrico - 1,0 kV</Text>
          <Text x={5} y={60} fontSize={5.8} fill="#000">1 #{secaoFase}mm2 (F)</Text>
          <Text x={5} y={69} fontSize={5.8} fill="#000">1 #{secaoFase}mm2 (N)</Text>

          {/* ═══ PADRÃO DE ENTRADA ═══ */}
          <Rect x={BX} y={42} width={BW} height={150} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={CX} y={60} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">PADRAO DE ENTRADA</Text>
          <Text x={CX} y={73} fontSize={7}   textAnchor="middle" fill="#000">(caixa de medicao)</Text>
          <Rect x={262} y={79} width={156} height={38} fill="white" stroke="#000" strokeWidth={1} />
          <Text x={CX} y={102} fontSize={9} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">MEDIDOR</Text>

          <Line x1={CX} y1={117} x2={CX} y2={138} stroke="#000" strokeWidth={1} />
          <PDFDisjuntor x={CX} y={145} />
          <Text x={CX + 15} y={143} fontSize={6.5} fill="#000">D1</Text>
          <Text x={CX + 15} y={152} fontSize={5.5} fill="#000">{djLabel}</Text>

          <Line x1={CX} y1={152} x2={CX}       y2={165}       stroke="#000" strokeWidth={1} />
          <Line x1={CX} y1={165} x2={BR - 18}  y2={165}       stroke="#000" strokeWidth={1} />
          <PDFTerra x={BR - 18} y={165} />
          <Line x1={CX} y1={165} x2={CX} y2={220} stroke="#000" strokeWidth={1} />

          {/* ═══ QUADRO DE DISTRIBUIÇÃO ═══ */}
          <Rect x={BX} y={220} width={BW} height={82} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={CX} y={267} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">QUADRO DE DISTRIBUICAO</Text>

          <Line x1={BX} y1={261} x2={118} y2={261} stroke="#000" strokeWidth={1} />
          <Line x1={118} y1={261} x2={118} y2={290} stroke="#000" strokeWidth={1} />
          <PDFTerra x={118} y={290} />

          <Text x={5} y={240} fontSize={5.8} fill="#000">Cargas ({cargaKw !== '___' ? cargaKw : '--'} kW)</Text>
          <Text x={5} y={250} fontSize={5.8} fill="#000">Tensao Nominal: {tensaoNom} V</Text>
          <Text x={5} y={260} fontSize={5.8} fill="#000">Corrente: {corrCargas !== '___' ? corrCargas : '--'} A</Text>

          <Line x1={CX} y1={302} x2={CX} y2={348} stroke="#000" strokeWidth={1} />

          {/* CA cables RIGHT (above QUADRO CA) */}
          <Line x1={BR} y1={324} x2={BR + 14} y2={324} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={BR + 17} y={319} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70 - 1,0 kV</Text>
          <Text x={BR + 17} y={327} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (F)</Text>
          <Text x={BR + 17} y={335} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (N)</Text>
          <Text x={BR + 17} y={343} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (T)</Text>

          {/* ═══ QUADRO DE PROTEÇÃO CA ═══ */}
          <Rect x={BX} y={348} width={BW} height={122} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={CX} y={370} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">QUADRO DE</Text>
          <Text x={CX} y={382} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">PROTECAO CA</Text>

          <Text x={228} y={396} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">2x DPS CA</Text>
          <Text x={228} y={405} fontSize={5.5} fill="#000">275 Vca, 20-40 kA</Text>
          <Text x={228} y={414} fontSize={5.5} fill="#000">Classe II</Text>

          <Line x1={CX} y1={365} x2={257} y2={365} stroke="#000" strokeWidth={0.8} />
          <Line x1={257} y1={365} x2={257} y2={417} stroke="#000" strokeWidth={0.8} />
          <PDFDPSSymbol x={257} y={426} />
          <Line x1={257} y1={435} x2={257} y2={447} stroke="#000" strokeWidth={0.8} />
          <PDFTerra x={257} y={447} />

          <Line x1={CX} y1={365} x2={CX} y2={397} stroke="#000" strokeWidth={1} />
          <PDFDisjuntor x={CX} y={405} />
          <Text x={CX + 15} y={403} fontSize={6.5} fill="#000">D2</Text>
          <Text x={CX + 15} y={413} fontSize={5.5} fill="#000">Bipolar - {djCorr} A / {djTensao} Vca</Text>
          <Line x1={CX} y1={412} x2={CX} y2={470} stroke="#000" strokeWidth={1} />
          <Line x1={CX} y1={470} x2={CX} y2={514} stroke="#000" strokeWidth={1} />

          {/* CA cables LEFT (below QUADRO CA) */}
          <Line x1={BX} y1={491} x2={BX - 14} y2={491} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={5} y={483} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70 - 1,0 kV</Text>
          <Text x={5} y={492} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (F)</Text>
          <Text x={5} y={500} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (N)</Text>
          <Text x={5} y={508} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (T)</Text>

          {/* ═══ INVERSOR ═══ */}
          <Rect x={BX} y={514} width={BW} height={110} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={CX} y={572} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">INVERSOR</Text>

          <Line x1={CX - 24} y1={556} x2={CX - 10} y2={556} stroke="#000" strokeWidth={0.9} />
          <Line x1={CX - 24} y1={560} x2={CX - 10} y2={560} stroke="#000" strokeWidth={0.9} />
          <Path d={`M${CX + 10} 558 Q${CX + 14} 551 ${CX + 18} 558 Q${CX + 22} 565 ${CX + 26} 558`}
                stroke="#000" strokeWidth={0.9} fill="none" />

          <Line x1={BX} y1={561} x2={BX - 14} y2={561} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={5} y={521} fontSize={5.5} fill="#000">Marca: {invFab}</Text>
          <Text x={5} y={530} fontSize={5.5} fill="#000">Modelo: {invMod}</Text>
          <Text x={5} y={539} fontSize={5.5} fill="#000">Potencia: {invPot} kW</Text>
          <Text x={5} y={548} fontSize={5.5} fill="#000">Entrada - Tensao max: {invVccMax} Vcc</Text>
          <Text x={5} y={557} fontSize={5.5} fill="#000">  - Corrente max: {invIccMax} A</Text>
          <Text x={5} y={566} fontSize={5.5} fill="#000">Saida - Tensao: {tensaoNom} Vca</Text>
          <Text x={5} y={575} fontSize={5.5} fill="#000">  - Corrente: {invCorrOut} A</Text>
          <Text x={5} y={584} fontSize={5.5} fill="#000">Ver datasheet para mais detalhes</Text>

          {/* Protection boxes */}
          {([
            { l: '25', s: '' },
            { l: '27', s: '' },
            { l: '59', s: '' },
            { l: '81', s: 'U/O' },
          ] as { l: string; s: string }[]).map(({ l, s }, i) => (
            <G key={l}>
              <Rect x={BR + 8} y={520 + i * 25} width={26} height={20} fill="white" stroke="#000" strokeWidth={0.8} />
              <Text x={BR + 21} y={s ? 531 + i * 25 : 534 + i * 25}
                    fontSize={7} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{l}</Text>
              {s ? <Text x={BR + 21} y={538 + i * 25} fontSize={5.5} textAnchor="middle" fill="#000">{s}</Text> : null}
            </G>
          ))}
          <Line x1={BR + 34} y1={614} x2={BR + 56} y2={614} stroke="#000" strokeWidth={0.8} />
          <Text x={BR + 58} y={618} fontSize={6} fill="#000">ANTI-ILHAMENTO</Text>

          <Line x1={CX} y1={624} x2={CX} y2={668} stroke="#000" strokeWidth={1} />

          {/* CC cables RIGHT (inversor → QUADRO CC) */}
          <Line x1={BR} y1={645} x2={BR + 14} y2={645} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={BR + 17} y={639} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CC Fotovoltaico -</Text>
          <Text x={BR + 17} y={647} fontSize={5.5} fill="#000">HEPR/XLPO 1,8 kV:</Text>
          <Text x={BR + 17} y={655} fontSize={5.5} fill="#000">Para cada string:</Text>
          <Text x={BR + 17} y={662} fontSize={5.5} fill="#000">1 #{caboCC}mm2 (-)</Text>
          <Text x={BR + 17} y={669} fontSize={5.5} fill="#000">1 #{caboCC}mm2 (+)</Text>
          <Text x={BR + 17} y={677} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabo PE - HEPR/XLPO 1,8 kV:</Text>
          <Text x={BR + 17} y={684} fontSize={5.5} fill="#000">1 #6,0mm2 (T)</Text>

          {/* ═══ QUADRO DE PROTEÇÃO CC ═══ */}
          <Rect x={BX} y={668} width={BW} height={140} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={CX} y={692} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">QUADRO DE</Text>
          <Text x={CX} y={704} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">PROTECAO CC</Text>

          <Text x={5} y={677} fontSize={5.5} fill="#000">(ACOPLADO AO</Text>
          <Text x={5} y={686} fontSize={5.5} fill="#000">INVERSOR FV)</Text>

          <Text x={228} y={718} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DPS CC</Text>
          <Text x={228} y={727} fontSize={5.5} fill="#000">1040 Vcc, 18-40 kA</Text>
          <Text x={228} y={736} fontSize={5.5} fill="#000">Classe II</Text>

          <Line x1={CX} y1={685} x2={257} y2={685} stroke="#000" strokeWidth={0.8} />
          <Line x1={257} y1={685} x2={257} y2={740} stroke="#000" strokeWidth={0.8} />
          <PDFDPSSymbol x={257} y={749} />
          <Line x1={257} y1={758} x2={257} y2={770} stroke="#000" strokeWidth={0.8} />
          <PDFTerra x={257} y={770} />

          <Line x1={CX} y1={685} x2={CX} y2={718} stroke="#000" strokeWidth={1} />
          <PDFChaveSeccionadora x={CX} y={726} />
          <Line x1={CX + 14} y1={709} x2={CX + 14} y2={703} stroke="#000" strokeWidth={0.8} />
          <Text x={CX + 22} y={718} fontSize={5.5} fill="#000">C1</Text>
          <Text x={CX + 22} y={728} fontSize={5.5} fill="#000">Chave Seccionadora</Text>
          <Text x={CX + 22} y={737} fontSize={5.5} fill="#000">(4 polos)</Text>
          <Text x={CX + 22} y={746} fontSize={5.5} fill="#000">1200 Vcc 32 A</Text>

          <Line x1={CX} y1={743} x2={CX} y2={808} stroke="#000" strokeWidth={1} />

          {/* CC cables RIGHT (below QUADRO CC) */}
          <Line x1={BR} y1={780} x2={BR + 14} y2={780} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={BR + 17} y={775} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CC Fotovoltaico -</Text>
          <Text x={BR + 17} y={783} fontSize={5.5} fill="#000">HEPR/XLPO 1,8 kV:</Text>
          <Text x={BR + 17} y={791} fontSize={5.5} fill="#000">Para cada string:</Text>
          <Text x={BR + 17} y={798} fontSize={5.5} fill="#000">1 #{caboCC}mm2 (-)</Text>
          <Text x={BR + 17} y={805} fontSize={5.5} fill="#000">1 #{caboCC}mm2 (+)</Text>
          <Text x={BR + 17} y={813} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabo PE - HEPR/XLPO 1,8 kV:</Text>
          <Text x={BR + 17} y={820} fontSize={5.5} fill="#000">1 #6,0mm2 (T)</Text>

          {/* ═══ G — GERADOR ═══ */}
          <Line x1={CX} y1={808} x2={CX} y2={845} stroke="#000" strokeWidth={1} />
          <Circle cx={CX} cy={881} r={35} fill="white" stroke="#000" strokeWidth={1.5} />
          <Text x={CX} y={888} fontSize={22} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">G</Text>
          <Line x1={CX} y1={916} x2={CX} y2={930} stroke="#000" strokeWidth={1.2} />
          <PDFTerra x={CX} y={930} />

          <Line x1={CX + 35} y1={881} x2={CX + 52} y2={881} stroke="#000" strokeWidth={0.6} strokeDasharray="3,2" />
          <Text x={CX + 55} y={848} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Modulos Fotovoltaicos:</Text>
          <Text x={CX + 55} y={858} fontSize={5.5} fill="#000">Marca: {fv(pd.modulos_fabricante)}</Text>
          <Text x={CX + 55} y={867} fontSize={5.5} fill="#000">Modelo: {fv(pd.modulos_modelo)}</Text>
          <Text x={CX + 55} y={876} fontSize={5.5} fill="#000">Potencia do modulo: {fv(pd.modulos_potencia_wp)} W</Text>
          <Text x={CX + 55} y={885} fontSize={5.5} fill="#000">Tensao do modulo: {fv(pd.modulos_vpmp)} V</Text>
          <Text x={CX + 55} y={894} fontSize={5.5} fill="#000">Corrente de saida do modulo: {fv(pd.modulos_ipmp)} A</Text>
          <Text x={CX + 55} y={903} fontSize={5.5} fill="#000">Quantidade: {modQtd > 0 ? `${modQtd} (${strDescr})` : '___'}</Text>
          <Text x={CX + 55} y={912} fontSize={5.5} fill="#000">Potencia total: {potKwp} kWp</Text>
          <Text x={CX + 55} y={921} fontSize={5.5} fill="#000">Tensao de operacao strings: {tensaoStr} V</Text>
          <Text x={CX + 55} y={930} fontSize={5.5} fill="#000">Corrente de saida das strings: {corrStr} A</Text>

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

          {/* ═══ DETALHE 1 ═══ */}
          <Text x={748} y={262} fontSize={7.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">DETALHE 1</Text>
          <Line x1={714} y1={266} x2={714} y2={278} stroke="#000" strokeWidth={1} />
          <Rect x={703} y={278} width={22} height={18} fill="white" stroke="#000" strokeWidth={0.8} />
          <Polygon points="714,281 708,291 720,291" fill="#000" />
          <Line x1={707} y1={292} x2={721} y2={292} stroke="#000" strokeWidth={0.8} />
          <Line x1={714} y1={296} x2={714} y2={306} stroke="#000" strokeWidth={0.8} />
          <Line x1={714} y1={278} x2={714} y2={272} stroke="#000" strokeWidth={1} />
          <Line x1={714} y1={272} x2={746} y2={272} stroke="#000" strokeWidth={1} />
          <Line x1={746} y1={272} x2={746} y2={278} stroke="#000" strokeWidth={1} />
          <Rect x={735} y={278} width={22} height={18} fill="white" stroke="#000" strokeWidth={0.8} />
          <Polygon points="746,281 740,291 752,291" fill="#000" />
          <Line x1={739} y1={292} x2={753} y2={292} stroke="#000" strokeWidth={0.8} />
          <Line x1={746} y1={296} x2={746} y2={306} stroke="#000" strokeWidth={0.8} />
          <Line x1={700} y1={306} x2={760} y2={306} stroke="#000" strokeWidth={1} />
          <Line x1={730} y1={306} x2={730} y2={316} stroke="#000" strokeWidth={1} />
          <Line x1={720} y1={316} x2={740} y2={316} stroke="#000" strokeWidth={1.3} />
          <Line x1={724} y1={320} x2={736} y2={320} stroke="#000" strokeWidth={1.3} />
          <Line x1={728} y1={324} x2={732} y2={324} stroke="#000" strokeWidth={1.3} />

          {/* ═══ TITLE BLOCK ═══ */}
          <Line x1={5} y1={952} x2={890} y2={952} stroke="#000" strokeWidth={1} />
          <Rect x={5} y={954} width={32} height={24} fill="white" stroke="#000" strokeWidth={1} />
          <Text x={21} y={971} fontSize={14} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">1</Text>
          <Line x1={37} y1={954} x2={37} y2={978} stroke="#000" strokeWidth={1} />
          <Text x={43} y={970} fontSize={9} fontFamily="Helvetica-Bold" fill="#000">DIAGRAMA UNIFILAR</Text>

          <Rect x={5} y={978} width={885} height={108} fill="white" stroke="#000" strokeWidth={1.2} />
          <Line x1={178} y1={978} x2={178} y2={1086} stroke="#000" strokeWidth={0.8} />
          <Line x1={545} y1={978} x2={545} y2={1086} stroke="#000" strokeWidth={0.8} />
          <Line x1={718} y1={978} x2={718} y2={1086} stroke="#000" strokeWidth={0.8} />
          <Line x1={5}   y1={1002} x2={890} y2={1002} stroke="#000" strokeWidth={0.7} />
          <Line x1={5}   y1={1026} x2={890} y2={1026} stroke="#000" strokeWidth={0.7} />
          <Line x1={5}   y1={1050} x2={890} y2={1050} stroke="#000" strokeWidth={0.7} />
          <Line x1={5}   y1={1074} x2={890} y2={1074} stroke="#000" strokeWidth={0.7} />

          <Text x={12}  y={992}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">PRODUTO</Text>
          <Text x={12}  y={1018} fontSize={9}   fontFamily="Helvetica-Bold" fill="#000">GFV {potKwp} kWp</Text>

          <Text x={185} y={992}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Proprietario e Obra:</Text>
          <Text x={185} y={1018} fontSize={6}   fill="#000">Nome: {owner}</Text>
          <Text x={185} y={1042} fontSize={6}   fill="#000">Endereco: {endereco}</Text>
          <Text x={185} y={1066} fontSize={6}   fill="#000">Cidade: {cidade}</Text>
          <Text x={185} y={1083} fontSize={6}   fill="#000">CEP: {cep}</Text>

          <Text x={552} y={992}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TITULO</Text>
          <Text x={632} y={1017} fontSize={11}  fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">DIAGRAMA UNIFILAR</Text>

          <Text x={725} y={992}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DATA</Text>
          <Text x={725} y={1018} fontSize={6}   fill="#000">{dataDoc}</Text>

          <Text x={12}  y={1038} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">ESCALA</Text>
          <Text x={12}  y={1050} fontSize={6}   fill="#000">S/ ESCALA</Text>
          <Text x={95}  y={1038} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TAMANHO</Text>
          <Text x={95}  y={1050} fontSize={6}   fill="#000">A3</Text>
          <Text x={12}  y={1063} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">FOLHA</Text>
          <Text x={12}  y={1075} fontSize={6}   fill="#000">1/1</Text>
          <Text x={95}  y={1063} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">REVISAO</Text>
          <Text x={95}  y={1075} fontSize={6}   fill="#000">R0</Text>

          <Text x={552} y={1008} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Responsavel Tecnico:</Text>
          <Text x={552} y={1022} fontSize={6}   fill="#000">{respNome}</Text>
          <Text x={552} y={1036} fontSize={5.5} fill="#000">TECNICO EM ELETROTECNICA</Text>
          <Text x={552} y={1050} fontSize={5.5} fill="#000">CFT: {respCft}</Text>

          {['R1:', 'R2:', 'R3:', 'R4:', 'R5:'].map((r, i) => (
            <Text key={r} x={725} y={1012 + i * 14} fontSize={5.5} fill="#000">{r}</Text>
          ))}

        </Svg>
      </Page>
    </Document>
  );
}
