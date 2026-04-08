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
        <Svg width={812} height={983} viewBox="0 0 900 1090">

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
          <Text x={244} y={87}  fontSize={5.8} fill="#000">Aluminio Concentrico - 1,0 kV</Text>
          <Text x={244} y={96}  fontSize={5.8} fill="#000">{`1 #${secaoFase}mm2 (F)`}</Text>
          <Text x={244} y={105} fontSize={5.8} fill="#000">{`1 #${secaoFase}mm2 (N)`}</Text>

          {/* D1 on main vertical line */}
          <PDFDisjuntor x={CX} y={145} />
          <Text x={CX + 15} y={143} fontSize={6.5} fill="#000">D1</Text>
          <Text x={CX + 15} y={152} fontSize={5.5} fill="#000">{djLabel}</Text>

          {/* D1 exit → terra → continue down */}
          <Line x1={CX} y1={152} x2={CX} y2={165} stroke="#000" strokeWidth={1} />
          <Line x1={CX} y1={165} x2={BR - 18} y2={165} stroke="#000" strokeWidth={1} />
          <PDFTerra x={BR - 18} y={165} />
          <Line x1={CX} y1={165} x2={CX} y2={220} stroke="#000" strokeWidth={1} />

          {/* ═══ QUADRO DE DISTRIBUIÇÃO ═══ */}
          {/* Wider box — extended both left (x=150) and right (to x=520) */}
          <Rect x={150} y={220} width={370} height={82} fill="white" stroke="#000" strokeWidth={1.2} />
          {/* Label — upper right, clear of center line */}
          <Text x={512} y={233} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE DISTRIBUICAO</Text>

          {/* Main vertical line through box */}
          <Line x1={CX} y1={220} x2={CX} y2={302} stroke="#000" strokeWidth={1} />

          {/* Barramento horizontal — with margin at each end */}
          <Line x1={175} y1={255} x2={495} y2={255} stroke="#000" strokeWidth={1} />

          {/* Terra — exactly at lower-right corner of box (bottom at y=302) */}
          <Line x1={505} y1={255} x2={505} y2={287} stroke="#000" strokeWidth={1} />
          <PDFTerra x={505} y={287} />

          {/* Cargas derivation — inside box (x=195), drops with arrow */}
          <Line x1={195} y1={255} x2={195} y2={315} stroke="#000" strokeWidth={1} />
          <Polygon points="190,315 200,315 195,325" fill="#000" />
          <Text x={215} y={311} fontSize={5.8} fill="#000">{`Cargas (${cargaKw !== '___' ? cargaKw : '--'} kW)`}</Text>
          <Text x={215} y={320} fontSize={5.8} fill="#000">{`Tensao Nominal: ${tensaoNom} V`}</Text>
          <Text x={215} y={329} fontSize={5.8} fill="#000">{`Corrente: ${corrCargas !== '___' ? corrCargas : '--'} A`}</Text>

          <Line x1={CX} y1={302} x2={CX} y2={358} stroke="#000" strokeWidth={1} />

          {/* CA cables annotation — centered on main line */}
          <Line x1={CX} y1={330} x2={CX + 12} y2={330} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={323} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70 - 1,0 kV</Text>
          <Text x={CX + 15} y={331} fontSize={5.5} fill="#000">{`1 #${caboCA}mm2 (F)`}</Text>
          <Text x={CX + 15} y={339} fontSize={5.5} fill="#000">{`1 #${caboCA}mm2 (N)`}</Text>
          <Text x={CX + 15} y={347} fontSize={5.5} fill="#000">{`1 #${caboCA}mm2 (T)`}</Text>

          {/* ═══ QUADRO DE PROTEÇÃO CA ═══ */}
          <Rect x={BX} y={358} width={BW} height={122} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={BR - 8} y={370} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE</Text>
          <Text x={BR - 8} y={382} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">PROTECAO CA</Text>
          <Text x={228} y={396} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">2x DPS CA</Text>
          <Text x={228} y={405} fontSize={5.5} fill="#000">275 Vca, 20-40 kA</Text>
          <Text x={228} y={414} fontSize={5.5} fill="#000">Classe II</Text>

          {/* Main vertical — continuous from box top (y=358) through D2 */}
          <Line x1={CX} y1={358} x2={CX} y2={408} stroke="#000" strokeWidth={1} />

          {/* DPS CA — slightly lower tap */}
          <Line x1={CX} y1={368} x2={290} y2={368} stroke="#000" strokeWidth={0.8} />
          <Line x1={290} y1={368} x2={290} y2={420} stroke="#000" strokeWidth={0.8} />
          <PDFDPSSymbol x={290} y={429} />
          <Line x1={290} y1={438} x2={290} y2={450} stroke="#000" strokeWidth={0.8} />
          <PDFTerra x={290} y={450} />

          {/* D2 — moved slightly lower to center in box */}
          <PDFDisjuntor x={CX} y={415} />
          <Text x={CX + 15} y={413} fontSize={6.5} fill="#000">D2</Text>
          <Text x={CX + 15} y={423} fontSize={5.5} fill="#000">Bipolar - {djCorr} A / {djTensao} Vca</Text>
          <Line x1={CX} y1={422} x2={CX} y2={514} stroke="#000" strokeWidth={1} />

          <Line x1={BX} y1={491} x2={BX - 14} y2={491} stroke="#000" strokeWidth={0.6} />
          <Text x={5} y={483} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70 - 1,0 kV</Text>
          <Text x={5} y={492} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (F)</Text>
          <Text x={5} y={500} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (N)</Text>
          <Text x={5} y={508} fontSize={5.5} fill="#000">1 #{caboCA}mm2 (T)</Text>

          {/* ═══ INVERSOR ═══ */}
          {/* Reduced to ~1/4 size (w=120, h=55), centered at CX */}
          <Rect x={280} y={514} width={120} height={55} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={CX} y={547} fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">INVERSOR</Text>
          {/* Diagonal line across inversor center */}
          <Line x1={283} y1={516} x2={397} y2={567} stroke="#000" strokeWidth={0.9} />
          {/* AC ~ symbol — now on LEFT side */}
          <Path d={`M${CX - 26} 532 Q${CX - 22} 525 ${CX - 18} 532 Q${CX - 14} 539 ${CX - 10} 532`}
                stroke="#000" strokeWidth={0.9} fill="none" />
          {/* DC = symbol — now on RIGHT side */}
          <Line x1={CX + 10} y1={530} x2={CX + 24} y2={530} stroke="#000" strokeWidth={0.9} />
          <Line x1={CX + 10} y1={534} x2={CX + 24} y2={534} stroke="#000" strokeWidth={0.9} />

          {/* Horizontal line from right side of inversor → vertical line connecting relay boxes */}
          <Line x1={400} y1={541} x2={467} y2={541} stroke="#000" strokeWidth={1} />
          {/* Vertical line connecting all relay boxes */}
          <Line x1={467} y1={520} x2={467} y2={637} stroke="#000" strokeWidth={1} />

          {/* Left annotation (text only) */}
          <Text x={5} y={517} fontSize={5.5} fill="#000">Marca: {invFab}</Text>
          <Text x={5} y={524} fontSize={5.5} fill="#000">Modelo: {invMod}</Text>
          <Text x={5} y={531} fontSize={5.5} fill="#000">Potencia: {invPot} kW</Text>
          <Text x={5} y={538} fontSize={5.5} fill="#000">Entrada - Tensao max: {invVccMax} Vcc</Text>
          <Text x={5} y={545} fontSize={5.5} fill="#000">  - Corrente max: {invIccMax} A</Text>
          <Text x={5} y={552} fontSize={5.5} fill="#000">Saida - Tensao: {tensaoNom} Vca</Text>
          <Text x={5} y={559} fontSize={5.5} fill="#000">  - Corrente: {invCorrOut} A</Text>
          <Text x={5} y={566} fontSize={5.5} fill="#000">Ver datasheet para mais detalhes</Text>

          {[
            { l: '25', s: '' }, { l: '27', s: '' },
            { l: '59', s: '' }, { l: '81', s: 'U/O' },
          ].map(({ l, s }, i) => (
            <>
              <Rect key={`r${l}`} x={BR + 8} y={520 + i * 25} width={26} height={20} fill="white" stroke="#000" strokeWidth={0.8} />
              <Text key={`t${l}`} x={BR + 21} y={s ? 531 + i * 25 : 534 + i * 25}
                    fontSize={7} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{l}</Text>
              {s ? <Text key={`s${l}`} x={BR + 21} y={538 + i * 25} fontSize={5.5} textAnchor="middle" fill="#000">{s}</Text> : null}
            </>
          ))}
          {/* ANTI-ILHAMENTO — rectangular block at bottom of relay column */}
          <Rect x={468} y={621} width={90} height={16} fill="white" stroke="#000" strokeWidth={0.8} />
          <Text x={513} y={632} fontSize={6} textAnchor="middle" fill="#000">ANTI-ILHAMENTO</Text>

          <Line x1={CX} y1={569} x2={CX} y2={668} stroke="#000" strokeWidth={1} />

          <Line x1={BR} y1={645} x2={BR + 14} y2={645} stroke="#000" strokeWidth={0.6} />
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

          <Line x1={BR} y1={780} x2={BR + 14} y2={780} stroke="#000" strokeWidth={0.6} />
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

          <Line x1={CX + 35} y1={881} x2={CX + 52} y2={881} stroke="#000" strokeWidth={0.6} />
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

          {/* ═══════════════════════════════════════════
              TITLE BLOCK / SELO
          ═══════════════════════════════════════════ */}

          {/* Seal outer rect */}
          <Rect x={5} y={978} width={885} height={112} fill="white" stroke="#000" strokeWidth={1.2} />

          {/* === COLUMN DIVIDERS === */}
          {/* Left | Mid */}
          <Line x1={178} y1={978} x2={178} y2={1090} stroke="#000" strokeWidth={0.8} />
          {/* Mid | Right (logo area) */}
          <Line x1={700} y1={978} x2={700} y2={1090} stroke="#000" strokeWidth={0.8} />
          {/* Left sub-col: label area | R values — starts below PRODUTO section */}
          <Line x1={118} y1={1008} x2={118} y2={1090} stroke="#000" strokeWidth={0.6} />

          {/* === HORIZONTAL DIVIDERS === */}
          {/* Below PRODUTO section (left + mid cols) */}
          <Line x1={5} y1={1008} x2={700} y2={1008} stroke="#000" strokeWidth={0.7} />
          {/* Left col — 4 equal rows of 16px + last row to 1090 */}
          <Line x1={5} y1={1024} x2={178} y2={1024} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1040} x2={178} y2={1040} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1056} x2={178} y2={1056} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1072} x2={178} y2={1072} stroke="#000" strokeWidth={0.5} />
          {/* Mid col: owner | responsavel separator (aligns with left col row 3 end) */}
          <Line x1={178} y1={1056} x2={700} y2={1056} stroke="#000" strokeWidth={0.5} />

          {/* === LEFT COLUMN — PRODUTO (top, full width, value centered) === */}
          <Text x={8}  y={987}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">PRODUTO</Text>
          <Text x={92} y={1002} fontSize={9}   fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">GFV {potKwp} kWp</Text>

          {/* DATA  (row 1: y=1008–1024) */}
          <Text x={8}   y={1015} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DATA</Text>
          <Text x={62}  y={1022} fontSize={6}   textAnchor="middle" fill="#000">{dataDoc}</Text>
          <Text x={148} y={1019} fontSize={5.5} textAnchor="middle" fill="#000">R1:</Text>

          {/* ESCALA  (row 2: y=1024–1040) */}
          <Text x={8}   y={1031} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">ESCALA</Text>
          <Text x={62}  y={1038} fontSize={6}   textAnchor="middle" fill="#000">S/ ESCALA</Text>
          <Text x={148} y={1035} fontSize={5.5} textAnchor="middle" fill="#000">R2:</Text>

          {/* TAMANHO  (row 3: y=1040–1056) */}
          <Text x={8}   y={1047} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TAMANHO</Text>
          <Text x={62}  y={1054} fontSize={6}   textAnchor="middle" fill="#000">A3</Text>
          <Text x={148} y={1051} fontSize={5.5} textAnchor="middle" fill="#000">R3:</Text>

          {/* FOLHA  (row 4: y=1056–1072) */}
          <Text x={8}   y={1063} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">FOLHA</Text>
          <Text x={62}  y={1070} fontSize={6}   textAnchor="middle" fill="#000">1/1</Text>
          <Text x={148} y={1067} fontSize={5.5} textAnchor="middle" fill="#000">R4:</Text>

          {/* REVISAO  (row 5: y=1072–1090) */}
          <Text x={8}   y={1079} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">REVISAO</Text>
          <Text x={62}  y={1086} fontSize={6}   textAnchor="middle" fill="#000">R0</Text>
          <Text x={148} y={1083} fontSize={5.5} textAnchor="middle" fill="#000">R5:</Text>

          {/* === MIDDLE COLUMN — TITULO (top) === */}
          <Text x={185} y={989} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TITULO</Text>
          <Text x={MID_CTR} y={1003} fontSize={11} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">DIAGRAMA UNIFILAR</Text>

          {/* === MIDDLE COLUMN — OWNER BLOCK (y=1008–1056, 5 items equidistant 9px) === */}
          <Text x={MID_CTR} y={1017} fontSize={5.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">Proprietario e Obra:</Text>
          <Text x={MID_CTR} y={1026} fontSize={6} textAnchor="middle" fill="#000">{`Nome: ${owner}`}</Text>
          <Text x={MID_CTR} y={1035} fontSize={6} textAnchor="middle" fill="#000">{`Endereco: ${endereco}`}</Text>
          <Text x={MID_CTR} y={1044} fontSize={6} textAnchor="middle" fill="#000">{`Cidade: ${uf ? `${cidade} - ${uf}` : cidade}`}</Text>
          <Text x={MID_CTR} y={1053} fontSize={6} textAnchor="middle" fill="#000">{`CEP: ${cep}`}</Text>

          {/* === MIDDLE COLUMN — RESPONSAVEL BLOCK (y=1056–1090, 4 items equidistant 8px) === */}
          <Text x={MID_CTR} y={1065} fontSize={5.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">Responsavel Tecnico:</Text>
          <Text x={MID_CTR} y={1073} fontSize={6} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{respNome}</Text>
          <Text x={MID_CTR} y={1081} fontSize={5.5} textAnchor="middle" fill="#000">TECNICO EM ELETROTECNICA</Text>
          <Text x={MID_CTR} y={1089} fontSize={5.5} textAnchor="middle" fill="#000">{`CFT: ${respCft}`}</Text>

          {/* === RIGHT COLUMN — Logo placeholder === */}
          {/* Empty — space reserved for company logo */}

        </Svg>
      </Page>
    </Document>
  );
}
