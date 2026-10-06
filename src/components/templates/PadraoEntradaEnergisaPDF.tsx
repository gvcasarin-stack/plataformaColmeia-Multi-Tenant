// @ts-nocheck
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

function imgUrl(path: string) {
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

interface PadraoEntradaEnergisaPDFProps {
  projectData?: Record<string, any>;
}

// Mesma proporção do protótipo (bloco de 222.5 x 219 "mm") escalada para 360pt
// de largura dentro da página A4 — ver PadraoEntradaEnergisaPreview.tsx para a
// versão em tela (SVG), que usa exatamente as mesmas posições relativas.
const IMG_W = 360;
const IMG_H = 354.25;

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
  figure: { width: IMG_W, height: IMG_H, position: 'relative', marginHorizontal: 'auto' },
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

  const secaoFaseRL = get('secao_fase_rl_mm2');
  const secaoNeutroRL = get('secao_neutro_rl_mm2');
  const caboMultiplex = secaoFaseRL && secaoNeutroRL ? `1x1x${secaoFaseRL}+${secaoNeutroRL}` : '';

  const secaoFase = fmtMm2(get('secao_fase_mm2'));
  const secaoNeutro = fmtMm2(get('secao_neutro_mm2'));
  const secaoAterramento = get('secao_aterramento_mm2');

  const disjuntorCorrente = get('disjuntor_corrente_a');
  const disjuntorPolosLabel = POLOS_LABEL[get('disjuntor_polos')] || '';
  const disjuntorLabel = [disjuntorPolosLabel, disjuntorCorrente ? `${disjuntorCorrente} A` : ''].filter(Boolean).join(' ');

  const conexaoAdj = CONEXAO_ADJ[get('tipo_conexao')] || '';
  const caixaMedicaoCorrente = disjuntorCorrente ? `${disjuntorCorrente} A` : '';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <DocHeader title="DETALHE CONSTRUTIVO DO PADRÃO DE ENTRADA" subtitle="GERAÇÃO DISTRIBUÍDA" />

        <View style={s.figure}>
          <Image src={imgUrl('/images/energisa-pde-mono-2.png')} style={{ width: IMG_W, height: IMG_H }} />

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
      </Page>
    </Document>
  );
}
