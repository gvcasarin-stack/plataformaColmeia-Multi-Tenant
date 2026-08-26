// @ts-nocheck — react-pdf SVG props (x, y, fontSize, fill, etc.) não são reconhecidos pelo TS language server mas funcionam corretamente em runtime e na build
import {
  Document,
  Page,
  Svg,
  G,
  Line,
  Polygon,
  Rect,
  Circle,
  Path,
  Text,
  Image,
  View,
} from '@react-pdf/renderer';
import { getTotalKwp, getTotalModulosQtd, getAllInversores } from '@/lib/utils/equipmentParser';

interface DiagramaUnifilarPDFProps {
  projectData?: Record<string, any>;
  placaAdvertencia?: { nome: string; imagem_url: string } | null;
}

// ── Placa de Advertência (CPFL) — texto normativo fixo (sem acentos, como o
// restante deste arquivo, por limitação de fontes do react-pdf) ────────────
const PLACA_ADVERTENCIA_CPFL_LINES = [
  'Alem da tampa da caixa do medidor, onde a placa deve ser',
  'obrigatoriamente fixada atraves de rebites, esta mesma placa',
  'devera tambem ser fixada atraves de parafusos ou cintas',
  'metalicas nos seguintes locais:',
  '1) No caso de ponto de entrega aerea, no postinho, ou',
  'parede, ou cabine com buchas de passagem, do lado da via',
  'publica, na conexao do ramal de ligacao (ou servico).',
  '2) No caso de conexao de unidade consumidora (UC) em',
  'edificio com multiplas unidades (edificio de uso coletivo ou',
  'com medicao agrupada), no ponto de entrega do edificio',
  '(poste) e na caixa de distribuicao (se houver).',
  '3) No caso de ponto de entrega subterranea, na parte mais',
  'alta do duto de entrada localizado no poste da CPFL.',
];

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

export function DiagramaUnifilarPDF({ projectData, placaAdvertencia }: DiagramaUnifilarPDFProps) {
  const pd = projectData || {};
  const isCPFL = String(pd.distribuidora || '').toLowerCase().includes('cpfl');

  const modQtd    = getTotalModulosQtd(pd);
  const potTotal  = getTotalKwp(pd);
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
  // Corrente das strings usa Isc (curto-circuito, pior caso) — nao Ipmp, que e
  // a linha separada "Corrente de saida do modulo" logo acima no diagrama.
  const corrStr = fv(pd.modulos_isc);

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
  // Secao do Ramal de Ligacao (nao confundir com secao_fase_mm2/secao_neutro_mm2,
  // que sao do Ramal de Entrada — usados no Memorial Descritivo, campo diferente).
  const secaoFase   = fv(pd.secao_fase_rl_mm2, '10,0');
  const secaoNeutro = fv(pd.secao_neutro_rl_mm2, '10,0');

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
  const d2Corr           = fv(pd.disjuntor_ca_corrente_a, djCorr);
  const dpsLabel         = isRedeMono ? '2x DPS CA' : '4x DPS CA';
  const djGeralCorr      = fv(pd.disjuntor_quadro_ca_corrente_a, djCorr);
  const djGeralPolos     = fv(pd.disjuntor_quadro_ca_polos, djCaPolos);
  const djGeralTipo      = djGeralPolos === '3' ? 'Tripolar' : djGeralPolos === '1' ? 'Monopolar' : 'Bipolar';

  const physicalInvDisj = (() => {
    const invsList = getAllInversores(pd);
    const result: Array<{ corrente: string; tipo: string }> = [];
    for (const inv of invsList) {
      const qty = parseInt(String(inv.quantidade || '1')) || 1;
      for (let u = 0; u < qty; u++) {
        const corrente = inv.disjuntor_ca_corrente_a || fv(pd.disjuntor_ca_corrente_a, djCorr);
        const polos = inv.disjuntor_ca_polos || djCaPolos;
        const tipo = polos === '3' ? 'Tripolar' : polos === '1' ? 'Monopolar' : 'Bipolar';
        result.push({ corrente, tipo });
      }
    }
    return result;
  })();

  const physicalInvCabo = (() => {
    const invsList = getAllInversores(pd);
    const result: Array<{ secao: string }> = [];
    for (const inv of invsList) {
      const qty = parseInt(String(inv.quantidade || '1')) || 1;
      for (let u = 0; u < qty; u++) {
        result.push({ secao: inv.cabo_ca_secao_mm2 || caboCA });
      }
    }
    return result;
  })();

  const caboQuadroCA = fv(pd.cabo_quadro_ca_secao_mm2, caboCA);

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

  const numInversores = (pd.setup_mais_de_um_inversor === 'sim' && pd.setup_tipo_inversor !== 'microinversor')
    ? (parseInt(String(pd.setup_total_inversores || '2')) || 2) : 1;
  const isMultiInv = numInversores > 1;
  const MI_GAP = numInversores >= 4 ? 187 : (numInversores >= 3 ? 156 : 312);
  const MI_MAX_COL_W = 130;
  const miColW = Math.min(MI_MAX_COL_W, Math.floor((840 - MI_GAP * (numInversores - 1)) / numInversores));
  const miColStep = miColW + MI_GAP;
  const miSectionW = numInversores * miColStep - MI_GAP;
  const miSectionStart = (900 - miSectionW) / 2;
  const miColCX = (i: number) => Math.round(miSectionStart + miColW / 2 + i * miColStep);
  const miColBX = (i: number) => Math.round(miSectionStart + i * miColStep);

  const topCX = isMultiInv ? 450 : CX;

  // DPS no Padrao de Entrada (Setup do Projeto) — quantidade vem do Tipo de Conexao
  // do Padrao de Entrada (mesma fonte que ja define o Ramal de Ligacao/D1), Classe
  // vem da opcao escolhida no Setup (Tipo I/Tipo II).
  const dpsEntradaSetup = fv(pd.setup_dps_padrao_entrada);
  const hasDpsEntrada = dpsEntradaSetup === 'tipo1' || dpsEntradaSetup === 'tipo2';
  const dpsEntradaQtd = isTri ? 3 : isBi ? 2 : 1;
  const dpsEntradaClasse = dpsEntradaSetup === 'tipo1' ? 'Classe I' : 'Classe II';

  // O retangulo do Padrao de Entrada so cresce quando ha DPS a desenhar — do
  // contrario mantem exatamente o tamanho/posicao de sempre.
  const topBX = hasDpsEntrada ? topCX - 155 : topCX - 120;
  const topBR = hasDpsEntrada ? topCX + 175 : topCX + 120;
  const padraoEntradaBH = hasDpsEntrada ? 200 : 150;
  const padraoEntradaBottom = 42 + padraoEntradaBH;
  // Tudo que fica abaixo do Padrao de Entrada (Quadro de Distribuicao em diante)
  // desce a mesma quantidade que o retangulo cresceu — com YSHIFT=0 (sem DPS) o
  // translate nao faz nada e o resto do diagrama fica igual ao de sempre.
  const YSHIFT = padraoEntradaBH - 150;
  // A altura do viewBox precisa crescer junto com o YSHIFT, senao o selo (que fica
  // no fim do desenho, dentro do <G> deslocado) passa do limite inferior e e
  // cortado. Com YSHIFT=0 (sem DPS) o valor fica exatamente 1295, como sempre foi.
  const VB_H = 1295 + YSHIFT;
  // Com DPS, D1 sobe (fica na altura onde antes ficava a derivacao do DPS, um
  // pouco abaixo dela) — sem DPS, fica exatamente onde sempre esteve (y=145).
  const d1Y = hasDpsEntrada ? 138 : 145;
  // Derivacao do DPS agora sai do trecho ABAIXO do D1 (nao mais acima).
  const dpsTapY = d1Y + 7 + 8;
  // So a linha horizontal que sai da linha central desce 15% (do trecho vertical
  // ate o simbolo do DPS) — o simbolo, texto e Terra do DPS continuam no lugar.
  const dpsTapLineY = dpsTapY + 5;
  const cargasX = isMultiInv ? Math.max(Math.round(miColBX(0)) - 55, numInversores >= 4 ? 45 : (numInversores >= 3 ? 64 : 100)) : 195;
  const legendX = isMultiInv ? (numInversores >= 4 ? 851 : 810) : 650;
  const isSaidaAgrupada = isMultiInv && fv(pd.setup_configuracao_saidas) === 'agrupadas';
  const miInvShift = isSaidaAgrupada ? 75 : 0;
  const miQccShift = isSaidaAgrupada ? 75 : 0;
  // Com 1 so inversor o circuito (Padrao de Entrada -> Gerador) fica bem mais estreito
  // que a folha, deixando um vao grande antes da legenda. Desloca esse bloco pra
  // direita, aproximando-o da legenda (que nao se move), pra aproveitar melhor o
  // espaco. Nao afeta multi-inversor (que ja usa a largura toda).
  const hShift = !isMultiInv ? 50 : 0;
  const hShiftTransform = hShift ? `translate(${hShift}, 0)` : undefined;

  // Seal column centers
  const MID_CTR = 439; // center of middle col (178-700)

  // Placa de Advertência — mesma conversão viewBox→pontos do Page usada no
  // logo abaixo (Svg width/height ≠ viewBox, então a posição em pontos
  // precisa ser escalada; ver bloco do logo mais adiante).
  const SVG_W = numInversores >= 4 ? 1280 : (numInversores >= 3 ? 1160 : 812);
  const VB_MINX = numInversores >= 4 ? -100 : (numInversores >= 3 ? -25 : 0);
  const VB_W = numInversores >= 4 ? 1200 : (numInversores >= 3 ? 1085 : 1060);
  const VB_MINY = -25;
  const SVG_SCALE = SVG_W / VB_W;
  const PAGE_PADDING = 15;
  const placaImgLeft = PAGE_PADDING + (14 - VB_MINX) * SVG_SCALE;
  const placaImgTop = PAGE_PADDING + (44 - VB_MINY) * SVG_SCALE;
  const placaImgW = 42 * SVG_SCALE;
  const placaImgH = 45 * SVG_SCALE;
  // Altura do Svg em pontos, escalada junto com o VB_H (mesma técnica do "top"
  // do logo abaixo) — com YSHIFT=0 fica exatamente igual ao valor de sempre.
  const SVG_H = (numInversores >= 4 ? 1385 : (numInversores >= 3 ? 1385 : 992)) + YSHIFT * SVG_SCALE;

  // Segunda ocorrência da placa — dentro do Padrão de Entrada. Sem DPS, ao lado
  // esquerdo do D1 (posição de sempre); com DPS, ao lado direito (acima do
  // MEDIDOR), mais para baixo (a caixa cresceu e sobrou espaço) e levemente à
  // esquerda, já que o lado esquerdo passa a ser do DPS.
  const placa2X = hasDpsEntrada ? topCX + 112 : topCX - 96;
  const placa2Y = hasDpsEntrada ? 146 : 132;
  const placaImg2Left = PAGE_PADDING + (placa2X - VB_MINX) * SVG_SCALE;
  const placaImg2Top = PAGE_PADDING + (placa2Y - VB_MINY) * SVG_SCALE;

  return (
    <Document>
      <Page size={numInversores >= 4 ? 'A1' : (numInversores >= 3 ? 'A2' : 'A3')} style={{ padding: 15, backgroundColor: '#FFFFFF' }}>
        <Svg width={SVG_W} height={SVG_H} viewBox={`${VB_MINX} ${VB_MINY} ${VB_W} ${VB_H}`}>

          {/* Com 1 inversor, todo o circuito (menos o texto da placa CPFL do canto,
              que fica sempre fixo no canto esquerdo da folha) desloca hShift pts pra
              direita — com hShift=0 (multi-inversor) o transform nao faz nada. */}
          <G transform={hShiftTransform}>
          {/* ═══ REDE DE BAIXA TENSÃO ═══ */}
          <Line
            x1={isMultiInv ? 144 : 90} y1={28}
            x2={isMultiInv ? 756 : 490} y2={28}
            stroke="#000" strokeWidth={1.8}
          />
          <Text x={topCX} y={21} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">REDE DE BAIXA TENSAO</Text>

          <Line x1={topCX} y1={28} x2={topCX} y2={44} stroke="#000" strokeWidth={1} />
          <Polygon points={`${topCX - 5},28 ${topCX + 5},28 ${topCX},40`} fill="#000" />
          <Text x={topCX + 8} y={37} fontSize={6.5} fill="#000">PONTO DE ENTREGA</Text>
          <Text x={topCX + 8} y={47} fontSize={6.5} fill="#000">ACESSADA</Text>
          <Text x={topCX + 8} y={57} fontSize={6.5} fill="#000">ACESSANTE</Text>

          {/* ═══ PADRÃO DE ENTRADA ═══ */}
          <Rect x={topBX} y={42} width={topBR - topBX} height={padraoEntradaBH} fill="white" stroke="#000" strokeWidth={1.2} />
          <Text x={topCX + 66} y={57} fontSize={7.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">PADRAO DE ENTRADA</Text>
          <Text x={topCX + 66} y={67} fontSize={6} textAnchor="middle" fill="#000">(caixa de medicao)</Text>
          </G>

          {/* ═══ PLACA DE ADVERTENCIA (CPFL) — fixa, não desloca — texto ao lado esquerdo do PADRAO DE ENTRADA (imagem fica fora do Svg, ver bloco de posicionamento absoluto abaixo) ═══ */}
          {isCPFL && placaAdvertencia && PLACA_ADVERTENCIA_CPFL_LINES.map((line, i) => (
            <Text key={i} x={14} y={103 + i * 8} fontSize={5.5} fill="#000">{line}</Text>
          ))}

          <G transform={hShiftTransform}>
          {/* Main vertical — starts at box top (y=42) to close the small gap */}
          <Line x1={topCX} y1={42} x2={topCX} y2={d1Y - 7} stroke="#000" strokeWidth={1} />

          {/* Horizontal tap to MEDIDOR (branch right) */}
          <Line x1={topCX} y1={85} x2={topCX + 15} y2={85} stroke="#000" strokeWidth={1} />

          {/* MEDIDOR box — right of main line */}
          <Rect x={topCX + 15} y={71} width={95} height={28} fill="white" stroke="#000" strokeWidth={1} />
          <Text x={topCX + 62} y={88} fontSize={9} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">MEDIDOR</Text>

          {/* Ramal de Ligação — drawn AFTER rects so visible over white fills */}
          <Text x={topCX - 96} y={78}  fontSize={5.8} fontFamily="Helvetica-Bold" fill="#000">Ramal de Ligacao</Text>
          <Text x={topCX - 96} y={87}  fontSize={5.8} fontFamily="Helvetica-Bold" fill="#000">{`Aluminio ${ramalTipo} - 1,0 kV`}</Text>
          <Text x={topCX - 96} y={96}  fontSize={5.8} fill="#000">{`${nFaseRL} #${secaoFase}mm² (F)`}</Text>
          <Text x={topCX - 96} y={105} fontSize={5.8} fill="#000">{`1 #${secaoNeutro}mm² (N)`}</Text>

          {/* D1 on main vertical line — com DPS, sobe para a altura de onde antes
              ficava a derivacao do DPS (um pouco abaixo dela). */}
          <PDFDisjuntor x={topCX} y={d1Y} />
          <Text x={topCX + 15} y={d1Y - 2} fontSize={6.5} fill="#000">D1</Text>
          <Text x={topCX + 15} y={d1Y + 7} fontSize={5.5} fill="#000">{djLabel}</Text>

          {/* DPS no Padrao de Entrada (Setup do Projeto) — mesmo padrao visual do DPS do
              Quadro de Protecao CA (derivacao da linha principal + simbolo + Terra), do
              lado esquerdo do D1, com a derivacao saindo do trecho da linha principal
              ABAIXO do D1 (nao acima). */}
          {hasDpsEntrada && (
            <>
              <Line x1={topCX} y1={dpsTapLineY} x2={topCX - 70} y2={dpsTapLineY} stroke="#000" strokeWidth={0.8} />
              <Line x1={topCX - 70} y1={dpsTapLineY} x2={topCX - 70} y2={dpsTapY + 34} stroke="#000" strokeWidth={0.8} />
              <PDFDPSSymbol x={topCX - 70} y={dpsTapY + 43} />
              <Line x1={topCX - 70} y1={dpsTapY + 52} x2={topCX - 70} y2={dpsTapY + 64} stroke="#000" strokeWidth={0.8} />
              <PDFTerra x={topCX - 70} y={dpsTapY + 64} />
              <Text x={topCX - 132} y={dpsTapY + 10} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">{`${dpsEntradaQtd}x DPS`}</Text>
              <Text x={topCX - 132} y={dpsTapY + 19} fontSize={5.5} fill="#000">275 Vca, 20-40 kA</Text>
              <Text x={topCX - 132} y={dpsTapY + 28} fontSize={5.5} fill="#000">{dpsEntradaClasse}</Text>
            </>
          )}

          {/* D1 exit → out of PADRÃO — desce ate o novo topo (deslocado) do Quadro de
              Distribuicao. A derivacao do DPS tapeia nesta mesma linha, no ponto dpsTapY. */}
          <Line x1={topCX} y1={d1Y + 7} x2={topCX} y2={220 + YSHIFT} stroke="#000" strokeWidth={1} />

          {/* Terra — lower-right corner of PADRAO DE ENTRADA */}
          <PDFTerra x={topBR - 18} y={padraoEntradaBottom} />
          </G>

          {/* ═══ TUDO A PARTIR DAQUI (Quadro de Distribuicao em diante) desce YSHIFT
              pontos — com YSHIFT=0 (sem DPS no Padrao de Entrada) o translate nao
              muda nada, entao nada abaixo deste ponto e afetado no caso comum. ═══ */}
          <G transform={`translate(0, ${YSHIFT})`}>
          {/* Circuito (Quadro Distribuicao -> Gerador) tambem desloca hShift pts pra
              direita com 1 inversor — legenda/selo/logo (fora deste <G>) nao se movem. */}
          <G transform={hShiftTransform}>

          {/* ═══ QUADRO DE DISTRIBUIÇÃO ═══ */}
          <Rect
            x={isMultiInv ? miColBX(0) - (numInversores >= 3 ? 119 : 99) : 150}
            y={220}
            width={isMultiInv ? miSectionW + (numInversores >= 3 ? 188 : 168) : 370}
            height={82}
            fill="white" stroke="#000" strokeWidth={1.2}
          />
          <Text
            x={isMultiInv ? miColBX(numInversores - 1) + miColW + 52 : 512}
            y={233}
            fontSize={8.5} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000"
          >QUADRO DE DISTRIBUICAO</Text>

          {/* Main vertical line through box */}
          <Line x1={topCX} y1={220} x2={topCX} y2={isMultiInv ? 255 : 302} stroke="#000" strokeWidth={1} />

          {/* Barramento horizontal */}
          <Line
            x1={isMultiInv ? miColBX(0) - 80 : 175} y1={255}
            x2={isMultiInv ? miColBX(numInversores - 1) + miColW + 55 : 495} y2={255}
            stroke="#000" strokeWidth={1}
          />

          {/* Terra — lower-right corner of QD */}
          <PDFTerra x={isMultiInv ? miColBX(numInversores - 1) + miColW + 55 : 505} y={302} />

          {/* Cargas derivation — inside QD box */}
          <Line x1={cargasX} y1={255} x2={cargasX} y2={315} stroke="#000" strokeWidth={1} />
          <Polygon points={`${cargasX - 5},315 ${cargasX + 5},315 ${cargasX},325`} fill="#000" />
          <Text x={cargasX + 20} y={311} fontSize={5.8} fill="#000">{`Cargas (${cargaKw !== '___' ? cargaKw : '--'} kW)`}</Text>
          <Text x={cargasX + 20} y={320} fontSize={5.8} fill="#000">{`Tensao Nominal: ${tensaoNom} V`}</Text>
          <Text x={cargasX + 20} y={329} fontSize={5.8} fill="#000">{`Corrente: ${corrCargas !== '___' ? corrCargas : '--'} A`}</Text>

          {!isMultiInv && (<>
          <Line x1={CX} y1={302} x2={CX} y2={358} stroke="#000" strokeWidth={1} />

          {/* CA cables annotation — centered on main line */}
          <Line x1={CX} y1={330} x2={CX + 12} y2={330} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={323} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70ºC - 1,0 kV</Text>
          <Text x={CX + 15} y={331} fontSize={5.5} fill="#000">{`${caboCaFCount} #${physicalInvCabo[0]?.secao || caboCA}mm² (F)`}</Text>
          <Text x={CX + 15} y={339} fontSize={5.5} fill="#000">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² ${caboCaMidLabel}`}</Text>
          <Text x={CX + 15} y={347} fontSize={5.5} fill="#000">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² (T)`}</Text>

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
          <Text x={CX + 15} y={423} fontSize={5.5} fill="#000">{`${d2Tipo} - ${d2Corr} A / ${djTensao} Vca`}</Text>
          <Line x1={CX} y1={422} x2={CX} y2={554} stroke="#000" strokeWidth={1} />

          {/* CA cables annotation — between QUADRO CA exit and INVERSOR (same style as DIST→CA) */}
          <Line x1={CX} y1={502} x2={CX + 12} y2={502} stroke="#000" strokeWidth={0.6} />
          <Text x={CX + 15} y={495} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70ºC - 1,0 kV</Text>
          <Text x={CX + 15} y={503} fontSize={5.5} fill="#000">{`${caboCaFCount} #${physicalInvCabo[0]?.secao || caboCA}mm² (F)`}</Text>
          <Text x={CX + 15} y={511} fontSize={5.5} fill="#000">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² ${caboCaMidLabel}`}</Text>
          <Text x={CX + 15} y={519} fontSize={5.5} fill="#000">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² (T)`}</Text>

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
          </>)}

          {/* ── Multi-inverter columns ── */}
          {isMultiInv && (<>

            {/* ═══ UNIFIED QD CA — saidas agrupadas ═══ */}
            {isSaidaAgrupada && (<>
              <Line x1={topCX} y1={255} x2={topCX} y2={358} stroke="#000" strokeWidth={1} />
              <Line x1={topCX} y1={322} x2={topCX + 12} y2={322} stroke="#000" strokeWidth={0.6} />
              <Text x={topCX + 15} y={315} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70{'º'}C - 1,0 kV</Text>
              <Text x={topCX + 15} y={323} fontSize={5.5} fill="#000">{`${caboCaFCount} #${caboQuadroCA}mm² (F)`}</Text>
              <Text x={topCX + 15} y={331} fontSize={5.5} fill="#000">{`1 #${caboQuadroCA}mm² ${caboCaMidLabel}`}</Text>
              <Text x={topCX + 15} y={339} fontSize={5.5} fill="#000">{`1 #${caboQuadroCA}mm² (T)`}</Text>
              <Rect
                x={miColBX(0) - (numInversores >= 3 ? 119 : 99)}
                y={358}
                width={miSectionW + (numInversores >= 3 ? 188 : 168)}
                height={185}
                fill="white" stroke="#000" strokeWidth={1.2}
              />
              <Text x={miColBX(numInversores - 1) + miColW + 52} y={370} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE</Text>
              <Text x={miColBX(numInversores - 1) + miColW + 52} y={380} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">PROTECAO CA</Text>
              <Line x1={topCX} y1={358} x2={topCX} y2={465} stroke="#000" strokeWidth={1} />
              <Text x={topCX - 130} y={372} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">{dpsLabel}</Text>
              <Text x={topCX - 130} y={381} fontSize={5.5} fill="#000">275 Vca, 20-40 kA</Text>
              <Text x={topCX - 130} y={390} fontSize={5.5} fill="#000">Classe II</Text>
              <Line x1={topCX} y1={375} x2={topCX - 80} y2={375} stroke="#000" strokeWidth={0.8} />
              <Line x1={topCX - 80} y1={375} x2={topCX - 80} y2={400} stroke="#000" strokeWidth={0.8} />
              <PDFDPSSymbol x={topCX - 80} y={409} />
              <Line x1={topCX - 80} y1={418} x2={topCX - 80} y2={428} stroke="#000" strokeWidth={0.8} />
              <PDFTerra x={topCX - 80} y={428} />
              <PDFDisjuntor x={topCX} y={408} />
              <Text x={topCX + 15} y={406} fontSize={6.5} fill="#000">D2</Text>
              <Text x={topCX + 15} y={416} fontSize={5.5} fill="#000">{`${djGeralTipo} - ${djGeralCorr} A / ${djTensao} Vca`}</Text>
              <Text x={topCX + 15} y={425} fontSize={5} fill="#000">GERAL</Text>
              <Line x1={miColCX(0)} y1={465} x2={miColCX(numInversores - 1)} y2={465} stroke="#000" strokeWidth={1} />
            </>)}

            {Array.from({ length: numInversores }, (_, i) => {
              const cCX = miColCX(i);
              const cBX = miColBX(i);
              const cBR = cBX + miColW;
              const dpsX = cCX - 50;
              const invDisj = physicalInvDisj[i] || { corrente: djCorr, tipo: d2Tipo };
              const invCabo = physicalInvCabo[i] || { secao: caboCA };
              return (
                <>
                  {/* Independente: QD CA individual */}
                  {!isSaidaAgrupada && (<>
                    <Line key={`vl-${i}`} x1={cCX} y1={255} x2={cCX} y2={358} stroke="#000" strokeWidth={1} />
                    <Line key={`ca1-ln-${i}`} x1={cCX} y1={330} x2={cCX + 12} y2={330} stroke="#000" strokeWidth={0.6} />
                    <Text key={`ca1-t0-${i}`} x={cCX + 15} y={323} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70{'º'}C - 1,0 kV</Text>
                    <Text key={`ca1-t1-${i}`} x={cCX + 15} y={331} fontSize={5.5} fill="#000">{`${caboCaFCount} #${invCabo.secao}mm² (F)`}</Text>
                    <Text key={`ca1-t2-${i}`} x={cCX + 15} y={339} fontSize={5.5} fill="#000">{`1 #${invCabo.secao}mm² ${caboCaMidLabel}`}</Text>
                    <Text key={`ca1-t3-${i}`} x={cCX + 15} y={347} fontSize={5.5} fill="#000">{`1 #${invCabo.secao}mm² (T)`}</Text>
                    <Rect key={`qca-r-${i}`} x={cCX - 120} y={358} width={240} height={122} fill="white" stroke="#000" strokeWidth={1.2} />
                    <Text key={`qca-t1-${i}`} x={cCX + 115} y={371} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE</Text>
                    <Text key={`qca-t2-${i}`} x={cCX + 115} y={381} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">PROTECAO CA</Text>
                    <Text key={`dpsca-l0-${i}`} x={cCX - 115} y={396} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">{dpsLabel}</Text>
                    <Text key={`dpsca-l1-${i}`} x={cCX - 115} y={405} fontSize={5.5} fill="#000">275 Vca, 20-40 kA</Text>
                    <Text key={`dpsca-l2-${i}`} x={cCX - 115} y={414} fontSize={5.5} fill="#000">Classe II</Text>
                    <Line key={`qca-v1-${i}`} x1={cCX} y1={358} x2={cCX} y2={408} stroke="#000" strokeWidth={1} />
                    <Line key={`dpsca-h-${i}`} x1={cCX} y1={385} x2={dpsX} y2={385} stroke="#000" strokeWidth={0.8} />
                    <Line key={`dpsca-v-${i}`} x1={dpsX} y1={385} x2={dpsX} y2={420} stroke="#000" strokeWidth={0.8} />
                    <PDFDPSSymbol key={`dpsca-sym-${i}`} x={dpsX} y={429} />
                    <Line key={`dpsca-bt-${i}`} x1={dpsX} y1={438} x2={dpsX} y2={450} stroke="#000" strokeWidth={0.8} />
                    <PDFTerra key={`dpsca-t-${i}`} x={dpsX} y={450} />
                    <PDFDisjuntor key={`d2-${i}`} x={cCX} y={415} />
                    <Text key={`d2-lbl-${i}`} x={cCX + 15} y={413} fontSize={6.5} fill="#000">{`D${i + 2}`}</Text>
                    <Text key={`d2-typ-${i}`} x={cCX + 15} y={423} fontSize={5.5} fill="#000">{`${invDisj.tipo} - ${invDisj.corrente} A / ${djTensao} Vca`}</Text>
                    <Line key={`qca-v2-${i}`} x1={cCX} y1={422} x2={cCX} y2={480} stroke="#000" strokeWidth={1} />
                  </>)}

                  {/* Agrupadas: disjuntor individual dentro do QD CA unificado */}
                  {isSaidaAgrupada && (<>
                    <Line key={`agr-v1-${i}`} x1={cCX} y1={465} x2={cCX} y2={483} stroke="#000" strokeWidth={1} />
                    <PDFDisjuntor key={`agr-d-${i}`} x={cCX} y={490} />
                    <Text key={`agr-dlbl-${i}`} x={cCX + 22} y={488} fontSize={6.5} fill="#000">{`D${i + 3}`}</Text>
                    <Text key={`agr-dtyp-${i}`} x={cCX + 22} y={498} fontSize={5.5} fill="#000">{`${invDisj.tipo} - ${invDisj.corrente} A / ${djTensao} Vca`}</Text>
                    <Line key={`agr-v2-${i}`} x1={cCX} y1={498} x2={cCX} y2={543} stroke="#000" strokeWidth={1} />
                  </>)}

                  {/* Wire → INVERSOR */}
                  <Line key={`inv-up-${i}`} x1={cCX} y1={isSaidaAgrupada ? 543 : 480} x2={cCX} y2={554 + miInvShift} stroke="#000" strokeWidth={1} />

                  {/* Cabos CA — QD CA → Inversor */}
                  <Line key={`ca2-ln-${i}`} x1={cCX} y1={isSaidaAgrupada ? 568 : 502} x2={cCX + 12} y2={isSaidaAgrupada ? 568 : 502} stroke="#000" strokeWidth={0.6} />
                  <Text key={`ca2-t0-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 561 : 495} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CA - PVC 70{'º'}C - 1,0 kV</Text>
                  <Text key={`ca2-t1-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 576 : 503} fontSize={5.5} fill="#000">{`${caboCaFCount} #${invCabo.secao}mm² (F)`}</Text>
                  <Text key={`ca2-t2-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 584 : 511} fontSize={5.5} fill="#000">{`1 #${invCabo.secao}mm² ${caboCaMidLabel}`}</Text>
                  <Text key={`ca2-t3-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 592 : 519} fontSize={5.5} fill="#000">{`1 #${invCabo.secao}mm² (T)`}</Text>

                  {/* INVERSOR */}
                  <Text key={`inv-lbl-${i}`} x={cBR + 15} y={551 + miInvShift} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">{`INVERSOR ${i + 1}`}</Text>
                  <Rect key={`inv-r-${i}`} x={cBX} y={554 + miInvShift} width={miColW} height={62} fill="white" stroke="#000" strokeWidth={1.2} />
                  <Line key={`inv-diag-${i}`} x1={cBX} y1={554 + miInvShift} x2={cBR} y2={616 + miInvShift} stroke="#000" strokeWidth={0.9} />
                  <Path key={`inv-ac-${i}`} d={`M${cBX + 4} ${598 + miInvShift} Q${cBX + 8} ${591 + miInvShift} ${cBX + 12} ${598 + miInvShift} Q${cBX + 16} ${605 + miInvShift} ${cBX + 20} ${598 + miInvShift}`} stroke="#000" strokeWidth={0.9} fill="none" />
                  <Line key={`inv-dc1-${i}`} x1={cBR - 26} y1={560 + miInvShift} x2={cBR - 4} y2={560 + miInvShift} stroke="#000" strokeWidth={0.9} />
                  <Line key={`inv-dc2-${i}`} x1={cBR - 26} y1={564 + miInvShift} x2={cBR - 4} y2={564 + miInvShift} stroke="#000" strokeWidth={0.9} />

                  {/* Specs */}
                  <Text key={`spec-t0-${i}`} x={cBX - 118} y={557 + miInvShift} fontSize={5.5} fill="#000">Marca: {invFab}</Text>
                  <Text key={`spec-t1-${i}`} x={cBX - 118} y={564 + miInvShift} fontSize={5.5} fill="#000">Modelo: {invMod}</Text>
                  <Text key={`spec-t2-${i}`} x={cBX - 118} y={571 + miInvShift} fontSize={5.5} fill="#000">Potencia: {invPot} kW</Text>
                  <Text key={`spec-t3-${i}`} x={cBX - 118} y={578 + miInvShift} fontSize={5.5} fill="#000">Ent - V max: {invVccMax} Vcc</Text>
                  <Text key={`spec-t4-${i}`} x={cBX - 118} y={585 + miInvShift} fontSize={5.5} fill="#000">  - I max: {invIccMax} A</Text>
                  <Text key={`spec-t5-${i}`} x={cBX - 118} y={592 + miInvShift} fontSize={5.5} fill="#000">Saida - V: {tensaoNom} Vca</Text>
                  <Text key={`spec-t6-${i}`} x={cBX - 118} y={599 + miInvShift} fontSize={5.5} fill="#000">  - I: {invCorrOut} A</Text>
                  <Text key={`spec-t7-${i}`} x={cBX - 118} y={606 + miInvShift} fontSize={5.5} fill="#000">Ver datasheet</Text>

                  {/* Relays — only last col when N>=3 */}
                  {(numInversores <= 2 || i === numInversores - 1) && (<>
                    <Line key={`rel-h-${i}`} x1={cBR} y1={581 + miInvShift} x2={cBR + 67} y2={581 + miInvShift} stroke="#000" strokeWidth={1} />
                    <Line key={`rel-v-${i}`} x1={cBR + 67} y1={534 + miInvShift} x2={cBR + 67} y2={651 + miInvShift} stroke="#000" strokeWidth={1} />
                    {[{ l: '25', s: '' }, { l: '27', s: '' }, { l: '59', s: '' }, { l: '81', s: 'U/O' }].map(({ l, s }, ri) => (
                      <>
                        <Line key={`rl-${i}-${l}`} x1={cBR + 67} y1={544 + ri * 25 + miInvShift} x2={cBR + 90} y2={544 + ri * 25 + miInvShift} stroke="#000" strokeWidth={0.8} />
                        <Rect key={`rr-${i}-${l}`} x={cBR + 90} y={534 + ri * 25 + miInvShift} width={26} height={20} fill="white" stroke="#000" strokeWidth={0.8} />
                        <Text key={`rt-${i}-${l}`} x={cBR + 103} y={s ? 545 + ri * 25 + miInvShift : 548 + ri * 25 + miInvShift} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{l}</Text>
                        {s ? <Text key={`rs-${i}-${l}`} x={cBR + 103} y={552 + ri * 25 + miInvShift} fontSize={5.5} textAnchor="middle" fill="#000">{s}</Text> : null}
                      </>
                    ))}
                    <Line key={`ai-h-${i}`} x1={cBR + 67} y1={643 + miInvShift} x2={cBR + 90} y2={643 + miInvShift} stroke="#000" strokeWidth={0.8} />
                    <Rect key={`ai-r-${i}`} x={cBR + 90} y={635 + miInvShift} width={80} height={16} fill="white" stroke="#000" strokeWidth={0.8} />
                    <Text key={`ai-t-${i}`} x={cBR + 130} y={646 + miInvShift} fontSize={6} textAnchor="middle" fill="#000">ANTI-ILHAMENTO</Text>
                  </>)}

                  {/* Wire INVERSOR → QUADRO CC */}
                  <Line key={`inv-dn-${i}`} x1={cCX} y1={616 + miInvShift} x2={cCX} y2={708 + miQccShift} stroke="#000" strokeWidth={1} />

                  {/* Cabos CC — Inversor → Quadro CC */}
                  <Line key={`cc1-ln-${i}`} x1={cCX} y1={isSaidaAgrupada ? 719 : 644} x2={cCX + 12} y2={isSaidaAgrupada ? 719 : 644} stroke="#000" strokeWidth={0.6} />
                  <Text key={`cc1-t0-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 712 : 636} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CC Fotovoltaico -</Text>
                  <Text key={`cc1-t1-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 719 : 644} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">HEPR/XLPO 1,8 kV:</Text>
                  <Text key={`cc1-t2-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 727 : 652} fontSize={5.5} fill="#000">Para cada string:</Text>
                  <Text key={`cc1-t3-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 735 : 659} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (-)`}</Text>
                  <Text key={`cc1-t4-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 743 : 666} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (+)`}</Text>
                  <Text key={`cc1-t5-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 751 : 674} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabo PE - HEPR/XLPO 1,8 kV:</Text>
                  <Text key={`cc1-t6-${i}`} x={cCX + 15} y={isSaidaAgrupada ? 759 : 681} fontSize={5.5} fill="#000">1 #6,0mm² (T)</Text>

                  {/* QUADRO DE PROTECAO CC */}
                  <Rect key={`qcc-r-${i}`} x={cCX - 120} y={708 + miQccShift} width={240} height={140} fill="white" stroke="#000" strokeWidth={1.2} />
                  <Text key={`qcc-t1-${i}`} x={cCX + 115} y={720 + miQccShift} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">QUADRO DE</Text>
                  <Text key={`qcc-t2-${i}`} x={cCX + 115} y={730 + miQccShift} fontSize={7} fontFamily="Helvetica-Bold" textAnchor="end" fill="#000">PROTECAO CC</Text>
                  <Text key={`dpscc-la-${i}`} x={cCX - 115} y={721 + miQccShift} fontSize={5.5} fill="#000">(ACOPLADO AO</Text>
                  <Text key={`dpscc-lb-${i}`} x={cCX - 115} y={730 + miQccShift} fontSize={5.5} fill="#000">INVERSOR FV)</Text>
                  <Text key={`dpscc-l0-${i}`} x={cCX - 115} y={758 + miQccShift} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DPS CC</Text>
                  <Text key={`dpscc-l1-${i}`} x={cCX - 115} y={767 + miQccShift} fontSize={5.5} fill="#000">1040 Vcc, 18-40 kA</Text>
                  <Text key={`dpscc-l2-${i}`} x={cCX - 115} y={776 + miQccShift} fontSize={5.5} fill="#000">Classe II</Text>
                  <Line key={`qcc-v1-${i}`} x1={cCX} y1={708 + miQccShift} x2={cCX} y2={745 + miQccShift} stroke="#000" strokeWidth={1} />
                  <Line key={`dpscc-h-${i}`} x1={cCX} y1={725 + miQccShift} x2={dpsX} y2={725 + miQccShift} stroke="#000" strokeWidth={0.8} />
                  <Line key={`dpscc-v-${i}`} x1={dpsX} y1={725 + miQccShift} x2={dpsX} y2={780 + miQccShift} stroke="#000" strokeWidth={0.8} />
                  <PDFDPSSymbol key={`dpscc-sym-${i}`} x={dpsX} y={789 + miQccShift} />
                  <Line key={`dpscc-bt-${i}`} x1={dpsX} y1={798 + miQccShift} x2={dpsX} y2={810 + miQccShift} stroke="#000" strokeWidth={0.8} />
                  <PDFTerra key={`dpscc-t-${i}`} x={dpsX} y={810 + miQccShift} />
                  <PDFChaveSeccionadora key={`c1-${i}`} x={cCX} y={766 + miQccShift} />
                  <Text key={`c1-n-${i}`} x={cCX + 22} y={758 + miQccShift} fontSize={6.5} fill="#000">{`C${i + 1}`}</Text>
                  <Text key={`c1-l1-${i}`} x={cCX + 22} y={768 + miQccShift} fontSize={5.5} fill="#000">Chave Seccionadora</Text>
                  <Text key={`c1-l2-${i}`} x={cCX + 22} y={777 + miQccShift} fontSize={5.5} fill="#000">(4 polos)</Text>
                  <Text key={`c1-l3-${i}`} x={cCX + 22} y={786 + miQccShift} fontSize={5.5} fill="#000">1200 Vcc 32 A</Text>

                  {/* Wire QCC → G */}
                  <Line key={`qcc-v2-${i}`} x1={cCX} y1={770 + miQccShift} x2={cCX} y2={848 + miQccShift} stroke="#000" strokeWidth={1} />

                  {/* Cabos CC — Quadro CC → G */}
                  <Line key={`cc2-ln-${i}`} x1={cCX} y1={872 + miQccShift} x2={cCX + 12} y2={872 + miQccShift} stroke="#000" strokeWidth={0.6} />
                  <Text key={`cc2-t0-${i}`} x={cCX + 15} y={865 + miQccShift} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabos CC Fotovoltaico -</Text>
                  <Text key={`cc2-t1-${i}`} x={cCX + 15} y={873 + miQccShift} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">HEPR/XLPO 1,8 kV:</Text>
                  <Text key={`cc2-t2-${i}`} x={cCX + 15} y={881 + miQccShift} fontSize={5.5} fill="#000">Para cada string:</Text>
                  <Text key={`cc2-t3-${i}`} x={cCX + 15} y={888 + miQccShift} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (-)`}</Text>
                  <Text key={`cc2-t4-${i}`} x={cCX + 15} y={895 + miQccShift} fontSize={5.5} fill="#000">{`1 #${caboCC}mm² (+)`}</Text>
                  <Text key={`cc2-t5-${i}`} x={cCX + 15} y={903 + miQccShift} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Cabo PE - HEPR/XLPO 1,8 kV:</Text>
                  <Text key={`cc2-t6-${i}`} x={cCX + 15} y={910 + miQccShift} fontSize={5.5} fill="#000">1 #6,0mm² (T)</Text>

                  {/* G — GERADOR */}
                  <Line key={`g-up-${i}`} x1={cCX} y1={848 + miQccShift} x2={cCX} y2={935 + miQccShift} stroke="#000" strokeWidth={1} />
                  <Circle key={`g-c-${i}`} cx={cCX} cy={971 + miQccShift} r={32} fill="white" stroke="#000" strokeWidth={1.5} />
                  <Text key={`g-t-${i}`} x={cCX} y={978 + miQccShift} fontSize={20} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">G</Text>
                  <Line key={`g-v-${i}`} x1={cCX} y1={1003 + miQccShift} x2={cCX} y2={1017 + miQccShift} stroke="#000" strokeWidth={1.2} />
                  <PDFTerra key={`g-terra-${i}`} x={cCX} y={1017 + miQccShift} />

                  {/* Modulos — direita do G */}
                  <Line key={`mod-ln-${i}`} x1={cCX + 32} y1={971 + miQccShift} x2={cCX + 52} y2={971 + miQccShift} stroke="#000" strokeWidth={0.6} />
                  <Text key={`mod-t0-${i}`} x={cCX + 55} y={938 + miQccShift} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">Modulos Fotovoltaicos:</Text>
                  <Text key={`mod-t1-${i}`} x={cCX + 55} y={948 + miQccShift} fontSize={5.5} fill="#000">Marca: {fv(pd.modulos_fabricante)}</Text>
                  <Text key={`mod-t2-${i}`} x={cCX + 55} y={957 + miQccShift} fontSize={5.5} fill="#000">Modelo: {fv(pd.modulos_modelo)}</Text>
                  <Text key={`mod-t3-${i}`} x={cCX + 55} y={966 + miQccShift} fontSize={5.5} fill="#000">Potencia do modulo: {fv(pd.modulos_potencia_wp)} W</Text>
                  <Text key={`mod-t4-${i}`} x={cCX + 55} y={975 + miQccShift} fontSize={5.5} fill="#000">Tensao do modulo: {fv(pd.modulos_vpmp)} V</Text>
                  <Text key={`mod-t5-${i}`} x={cCX + 55} y={984 + miQccShift} fontSize={5.5} fill="#000">Corrente de saida do modulo: {fv(pd.modulos_ipmp)} A</Text>
                  <Text key={`mod-t6-${i}`} x={cCX + 55} y={993 + miQccShift} fontSize={5.5} fill="#000">Quantidade: {qtdDescr}</Text>
                  <Text key={`mod-t7-${i}`} x={cCX + 55} y={1002 + miQccShift} fontSize={5.5} fill="#000">Potencia total: {potKwp} kWp</Text>
                  <Text key={`mod-t8-${i}`} x={cCX + 55} y={1011 + miQccShift} fontSize={5.5} fill="#000">{tensaoLabel}: {tensaoStr} V</Text>
                  <Text key={`mod-t9-${i}`} x={cCX + 55} y={1020 + miQccShift} fontSize={5.5} fill="#000">{corrLabel}: {corrStr} A</Text>
                </>
              );
            })}
          </>)}
          </G>

          {/* ═══ LEGENDA ═══ */}
          <Rect x={legendX} y={-20} width={238} height={215} fill="white" stroke="#000" strokeWidth={1} />
          <Text x={legendX + 119} y={-4} fontSize={8} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">LEGENDA:</Text>
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
            <Text key={i} x={legendX + 8} y={10 + i * 13} fontSize={6.5} fill="#000">{ln}</Text>
          ))}


          {/* ═══════════════════════════════════════════
              TITLE BLOCK / SELO
          ═══════════════════════════════════════════ */}

          {/* Seal outer rect */}
          <Rect x={5} y={1128} width={1050} height={120} fill="white" stroke="#000" strokeWidth={1.2} />

          {/* === COLUMN DIVIDERS === */}
          {/* Left | Mid */}
          <Line x1={178} y1={1128} x2={178} y2={1248} stroke="#000" strokeWidth={0.8} />
          {/* Mid | Right (logo area) */}
          <Line x1={700} y1={1128} x2={700} y2={1248} stroke="#000" strokeWidth={0.8} />
          {/* Left sub-col: label area | R values — starts below PRODUTO section */}
          <Line x1={118} y1={1158} x2={118} y2={1248} stroke="#000" strokeWidth={0.6} />

          {/* === HORIZONTAL DIVIDERS === */}
          {/* Below PRODUTO section (left + mid cols) */}
          <Line x1={5} y1={1158} x2={700} y2={1158} stroke="#000" strokeWidth={0.7} />
          {/* Left col — 4 equal rows of 16px + last row to 1170 */}
          <Line x1={5} y1={1174} x2={178} y2={1174} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1190} x2={178} y2={1190} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1206} x2={178} y2={1206} stroke="#000" strokeWidth={0.5} />
          <Line x1={5} y1={1222} x2={178} y2={1222} stroke="#000" strokeWidth={0.5} />
          {/* Mid col: owner | responsavel separator (aligns with left col row 3 end) */}
          <Line x1={178} y1={1206} x2={700} y2={1206} stroke="#000" strokeWidth={0.5} />

          {/* === LEFT COLUMN — PRODUTO (top, full width, value centered) === */}
          <Text x={8}  y={1137}  fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">PRODUTO</Text>
          <Text x={92} y={1152} fontSize={9}   fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">GFV {potKwp} kWp</Text>

          {/* DATA  (row 1: y=1158–1174) */}
          <Text x={8}   y={1165} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">DATA</Text>
          <Text x={62}  y={1172} fontSize={6}   textAnchor="middle" fill="#000">{dataDoc}</Text>
          <Text x={148} y={1169} fontSize={5.5} textAnchor="middle" fill="#000">R1:</Text>

          {/* ESCALA  (row 2: y=1174–1190) */}
          <Text x={8}   y={1181} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">ESCALA</Text>
          <Text x={62}  y={1188} fontSize={6}   textAnchor="middle" fill="#000">S/ ESCALA</Text>
          <Text x={148} y={1185} fontSize={5.5} textAnchor="middle" fill="#000">R2:</Text>

          {/* TAMANHO  (row 3: y=1190–1206) */}
          <Text x={8}   y={1197} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TAMANHO</Text>
          <Text x={62}  y={1204} fontSize={6}   textAnchor="middle" fill="#000">{numInversores >= 4 ? 'A1' : (numInversores >= 3 ? 'A2' : 'A3')}</Text>
          <Text x={148} y={1201} fontSize={5.5} textAnchor="middle" fill="#000">R3:</Text>

          {/* FOLHA  (row 4: y=1206–1222) */}
          <Text x={8}   y={1213} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">FOLHA</Text>
          <Text x={62}  y={1220} fontSize={6}   textAnchor="middle" fill="#000">1/1</Text>
          <Text x={148} y={1217} fontSize={5.5} textAnchor="middle" fill="#000">R4:</Text>

          {/* REVISAO  (row 5: y=1222–1240) */}
          <Text x={8}   y={1229} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">REVISAO</Text>
          <Text x={62}  y={1236} fontSize={6}   textAnchor="middle" fill="#000">R0</Text>
          <Text x={148} y={1233} fontSize={5.5} textAnchor="middle" fill="#000">R5:</Text>

          {/* === MIDDLE COLUMN — TITULO (top) === */}
          <Text x={185} y={1139} fontSize={5.5} fontFamily="Helvetica-Bold" fill="#000">TITULO</Text>
          <Text x={MID_CTR} y={1153} fontSize={11} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">DIAGRAMA UNIFILAR</Text>

          {/* === MIDDLE COLUMN — OWNER BLOCK (y=1158–1206, 5 items equidistant 9px) === */}
          <Text x={MID_CTR} y={1167} fontSize={5.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">Proprietario e Obra:</Text>
          <Text x={MID_CTR} y={1176} fontSize={6} textAnchor="middle" fill="#000">{`Nome: ${owner}`}</Text>
          <Text x={MID_CTR} y={1185} fontSize={6} textAnchor="middle" fill="#000">{`Endereco: ${endereco}`}</Text>
          <Text x={MID_CTR} y={1194} fontSize={6} textAnchor="middle" fill="#000">{`Cidade: ${uf ? `${cidade} - ${uf}` : cidade}`}</Text>
          <Text x={MID_CTR} y={1203} fontSize={6} textAnchor="middle" fill="#000">{`CEP: ${cep}`}</Text>

          {/* === MIDDLE COLUMN — RESPONSAVEL BLOCK (y=1206–1240, 4 items equidistant 8px) === */}
          <Text x={MID_CTR} y={1215} fontSize={5.5} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">Responsavel Tecnico:</Text>
          <Text x={MID_CTR} y={1223} fontSize={6} fontFamily="Helvetica-Bold" textAnchor="middle" fill="#000">{respNome}</Text>
          <Text x={MID_CTR} y={1231} fontSize={5.5} textAnchor="middle" fill="#000">TECNICO EM ELETROTECNICA</Text>
          <Text x={MID_CTR} y={1239} fontSize={5.5} textAnchor="middle" fill="#000">{`CFT: ${respCft}`}</Text>

          </G>
        </Svg>

        {/* Logo fora do SVG com posição absoluta sobre a coluna direita do selo.
            Fica fora do <G> de baixo (que só existe dentro do Svg), então acompanha
            o mesmo deslocamento manualmente, convertido para pontos pela mesma
            escala usada nas outras posições absolutas desta página. */}
        {pd.logo_empresa_url && (
          <View style={{
            position: 'absolute',
            left: numInversores >= 3 ? 883 : 618,
            top: (numInversores >= 3 ? 1252 : 901) + YSHIFT * SVG_SCALE,
            width: numInversores >= 3 ? 195 : 139,
            height: numInversores >= 3 ? 120 : 86,
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

        {/* Placa de Advertência (CPFL) — mesma técnica do logo acima (imagem fora do Svg, posição absoluta escalada) */}
        {isCPFL && placaAdvertencia && (
          <View style={{
            position: 'absolute',
            left: placaImgLeft,
            top: placaImgTop,
            width: placaImgW,
            height: placaImgH,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image
              src={placaAdvertencia.imagem_url}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </View>
        )}

        {/* Placa de Advertência (CPFL) — segunda ocorrência, ao lado esquerdo do D1 */}
        {isCPFL && placaAdvertencia && (
          <View style={{
            position: 'absolute',
            left: placaImg2Left,
            top: placaImg2Top,
            width: placaImgW,
            height: placaImgH,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Image
              src={placaAdvertencia.imagem_url}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </View>
        )}
      </Page>
    </Document>
  );
}
