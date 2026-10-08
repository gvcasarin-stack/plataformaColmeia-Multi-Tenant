// @ts-nocheck
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

function imgUrl(path: string) {
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

interface PadraoEntradaEnergisaPDFProps {
  projectData?: Record<string, any>;
}

// Prancha A3 paisagem em escala real (1mm = 72/25.4pt) — mesmas posições em
// milímetros usadas em PadraoEntradaEnergisaPreview.tsx (SVG), convertidas
// para pontos. Isso garante que o PDF respeite o formato A3 de verdade (a
// versão anterior desenhava tudo em uma página A4 com larguras arbitrárias).
const PT_PER_MM = 72 / 25.4;
const mm = (v: number) => v * PT_PER_MM;

// Desenho técnico (imagem + overlays) usando a largura quase total da folha
// (mesmas posições do protótipo/Preview); só o rodapé (y 253–287) divide
// espaço com o selo.
const MONO_X = 111.25, MONO_Y = 22, MONO_W = 222.5, MONO_H = 219, MONO_VB_W = 222.5;
const TRI_X = 66.2, TRI_Y = 21.5, TRI_W = 312.6, TRI_H = 220, TRI_VB_W = 312.6;
const BI_X = 66.2, BI_Y = 22.75, BI_W = 312.6, BI_H = 217.5, BI_VB_W = 312.6;

// Converte uma coordenada local do desenho original (mesmas unidades usadas
// no SVG do Preview, local ao viewBox de cada imagem) em posição absoluta
// (pt) na página, aplicando a escala do padrão e a correção de baseline
// (SVG <text> ancora na linha de base; react-pdf <Text> ancora no topo).
function mkOverlay(drawXmm: number, drawYmm: number, drawWmm: number, vbW: number) {
  const scale = mm(drawWmm) / vbW;
  const baseLeft = mm(drawXmm);
  const baseTop = mm(drawYmm);
  return (lx: number, ly: number, fontSizeLocal: number) => {
    const fontSize = fontSizeLocal * scale;
    return { left: baseLeft + lx * scale, top: baseTop + ly * scale - fontSize * 0.78, fontSize };
  };
}

const s = StyleSheet.create({
  page: { backgroundColor: '#FFFFFF', fontFamily: 'Helvetica', color: '#000000' },
  overlay: { position: 'absolute', color: '#1c3f73', fontFamily: 'Helvetica-Bold' },
  seloLbl: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' },
});

// "6" -> "6,0" (mesma notação com uma casa decimal do desenho original)
function fmtMm2(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.includes(',') ? v : `${v},0`;
}

function fv(val: any, fb = '___'): string {
  if (val === undefined || val === null || val === '') return fb;
  return String(val);
}

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function formatDataBR(raw: string): string {
  const str = raw.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const match = str.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})$/i);
  if (match) {
    const monthIndex = MESES_PT.indexOf(match[2]);
    if (monthIndex !== -1) return `${match[1].padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}/${match[3]}`;
  }
  return str;
}

const POLOS_LABEL: Record<string, string> = { '1': 'Monopolar', '2': 'Bipolar', '3': 'Tripolar' };
const CONEXAO_ADJ: Record<string, string> = { 'Monofásico': 'monofásica', 'Bifásico': 'bifásica', 'Trifásico': 'trifásica' };

export function PadraoEntradaEnergisaPDF({ projectData = {} }: PadraoEntradaEnergisaPDFProps) {
  const get = (key: string) => String(projectData[key] || '').trim();

  // ✅ Qual padrão exibir: Tipo de Conexão (Conferir Informações > Padrão de
  // Entrada). "Trifásico"/"Bifásico" mostram o respectivo desenho; qualquer
  // outro valor mostra o monofásico.
  const isTrifasico = get('tipo_conexao') === 'Trifásico';
  const isBifasico = get('tipo_conexao') === 'Bifásico';
  const faseQtd = isTrifasico ? '3' : isBifasico ? '2' : '1';

  const secaoFaseRL = get('secao_fase_rl_mm2');
  const secaoNeutroRL = get('secao_neutro_rl_mm2');
  const caboMultiplex = secaoFaseRL && secaoNeutroRL
    ? `${faseQtd}x1x${secaoFaseRL}+${secaoNeutroRL}`
    : '';

  const secaoFase = fmtMm2(get('secao_fase_mm2'));
  const secaoNeutro = fmtMm2(get('secao_neutro_mm2'));
  const secaoAterramento = get('secao_aterramento_mm2');

  const disjuntorCorrente = get('disjuntor_corrente_a');
  const disjuntorPolosLabel = POLOS_LABEL[get('disjuntor_polos')] || '';
  // Monofásico: a imagem não traz "Monopolar", então o rótulo completo (polos + corrente)
  // é sobreposto. Trifásico/Bifásico: a imagem já traz o rótulo de polaridade impresso,
  // falta só a corrente.
  const disjuntorLabel = [disjuntorPolosLabel, disjuntorCorrente ? `${disjuntorCorrente} A` : ''].filter(Boolean).join(' ');
  const disjuntorCorrenteLabel = disjuntorCorrente ? `${disjuntorCorrente} A` : '';

  const conexaoAdj = CONEXAO_ADJ[get('tipo_conexao')] || '';
  const caixaMedicaoCorrente = disjuntorCorrente ? `${disjuntorCorrente} A` : '';

  // Selo — mesmos campos/chaves de projeto do Diagrama Unifilar / Blocos.
  const potKwp = (() => {
    const n = parseFloat(String(projectData?.potencia || '0').replace(',', '.'));
    return n > 0 ? n.toFixed(2).replace('.', ',') : '0,00';
  })();
  const owner = fv(projectData?.nomeClienteFinal, 'NOME DO PROPRIETÁRIO');
  const endereco = fv(projectData?.endereco_local, 'ENDEREÇO DA OBRA');
  const cidade = fv(projectData?.client_city, 'Cidade');
  const uf = fv(projectData?.client_state, '');
  const cep = fv(projectData?.cliente_cep, '00.000-000');
  const respNome = fv(projectData?.responsavel_nome, 'RESPONSÁVEL TÉCNICO');
  const respCft = fv(projectData?.responsavel_registro, '00000000000');
  const dataDoc = formatDataBR(fv(projectData?.data_documento, new Date().toLocaleDateString('pt-BR')));
  const logoUrl = projectData?.logo_empresa_url;

  const drawXmm = isTrifasico ? TRI_X : isBifasico ? BI_X : MONO_X;
  const drawYmm = isTrifasico ? TRI_Y : isBifasico ? BI_Y : MONO_Y;
  const drawWmm = isTrifasico ? TRI_W : isBifasico ? BI_W : MONO_W;
  const drawHmm = isTrifasico ? TRI_H : isBifasico ? BI_H : MONO_H;
  const vbW = isTrifasico ? TRI_VB_W : isBifasico ? BI_VB_W : MONO_VB_W;
  const ov = mkOverlay(drawXmm, drawYmm, drawWmm, vbW);
  const imgSrc = isTrifasico ? '/images/energisa-pde-tri.png' : isBifasico ? '/images/energisa-pde-bi.png' : '/images/energisa-pde-mono-2.png';

  return (
    <Document>
      <Page size="A3" orientation="landscape" style={s.page}>
        <View style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* ===== borda de corte + quadro de desenho (NBR 10068) ===== */}
          <View style={{ position: 'absolute', left: mm(0.5), top: mm(0.5), width: mm(419), height: mm(296), borderWidth: 0.75, borderColor: '#161513' }} />
          <View style={{ position: 'absolute', left: mm(25), top: mm(10), width: mm(385), height: mm(277), borderWidth: 0.75, borderColor: '#161513' }} />

          {/* marcas de centragem */}
          <View style={{ position: 'absolute', left: mm(217.5), top: mm(0.5), width: 0.75, height: mm(9.5), backgroundColor: '#161513' }} />
          <View style={{ position: 'absolute', left: mm(217.5), top: mm(287), width: 0.75, height: mm(9.5), backgroundColor: '#161513' }} />
          <View style={{ position: 'absolute', left: mm(0.5), top: mm(148.5), width: mm(24.5), height: 0.75, backgroundColor: '#161513' }} />
          <View style={{ position: 'absolute', left: mm(410), top: mm(148.5), width: mm(9.5), height: 0.75, backgroundColor: '#161513' }} />

          {/* ===== detalhe construtivo (largura quase total da folha) ===== */}
          <Image
            src={imgUrl(imgSrc)}
            style={{ position: 'absolute', left: mm(drawXmm), top: mm(drawYmm), width: mm(drawWmm), height: mm(drawHmm) }}
          />

          {isTrifasico ? (
            <>
              <Text style={[s.overlay, ov(60.8, 10.2, 4.0)]}>aço galvanizado</Text>
              {caboMultiplex && <Text style={[s.overlay, ov(43.8, 41.3, 4.0)]}>{caboMultiplex}</Text>}
              <Text style={[s.overlay, ov(82.8, 64.9, 4.0)]}>{'Ø1"'}</Text>
              {caixaMedicaoCorrente && <Text style={[s.overlay, ov(70.1, 81.3, 3.6)]}>{caixaMedicaoCorrente}</Text>}
              {disjuntorCorrenteLabel && <Text style={[s.overlay, ov(69.4, 94.0, 4.0)]}>{disjuntorCorrenteLabel}</Text>}
              {secaoAterramento && <Text style={[s.overlay, ov(63.8, 119.4, 4.0)]}>{`${fmtMm2(secaoAterramento)} mm²`}</Text>}
              <Text style={[s.overlay, ov(173.8, 110.9, 3.5)]}>PVC 70° - 1,0 kV</Text>
              {secaoFase && <Text style={[s.overlay, ov(149.8, 115.9, 3.3)]}>{`3#${secaoFase} mm² (Fases)`}</Text>}
              {secaoNeutro && <Text style={[s.overlay, ov(149.8, 121.0, 3.3)]}>{`1#${secaoNeutro} mm² (Neutro)`}</Text>}
              {secaoAterramento && <Text style={[s.overlay, ov(149.8, 126.0, 3.3)]}>{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</Text>}
            </>
          ) : isBifasico ? (
            <>
              <Text style={[s.overlay, ov(87.1, 8.45, 4.0)]}>concreto</Text>
              {caboMultiplex && <Text style={[s.overlay, ov(68.3, 39.85, 4.0)]}>{caboMultiplex}</Text>}
              <Text style={[s.overlay, ov(91.8, 62.95, 4.0)]}>{'Ø3/4"'}</Text>
              <Text style={[s.overlay, ov(153.3, 60.45, 4.0)]}>{'Ø3/4"'}</Text>
              {caixaMedicaoCorrente && <Text style={[s.overlay, ov(171.1, 82.85, 3.6)]}>{caixaMedicaoCorrente}</Text>}
              {disjuntorCorrenteLabel && <Text style={[s.overlay, ov(88.4, 94.45, 4.0)]}>{disjuntorCorrenteLabel}</Text>}
              {secaoAterramento && <Text style={[s.overlay, ov(86.8, 116.85, 4.0)]}>{`${fmtMm2(secaoAterramento)} mm²`}</Text>}
              <Text style={[s.overlay, ov(192.7, 37.15, 3.5)]}>PVC 70° - 1,0 kV</Text>
              {secaoFase && <Text style={[s.overlay, ov(170.5, 42.25, 3.3)]}>{`2#${secaoFase} mm² (Fases)`}</Text>}
              {secaoNeutro && <Text style={[s.overlay, ov(170.5, 47.35, 3.3)]}>{`1#${secaoNeutro} mm² (Neutro)`}</Text>}
              {secaoAterramento && <Text style={[s.overlay, ov(170.5, 52.35, 3.3)]}>{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</Text>}
            </>
          ) : (
            <>
              {caboMultiplex && <Text style={[s.overlay, ov(54.45, 38.6, 4.0)]}>{caboMultiplex}</Text>}
              {secaoFase && <Text style={[s.overlay, ov(158.75, 42.9, 3.5)]}>{`1#${secaoFase} mm² (Fases)`}</Text>}
              {secaoNeutro && <Text style={[s.overlay, ov(158.75, 47.1, 3.5)]}>{`1#${secaoNeutro} mm² (Neutro)`}</Text>}
              {secaoAterramento && <Text style={[s.overlay, ov(158.75, 51.2, 3.5)]}>{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</Text>}
              <Text style={[s.overlay, ov(77.45, 62.4, 4.0)]}>{'Ø3/4"'}</Text>
              <Text style={[s.overlay, ov(138.95, 60.6, 4.0)]}>{'Ø3/4"'}</Text>
              {disjuntorLabel && <Text style={[s.overlay, ov(54.35, 94.7, 4.0)]}>{disjuntorLabel}</Text>}
              {conexaoAdj && <Text style={[s.overlay, ov(162.85, 77.7, 3.6)]}>{conexaoAdj}</Text>}
              {caixaMedicaoCorrente && <Text style={[s.overlay, ov(157.35, 82.5, 3.6)]}>{caixaMedicaoCorrente}</Text>}
              {secaoAterramento && <Text style={[s.overlay, ov(76.45, 117.4, 4.0)]}>{`${fmtMm2(secaoAterramento)} mm²`}</Text>}
            </>
          )}

          {/* ===================================================================
              SELO — faixa inferior (mesma altura de antes: y 253–287mm,
              34mm), ocupando horizontalmente a metade DIREITA da folha
              (x 217.5–410mm, 192.5mm). 3 colunas: Produto/Data/Escala/
              Tamanho/Folha/Revisão (40mm) | Título + Proprietário e Obra +
              Responsável Técnico (110mm) | Logo da empresa (42.5mm).
              ================================================================= */}
          <View style={{ position: 'absolute', left: mm(217.5), top: mm(253), width: mm(192.5), height: mm(34), borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: '#161513', flexDirection: 'row' }}>
            {/* Coluna 1: Produto / Data / Escala / Tamanho / Folha / Revisão */}
            <View style={{ width: mm(40), borderRightWidth: 0.75, borderColor: '#161513' }}>
              <View style={{ height: mm(8.5), borderBottomWidth: 0.75, borderColor: '#161513', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={s.seloLbl}>PRODUTO</Text>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 1 }}>GFV {potKwp} kWp</Text>
              </View>
              {[['DATA', dataDoc], ['ESCALA', 'S/ ESCALA'], ['TAMANHO', 'A3'], ['FOLHA', '1/1'], ['REVISÃO', 'R0']].map(([lbl, val]) => (
                <View key={lbl} style={{ height: mm(5.1), justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={[s.seloLbl, { fontSize: 4.5 }]}>{lbl}</Text>
                  <Text style={{ fontSize: 5.5, textAlign: 'center' }}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Coluna 2: Título + Proprietário e Obra + Responsável Técnico */}
            <View style={{ width: mm(110), borderRightWidth: 0.75, borderColor: '#161513' }}>
              <View style={{ height: mm(8.5), borderBottomWidth: 0.75, borderColor: '#161513', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={[s.seloLbl, { textAlign: 'center' }]}>TÍTULO</Text>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 1 }}>DETALHE CONSTRUTIVO DO PADRÃO DE ENTRADA</Text>
              </View>
              <View style={{ height: mm(13.5), borderBottomWidth: 0.4, borderColor: '#161513', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={[s.seloLbl, { textAlign: 'center' }]}>Proprietário e Obra:</Text>
                <Text style={{ fontSize: 5.3, textAlign: 'center', marginTop: 1 }}>Nome: {owner}</Text>
                <Text style={{ fontSize: 5.3, textAlign: 'center' }}>Endereço: {endereco}</Text>
                <Text style={{ fontSize: 5.3, textAlign: 'center' }}>Cidade: {uf ? `${cidade} - ${uf}` : cidade}</Text>
                <Text style={{ fontSize: 5.3, textAlign: 'center' }}>CEP: {cep}</Text>
              </View>
              <View style={{ height: mm(12), justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={[s.seloLbl, { textAlign: 'center' }]}>Responsável Técnico:</Text>
                <Text style={{ fontSize: 5.6, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 1 }}>{respNome}</Text>
                <Text style={{ fontSize: 5, textAlign: 'center' }}>TÉCNICO EM ELETROTÉCNICA</Text>
                <Text style={{ fontSize: 5, textAlign: 'center' }}>CFT: {respCft}</Text>
              </View>
            </View>

            {/* Coluna 3: Logo da empresa */}
            <View style={{ width: mm(42.5), alignItems: 'center', justifyContent: 'center', padding: 3 }}>
              {logoUrl && <Image src={logoUrl} style={{ width: '100%', maxHeight: mm(26), objectFit: 'contain' }} />}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
