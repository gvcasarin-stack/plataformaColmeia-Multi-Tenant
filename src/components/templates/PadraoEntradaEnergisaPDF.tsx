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

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    color: '#000000',
  },
  title: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 2 },
  subtitle: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 10 },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  docHeaderLogo: { width: 70, height: 36, objectFit: 'contain' },
  docHeaderTitles: { flex: 1, alignItems: 'center' },
  docHeaderSpacer: { width: 70 },
  figure: { width: IMG_W, position: 'relative', marginHorizontal: 'auto' },
  overlay: { position: 'absolute', color: '#1c3f73', fontFamily: 'Helvetica-Bold' },
});

// "6" -> "6,0" (mesma notação com uma casa decimal do desenho original)
function fmtMm2(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.includes(',') ? v : `${v},0`;
}

const POLOS_LABEL: Record<string, string> = { '1': 'Monopolar', '2': 'Bipolar', '3': 'Tripolar' };
const CONEXAO_ADJ: Record<string, string> = { 'Monofásico': 'monofásica', 'Bifásico': 'bifásica', 'Trifásico': 'trifásica' };

function DocHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={s.docHeader}>
      <Image src={imgUrl('/images/logo-grupo-energisa.png')} style={s.docHeaderLogo} />
      <View style={s.docHeaderTitles}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>
      <View style={s.docHeaderSpacer} />
    </View>
  );
}

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

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <DocHeader title="DETALHE CONSTRUTIVO DO PADRÃO DE ENTRADA" subtitle="GERAÇÃO DISTRIBUÍDA" />

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
      </Page>
    </Document>
  );
}
