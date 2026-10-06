// @ts-nocheck
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

function imgUrl(path: string) {
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

interface PadraoEntradaEnergisaPDFProps {
  projectData?: Record<string, any>;
}

// Mesma proporção do protótipo escalada para 360pt de largura dentro da
// página A4 — ver PadraoEntradaEnergisaPreview.tsx para a versão em tela
// (SVG), que usa exatamente as mesmas posições relativas. Mono e trifásico
// usam imagens com proporções diferentes, por isso cada um tem sua altura.
const IMG_W = 360;
const IMG_H_MONO = 354.25;
const IMG_H_TRI = 253.5;
const B = 0.75;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    backgroundColor: '#FFFFFF',
    padding: 18,
    color: '#000000',
  },
  // ✅ Moldura da prancha (mesma ideia do protótipo: quadro em volta de todo
  // o conteúdo da folha) — aqui como borda simples ao redor de figura + selo,
  // já que o react-pdf não desenha bem imagens dentro de <Svg>.
  frame: { borderWidth: 1, borderColor: '#161513', padding: 14 },
  figure: { width: IMG_W, position: 'relative', marginHorizontal: 'auto' },
  overlay: { position: 'absolute', color: '#1c3f73', fontFamily: 'Helvetica-Bold' },

  // ✅ Selo no mesmo padrão do Diagrama Unifilar / Diagrama de Blocos —
  // construído como tabela (mesma convenção de bordas usada nos demais
  // documentos deste app), não como SVG de posição livre.
  selo: { flexDirection: 'row', borderTopWidth: B, borderColor: '#161513', marginTop: 14 },
  seloCol: { borderRightWidth: B, borderColor: '#161513' },
  seloLbl: { fontSize: 5, fontFamily: 'Helvetica-Bold', color: '#444' },
  seloVal: { fontSize: 6.5, textAlign: 'center' },
  seloRow: { borderBottomWidth: 0.4, borderColor: '#161513', paddingVertical: 2, paddingHorizontal: 4 },
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
  // Entrada). "Trifásico" mostra o desenho trifásico; qualquer outro valor
  // mostra o monofásico — o bifásico ainda não tem desenho próprio.
  const isTrifasico = get('tipo_conexao') === 'Trifásico';

  const secaoFaseRL = get('secao_fase_rl_mm2');
  const secaoNeutroRL = get('secao_neutro_rl_mm2');
  const caboMultiplex = secaoFaseRL && secaoNeutroRL
    ? `${isTrifasico ? '3x1x' : '1x1x'}${secaoFaseRL}+${secaoNeutroRL}`
    : '';

  const secaoFase = fmtMm2(get('secao_fase_mm2'));
  const secaoNeutro = fmtMm2(get('secao_neutro_mm2'));
  const secaoAterramento = get('secao_aterramento_mm2');

  const disjuntorCorrente = get('disjuntor_corrente_a');
  const disjuntorPolosLabel = POLOS_LABEL[get('disjuntor_polos')] || '';
  // Monofásico: a imagem não traz "Monopolar", então o rótulo completo (polos + corrente)
  // é sobreposto. Trifásico: a imagem já traz "Disjuntor Tripolar" impresso, falta só a corrente.
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

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.frame}>
          {isTrifasico ? (
            <View style={[s.figure, { height: IMG_H_TRI }]}>
              <Image src={imgUrl('/images/energisa-pde-tri.png')} style={{ width: IMG_W, height: IMG_H_TRI }} />

              <Text style={[s.overlay, { left: 70.0, top: 8.2, fontSize: 4.6 }]}>aço galvanizado</Text>

              {caboMultiplex && (
                <Text style={[s.overlay, { left: 50.4, top: 44.0, fontSize: 4.6 }]}>{caboMultiplex}</Text>
              )}

              <Text style={[s.overlay, { left: 95.4, top: 71.2, fontSize: 4.6 }]}>{'Ø1"'}</Text>

              {caixaMedicaoCorrente && (
                <Text style={[s.overlay, { left: 80.7, top: 90.4, fontSize: 4.2 }]}>{caixaMedicaoCorrente}</Text>
              )}
              {disjuntorCorrenteLabel && (
                <Text style={[s.overlay, { left: 79.9, top: 104.7, fontSize: 4.6 }]}>{disjuntorCorrenteLabel}</Text>
              )}

              {secaoAterramento && (
                <Text style={[s.overlay, { left: 73.5, top: 133.9, fontSize: 4.6 }]}>{`${fmtMm2(secaoAterramento)} mm²`}</Text>
              )}

              <Text style={[s.overlay, { left: 200.2, top: 124.6, fontSize: 4.0 }]}>PVC 70° - 1,0 kV</Text>
              {secaoFase && (
                <Text style={[s.overlay, { left: 172.5, top: 130.5, fontSize: 3.8 }]}>{`3#${secaoFase} mm² (Fases)`}</Text>
              )}
              {secaoNeutro && (
                <Text style={[s.overlay, { left: 172.5, top: 136.4, fontSize: 3.8 }]}>{`1#${secaoNeutro} mm² (Neutro)`}</Text>
              )}
              {secaoAterramento && (
                <Text style={[s.overlay, { left: 172.5, top: 142.2, fontSize: 3.8 }]}>{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</Text>
              )}
            </View>
          ) : (
            <View style={[s.figure, { height: IMG_H_MONO }]}>
              <Image src={imgUrl('/images/energisa-pde-mono-2.png')} style={{ width: IMG_W, height: IMG_H_MONO }} />

              {caboMultiplex && (
                <Text style={[s.overlay, { left: 88.1, top: 57.4, fontSize: 6.5 }]}>{caboMultiplex}</Text>
              )}

              {secaoFase && (
                <Text style={[s.overlay, { left: 256.8, top: 65.0, fontSize: 5.7 }]}>{`1#${secaoFase} mm² (Fases)`}</Text>
              )}
              {secaoNeutro && (
                <Text style={[s.overlay, { left: 256.8, top: 71.8, fontSize: 5.7 }]}>{`1#${secaoNeutro} mm² (Neutro)`}</Text>
              )}
              {secaoAterramento && (
                <Text style={[s.overlay, { left: 256.8, top: 78.4, fontSize: 5.7 }]}>{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</Text>
              )}

              <Text style={[s.overlay, { left: 125.3, top: 95.9, fontSize: 6.5 }]}>{'Ø3/4"'}</Text>
              <Text style={[s.overlay, { left: 224.9, top: 93.0, fontSize: 6.5 }]}>{'Ø3/4"'}</Text>

              {disjuntorLabel && (
                <Text style={[s.overlay, { left: 87.9, top: 148.1, fontSize: 6.5 }]}>{disjuntorLabel}</Text>
              )}

              {conexaoAdj && (
                <Text style={[s.overlay, { left: 263.5, top: 121.2, fontSize: 5.8 }]}>{conexaoAdj}</Text>
              )}
              {caixaMedicaoCorrente && (
                <Text style={[s.overlay, { left: 254.6, top: 129.0, fontSize: 5.8 }]}>{caixaMedicaoCorrente}</Text>
              )}

              {secaoAterramento && (
                <Text style={[s.overlay, { left: 123.7, top: 184.9, fontSize: 6.5 }]}>{`${fmtMm2(secaoAterramento)} mm²`}</Text>
              )}
            </View>
          )}

          {/* ===== Selo — mesmo padrão do Diagrama Unifilar / Diagrama de Blocos ===== */}
          <View style={s.selo}>
            {/* Coluna 1: Produto / Data / Escala / Tamanho / Folha / Revisão */}
            <View style={[s.seloCol, { width: '17%' }]}>
              <View style={[s.seloRow, { height: 28, justifyContent: 'center' }]}>
                <Text style={s.seloLbl}>PRODUTO</Text>
                <Text style={[s.seloVal, { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 2 }]}>GFV {potKwp} kWp</Text>
              </View>
              {[['DATA', dataDoc], ['ESCALA', 'S/ ESCALA'], ['TAMANHO', 'A3'], ['FOLHA', '1/1'], ['REVISÃO', 'R0']].map(([lbl, val], i, arr) => (
                <View key={lbl} style={i < arr.length - 1 ? s.seloRow : { paddingVertical: 2, paddingHorizontal: 4 }}>
                  <Text style={s.seloLbl}>{lbl}</Text>
                  <Text style={s.seloVal}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Coluna 2: Título + Proprietário e Obra + Responsável Técnico */}
            <View style={[s.seloCol, { width: '53%' }]}>
              <View style={[s.seloRow, { height: 28, justifyContent: 'center' }]}>
                <Text style={[s.seloLbl, { textAlign: 'center' }]}>TÍTULO</Text>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>DETALHE CONSTRUTIVO DO PADRÃO DE ENTRADA</Text>
              </View>
              <View style={[s.seloRow, { paddingVertical: 4 }]}>
                <Text style={[s.seloLbl, { textAlign: 'center' }]}>Proprietário e Obra:</Text>
                <Text style={{ fontSize: 6, textAlign: 'center', marginTop: 2 }}>Nome: {owner}</Text>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>Endereço: {endereco}</Text>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>Cidade: {uf ? `${cidade} - ${uf}` : cidade}</Text>
                <Text style={{ fontSize: 6, textAlign: 'center' }}>CEP: {cep}</Text>
              </View>
              <View style={{ paddingVertical: 4 }}>
                <Text style={[s.seloLbl, { textAlign: 'center' }]}>Responsável Técnico:</Text>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>{respNome}</Text>
                <Text style={{ fontSize: 5.5, textAlign: 'center' }}>TÉCNICO EM ELETROTÉCNICA</Text>
                <Text style={{ fontSize: 5.5, textAlign: 'center' }}>CFT: {respCft}</Text>
              </View>
            </View>

            {/* Coluna 3: Logo da empresa */}
            <View style={{ width: '30%', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
              {logoUrl && <Image src={logoUrl} style={{ width: '100%', maxHeight: 60, objectFit: 'contain' }} />}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
