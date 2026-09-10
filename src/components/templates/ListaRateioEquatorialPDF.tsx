import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface ListaRateioEquatorialPDFProps {
  projectData?: Record<string, any>;
}

const PLACEHOLDER_MAP: Record<string, string> = {
  '{{conta_contrato}}': 'conta_contrato',
  '{{data_documento}}': 'data_documento',
  '{{modalidade_compensacao}}': 'modalidade_compensacao',
  '{{forma_alocacao_creditos}}': 'forma_alocacao_creditos',
};

function v(placeholder: string, projectData?: Record<string, any>): string {
  const fieldKey = PLACEHOLDER_MAP[`{{${placeholder}}}`];
  const raw = fieldKey && projectData ? projectData[fieldKey] : undefined;
  if (raw !== undefined && raw !== null && raw !== '') return String(raw);
  return '___';
}

const B = 1;
const BC = '#000000';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
    color: '#000000',
    lineHeight: 1.3,
  },
  tbl: { borderLeftWidth: B, borderColor: BC },
  row: { flexDirection: 'row' },
  lbl: {
    backgroundColor: '#FFFFFF', color: '#000000', fontFamily: 'Helvetica-Bold', fontSize: 9,
    paddingVertical: 2, paddingHorizontal: 8,
    borderTopWidth: B, borderRightWidth: B, borderBottomWidth: B, borderColor: BC,
  },
  lblFill: {
    backgroundColor: '#D9D9D9', color: '#000000', fontFamily: 'Helvetica-Bold', fontSize: 9,
    paddingVertical: 2, paddingHorizontal: 8,
    borderTopWidth: B, borderRightWidth: B, borderBottomWidth: B, borderColor: BC,
  },
  val: {
    backgroundColor: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center',
    paddingVertical: 2, paddingHorizontal: 8,
    borderTopWidth: B, borderRightWidth: B, borderBottomWidth: B, borderColor: BC,
  },
  head: {
    backgroundColor: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center',
    paddingVertical: 4, paddingHorizontal: 8, height: 20,
    borderTopWidth: B, borderRightWidth: B, borderBottomWidth: B, borderColor: BC,
  },
  cell: {
    backgroundColor: '#FFFFFF', fontSize: 9, textAlign: 'center',
    paddingVertical: 4, paddingHorizontal: 8, height: 20,
    borderTopWidth: B, borderRightWidth: B, borderBottomWidth: B, borderColor: BC,
  },
  green: { backgroundColor: '#4CAF50', color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  amber: { backgroundColor: '#FEF3C7', fontFamily: 'Helvetica-Bold' },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'center' },
  subtitle: { fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'center', marginTop: 3 },
});

export function ListaRateioEquatorialPDF({ projectData }: ListaRateioEquatorialPDFProps) {
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/images/logo-equatorial.png`
    : '/images/logo-equatorial.png';

  const formaAlocacao = String(projectData?.forma_alocacao_creditos || '');
  // Enquanto a forma de alocação ainda não foi escolhida, gera o PDF já com a
  // grade "Percentual do Excedente" vazia como padrão (mesma regra do preview).
  const isOrdem = formaAlocacao === 'Ordem de Prioridade';
  const isPercentual = !isOrdem;
  const beneficiarias: { conta_contrato: string; percentual?: number; ordem?: number }[] = Array.isArray(projectData?.rateio_beneficiarias)
    ? projectData.rateio_beneficiarias
    : [];
  const totalPercentual = beneficiarias.reduce((sum, b) => sum + (Number(b.percentual) || 0), 0);
  const ordenadas = isOrdem
    ? [...beneficiarias].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    : beneficiarias;

  const totalRows = 30;
  const emptyRows = Array.from({ length: Math.max(0, totalRows - beneficiarias.length) });

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ===== CABEÇALHO ===== */}
        <View style={[s.tbl, s.row]}>
          <View style={[s.val, { width: '20%', justifyContent: 'center', alignItems: 'center' }]}>
            <Image src={logoUrl} style={{ width: 90, height: 40, objectFit: 'contain' }} cache={false} />
          </View>
          <View style={[s.val, { width: '80%', justifyContent: 'center' }]}>
            <Text style={s.title}>LISTA DE RATEIO PARA AS UNIDADES CONSUMIDORAS PARTICIPANTES DO SISTEMA DE COMPENSAÇÃO</Text>
            <Text style={s.subtitle}>(Autoconsumo Remoto, Geração Compartilhada e EMUC)</Text>
          </View>
        </View>

        {/* ===== IDENTIFICAÇÃO ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <Text style={[s.lbl, { width: '32%' }]}>Conta Contrato da Unidade Geradora</Text>
            <Text style={[s.val, { width: '30%' }]}>{v('conta_contrato', projectData)}</Text>
            <Text style={[s.lbl, { width: '17%' }]}>Data solicitação</Text>
            <Text style={[s.val, { width: '21%' }]}>{v('data_documento', projectData)}</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.lblFill, { width: '32%' }]}>Enquadramento</Text>
            <Text style={[s.val, { width: '68%' }]}>{v('modalidade_compensacao', projectData)}</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.lblFill, { width: '32%' }]}>Forma de alocação dos créditos</Text>
            <Text style={[s.val, { width: '68%' }]}>{v('forma_alocacao_creditos', projectData)}</Text>
          </View>
        </View>

        {/* ===== TABELA DE RATEIO ===== */}
        <View style={{ marginTop: 14, marginLeft: 65 }}>
          {isPercentual && (
            <View style={[s.tbl, { width: 220 }]}>
              <View style={s.row}>
                <Text style={[s.head, { width: '50%' }]}>% Total</Text>
                <Text style={{ width: '50%', height: 20 }}></Text>
              </View>
              <View style={s.row}>
                <Text style={[s.cell, totalPercentual === 100 ? s.green : s.amber, { width: '50%' }]}>{String(totalPercentual)}</Text>
                <Text style={{ width: '50%', height: 20 }}></Text>
              </View>
              <View style={s.row}>
                <Text style={[s.head, { width: '50%' }]}>% do Excedente</Text>
                <Text style={[s.head, { width: '50%' }]}>Conta Contrato</Text>
              </View>
              {beneficiarias.map((b, i) => (
                <View style={s.row} key={i}>
                  <Text style={[s.cell, { width: '50%' }]}>{b.percentual !== undefined ? String(b.percentual) : ''}</Text>
                  <Text style={[s.cell, { width: '50%' }]}>{b.conta_contrato}</Text>
                </View>
              ))}
              {emptyRows.map((_, i) => (
                <View style={s.row} key={`empty-${i}`}>
                  <Text style={[s.cell, { width: '50%' }]}> </Text>
                  <Text style={[s.cell, { width: '50%' }]}> </Text>
                </View>
              ))}
            </View>
          )}

          {isOrdem && (
            <View style={[s.tbl, { width: 380 }]}>
              <View style={s.row}>
                <Text style={[s.head, { width: '30%' }]}>Conta Contrato</Text>
                <Text style={[s.head, { width: '35%' }]}>Classe de Consumo</Text>
                <Text style={[s.head, { width: '35%' }]}>Endereço</Text>
              </View>
              {ordenadas.map((b, i) => (
                <View style={s.row} key={i}>
                  <Text style={[s.cell, { width: '30%' }]}>{b.conta_contrato}</Text>
                  <Text style={[s.cell, { width: '35%' }]}> </Text>
                  <Text style={[s.cell, { width: '35%' }]}> </Text>
                </View>
              ))}
              {emptyRows.map((_, i) => (
                <View style={s.row} key={`empty-${i}`}>
                  <Text style={[s.cell, { width: '30%' }]}> </Text>
                  <Text style={[s.cell, { width: '35%' }]}> </Text>
                  <Text style={[s.cell, { width: '35%' }]}> </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
