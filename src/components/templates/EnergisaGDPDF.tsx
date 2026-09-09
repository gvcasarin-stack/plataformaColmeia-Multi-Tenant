import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getTotalKwpFromModulos, getTotalInversorKw } from '@/lib/utils/equipmentParser';

interface EnergisaGDPDFProps {
  projectData?: Record<string, any>;
}

const B = 0.75;
const BC = '#888888';
const COL = 100 / 12;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    color: '#000000',
  },
  title: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 2 },
  subtitle: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 10 },
  tbl: { borderTopWidth: B, borderLeftWidth: B, borderColor: BC, marginTop: 8 },
  row: { flexDirection: 'row' },
  bar: {
    backgroundColor: '#29ade0',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  lbl: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 3,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  lblGray: {
    backgroundColor: '#d9d9d9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 3,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  val: {
    backgroundColor: '#FFFFFF',
    fontSize: 7,
    padding: 3,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  valc: {
    backgroundColor: '#FFFFFF',
    fontSize: 7,
    padding: 3,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  sheetLabel: { fontSize: 7, color: '#888888', marginBottom: 2 },
  sig: { marginTop: 20, alignItems: 'center' },
  sigLine: { width: 200, borderTopWidth: 1, borderColor: '#111111', marginBottom: 3 },
  sigText: { fontSize: 7, fontFamily: 'Helvetica-Bold' },
});

// largura em % de N colunas de 12, para colSpan de tabelas 12-col
function w(cols: number) {
  return { width: `${COL * cols}%` as const };
}

export function EnergisaGDPDF({ projectData = {} }: EnergisaGDPDFProps) {
  const get = (key: string) => projectData[key] || '';

  const potenciaGeracaoKwp = getTotalKwpFromModulos(projectData) || parseFloat(String(get('potencia')).replace(',', '.')) || 0;
  const potenciaInversoresKw = getTotalInversorKw(projectData);

  return (
    <Document>
      {/* ══════════════════ Folha 1: Formulário de Orçamento de Conexão ══════════════════ */}
      <Page size="A4" style={s.page}>
        <Text style={s.sheetLabel}>Folha 1 de 6</Text>
        <Text style={s.title}>FORMULÁRIO DE ORÇAMENTO DE CONEXÃO</Text>
        <Text style={s.subtitle}>GERAÇÃO DISTRIBUÍDA</Text>

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Código do cliente (UC):</Text>
            <Text style={[s.valc, w(5)]}>{get('conta_contrato')}</Text>
            <Text style={[s.lbl, w(1)]}>Classe:</Text>
            <Text style={[s.valc, w(3)]}>{get('classe_uc')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Titular da UC:</Text>
            <Text style={[s.valc, w(9)]}>{get('nomeClienteFinal').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Logradouro:</Text>
            <Text style={[s.valc, w(9)]}>{get('endereco_local').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(1)]}>N°:</Text>
            <Text style={[s.valc, w(1)]}>{get('numero_endereco_cliente')}</Text>
            <Text style={[s.lbl, w(2)]}>Bairro:</Text>
            <Text style={[s.valc, w(2)]}>{get('bairro_cliente')}</Text>
            <Text style={[s.lbl, w(1)]}>UF:</Text>
            <Text style={[s.valc, w(1)]}>{get('client_state')}</Text>
            <Text style={[s.lbl, w(1)]}>CEP:</Text>
            <Text style={[s.valc, w(3)]}>{get('cliente_cep')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>E-mail:</Text>
            <Text style={[s.val, w(4)]}>{get('cliente_email')}</Text>
            <Text style={[s.lbl, w(2)]}>Cidade:</Text>
            <Text style={[s.valc, w(4)]}>{get('client_city')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Telefone:</Text>
            <Text style={[s.valc, w(4)]}>{get('cliente_telefone_fixo')}</Text>
            <Text style={[s.lbl, w(2)]}>Celular:</Text>
            <Text style={[s.valc, w(4)]}>{get('cliente_celular')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>CNPJ/CPF:</Text>
            <Text style={[s.valc, w(9)]}>{get('cpf_cnpj_cliente_final')}</Text>
          </View>

          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>2. DADOS DA UNIDADE CONSUMIDORA NO ATO DA VISTORIA - UC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(4)]}>Potência Instalada (kW):</Text>
            <Text style={[s.valc, w(2)]}>{potenciaInversoresKw ? potenciaInversoresKw.toFixed(0) : ''}</Text>
            <Text style={[s.lbl, w(4)]}>Tensão de Atendimento (V):</Text>
            <Text style={[s.valc, w(2)]}>{get('tensao_atendimento')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Tipo de Conexão:</Text>
            <Text style={[s.valc, w(9)]}>{get('tipo_conexao').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Tipo de Ramal:</Text>
            <Text style={[s.valc, w(9)]}>{get('tipo_ramal').toUpperCase()}</Text>
          </View>

          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>3. DADOS DA GERAÇÃO</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(5)]}>Potência Instalada de Geração (kWp):</Text>
            <Text style={[s.valc, w(7)]}>{potenciaGeracaoKwp ? potenciaGeracaoKwp.toFixed(2).replace('.', ',') : ''}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Tipo da Fonte de Geração:</Text>
            <Text style={[s.valc, w(3)]}>SOLAR FOTOVOLTAICA</Text>
            <Text style={[s.lbl, w(2)]}>Tipo de Geração:</Text>
            <Text style={[s.val, w(4)]}>Empregando conversor eletrônico/inversor</Text>
          </View>

          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>5. CONTATOS NA DISTRIBUIDORA</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lblGray, w(2)]}>Empresa</Text>
            <Text style={[s.valc, w(10)]}>Energisa</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lblGray, w(2)]}>Telefone</Text>
            <Text style={[s.valc, w(3)]}>0800 728 2891</Text>
            <Text style={[s.lbl, w(2)]}>E-mail:</Text>
            <Text style={[s.val, w(5)]}>geracaodistribuida.eto@energisa.com.br</Text>
          </View>

          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>6. DADOS DO RESPONSÁVEL TÉCNICO:</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Cliente/Procurador Legal:</Text>
            <Text style={[s.valc, w(9)]}>{get('responsavel_legal_nome').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Telefone</Text>
            <Text style={[s.valc, w(4)]}>{get('responsavel_legal_telefone')}</Text>
            <Text style={[s.lbl, w(2)]}>E-mail:</Text>
            <Text style={[s.val, w(4)]}>{get('responsavel_legal_email')}</Text>
          </View>
        </View>

        <View style={s.sig}>
          <View style={s.sigLine} />
          <Text style={s.sigText}>Assinatura do Responsável</Text>
        </View>
      </Page>
    </Document>
  );
}
