import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface AnexoG1CPFLPDFProps {
  projectData?: Record<string, any>;
}

const NAVY = '#1a3a6b';
const B = 0.75;
const BC = '#000000';
const ROWS_MIN = 29;

function fmtTotal(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 32,
    color: '#000000',
    lineHeight: 1.35,
  },
  titulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 12,
  },
  paragrafo: {
    textAlign: 'justify',
    marginBottom: 18,
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  codigoBox: {
    flexDirection: 'row',
    borderWidth: B,
    borderColor: BC,
    marginBottom: 22,
  },
  codigoLabel: {
    flex: 1,
    backgroundColor: NAVY,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    padding: 8,
    borderRightWidth: B,
    borderColor: BC,
  },
  codigoValor: {
    width: 130,
    textAlign: 'center',
    justifyContent: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    padding: 8,
  },
  tabelaTitulo: {
    backgroundColor: NAVY,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
    padding: 5,
    borderWidth: B,
    borderColor: BC,
  },
  tbl: { borderLeftWidth: B, borderColor: BC },
  row: { flexDirection: 'row' },
  head: {
    backgroundColor: NAVY,
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderTopWidth: B,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  cell: {
    fontSize: 7.5,
    textAlign: 'center',
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderTopWidth: B,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  footLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textAlign: 'left',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderTopWidth: B,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  footTotal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderTopWidth: B,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
});

// ANEXO G.1 — Formulário para cadastro de Unidades Consumidoras participantes do
// Sistema de Compensação (CPFL/RGE). Reaproveita os mesmos campos já coletados em
// "Conferir Informações" para a Lista de Rateio da Equatorial (conta_contrato da
// unidade geradora e rateio_beneficiarias), já que o formulário da CPFL/RGE pede
// exatamente os mesmos dados.
export function AnexoG1CPFLPDF({ projectData }: AnexoG1CPFLPDFProps) {
  const codigoUC = String(projectData?.conta_contrato || '');
  const beneficiarias: { conta_contrato: string; percentual?: number }[] = Array.isArray(projectData?.rateio_beneficiarias)
    ? projectData.rateio_beneficiarias
    : [];
  const totalPercentual = beneficiarias.reduce((sum, b) => sum + (Number(b.percentual) || 0), 0);

  // Layout de 2 colunas por linha (Nº UC + % duas vezes), igual ao Anexo G.1 oficial.
  const totalRows = Math.max(ROWS_MIN, Math.ceil(beneficiarias.length / 2));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.titulo}>
          ANEXO G.1 – Formulário para cadastro de Unidades Consumidoras participantes do Sistema de Compensação
        </Text>

        <Text style={s.paragrafo}>
          Solicito que o excedente de energia injetada na rede pela unidade consumidora denominada abaixo de{' '}
          <Text style={s.bold}>&ldquo;Unidade consumidora com geração distribuída&rdquo;</Text>, que esteja disponível
          para alocação nos termos da REN ANEEL 1.000/2021, seja rateada entre as unidades consumidoras abaixo
          relacionadas na TABELA 1, conforme percentuais discriminados, podendo inclusive a unidade geradora ser uma
          instalação beneficiada com o excedente.
        </Text>

        <View style={s.codigoBox}>
          <Text style={s.codigoLabel}>CÓDIGO DA UNIDADE CONSUMIDORA COM GERAÇÃO DISTRIBUÍDA:</Text>
          <Text style={s.codigoValor}>{codigoUC}</Text>
        </View>

        <Text style={s.tabelaTitulo}>
          TABELA 1 - Unidade(s) Consumidora(s) Beneficiária(s) do Excedente de Energia
        </Text>

        <View style={s.tbl}>
          <View style={s.row}>
            <Text style={[s.head, { width: '35%' }]}>Nº Unidade Consumidora</Text>
            <Text style={[s.head, { width: '15%' }]}>%</Text>
            <Text style={[s.head, { width: '35%' }]}>Nº Unidade Consumidora</Text>
            <Text style={[s.head, { width: '15%' }]}>%</Text>
          </View>
          {Array.from({ length: totalRows }).map((_, r) => {
            const left = beneficiarias[r * 2];
            const right = beneficiarias[r * 2 + 1];
            return (
              <View style={s.row} key={r}>
                <Text style={[s.cell, { width: '35%' }]}>{left?.conta_contrato || ''}</Text>
                <Text style={[s.cell, { width: '15%' }]}>{left?.percentual !== undefined ? String(left.percentual) : ''}</Text>
                <Text style={[s.cell, { width: '35%' }]}>{right?.conta_contrato || ''}</Text>
                <Text style={[s.cell, { width: '15%' }]}>{right?.percentual !== undefined ? String(right.percentual) : ''}</Text>
              </View>
            );
          })}
          <View style={s.row}>
            <Text style={[s.footLabel, { width: '85%' }]}>Somatória</Text>
            <Text style={[s.footTotal, { width: '15%' }]}>{fmtTotal(totalPercentual)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
