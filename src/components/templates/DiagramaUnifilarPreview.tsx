'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getTotalKwp, getTotalModulosQtd, getAllInversores } from '@/lib/utils/equipmentParser';

// ── Placa de Advertência (CPFL) — texto normativo fixo ──────────────────────
const PLACA_ADVERTENCIA_CPFL_LINES = [
  'Além da tampa da caixa do medidor, onde a placa deve ser',
  'obrigatoriamente fixada através de rebites, esta mesma placa',
  'deverá também ser fixada através de parafusos ou cintas',
  'metálicas nos seguintes locais:',
  '1) No caso de ponto de entrega aérea, no postinho, ou',
  'parede, ou cabine com buchas de passagem, do lado da via',
  'pública, na conexão do ramal de ligação (ou serviço).',
  '2) No caso de conexão de unidade consumidora (UC) em',
  'edifício com múltiplas unidades (edifício de uso coletivo ou',
  'com medição agrupada), no ponto de entrega do edifício',
  '(poste) e na caixa de distribuição (se houver).',
  '3) No caso de ponto de entrega subterrânea, na parte mais',
  'alta do duto de entrada localizado no poste da CPFL.',
];

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
  const hasStringbox = fv(pd.setup_quadro_cc, 'nao') !== 'nao';
  const distribuidora = String(pd.distribuidora || '');
  const isCPFL = distribuidora.toLowerCase().includes('cpfl');

  // Placa de Advertência cadastrada no Acervo Técnico da distribuidora
  // (mesmo mecanismo já usado no Memorial Descritivo)
  const [placaAdvertencia, setPlacaAdvertencia] = useState<{ nome: string; imagem_url: string } | null>(null);
  useEffect(() => {
    if (!isCPFL) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCPFL, distribuidora]);

  const numInversores = (pd.setup_mais_de_um_inversor === 'sim' && pd.setup_tipo_inversor !== 'microinversor')
    ? (parseInt(String(pd.setup_total_inversores || '2')) || 2) : 1;
  const isMultiInv = numInversores > 1;
  const isSaidaAgrupada = isMultiInv && fv(pd.setup_configuracao_saidas) === 'agrupadas';
  const MI_GAP = numInversores >= 4 ? 187 : (numInversores >= 3 ? 156 : 312);
  const MI_MAX_COL_W = 130;
  const miColW = Math.min(MI_MAX_COL_W, Math.floor((840 - MI_GAP * (numInversores - 1)) / numInversores));
  const miColStep = miColW + MI_GAP;
  const miSectionW = numInversores * miColStep - MI_GAP;
  const miSectionStart = (900 - miSectionW) / 2;
  const miColCX = (i: number) => Math.round(miSectionStart + miColW / 2 + i * miColStep);
  const miColBX = (i: number) => Math.round(miSectionStart + i * miColStep);

  // ── Derived values ─────────────────────────────────────────────────────────
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

  // Quantity description: "12 (2x06 módulos)" or fallback
  let qtdDescr = modQtd > 0 ? `${modQtd} módulos` : '___';
  if (modQtd > 0 && totalStrings > 0 && stringsModulos.length > 0) {
    const allSameQ = stringsModulos.every(m => m === stringsModulos[0]);
    qtdDescr = allSameQ
      ? `${modQtd} (${totalStrings}x${String(stringsModulos[0]).padStart(2, '0')} módulos)`
      : `${modQtd} (${stringsModulos.map((m, i) => `S${i + 1}: ${m}`).join(' / ')} módulos)`;
  }

  const vpmp = parseFloat(fv(pd.modulos_vpmp, '0')) || 0;
  // Corrente das strings usa Isc (curto-circuito, pior caso) — não Ipmp, que é
  // a linha separada "Corrente de saída do módulo" logo acima no diagrama.
  const corrStr = fv(pd.modulos_isc);

  // Tensão label and value per string
  let tensaoLabel = 'Tensão de operação das strings';
  let tensaoStr = vpmp > 0 && modQtd > 0 ? fn(vpmp * modQtd) : fv(pd.inversores_tensao);
  if (totalStrings > 0 && stringsModulos.length > 0 && vpmp > 0) {
    tensaoLabel = `Tensão de operação das Strings ${strLabelStr}`;
    const tensoes = stringsModulos.map(m => vpmp * m);
    const allSameT = tensoes.every(t => Math.abs(t - tensoes[0]) < 0.01);
    tensaoStr = allSameT ? fn(tensoes[0]) : tensoes.map((t, i) => `S${i + 1}: ${fn(t)}`).join(' / ');
  }

  // Corrente label
  const corrLabel = totalStrings > 0 && strLabelStr
    ? `Corrente de saída das Strings ${strLabelStr}`
    : 'Corrente de saída das strings';

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
  // Seção do Ramal de Ligação (não confundir com secao_fase_mm2/secao_neutro_mm2,
  // que são do Ramal de Entrada — usados no Memorial Descritivo, campo diferente).
  const secaoFase   = fv(pd.secao_fase_rl_mm2, '10,0');
  const secaoNeutro = fv(pd.secao_neutro_rl_mm2, '10,0');

  const djPolos    = parseInt(fv(pd.disjuntor_polos, '1')) || 1;
  const djCorr     = fv(pd.disjuntor_corrente_a, '40');
  const djTensao   = fv(pd.disjuntor_tensao_v, '415');

  const tipoConexao = fv(pd.tipo_conexao, '');
  const isTri      = /trif/i.test(tipoConexao);
  const isBi       = /bif/i.test(tipoConexao);
  const djTipo     = isTri ? 'Tripolar' : isBi ? 'Bipolar' : 'Monopolar';
  const ramalTipo  = isTri ? 'Quadripolar' : isBi ? 'Multiplexado' : 'Concêntrico';
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

  // For multi-inv, center top section at QD center (always 450 with current math)
  const topCX = isMultiInv ? 450 : CX;

  // DPS no Padrão de Entrada (Setup do Projeto) — quantidade vem do Tipo de Conexão
  // do Padrão de Entrada (mesma fonte que já define o Ramal de Ligação/D1 acima),
  // Classe vem da opção escolhida no Setup (Tipo I/Tipo II).
  const dpsEntradaSetup = fv(pd.setup_dps_padrao_entrada);
  const hasDpsEntrada = dpsEntradaSetup === 'tipo1' || dpsEntradaSetup === 'tipo2';
  const dpsEntradaQtd = isTri ? 3 : isBi ? 2 : 1;
  const dpsEntradaClasse = dpsEntradaSetup === 'tipo1' ? 'Classe I' : 'Classe II';

  // O retângulo do Padrão de Entrada só cresce quando há DPS a desenhar — do
  // contrário mantém exatamente o tamanho/posição de sempre.
  const topBX = hasDpsEntrada ? topCX - 155 : topCX - 120;
  const topBR = hasDpsEntrada ? topCX + 175 : topCX + 120;
  const padraoEntradaBH = hasDpsEntrada ? 200 : 150;
  const padraoEntradaBottom = 42 + padraoEntradaBH;
  // Tudo que fica abaixo do Padrão de Entrada (Quadro de Distribuição em diante)
  // desce a mesma quantidade que o retângulo cresceu, pra sobrar espaço lá dentro
  // sem espremer o resto do diagrama. Vira um <g transform="translate(0,Y)"> mais
  // abaixo — com YSHIFT=0 (caso sem DPS) o translate não faz nada, e o restante
  // do diagrama fica byte-a-byte igual ao de sempre.
  const YSHIFT = padraoEntradaBH - 150;
  // A altura do viewBox precisa crescer junto com o YSHIFT, senão o selo (que fica
  // no fim do desenho, dentro do <g> deslocado) passa do limite inferior e é
  // cortado. Com YSHIFT=0 (sem DPS) o valor fica exatamente 1295, como sempre foi.
  const vbHeight = 1295 + YSHIFT;
  // Com DPS, D1 sobe (fica na altura onde antes ficava a derivação do DPS, um
  // pouco abaixo dela) — sem DPS, fica exatamente onde sempre esteve (y=145).
  const d1Y = hasDpsEntrada ? 138 : 145;
  // Derivação do DPS agora sai do trecho ABAIXO do D1 (não mais acima).
  const dpsTapY = d1Y + 7 + 8;
  // Só a linha horizontal que sai da linha central desce 15% (do trecho vertical
  // até o símbolo do DPS) — o símbolo, texto e Terra do DPS continuam no lugar.
  const dpsTapLineY = dpsTapY + 5;
  // Placa de Advertência (2ª ocorrência, dentro do Padrão de Entrada): sem DPS
  // continua exatamente onde sempre esteve (ao lado do D1, alinhada ao Ramal de
  // Ligação); com DPS, o lado esquerdo passa a ser ocupado pelo DPS, então ela
  // vai para o lado direito (acima do MEDIDOR), mais para baixo (a caixa cresceu
  // e sobrou espaço) e levemente à esquerda, para otimizar o espaço.
  const placa2X = hasDpsEntrada ? topCX + 112 : topCX - 96;
  const placa2Y = hasDpsEntrada ? 146 : 132;
  const cargasX = isMultiInv ? Math.max(Math.round(miColBX(0)) - 55, numInversores >= 4 ? 45 : (numInversores >= 3 ? 64 : 100)) : 195;
  const legendX = isMultiInv ? (numInversores >= 4 ? 851 : 810) : 650;
  const miInvShift = isSaidaAgrupada ? 75 : 0;
  const miQccShift = isSaidaAgrupada ? 75 : 0;
  // Com 1 só inversor o circuito (Padrão de Entrada → Gerador) fica bem mais estreito
  // que a folha, deixando um vão grande antes da legenda. Desloca esse bloco pra
  // direita, aproximando-o da legenda (que não se move), pra aproveitar melhor o
  // espaço. Não afeta multi-inversor (que já usa a largura toda).
  const hShift = !isMultiInv ? 50 : 0;
  const hShiftTransform = hShift ? `translate(${hShift}, 0)` : undefined;

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { DiagramaUnifilarPDF } = await import('./DiagramaUnifilarPDF');
      const React = await import('react');
      const clientName = pd?.nomeClienteFinal || 'projeto';
      const filename = `Diagrama Unifilar - ${clientName}.pdf`;
      const blob = await pdf(React.createElement(DiagramaUnifilarPDF, { projectData, placaAdvertencia })).toBlob();
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
          viewBox={numInversores >= 4 ? `-100 -25 1200 ${vbHeight}` : (numInversores >= 3 ? `-25 -25 1085 ${vbHeight}` : `0 -25 1060 ${vbHeight}`)}
          width="100%"
          style={{ maxWidth: numInversores >= 4 ? 1200 : (numInversores >= 3 ? 1085 : 1060), display: 'block', margin: '0 auto' }}
          xmlns="http://www.w3.org/2000/svg"
          fontFamily="Arial, Helvetica, sans-serif"
        >

          {/* Com 1 inversor, todo o circuito (menos a placa CPFL do canto, que fica
              sempre fixa no canto esquerdo da folha) desloca hShift px pra direita —
              com hShift=0 (multi-inversor) o transform não faz nada. */}
          <g transform={hShiftTransform}>
          {/* ═══════════════ REDE DE BAIXA TENSÃO ═══════════════ */}
          <line
            x1={isMultiInv ? 144 : 90} y1="28"
            x2={isMultiInv ? 756 : 490} y2="28"
            stroke="#000" strokeWidth="1.8"
          />
          <text x={topCX} y="21" fontSize="8" fontWeight="bold" textAnchor="middle">REDE DE BAIXA TENSÃO</text>

          {/* Ponto de entrega */}
          <line    x1={topCX} y1="28" x2={topCX} y2="44" stroke="#000" strokeWidth="1" />
          <polygon points={`${topCX - 5},28 ${topCX + 5},28 ${topCX},40`} fill="#000" />
          <text x={topCX + 8} y="37" fontSize="6.5">PONTO DE ENTREGA</text>
          <text x={topCX + 8} y="47" fontSize="6.5">ACESSADA</text>
          <text x={topCX + 8} y="57" fontSize="6.5">ACESSANTE</text>

          {/* ═══════════════ PADRÃO DE ENTRADA ═══════════════ */}
          <rect x={topBX} y="42" width={topBR - topBX} height={padraoEntradaBH} fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={topCX + 66} y="57" fontSize="7.5" fontWeight="bold" textAnchor="middle">PADRÃO DE ENTRADA</text>
          <text x={topCX + 66} y="67" fontSize="6"   textAnchor="middle">(caixa de medição)</text>
          </g>

          {/* ═══════════════ PLACA DE ADVERTÊNCIA (CPFL) — ao lado esquerdo do PADRÃO DE ENTRADA (fixa, não desloca) ═══════════════ */}
          {isCPFL && placaAdvertencia && (
            <g>
              <image
                href={placaAdvertencia.imagem_url}
                x={14} y={44} width={42} height={45}
                preserveAspectRatio="xMidYMid meet"
              />
              {PLACA_ADVERTENCIA_CPFL_LINES.map((line, i) => (
                <text key={i} x={14} y={103 + i * 8} fontSize="5.5">{line}</text>
              ))}
            </g>
          )}

          <g transform={hShiftTransform}>
          {/* Main vertical — starts at box top (y=42) to close the small gap */}
          <line x1={topCX} y1="42" x2={topCX} y2={d1Y - 7} stroke="#000" strokeWidth="1" />

          {/* Horizontal tap to MEDIDOR (branch right) */}
          <line x1={topCX} y1="85" x2={topCX + 15} y2="85" stroke="#000" strokeWidth="1" />

          {/* MEDIDOR box — right of main line */}
          <rect x={topCX + 15} y="71" width="95" height="28" fill="white" stroke="#000" strokeWidth="1" />
          <text x={topCX + 62} y="88" fontSize="9" fontWeight="bold" textAnchor="middle">MEDIDOR</text>

          {/* Ramal de Ligação — drawn AFTER rects so it's visible over white fills */}
          <text x={topCX - 96} y="78"  fontSize="5.8" fontWeight="bold">Ramal de Ligação</text>
          <text x={topCX - 96} y="87"  fontSize="5.8" fontWeight="bold">{`Alumínio ${ramalTipo} - 1,0 kV`}</text>
          <text x={topCX - 96} y="96"  fontSize="5.8">{`${nFaseRL} #${secaoFase}mm² (F)`}</text>
          <text x={topCX - 96} y="105" fontSize="5.8">{`1 #${secaoNeutro}mm² (N)`}</text>

          {/* Placa de Advertência (CPFL) — dentro do Padrão de Entrada. Sem DPS, ao
              lado esquerdo do D1 (posição de sempre); com DPS, ao lado direito
              (acima do MEDIDOR), já que o lado esquerdo passa a ser do DPS. */}
          {isCPFL && placaAdvertencia && (
            <image
              href={placaAdvertencia.imagem_url}
              x={placa2X} y={placa2Y} width={42} height={45}
              preserveAspectRatio="xMidYMid meet"
            />
          )}

          {/* D1 on main vertical line — com DPS, sobe para a altura de onde antes
              ficava a derivação do DPS (um pouco abaixo dela). */}
          <Disjuntor x={topCX} y={d1Y} />
          <text x={topCX + 15} y={d1Y - 2} fontSize="6.5">D1</text>
          <text x={topCX + 15} y={d1Y + 7} fontSize="5.5">{djLabel}</text>

          {/* DPS no Padrão de Entrada (Setup do Projeto) — mesmo padrão visual do DPS do
              Quadro de Proteção CA (derivação da linha principal + símbolo + Terra), do
              lado esquerdo do D1, com a derivação saindo do trecho da linha principal
              ABAIXO do D1 (não acima). */}
          {hasDpsEntrada && (
            <>
              <line x1={topCX} y1={dpsTapLineY} x2={topCX - 70} y2={dpsTapLineY} stroke="#000" strokeWidth="0.8" />
              <line x1={topCX - 70} y1={dpsTapLineY} x2={topCX - 70} y2={dpsTapY + 34} stroke="#000" strokeWidth="0.8" />
              <DPSSymbol x={topCX - 70} y={dpsTapY + 43} />
              <line x1={topCX - 70} y1={dpsTapY + 52} x2={topCX - 70} y2={dpsTapY + 64} stroke="#000" strokeWidth="0.8" />
              <Terra x={topCX - 70} y={dpsTapY + 64} />
              <text x={topCX - 132} y={dpsTapY + 10} fontSize="5.5" fontWeight="bold">{`${dpsEntradaQtd}x DPS`}</text>
              <text x={topCX - 132} y={dpsTapY + 19} fontSize="5.5">275 Vca, 20-40 kA</text>
              <text x={topCX - 132} y={dpsTapY + 28} fontSize="5.5">{dpsEntradaClasse}</text>
            </>
          )}

          {/* Wire D1 → out of PADRÃO (continuous, grounding branch removed) — desce até o
              novo topo (deslocado) do Quadro de Distribuição. A derivação do DPS (acima)
              tapeia nesta mesma linha, no ponto dpsTapY. */}
          <line x1={topCX} y1={d1Y + 7} x2={topCX} y2={220 + YSHIFT} stroke="#000" strokeWidth="1" />

          {/* Terra — lower-right corner of PADRÃO DE ENTRADA (same style as QUADRO DIST) */}
          <Terra x={topBR - 18} y={padraoEntradaBottom} />
          </g>

          {/* ═══ TUDO A PARTIR DAQUI (Quadro de Distribuição em diante) desce YSHIFT
              pixels — com YSHIFT=0 (sem DPS no Padrão de Entrada) o translate não
              muda nada, então nada abaixo deste ponto é afetado no caso comum. ═══ */}
          <g transform={`translate(0, ${YSHIFT})`}>
          {/* Circuito (Quadro Distribuição → Gerador) também desloca hShift px pra
              direita com 1 inversor — legenda/selo/logo (fora deste <g>) não se
              movem. */}
          <g transform={hShiftTransform}>

          {/* ═══════════════ QUADRO DE DISTRIBUIÇÃO ═══════════════ */}
          <rect
            x={isMultiInv ? miColBX(0) - (numInversores >= 3 ? 119 : 99) : 150}
            y="220"
            width={isMultiInv ? miSectionW + (numInversores >= 3 ? 188 : 168) : 370}
            height="82"
            fill="white" stroke="#000" strokeWidth="1.2"
          />
          <text
            x={isMultiInv ? miColBX(numInversores - 1) + miColW + 52 : 512}
            y="233"
            fontSize="8.5" fontWeight="bold" textAnchor="end"
          >QUADRO DE DISTRIBUIÇÃO</text>

          {/* Main vertical line through box */}
          <line x1={topCX} y1="220" x2={topCX} y2={isMultiInv ? 255 : 302} stroke="#000" strokeWidth="1" />

          {/* Barramento horizontal */}
          <line
            x1={isMultiInv ? miColBX(0) - 80 : 175} y1="255"
            x2={isMultiInv ? miColBX(numInversores - 1) + miColW + 55 : 495} y2="255"
            stroke="#000" strokeWidth="1"
          />

          {/* Terra — lower-right corner of QD */}
          <Terra x={isMultiInv ? miColBX(numInversores - 1) + miColW + 55 : 505} y={302} />

          {/* Cargas derivation — inside QD box */}
          <line x1={cargasX} y1="255" x2={cargasX} y2="315" stroke="#000" strokeWidth="1" />
          <polygon points={`${cargasX - 5},315 ${cargasX + 5},315 ${cargasX},325`} fill="#000" />
          <text x={cargasX + 20} y="311" fontSize="5.8">{`Cargas (${cargaKw !== '___' ? cargaKw : '--'} kW)`}</text>
          <text x={cargasX + 20} y="320" fontSize="5.8">{`Tensão Nominal: ${tensaoNom} V`}</text>
          <text x={cargasX + 20} y="329" fontSize="5.8">{`Corrente: ${corrCargas !== '___' ? corrCargas : '--'} A`}</text>

          {!isMultiInv && (<>
          {/* Wire → QUADRO CA (+10px extra gap) */}
          <line x1={CX} y1="302" x2={CX} y2="358" stroke="#000" strokeWidth="1" />

          {/* CA cables annotation — centered on main line */}
          <line x1={CX} y1="330" x2={CX + 12} y2="330" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 15} y="323" fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70°C - 1,0 kV</text>
          <text x={CX + 15} y="331" fontSize="5.5">{`${caboCaFCount} #${physicalInvCabo[0]?.secao || caboCA}mm² (F)`}</text>
          <text x={CX + 15} y="339" fontSize="5.5">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² ${caboCaMidLabel}`}</text>
          <text x={CX + 15} y="347" fontSize="5.5">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² (T)`}</text>

          {/* ═══════════════ QUADRO DE PROTEÇÃO CA ═══════════════ */}
          <rect x={BX} y="358" width={BW} height="122" fill="white" stroke="#000" strokeWidth="1.2" />
          <text x={BR - 8} y="370" fontSize="8" fontWeight="bold" textAnchor="end">QUADRO DE</text>
          <text x={BR - 8} y="382" fontSize="8" fontWeight="bold" textAnchor="end">PROTEÇÃO CA</text>

          {/* DPS CA label (left inside box) */}
          <text x="228" y="396" fontSize="5.5" fontWeight="bold">{dpsLabel}</text>
          <text x="228" y="405" fontSize="5.5">275 Vca, 20-40 kA</text>
          <text x="228" y="414" fontSize="5.5">Classe II</text>

          {/* Main vertical — continuous from box top (y=358) through D2 */}
          <line x1={CX} y1="358" x2={CX} y2="408" stroke="#000" strokeWidth="1" />

          {/* Tap main wire → DPS CA (slightly lower for label clearance) */}
          <line x1={CX} y1="385" x2="290" y2="385" stroke="#000" strokeWidth="0.8" />
          <line x1="290" y1="385" x2="290" y2="420" stroke="#000" strokeWidth="0.8" />
          <DPSSymbol x={290} y={429} />
          <line x1="290" y1="438" x2="290" y2="450" stroke="#000" strokeWidth="0.8" />
          <Terra x={290} y={450} />

          {/* D2 — moved slightly lower to center in box */}
          <Disjuntor x={CX} y={415} />
          <text x={CX + 15} y="413" fontSize="6.5">D2</text>
          <text x={CX + 15} y="423" fontSize="5.5">{`${d2Tipo} - ${d2Corr} A / ${djTensao} Vca`}</text>
          <line x1={CX} y1="422" x2={CX} y2="480" stroke="#000" strokeWidth="1" />

          {/* Wire → INVERSOR */}
          <line x1={CX} y1="480" x2={CX} y2="554" stroke="#000" strokeWidth="1" />

          {/* CA cables annotation — between QUADRO CA exit and INVERSOR (same style as DIST→CA) */}
          <line x1={CX} y1="502" x2={CX + 12} y2="502" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 15} y="495" fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70°C - 1,0 kV</text>
          <text x={CX + 15} y="503" fontSize="5.5">{`${caboCaFCount} #${physicalInvCabo[0]?.secao || caboCA}mm² (F)`}</text>
          <text x={CX + 15} y="511" fontSize="5.5">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² ${caboCaMidLabel}`}</text>
          <text x={CX + 15} y="519" fontSize="5.5">{`1 #${physicalInvCabo[0]?.secao || caboCA}mm² (T)`}</text>

          {/* ═══════════════ INVERSOR ═══════════════ */}
          {/* Reduced to ~1/4 size (w=120, h=55), centered at CX */}
          {/* Label outside box, above upper-right corner */}
          <text x="400" y="551" fontSize="8.5" fontWeight="bold" textAnchor="end">INVERSOR</text>
          <rect x="280" y="554" width="120" height="55" fill="white" stroke="#000" strokeWidth="1.2" />

          {/* Diagonal line across inversor — corner to corner */}
          <line x1="280" y1="554" x2="400" y2="609" stroke="#000" strokeWidth="0.9" />
          {/* AC ~ symbol — lower-left corner of inversor */}
          <path
            d="M284,598 Q288,591 292,598 Q296,605 300,598"
            stroke="#000" strokeWidth="0.9" fill="none"
          />
          {/* DC = symbol — upper-right corner of inversor */}
          <line x1="374" y1="560" x2="396" y2="560" stroke="#000" strokeWidth="0.9" />
          <line x1="374" y1="564" x2="396" y2="564" stroke="#000" strokeWidth="0.9" />

          {/* Horizontal line from right side of inversor → vertical line connecting relay boxes */}
          <line x1="400" y1="581" x2="467" y2="581" stroke="#000" strokeWidth="1" />
          {/* Vertical line connecting all relay boxes — shifted up to align midpoint with y=581 */}
          <line x1="467" y1="534" x2="467" y2="651" stroke="#000" strokeWidth="1" />

          {/* Left annotation — moved closer to inversor (x=150) */}
          <text x="150" y="557" fontSize="5.5">Marca: {invFab}</text>
          <text x="150" y="564" fontSize="5.5">Modelo: {invMod}</text>
          <text x="150" y="571" fontSize="5.5">Potência: {invPot} kW</text>
          <text x="150" y="578" fontSize="5.5">Entrada - Tensão max: {invVccMax} Vcc</text>
          <text x="150" y="585" fontSize="5.5">  - Corrente max: {invIccMax} A</text>
          <text x="150" y="592" fontSize="5.5">Saída - Tensão: {tensaoNom} Vca</text>
          <text x="150" y="599" fontSize="5.5">  - Corrente: {invCorrOut} A</text>
          <text x="150" y="606" fontSize="5.5" fontStyle="italic">Ver datasheet para mais detalhes</text>

          {/* Protection relay boxes — raised so column midpoint aligns with inversor horizontal (y=581) */}
          {([
            { l: '25', s: '' },
            { l: '27', s: '' },
            { l: '59', s: '' },
            { l: '81', s: 'U/O' },
          ] as { l: string; s: string }[]).map(({ l, s }, i) => (
            <g key={l}>
              {/* Horizontal connection from vertical line (x=467) to box left (x=490) at box center */}
              <line x1="467" y1={544 + i * 25} x2="490" y2={544 + i * 25} stroke="#000" strokeWidth="0.8" />
              <rect x="490" y={534 + i * 25} width={26} height={20} fill="white" stroke="#000" strokeWidth="0.8" />
              <text
                x="503"
                y={s ? 545 + i * 25 : 548 + i * 25}
                fontSize="7" fontWeight="bold" textAnchor="middle"
              >{l}</text>
              {s && (
                <text x="503" y={552 + i * 25} fontSize="5.5" textAnchor="middle">{s}</text>
              )}
            </g>
          ))}
          {/* ANTI-ILHAMENTO — rectangular block, connected with horizontal line */}
          <line x1="467" y1="643" x2="490" y2="643" stroke="#000" strokeWidth="0.8" />
          <rect x="490" y="635" width="90" height="16" fill="white" stroke="#000" strokeWidth="0.8" />
          <text x="535" y="646" fontSize="6" textAnchor="middle">ANTI-ILHAMENTO</text>

          {/* Wire INVERSOR → QUADRO CC */}
          <line x1={CX} y1="609" x2={CX} y2="708" stroke="#000" strokeWidth="1" />

          {/* CC cables annotation — between INVERSOR and QUADRO CC (tap from main line) */}
          <line x1={CX} y1="644" x2={CX + 12} y2="644" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 15} y="636" fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
          <text x={CX + 15} y="644" fontSize="5.5" fontWeight="bold">HEPR/XLPO 1,8 kV:</text>
          <text x={CX + 15} y="652" fontSize="5.5">Para cada string:</text>
          <text x={CX + 15} y="659" fontSize="5.5">{`1 #${caboCC}mm² (-)`}</text>
          <text x={CX + 15} y="666" fontSize="5.5">{`1 #${caboCC}mm² (+)`}</text>
          <text x={CX + 15} y="674" fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
          <text x={CX + 15} y="681" fontSize="5.5">1 #6,0mm² (T)</text>

          {/* ═══════════════ QUADRO DE PROTEÇÃO CC ═══════════════ */}
          <rect x={BX} y="708" width={BW} height="140" fill="white" stroke="#000" strokeWidth="1.2" />
          {/* Label — upper right (same style as QUADRO CA) */}
          <text x={BR - 8} y="720" fontSize="8" fontWeight="bold" textAnchor="end">QUADRO DE</text>
          <text x={BR - 8} y="732" fontSize="8" fontWeight="bold" textAnchor="end">PROTEÇÃO CC</text>

          {/* (ACOPLADO AO INVERSOR FV) — only when stringbox is NOT external */}
          {!hasStringbox && (
            <>
              <text x={BX + 6} y="721" fontSize="5.5">(ACOPLADO AO</text>
              <text x={BX + 6} y="730" fontSize="5.5">INVERSOR FV)</text>
            </>
          )}

          {/* DPS CC label (left inside box) */}
          <text x="228" y="758" fontSize="5.5" fontWeight="bold">DPS CC</text>
          <text x="228" y="767" fontSize="5.5">1040 Vcc, 18-40 kA</text>
          <text x="228" y="776" fontSize="5.5">Classe II</text>

          {/* Main vertical — from box top to just above upper circle of C1 (gap = switch open space) */}
          <line x1={CX} y1="708" x2={CX} y2="745" stroke="#000" strokeWidth="1" />

          {/* Tap main → DPS CC (shifted right to x=290, same as DPS CA) */}
          <line x1={CX} y1="725" x2="290" y2="725" stroke="#000" strokeWidth="0.8" />
          <line x1="290" y1="725" x2="290" y2="780" stroke="#000" strokeWidth="0.8" />
          <DPSSymbol x={290} y={789} />
          <line x1="290" y1="798" x2="290" y2="810" stroke="#000" strokeWidth="0.8" />
          <Terra x={290} y={810} />

          {/* C1 Chave Seccionadora on main wire */}
          <ChaveSeccionadora x={CX} y={766} />
          <text x={CX + 22} y="758" fontSize="5.5">C1</text>
          <text x={CX + 22} y="768" fontSize="5.5">Chave Seccionadora</text>
          <text x={CX + 22} y="777" fontSize="5.5">(4 polos)</text>
          <text x={CX + 22} y="786" fontSize="5.5">1200 Vcc 32 A</text>

          {/* Wire out of QUADRO CC — starts right after C1 bottom circle (y≈770) */}
          <line x1={CX} y1="770" x2={CX} y2="848" stroke="#000" strokeWidth="1" />

          {/* CC cables annotation — between QUADRO CC and GERADOR/modules (tap from main line) */}
          <line x1={CX} y1="872" x2={CX + 12} y2="872" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 15} y="865" fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
          <text x={CX + 15} y="873" fontSize="5.5" fontWeight="bold">HEPR/XLPO 1,8 kV:</text>
          <text x={CX + 15} y="881" fontSize="5.5">Para cada string:</text>
          <text x={CX + 15} y="888" fontSize="5.5">{`1 #${caboCC}mm² (-)`}</text>
          <text x={CX + 15} y="895" fontSize="5.5">{`1 #${caboCC}mm² (+)`}</text>
          <text x={CX + 15} y="903" fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
          <text x={CX + 15} y="910" fontSize="5.5">1 #6,0mm² (T)</text>

          {/* ═══════════════ G — GERADOR ═══════════════ */}
          <line x1={CX} y1="848" x2={CX} y2="935" stroke="#000" strokeWidth="1" />
          <circle cx={CX} cy="971" r="35" fill="white" stroke="#000" strokeWidth="1.5" />
          <text x={CX} y="978" fontSize="22" fontWeight="bold" textAnchor="middle">G</text>
          <line x1={CX} y1="1006" x2={CX} y2="1020" stroke="#000" strokeWidth="1.2" />
          <Terra x={CX} y={1020} />

          {/* Module annotation (right of G) */}
          <line x1={CX + 35} y1="971" x2={CX + 52} y2="971" stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
          <text x={CX + 55} y="938" fontSize="5.5" fontWeight="bold">Módulos Fotovoltaicos:</text>
          <text x={CX + 55} y="948" fontSize="5.5">Marca: {fv(pd.modulos_fabricante)}</text>
          <text x={CX + 55} y="957" fontSize="5.5">Modelo: {fv(pd.modulos_modelo)}</text>
          <text x={CX + 55} y="966" fontSize="5.5">Potência do módulo: {fv(pd.modulos_potencia_wp)} W</text>
          <text x={CX + 55} y="975" fontSize="5.5">Tensão do módulo: {fv(pd.modulos_vpmp)} V</text>
          <text x={CX + 55} y="984" fontSize="5.5">Corrente de saída do módulo: {fv(pd.modulos_ipmp)} A</text>
          <text x={CX + 55} y="993" fontSize="5.5">Quantidade: {qtdDescr}</text>
          <text x={CX + 55} y="1002" fontSize="5.5">Potência total: {potKwp} kWp</text>
          <text x={CX + 55} y="1011" fontSize="5.5">{tensaoLabel}: {tensaoStr} V</text>
          <text x={CX + 55} y="1020" fontSize="5.5">{corrLabel}: {corrStr} A</text>
          </>)}

          {/* ── Multi-inverter columns ── */}
          {isMultiInv && (<>

            {/* ═══ UNIFIED QD CA — saídas agrupadas ═══ */}
            {isSaidaAgrupada && (<>
              {/* Barramento → QD CA unificado */}
              <line x1={topCX} y1={255} x2={topCX} y2={358} stroke="#000" strokeWidth="1" />
              {/* Cabos CA — barramento → QD CA (cabo geral) */}
              <line x1={topCX} y1={322} x2={topCX + 12} y2={322} stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
              <text x={topCX + 15} y={315} fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70°C - 1,0 kV</text>
              <text x={topCX + 15} y={323} fontSize="5.5">{`${caboCaFCount} #${caboQuadroCA}mm² (F)`}</text>
              <text x={topCX + 15} y={331} fontSize="5.5">{`1 #${caboQuadroCA}mm² ${caboCaMidLabel}`}</text>
              <text x={topCX + 15} y={339} fontSize="5.5">{`1 #${caboQuadroCA}mm² (T)`}</text>
              {/* Retângulo unificado QD Proteção CA */}
              <rect
                x={miColBX(0) - (numInversores >= 3 ? 119 : 99)}
                y={358}
                width={miSectionW + (numInversores >= 3 ? 188 : 168)}
                height={185}
                fill="white" stroke="#000" strokeWidth="1.2"
              />
              <text x={miColBX(numInversores - 1) + miColW + 52} y={370} fontSize="7" fontWeight="bold" textAnchor="end">QUADRO DE</text>
              <text x={miColBX(numInversores - 1) + miColW + 52} y={380} fontSize="7" fontWeight="bold" textAnchor="end">PROTEÇÃO CA</text>
              {/* Linha central do barramento até disjuntor geral */}
              <line x1={topCX} y1={358} x2={topCX} y2={465} stroke="#000" strokeWidth="1" />
              {/* DPS lateral */}
              <text x={topCX - 130} y={372} fontSize="5.5" fontWeight="bold">{dpsLabel}</text>
              <text x={topCX - 130} y={381} fontSize="5.5">275 Vca, 20-40 kA</text>
              <text x={topCX - 130} y={390} fontSize="5.5">Classe II</text>
              <line x1={topCX} y1={375} x2={topCX - 80} y2={375} stroke="#000" strokeWidth="0.8" />
              <line x1={topCX - 80} y1={375} x2={topCX - 80} y2={400} stroke="#000" strokeWidth="0.8" />
              <DPSSymbol x={topCX - 80} y={409} />
              <line x1={topCX - 80} y1={418} x2={topCX - 80} y2={428} stroke="#000" strokeWidth="0.8" />
              <Terra x={topCX - 80} y={428} />
              {/* Disjuntor Geral */}
              <Disjuntor x={topCX} y={408} />
              <text x={topCX + 15} y={406} fontSize="6.5">D2</text>
              <text x={topCX + 15} y={416} fontSize="5.5">{`${djGeralTipo} - ${djGeralCorr} A / ${djTensao} Vca`}</text>
              <text x={topCX + 15} y={425} fontSize="5" fontStyle="italic">GERAL</text>
              {/* Barramento horizontal entre inversores */}
              <line x1={miColCX(0)} y1={465} x2={miColCX(numInversores - 1)} y2={465} stroke="#000" strokeWidth="1" />
            </>)}

            {Array.from({ length: numInversores }, (_, i) => {
              const cCX = miColCX(i);
              const cBX = miColBX(i);
              const cBR = cBX + miColW;
              const dpsX = cCX - 50;
              const invDisj = physicalInvDisj[i] || { corrente: djCorr, tipo: d2Tipo };
              const invCabo = physicalInvCabo[i] || { secao: caboCA };
              return (
                <g key={`inv-col-${i}`}>
                  {/* ─── Independentes: QD CA individual por inversor ─── */}
                  {!isSaidaAgrupada && (<>
                    {/* Barramento → Quadro CA */}
                    <line x1={cCX} y1={255} x2={cCX} y2={358} stroke="#000" strokeWidth="1" />
                    {/* Cabos CA — barramento → Quadro CA */}
                    <line x1={cCX} y1={330} x2={cCX + 12} y2={330} stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
                    <text x={cCX + 15} y={323} fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70°C - 1,0 kV</text>
                    <text x={cCX + 15} y={331} fontSize="5.5">{`${caboCaFCount} #${invCabo.secao}mm² (F)`}</text>
                    <text x={cCX + 15} y={339} fontSize="5.5">{`1 #${invCabo.secao}mm² ${caboCaMidLabel}`}</text>
                    <text x={cCX + 15} y={347} fontSize="5.5">{`1 #${invCabo.secao}mm² (T)`}</text>
                    {/* QUADRO DE PROTEÇÃO CA */}
                    <rect x={cCX - 120} y={358} width={240} height={122} fill="white" stroke="#000" strokeWidth="1.2" />
                    <text x={cCX + 115} y={371} fontSize="7" fontWeight="bold" textAnchor="end">QUADRO DE</text>
                    <text x={cCX + 115} y={381} fontSize="7" fontWeight="bold" textAnchor="end">PROTEÇÃO CA</text>
                    <text x={cCX - 115} y={396} fontSize="5.5" fontWeight="bold">{dpsLabel}</text>
                    <text x={cCX - 115} y={405} fontSize="5.5">275 Vca, 20-40 kA</text>
                    <text x={cCX - 115} y={414} fontSize="5.5">Classe II</text>
                    <line x1={cCX} y1={358} x2={cCX} y2={408} stroke="#000" strokeWidth="1" />
                    <line x1={cCX} y1={385} x2={dpsX} y2={385} stroke="#000" strokeWidth="0.8" />
                    <line x1={dpsX} y1={385} x2={dpsX} y2={420} stroke="#000" strokeWidth="0.8" />
                    <DPSSymbol x={dpsX} y={429} />
                    <line x1={dpsX} y1={438} x2={dpsX} y2={450} stroke="#000" strokeWidth="0.8" />
                    <Terra x={dpsX} y={450} />
                    <Disjuntor x={cCX} y={415} />
                    <text x={cCX + 15} y={413} fontSize="6.5">D{i + 2}</text>
                    <text x={cCX + 15} y={423} fontSize="5.5">{`${invDisj.tipo} - ${invDisj.corrente} A / ${djTensao} Vca`}</text>
                    <line x1={cCX} y1={422} x2={cCX} y2={480} stroke="#000" strokeWidth="1" />
                  </>)}

                  {/* ─── Agrupadas: disjuntor individual dentro do QD CA unificado ─── */}
                  {isSaidaAgrupada && (<>
                    <line x1={cCX} y1={465} x2={cCX} y2={483} stroke="#000" strokeWidth="1" />
                    <Disjuntor x={cCX} y={490} />
                    <text x={cCX + 22} y={488} fontSize="6.5">D{i + 3}</text>
                    <text x={cCX + 22} y={498} fontSize="5.5">{`${invDisj.tipo} - ${invDisj.corrente} A / ${djTensao} Vca`}</text>
                    <line x1={cCX} y1={498} x2={cCX} y2={543} stroke="#000" strokeWidth="1" />
                  </>)}

                  {/* Wire → INVERSOR */}
                  <line x1={cCX} y1={isSaidaAgrupada ? 543 : 480} x2={cCX} y2={554 + miInvShift} stroke="#000" strokeWidth="1" />

                  {/* Cabos CA — QD CA → Inversor */}
                  <line x1={cCX} y1={isSaidaAgrupada ? 568 : 502} x2={cCX + 12} y2={isSaidaAgrupada ? 568 : 502} stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
                  <text x={cCX + 15} y={isSaidaAgrupada ? 561 : 495} fontSize="5.5" fontWeight="bold">Cabos CA - PVC 70°C - 1,0 kV</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 576 : 503} fontSize="5.5">{`${caboCaFCount} #${invCabo.secao}mm² (F)`}</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 584 : 511} fontSize="5.5">{`1 #${invCabo.secao}mm² ${caboCaMidLabel}`}</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 592 : 519} fontSize="5.5">{`1 #${invCabo.secao}mm² (T)`}</text>

                  {/* INVERSOR */}
                  <text x={cBR + 15} y={551 + miInvShift} fontSize="8" fontWeight="bold" textAnchor="end">INVERSOR {i + 1}</text>
                  <rect x={cBX} y={554 + miInvShift} width={miColW} height={55} fill="white" stroke="#000" strokeWidth="1.2" />
                  <line x1={cBX} y1={554 + miInvShift} x2={cBR} y2={609 + miInvShift} stroke="#000" strokeWidth="0.9" />
                  <path d={`M${cBX + 4},${598 + miInvShift} Q${cBX + 8},${591 + miInvShift} ${cBX + 12},${598 + miInvShift} Q${cBX + 16},${605 + miInvShift} ${cBX + 20},${598 + miInvShift}`} stroke="#000" strokeWidth="0.9" fill="none" />
                  <line x1={cBR - 26} y1={560 + miInvShift} x2={cBR - 4} y2={560 + miInvShift} stroke="#000" strokeWidth="0.9" />
                  <line x1={cBR - 26} y1={564 + miInvShift} x2={cBR - 4} y2={564 + miInvShift} stroke="#000" strokeWidth="0.9" />

                  {/* Specs (left of inversor box) */}
                  <text x={cBX - 118} y={557 + miInvShift} fontSize="5.5">Marca: {invFab}</text>
                  <text x={cBX - 118} y={564 + miInvShift} fontSize="5.5">Modelo: {invMod}</text>
                  <text x={cBX - 118} y={571 + miInvShift} fontSize="5.5">Potência: {invPot} kW</text>
                  <text x={cBX - 118} y={578 + miInvShift} fontSize="5.5">Entrada - Tensão max: {invVccMax} Vcc</text>
                  <text x={cBX - 118} y={585 + miInvShift} fontSize="5.5">  - Corrente max: {invIccMax} A</text>
                  <text x={cBX - 118} y={592 + miInvShift} fontSize="5.5">Saída - Tensão: {tensaoNom} Vca</text>
                  <text x={cBX - 118} y={599 + miInvShift} fontSize="5.5">  - Corrente: {invCorrOut} A</text>
                  <text x={cBX - 118} y={606 + miInvShift} fontSize="5.5" fontStyle="italic">Ver datasheet para mais detalhes</text>

                  {/* Protection relays — only last col when N>=3 */}
                  {(numInversores <= 2 || i === numInversores - 1) && (<>
                  <line x1={cBR} y1={581 + miInvShift} x2={cBR + 67} y2={581 + miInvShift} stroke="#000" strokeWidth="1" />
                  <line x1={cBR + 67} y1={534 + miInvShift} x2={cBR + 67} y2={651 + miInvShift} stroke="#000" strokeWidth="1" />
                  {([
                    { l: '25', s: '' }, { l: '27', s: '' },
                    { l: '59', s: '' }, { l: '81', s: 'U/O' },
                  ] as { l: string; s: string }[]).map(({ l, s }, ri) => (
                    <g key={`rel-${i}-${l}`}>
                      <line x1={cBR + 67} y1={544 + ri * 25 + miInvShift} x2={cBR + 90} y2={544 + ri * 25 + miInvShift} stroke="#000" strokeWidth="0.8" />
                      <rect x={cBR + 90} y={534 + ri * 25 + miInvShift} width={26} height={20} fill="white" stroke="#000" strokeWidth="0.8" />
                      <text x={cBR + 103} y={s ? 545 + ri * 25 + miInvShift : 548 + ri * 25 + miInvShift} fontSize="7" fontWeight="bold" textAnchor="middle">{l}</text>
                      {s && <text x={cBR + 103} y={552 + ri * 25 + miInvShift} fontSize="5.5" textAnchor="middle">{s}</text>}
                    </g>
                  ))}
                  <line x1={cBR + 67} y1={643 + miInvShift} x2={cBR + 90} y2={643 + miInvShift} stroke="#000" strokeWidth="0.8" />
                  <rect x={cBR + 90} y={635 + miInvShift} width={80} height={16} fill="white" stroke="#000" strokeWidth="0.8" />
                  <text x={cBR + 130} y={646 + miInvShift} fontSize="6" textAnchor="middle">ANTI-ILHAMENTO</text>
                  </>)}

                  {/* Wire INVERSOR → QUADRO CC */}
                  <line x1={cCX} y1={609 + miInvShift} x2={cCX} y2={708 + miQccShift} stroke="#000" strokeWidth="1" />

                  {/* Cabos CC — Inversor → Quadro CC */}
                  <line x1={cCX} y1={isSaidaAgrupada ? 719 : 644} x2={cCX + 12} y2={isSaidaAgrupada ? 719 : 644} stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
                  <text x={cCX + 15} y={isSaidaAgrupada ? 712 : 636} fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 719 : 644} fontSize="5.5" fontWeight="bold">HEPR/XLPO 1,8 kV:</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 727 : 652} fontSize="5.5">Para cada string:</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 735 : 659} fontSize="5.5">{`1 #${caboCC}mm² (-)`}</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 743 : 666} fontSize="5.5">{`1 #${caboCC}mm² (+)`}</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 751 : 674} fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
                  <text x={cCX + 15} y={isSaidaAgrupada ? 759 : 681} fontSize="5.5">1 #6,0mm² (T)</text>

                  {/* QUADRO DE PROTEÇÃO CC */}
                  <rect x={cCX - 120} y={708 + miQccShift} width={240} height={140} fill="white" stroke="#000" strokeWidth="1.2" />
                  <text x={cCX + 115} y={720 + miQccShift} fontSize="7" fontWeight="bold" textAnchor="end">QUADRO DE</text>
                  <text x={cCX + 115} y={730 + miQccShift} fontSize="7" fontWeight="bold" textAnchor="end">PROTEÇÃO CC</text>
                  {!hasStringbox && (
                    <>
                      <text x={cCX - 115} y={721 + miQccShift} fontSize="5.5">(ACOPLADO AO</text>
                      <text x={cCX - 115} y={730 + miQccShift} fontSize="5.5">INVERSOR FV)</text>
                    </>
                  )}
                  <text x={cCX - 115} y={758 + miQccShift} fontSize="5.5" fontWeight="bold">DPS CC</text>
                  <text x={cCX - 115} y={767 + miQccShift} fontSize="5.5">1040 Vcc, 18-40 kA</text>
                  <text x={cCX - 115} y={776 + miQccShift} fontSize="5.5">Classe II</text>
                  <line x1={cCX} y1={708 + miQccShift} x2={cCX} y2={745 + miQccShift} stroke="#000" strokeWidth="1" />
                  <line x1={cCX} y1={725 + miQccShift} x2={dpsX} y2={725 + miQccShift} stroke="#000" strokeWidth="0.8" />
                  <line x1={dpsX} y1={725 + miQccShift} x2={dpsX} y2={780 + miQccShift} stroke="#000" strokeWidth="0.8" />
                  <DPSSymbol x={dpsX} y={789 + miQccShift} />
                  <line x1={dpsX} y1={798 + miQccShift} x2={dpsX} y2={810 + miQccShift} stroke="#000" strokeWidth="0.8" />
                  <Terra x={dpsX} y={810 + miQccShift} />
                  <ChaveSeccionadora x={cCX} y={766 + miQccShift} />
                  <text x={cCX + 22} y={758 + miQccShift} fontSize="6.5">C{i + 1}</text>
                  <text x={cCX + 22} y={768 + miQccShift} fontSize="5.5">Chave Seccionadora</text>
                  <text x={cCX + 22} y={777 + miQccShift} fontSize="5.5">(4 polos)</text>
                  <text x={cCX + 22} y={786 + miQccShift} fontSize="5.5">1200 Vcc 32 A</text>

                  {/* Wire QCC → G */}
                  <line x1={cCX} y1={770 + miQccShift} x2={cCX} y2={848 + miQccShift} stroke="#000" strokeWidth="1" />

                  {/* Cabos CC — Quadro CC → G */}
                  <line x1={cCX} y1={872 + miQccShift} x2={cCX + 12} y2={872 + miQccShift} stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
                  <text x={cCX + 15} y={865 + miQccShift} fontSize="5.5" fontWeight="bold">Cabos CC Fotovoltaico -</text>
                  <text x={cCX + 15} y={873 + miQccShift} fontSize="5.5" fontWeight="bold">HEPR/XLPO 1,8 kV:</text>
                  <text x={cCX + 15} y={881 + miQccShift} fontSize="5.5">Para cada string:</text>
                  <text x={cCX + 15} y={888 + miQccShift} fontSize="5.5">{`1 #${caboCC}mm² (-)`}</text>
                  <text x={cCX + 15} y={895 + miQccShift} fontSize="5.5">{`1 #${caboCC}mm² (+)`}</text>
                  <text x={cCX + 15} y={903 + miQccShift} fontSize="5.5" fontWeight="bold">Cabo PE - HEPR/XLPO 1,8 kV:</text>
                  <text x={cCX + 15} y={910 + miQccShift} fontSize="5.5">1 #6,0mm² (T)</text>

                  {/* G — GERADOR */}
                  <line x1={cCX} y1={848 + miQccShift} x2={cCX} y2={935 + miQccShift} stroke="#000" strokeWidth="1" />
                  <circle cx={cCX} cy={971 + miQccShift} r={32} fill="white" stroke="#000" strokeWidth="1.5" />
                  <text x={cCX} y={978 + miQccShift} fontSize="20" fontWeight="bold" textAnchor="middle">G</text>
                  <line x1={cCX} y1={1003 + miQccShift} x2={cCX} y2={1017 + miQccShift} stroke="#000" strokeWidth="1.2" />
                  <Terra x={cCX} y={1017 + miQccShift} />

                  {/* Módulos — direita do G (todas as colunas) */}
                  {(
                    <>
                      <line x1={cCX + 32} y1={971 + miQccShift} x2={cCX + 52} y2={971 + miQccShift} stroke="#000" strokeWidth="0.6" strokeDasharray="3,2" />
                      <text x={cCX + 55} y={938 + miQccShift} fontSize="5.5" fontWeight="bold">Módulos Fotovoltaicos:</text>
                      <text x={cCX + 55} y={948 + miQccShift} fontSize="5.5">Marca: {fv(pd.modulos_fabricante)}</text>
                      <text x={cCX + 55} y={957 + miQccShift} fontSize="5.5">Modelo: {fv(pd.modulos_modelo)}</text>
                      <text x={cCX + 55} y={966 + miQccShift} fontSize="5.5">Potência do módulo: {fv(pd.modulos_potencia_wp)} W</text>
                      <text x={cCX + 55} y={975 + miQccShift} fontSize="5.5">Tensão do módulo: {fv(pd.modulos_vpmp)} V</text>
                      <text x={cCX + 55} y={984 + miQccShift} fontSize="5.5">Corrente de saída do módulo: {fv(pd.modulos_ipmp)} A</text>
                      <text x={cCX + 55} y={993 + miQccShift} fontSize="5.5">Quantidade: {qtdDescr}</text>
                      <text x={cCX + 55} y={1002 + miQccShift} fontSize="5.5">Potência total: {potKwp} kWp</text>
                      <text x={cCX + 55} y={1011 + miQccShift} fontSize="5.5">{tensaoLabel}: {tensaoStr} V</text>
                      <text x={cCX + 55} y={1020 + miQccShift} fontSize="5.5">{corrLabel}: {corrStr} A</text>
                    </>
                  )}
                </g>
              );
            })}
          </>)}
          </g>

          {/* ═══════════════ LEGENDA (top right) ═══════════════ */}
          <rect x={legendX} y="-20" width="238" height="215" fill="white" stroke="#000" strokeWidth="1" />
          <text x={legendX + 119} y="-4" fontSize="8" fontWeight="bold" textAnchor="middle">LEGENDA:</text>
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
            <text key={i} x={legendX + 8} y={10 + i * 13} fontSize="6.5">{ln}</text>
          ))}


          {/* ═══════════════ TITLE BLOCK ═══════════════ */}
          <rect x="5" y="1128" width="1050" height="120" fill="white" stroke="#000" strokeWidth="1.2" />

          {/* Vertical dividers: Left|Mid at x=178, Mid|Right at x=700 */}
          <line x1="178" y1="1128" x2="178" y2="1248" stroke="#000" strokeWidth="0.8" />
          <line x1="700" y1="1128" x2="700" y2="1248" stroke="#000" strokeWidth="0.8" />
          {/* Left sub-col: label area | R values — starts below PRODUTO section */}
          <line x1="118" y1="1158" x2="118" y2="1248" stroke="#000" strokeWidth="0.6" />

          {/* Horizontal dividers */}
          {/* Below PRODUTO section (left + mid cols) */}
          <line x1="5"   y1="1158" x2="700" y2="1158" stroke="#000" strokeWidth="0.7" />
          {/* Left col — 4 equal rows of 16px + last row to 1170 */}
          <line x1="5"   y1="1174" x2="178" y2="1174" stroke="#000" strokeWidth="0.5" />
          <line x1="5"   y1="1190" x2="178" y2="1190" stroke="#000" strokeWidth="0.5" />
          <line x1="5"   y1="1206" x2="178" y2="1206" stroke="#000" strokeWidth="0.5" />
          <line x1="5"   y1="1222" x2="178" y2="1222" stroke="#000" strokeWidth="0.5" />
          {/* Mid col: owner | resp separator (aligns with left col row 3 end) */}
          <line x1="178" y1="1206" x2="700" y2="1206" stroke="#000" strokeWidth="0.5" />

          {/* === LEFT COLUMN — PRODUTO (top, full width, centered) === */}
          <text x="8"  y="1137"  fontSize="5.5" fontWeight="bold">PRODUTO</text>
          <text x="92" y="1152" fontSize="9"   fontWeight="bold" textAnchor="middle">GFV {potKwp} kWp</text>

          {/* DATA  (row 1: y=1158–1174) */}
          <text x="8"  y="1165" fontSize="5.5" fontWeight="bold">DATA</text>
          <text x="62" y="1172" fontSize="6"   textAnchor="middle">{dataDoc}</text>
          <text x="148" y="1169" fontSize="5.5" textAnchor="middle">R1:</text>

          {/* ESCALA  (row 2: y=1174–1190) */}
          <text x="8"  y="1181" fontSize="5.5" fontWeight="bold">ESCALA</text>
          <text x="62" y="1188" fontSize="6"   textAnchor="middle">S/ ESCALA</text>
          <text x="148" y="1185" fontSize="5.5" textAnchor="middle">R2:</text>

          {/* TAMANHO  (row 3: y=1190–1206) */}
          <text x="8"  y="1197" fontSize="5.5" fontWeight="bold">TAMANHO</text>
          <text x="62" y="1204" fontSize="6"   textAnchor="middle">{numInversores >= 4 ? 'A1' : (numInversores >= 3 ? 'A2' : 'A3')}</text>
          <text x="148" y="1201" fontSize="5.5" textAnchor="middle">R3:</text>

          {/* FOLHA  (row 4: y=1206–1222) */}
          <text x="8"  y="1213" fontSize="5.5" fontWeight="bold">FOLHA</text>
          <text x="62" y="1220" fontSize="6"   textAnchor="middle">1/1</text>
          <text x="148" y="1217" fontSize="5.5" textAnchor="middle">R4:</text>

          {/* REVISÃO  (row 5: y=1222–1240) */}
          <text x="8"  y="1229" fontSize="5.5" fontWeight="bold">REVISÃO</text>
          <text x="62" y="1236" fontSize="6"   textAnchor="middle">R0</text>
          <text x="148" y="1233" fontSize="5.5" textAnchor="middle">R5:</text>

          {/* === MIDDLE COLUMN — TÍTULO (top) === */}
          <text x="185" y="1139" fontSize="5.5" fontWeight="bold">TÍTULO</text>
          <text x="439" y="1153" fontSize="11" fontWeight="bold" textAnchor="middle">DIAGRAMA UNIFILAR</text>

          {/* === MIDDLE COLUMN — OWNER BLOCK (y=1158–1206, 5 items equidistant 9px) === */}
          <text x="439" y="1167" fontSize="5.5" fontWeight="bold" textAnchor="middle">Proprietário e Obra:</text>
          <text x="439" y="1176" fontSize="6" textAnchor="middle">Nome: {owner}</text>
          <text x="439" y="1185" fontSize="6" textAnchor="middle">Endereço: {endereco}</text>
          <text x="439" y="1194" fontSize="6" textAnchor="middle">Cidade: {uf ? `${cidade} - ${uf}` : cidade}</text>
          <text x="439" y="1203" fontSize="6" textAnchor="middle">CEP: {cep}</text>

          {/* === MIDDLE COLUMN — RESPONSÁVEL BLOCK (y=1206–1240, 4 items equidistant 8px) === */}
          <text x="439" y="1215" fontSize="5.5" fontWeight="bold" textAnchor="middle">Responsável Técnico:</text>
          <text x="439" y="1223" fontSize="6" fontWeight="bold" textAnchor="middle">{respNome}</text>
          <text x="439" y="1231" fontSize="5.5" textAnchor="middle">TÉCNICO EM ELETROTÉCNICA</text>
          <text x="439" y="1239" fontSize="5.5" textAnchor="middle">CFT: {respCft}</text>

          {/* === RIGHT COLUMN — Logo (centralizada na coluna x=700..1055) === */}
          {pd.logo_empresa_url
            ? <image href={pd.logo_empresa_url} x="787" y="1132" width="182" height="112" preserveAspectRatio="xMidYMid meet" />
            : null}

          </g>
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
