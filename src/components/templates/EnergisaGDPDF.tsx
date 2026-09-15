import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { getAllModulos, getAllInversores, getTotalKwpFromModulos, getTotalInversorKw, fmtBR } from '@/lib/utils/equipmentParser';

function imgUrl(path: string) {
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

interface EnergisaGDPDFProps {
  projectData?: Record<string, any>;
}

const B = 0.75;
const BC = '#aaaaaa';
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
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  docHeaderLogo: { width: 70, height: 36, objectFit: 'contain' },
  docHeaderTitles: { flex: 1, alignItems: 'center' },
  docHeaderSpacer: { width: 70 },
  chkTxt: {
    backgroundColor: '#FFFFFF',
    fontSize: 8,
    padding: 5,
    lineHeight: 1.4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  chkMark: {
    backgroundColor: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    padding: 5,
    textAlign: 'center',
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  hdrPlain: {
    backgroundColor: '#FFFFFF',
    color: '#111111',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    padding: 3,
    textAlign: 'center',
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  bar2: {
    backgroundColor: '#f2b48a',
    color: '#1a1a1a',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 4,
    textAlign: 'center',
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  redCell: {
    backgroundColor: '#c0392b',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: 4,
    textAlign: 'center',
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  subhead: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#E07B18', marginTop: 8, marginBottom: 3 },
  sectionTitle: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 11, marginTop: 6, marginBottom: 3 },
  paragraph: { fontSize: 8, lineHeight: 1.4, textAlign: 'justify', marginBottom: 4 },
  h3: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', textDecoration: 'underline', marginTop: 5, marginBottom: 2 },
  hdrOrange: {
    backgroundColor: '#FFFFFF',
    color: '#E07B18',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    padding: 3,
    textAlign: 'center',
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  v6Tag: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', marginTop: 2 },
});

// largura em % de N colunas de 16, para a tabela da Folha 4 (grid 16 colunas)
function w16(cols: number) {
  return { width: `${(100 / 16) * cols}%` as const };
}

// largura em % de N colunas de 12, para colSpan de tabelas 12-col
function w(cols: number) {
  return { width: `${COL * cols}%` as const };
}

const MESES_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
// data_documento vem em DD/MM/AAAA (ou por extenso) — usado só para derivar mês/ano
// da "Previsão de ligação" da folha 4, mesmo padrão de parsing da pré-visualização.
function parseMesAno(raw: string): { mes: string; ano: string } {
  const str = String(raw || '').trim();
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return { mes: MESES_PT[parseInt(m[2], 10) - 1] || '', ano: m[3] };
  m = str.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})$/i);
  if (m) {
    const idx = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'].indexOf(m[2]);
    if (idx !== -1) return { mes: MESES_PT[idx], ano: m[3] };
  }
  return { mes: '', ano: '' };
}

function buildChecklistSecoes(isPessoaJuridica: boolean): { titulo: string; itens: [string, string][] }[] {
  return [
    {
      titulo: '1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA (UC)',
      itens: [
        ['1-Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021;', 'X'],
        ['1.1-Pessoa jurídica, apresentação dos documentos relativos à sua constituição, ao seu registro e dos seus representantes legais;', isPessoaJuridica ? 'X' : ''],
        ['1.2-Pessoa física, apresentação de: a) Cadastro de Pessoa Física – CPF, desde que não esteja em situação cadastral cancelada ou anulada de acordo com instrução normativa da Receita Federal; e b) Carteira de Identidade ou outro documento de identificação oficial com foto e, no caso de indígenas, podendo ser apenas o Registro Administrativo de Nascimento Indígena – RANI;', isPessoaJuridica ? '' : 'X'],
        ['1.3-Endereço das instalações (ou número de identificação das instalações já existentes) e o endereço ou meio de comunicação para entrega da fatura, das correspondências e das notificações;', 'X'],
        ['1.4-Declaração descritiva da carga instalada;', 'X'],
        ['1.5-Informação das cargas que possam provocar perturbações no sistema de distribuição;', 'X'],
        ['1.6-Informação e documentação das atividades desenvolvidas nas instalações;', 'X'],
        ['1.7-Apresentação de licença ou declaração emitida pelo órgão competente caso as instalações ou a extensão de rede de responsabilidade do consumidor e demais usuários ocuparem áreas protegidas pela legislação, tais como unidades de conservação, reservas legais, áreas de preservação permanente, territórios indígenas e quilombolas;', 'X'],
        ['1.8-Documento, com data, que comprove a propriedade ou posse do imóvel onde será implantada a central geradora ou, no caso de unidade flutuante, autorização, licença ou documento equivalente emitido pelas autoridades competentes;', 'X'],
        ['1.9-Indicação de um ponto de conexão de interesse, da tensão de conexão, do número de fases e das características de qualidade desejadas, que devem ser objeto da análise de viabilidade e de custos pela distribuidora. (Opcional)', 'X'],
      ],
    },
    {
      titulo: '2. Documentação Técnica',
      itens: [
        ['2.1-Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, que identifique o número do registro válido e o nome do responsável técnico, o local da obra ou serviço e as atividades profissionais desenvolvidas, caso seja exigível na legislação específica e na forma prevista nessa legislação.', 'X'],
        ['2.2-Indicação do local do padrão ou da subestação de entrada no imóvel, exclusivamente nos casos em que ainda não estiverem instalados ou houver previsão de necessidade de aprovação prévia de projeto na norma técnica da distribuidora', 'X'],
        ['2.3-Diagrama unifilar e de blocos e memorial descritivo do sistema de geração e proteção;', 'X'],
        ['2.4-Relatório de ensaio, em língua portuguesa, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão com a rede, sempre que houver a utilização de conversores.', 'X'],
        ['2.5-Dados necessários ao registro da central geradora distribuída conforme disponível no site da ANEEL', 'X'],
        ['2.6-Lista de unidades consumidoras participantes do sistema de compensação, indicando o percentual ou a ordem de utilização dos excedentes. (Opcional)', ''],
        ['2.7-Cópia de instrumento jurídico que comprove a participação dos integrantes para os casos de múltiplas unidades consumidoras e geração compartilhada. (Caso aplicável)', ''],
        ['2.8-Documento que comprove o reconhecimento, pela ANEEL, da cogeração qualificada (Caso aplicável)', ''],
        ['2.9-Dados de segurança das barragens no caso do uso de sistemas com fontes hídricas, conforme Resolução Normativa nº 696/2015. (Caso aplicável)', ''],
        ['2.10-Para centrais fotovoltaicas enquadradas como despacháveis, comprovação de que o sistema de armazenamento atende o disposto no art. 655-B da Resolução Normativa nº 1.000/2021. (Caso aplicável)', ''],
        ['2.11-Documento que comprove o aporte da Garantia de Fiel Cumprimento, se aplicável, conforme previsto no art. 655-C da Resolução Normativa nº 1.000/2021. (Caso aplicável)', ''],
      ],
    },
    {
      titulo: '3. SOLICITAÇÕES E DECLARAÇÕES',
      itens: [
        ['3.1-Deseja que a vistoria seja realizada após a aprovação desta solicitação de orçamento de conexão (projeto elétrico de GD)? Não: Neste caso, a vistoria deverá ser solicitada pelo responsável técnico, por meio do AWGPE, após a implantação do sistema de geração; Sim: Caso o sistema de geração já esteja implantado. Obs.: Caso a vistoria seja reprovada devido o sistema não está instalado, a solicitação de orçamento estará passível de indeferimento.', 'NÃO'],
        ['3.2-Deseja renunciar o direito de desistir do orçamento de conexão nos termos dos §§ 7º e 8º do art. 89 da Resolução Normativa nº 1.000/2021?', 'X'],
        ['3.3-Deseja autorizar a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade?', 'X'],
        ['3.4-Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da Associação Brasileira de Normas Técnicas - ABNT e às normas dos órgãos oficiais competentes, e ao art. 8º da Lei nº9.074, de 1995, naquilo que for aplicável. (Obrigatório)', 'X'],
      ],
    },
  ];
}

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

export function EnergisaGDPDF({ projectData = {} }: EnergisaGDPDFProps) {
  const get = (key: string) => projectData[key] || '';

  const potenciaGeracaoKwp = getTotalKwpFromModulos(projectData) || parseFloat(String(get('potencia')).replace(',', '.')) || 0;
  const potenciaInversoresKw = getTotalInversorKw(projectData);
  const isPessoaJuridica = get('cpf_cnpj_cliente_final').replace(/\D/g, '').length > 11;
  const checklistSecoes = buildChecklistSecoes(isPessoaJuridica);
  const previsaoLigacao = parseMesAno(get('data_documento'));

  const modulosList = getAllModulos(projectData);
  const inversoresList = getAllInversores(projectData);
  const areaTotalArranjos = modulosList.reduce((acc, m) => {
    const areaUnit = parseFloat(String(m.area_unitaria_m2 || '0').replace(',', '.')) || 0;
    const qty = parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0;
    return acc + areaUnit * qty;
  }, 0);

  return (
    <Document>
      {/* ══════════════════ Folha 1: Formulário de Orçamento de Conexão ══════════════════ */}
      <Page size="A4" style={s.page}>
        <Text style={s.sheetLabel}>Folha 1 de 6</Text>
        <DocHeader title="FORMULÁRIO DE ORÇAMENTO DE CONEXÃO" subtitle="GERAÇÃO DISTRIBUÍDA" />

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Código do cliente (UC):</Text>
            <Text style={[s.valc, w(6)]}>{get('conta_contrato')}</Text>
            <Text style={[s.lbl, w(1)]}>Classe:</Text>
            <Text style={[s.valc, w(3)]}>{get('classe_uc')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Titular da UC:</Text>
            <Text style={[s.valc, w(10)]}>{get('nomeClienteFinal').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Logradouro:</Text>
            <Text style={[s.valc, w(10)]}>{get('endereco_local').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>N°:</Text>
            <Text style={[s.valc, w(1)]}>{get('numero_endereco_cliente')}</Text>
            <Text style={[s.lbl, w(1)]}>Bairro:</Text>
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
            <Text style={[s.lbl, w(2)]}>CNPJ/CPF:</Text>
            <Text style={[s.valc, w(10)]}>{get('cpf_cnpj_cliente_final')}</Text>
          </View>

          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>2. DADOS DA UNIDADE CONSUMIDORA NO ATO DA VISTORIA - UC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Potência Instalada (kW):</Text>
            <Text style={[s.valc, w(3)]}>{potenciaInversoresKw ? potenciaInversoresKw.toFixed(0) : ''}</Text>
            <Text style={[s.lbl, w(4)]}>Tensão de Atendimento (V):</Text>
            <Text style={[s.valc, w(2)]}>{get('tensao_atendimento')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Tipo de Conexão:</Text>
            <Text style={[s.valc, w(3)]}>{get('tipo_conexao').toUpperCase()}</Text>
            <Text style={[s.val, w(6), { backgroundColor: '#c9c9c9' }]}></Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Tipo de Ramal:</Text>
            <Text style={[s.valc, w(3)]}>{get('tipo_ramal').toUpperCase()}</Text>
            <Text style={[s.val, w(6), { backgroundColor: '#c9c9c9' }]}></Text>
          </View>

          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>3. DADOS DA GERAÇÃO</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(3)]}>Potência Instalada de Geração (kWp):</Text>
            <Text style={[s.valc, w(9)]}>{potenciaGeracaoKwp ? potenciaGeracaoKwp.toFixed(2).replace('.', ',') : ''}</Text>
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
            <Text style={[s.lbl, w(3)]}>Responsável/Área:</Text>
            <Text style={[s.valc, w(2)]}>DCMD/COPC</Text>
            <Text style={[s.lblGray, w(2), { textAlign: 'center' }]}>LINK GISA</Text>
            <Text style={[s.valc, w(5)]}>https://l.ead.me/bbThiX</Text>
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
          <View style={s.row} wrap={false}>
            <Text style={[s.v6Tag, { width: '100%', borderBottomWidth: 0 }]}>V6</Text>
          </View>
        </View>

        <View style={s.sig}>
          <View style={s.sigLine} />
          <Text style={s.sigText}>Assinatura do Responsável</Text>
        </View>
      </Page>

      {/* ══════════════════ Folha 2: Relação de Carga e Cálculo de Demanda ══════════════════ */}
      <Page size="A4" style={s.page}>
        <Text style={s.sheetLabel}>Folha 2 de 6</Text>
        <DocHeader title="FORMULÁRIO DE RELAÇÃO DE CARGA" subtitle="E CÁLCULO DE DEMANDA" />

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w(12)]}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Código do cliente (UC):</Text>
            <Text style={[s.valc, w(6)]}>{get('conta_contrato')}</Text>
            <Text style={[s.lbl, w(1)]}>Classe:</Text>
            <Text style={[s.valc, w(3)]}>{get('classe_uc')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Titular da UC:</Text>
            <Text style={[s.valc, w(10)]}>{get('nomeClienteFinal').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Logradouro:</Text>
            <Text style={[s.valc, w(10)]}>{get('endereco_local').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>N°:</Text>
            <Text style={[s.valc, w(1)]}>{get('numero_endereco_cliente')}</Text>
            <Text style={[s.lbl, w(2)]}>Bairro:</Text>
            <Text style={[s.valc, w(3)]}>{get('bairro_cliente')}</Text>
            <Text style={[s.lbl, w(2)]}>Cidade:</Text>
            <Text style={[s.val, w(2)]}>{get('client_city')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>E-mail:</Text>
            <Text style={[s.val, w(4)]}>{get('cliente_email')}</Text>
            <Text style={[s.lbl, w(1)]}>UF:</Text>
            <Text style={[s.valc, w(1)]}>{get('client_state')}</Text>
            <Text style={[s.lbl, w(1)]}>CEP:</Text>
            <Text style={[s.valc, w(3)]}>{get('cliente_cep')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>Telefone:</Text>
            <Text style={[s.val, w(3)]}>{get('cliente_telefone_fixo')}</Text>
            <Text style={[s.lbl, w(2)]}>Celular:</Text>
            <Text style={[s.val, w(5)]}>{get('cliente_celular')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w(2)]}>CNPJ/CPF:</Text>
            <Text style={[s.valc, w(10)]}>{get('cpf_cnpj_cliente_final')}</Text>
          </View>
        </View>

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, { width: '12%' }]}>QUANTIDADE</Text>
            <Text style={[s.bar, { width: '26%' }]}>EQUIPAMENTO</Text>
            <Text style={[s.bar, { width: '16%' }]}>POT. INSTALADA UND (W)</Text>
            <Text style={[s.bar, { width: '18%' }]}>POTÊNCIA TOTAL (kW)</Text>
            <Text style={[s.bar, { width: '14%' }]}>FATOR DE DEMANDA</Text>
            <Text style={[s.bar, { width: '14%' }]}>DEMANDA (kW)</Text>
          </View>
          {Array.from({ length: 16 }).map((_, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={[s.val, { width: '12%' }]}> </Text>
              <Text style={[s.val, { width: '26%' }]}></Text>
              <Text style={[s.val, { width: '16%' }]}></Text>
              <Text style={[s.val, { width: '18%' }]}></Text>
              <Text style={[s.val, { width: '14%' }]}></Text>
              <Text style={[s.val, { width: '14%' }]}></Text>
            </View>
          ))}
          <View style={s.row} wrap={false}>
            <Text style={[s.val, { width: '12%', borderRightWidth: 0 }]}></Text>
            <Text style={[s.val, { width: '26%', borderRightWidth: 0 }]}></Text>
            <Text style={[s.lbl, { width: '16%', textAlign: 'center' }]}>TOTAL</Text>
            <Text style={[s.valc, { width: '18%' }]}></Text>
            <Text style={[s.lbl, { width: '14%', textAlign: 'center' }]}>TOTAL</Text>
            <Text style={[s.valc, { width: '14%' }]}></Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.v6Tag, { width: '100%', borderBottomWidth: 0 }]}>V6</Text>
          </View>
        </View>

        <View style={s.sig}>
          <View style={s.sigLine} />
          <Text style={s.sigText}>Assinatura do Projetista</Text>
        </View>
      </Page>

      {/* ══════════════════ Folha 3: Checklist/Declarações ══════════════════ */}
      <Page size="A4" style={s.page}>
        <Text style={s.sheetLabel}>Folha 3 de 6</Text>
        <DocHeader title="FORMULÁRIO DE ORÇAMENTO DE CONEXÃO" subtitle="GERAÇÃO DISTRIBUÍDA" />

        <View style={s.tbl}>
          {checklistSecoes.map((secao) => (
            <View key={secao.titulo}>
              <View style={s.row} wrap={false}>
                <Text style={[s.bar, { width: '100%' }]}>{secao.titulo}</Text>
              </View>
              {secao.itens.map(([texto, marca]) => (
                <View key={texto} style={s.row} wrap={false}>
                  <Text style={[s.chkTxt, { width: '88%' }]}>{texto}</Text>
                  <Text style={[s.chkMark, { width: '12%' }]}>{marca || ' '}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </Page>

      {/* ══════════════════ Folha 4: Memorial Descritivo UFV-Solar ══════════════════ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.sheetLabel}>Folha 4 de 6</Text>
        <View style={s.docHeader}>
          <Image src={imgUrl('/images/logo-grupo-energisa.png')} style={s.docHeaderLogo} />
          <View style={s.docHeaderTitles}>
            <Text style={s.title}>MEMORIAL DESCRITIVO DE GERAÇÃO DISTRIBUÍDA UFV-SOLAR</Text>
          </View>
          <View style={s.docHeaderSpacer} />
        </View>

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, w16(16)]}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2)]}>Código do cliente (UC):</Text>
            <Text style={[s.valc, w16(5)]}>{get('conta_contrato')}</Text>
            <Text style={[s.lbl, w16(2)]}>Classe:</Text>
            <Text style={[s.valc, w16(2)]}>{get('classe_uc')}</Text>
            <Text style={[s.lbl, w16(2)]}>CNPJ/CPF:</Text>
            <Text style={[s.valc, w16(3)]}>{get('cpf_cnpj_cliente_final')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2)]}>Titular da UC:</Text>
            <Text style={[s.valc, w16(14)]}>{get('nomeClienteFinal').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2)]}>Logradouro:</Text>
            <Text style={[s.valc, w16(14)]}>{get('endereco_local').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2)]}>N°:</Text>
            <Text style={[s.valc, w16(1)]}>{get('numero_endereco_cliente')}</Text>
            <Text style={[s.lbl, w16(2)]}>Bairro:</Text>
            <Text style={[s.valc, w16(3)]}>{get('bairro_cliente')}</Text>
            <Text style={[s.lbl, w16(2)]}>Cidade:</Text>
            <Text style={[s.valc, w16(6)]}>{get('client_city')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2)]}>E-mail:</Text>
            <Text style={[s.val, w16(6)]}>{get('cliente_email')}</Text>
            <Text style={[s.lbl, w16(1)]}>UF:</Text>
            <Text style={[s.valc, w16(1)]}>{get('client_state')}</Text>
            <Text style={[s.val, w16(1)]}></Text>
            <Text style={[s.lbl, w16(2)]}>CEP:</Text>
            <Text style={[s.val, w16(3)]}>{get('cliente_cep')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2)]}>Telefone:</Text>
            <Text style={[s.val, w16(3)]}>{get('cliente_telefone_fixo')}</Text>
            <Text style={[s.lbl, w16(1)]}>Celular:</Text>
            <Text style={[s.val, w16(3)]}>{get('cliente_celular')}</Text>
            <Text style={[s.val, w16(2)]}></Text>
            <Text style={[s.lbl, w16(3), { textAlign: 'center' }]}>N° de fases:</Text>
            <Text style={[s.lbl, w16(2), { textAlign: 'center' }]}>Ramal:</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2), { textAlign: 'center' }]}>Tipo do Padrão:</Text>
            <Text style={[s.lbl, w16(4), { textAlign: 'center' }]}>Nível de tensão (V):</Text>
            <Text style={[s.lbl, w16(5), { textAlign: 'center', color: '#e00000', backgroundColor: '#F7F0DA' }]}>Potência Máxima Disponibilizada (kW):</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.valc, w16(2)]}>{get('tipo_conexao').toUpperCase()}</Text>
            <Text style={[s.valc, w16(4)]}>{get('tensao_atendimento')}</Text>
            <Text style={[s.valc, w16(5), { backgroundColor: '#F7F0DA' }]}>{get('potencia_disponibilizada_kw')}</Text>
            <Text style={[s.valc, w16(3)]}>{get('numero_fases') || '1'}</Text>
            <Text style={[s.valc, w16(2)]}>{get('tipo_ramal').toUpperCase()}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2), { textAlign: 'center' }]}>Disjuntor geral (A):</Text>
            <Text style={[s.lbl, w16(4), { textAlign: 'center' }]}>Fator de Potência:</Text>
            <Text style={[s.lbl, w16(3), { textAlign: 'center' }]}>Demanda Contratada (kW):</Text>
            <Text style={[s.hdrPlain, w16(2)]}>DPS CA (kA)</Text>
            <Text style={[s.hdrPlain, w16(2)]}>DISJUNTOR CA</Text>
            <Text style={[s.hdrPlain, w16(2)]}>DPS CC (kA)</Text>
            <Text style={[s.hdrPlain, w16(1)]}>DISJUNTOR CC</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.valc, w16(2)]}>{get('disjuntor_corrente_a')}</Text>
            <Text style={[s.valc, w16(4)]}>{get('inversores_fator_potencia')}</Text>
            <Text style={[s.valc, w16(3)]}>{get('carga_declarada_kw')}</Text>
            <Text style={[s.valc, w16(2)]}>{get('dps_ca_ka')}</Text>
            <Text style={[s.valc, w16(2)]}>{get('disjuntor_ca_corrente_a')}</Text>
            <Text style={[s.valc, w16(2)]}>{get('dps_cc_ka')}</Text>
            <Text style={[s.valc, w16(1)]}>{get('disjuntor_cc_corrente_a')}</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, w16(2), { textAlign: 'center' }]}>Modalidade:</Text>
            <Text style={[s.lbl, w16(2), { textAlign: 'center' }]}>Potência Trafo:</Text>
            <Text style={[s.lbl, w16(2), { textAlign: 'center' }]}>Nº de hastes:</Text>
            <Text style={[s.lbl, w16(3), { textAlign: 'center' }]}>Demanda Contratada (kWg):</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.valc, w16(2)]}>{get('modalidade_compensacao')}</Text>
            <Text style={[s.valc, w16(2)]}>{get('potencia_trafo')}</Text>
            <Text style={[s.valc, w16(2)]}>{get('numero_hastes')}</Text>
            <Text style={[s.valc, w16(3)]}>{get('carga_declarada_kw')}</Text>
          </View>
          <View style={[s.row, { alignItems: 'stretch' }]} wrap={false}>
            <View style={[s.lbl, w16(6), { justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Coordenadas do padrão de entrada em UTM:</Text>
            </View>
            <View style={[w16(10), { flexDirection: 'column' }]}>
              <View style={s.row}>
                <Text style={[s.lbl, { width: '30%', textAlign: 'center' }]}>FUSO</Text>
                <Text style={[s.lbl, { width: '40%', textAlign: 'center' }]}>X (LONG)</Text>
                <Text style={[s.lbl, { width: '30%', textAlign: 'center' }]}>Y (LAT)</Text>
              </View>
              <View style={s.row}>
                <Text style={[s.valc, { width: '30%' }]}>{get('coord_utm_fuso') || ' '}</Text>
                <Text style={[s.valc, { width: '40%' }]}>{get('coord_utm_x') || ' '}</Text>
                <Text style={[s.valc, { width: '30%' }]}>{get('coord_utm_y') || ' '}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.tbl}>
          <View style={[s.row, { alignItems: 'stretch' }]} wrap={false}>
            <View style={[s.hdrOrange, { width: '10.09%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Tipo Tensão:</Text>
            </View>
            <View style={[s.hdrOrange, { width: '10.09%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Cabos por fase:</Text>
            </View>
            <View style={[s.hdrOrange, { width: '12%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Potência De Geração (kW):</Text>
            </View>
            <View style={[s.hdrOrange, { width: '5.32%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Bitola Fase:</Text>
            </View>
            <View style={[s.hdrOrange, { width: '18.75%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Bitola Neutro:</Text>
            </View>
            <View style={[s.hdrOrange, { width: '12.75%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Bitola Terra:</Text>
            </View>
            <View style={[s.hdrOrange, { width: '12.25%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Sistema GD já instalado?</Text>
            </View>
            <View style={{ width: '12%', flexDirection: 'column' }}>
              <Text style={[s.hdrOrange, { width: '100%' }]}>Previsão de ligação (Mês)</Text>
              <View style={s.row}>
                <Text style={[s.hdrOrange, { width: '50%' }]}>Mês:</Text>
                <Text style={[s.hdrOrange, { width: '50%' }]}>Ano:</Text>
              </View>
            </View>
            <View style={[s.hdrOrange, { width: '6.75%', justifyContent: 'center' }]}>
              <Text style={{ textAlign: 'center' }}>Zona:</Text>
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.valc, { width: '10.09%', fontFamily: 'Helvetica-Bold' }]}>BAIXA</Text>
            <Text style={[s.valc, { width: '10.09%' }]}>{get('cabos_por_fase') || '1'}</Text>
            <Text style={[s.valc, { width: '12%', fontFamily: 'Helvetica-Bold' }]}>{fmtBR(getTotalInversorKw(projectData))}</Text>
            <Text style={[s.valc, { width: '5.32%' }]}>{get('secao_fase_mm2') || ' '}</Text>
            <Text style={[s.valc, { width: '18.75%' }]}>{get('secao_neutro_mm2') || ' '}</Text>
            <Text style={[s.valc, { width: '12.75%' }]}>{get('secao_aterramento_mm2') || ' '}</Text>
            <Text style={[s.valc, { width: '12.25%', fontFamily: 'Helvetica-Bold' }]}>NÃO</Text>
            <Text style={[s.valc, { width: '6%' }]}>{previsaoLigacao.mes || ' '}</Text>
            <Text style={[s.valc, { width: '6%' }]}>{previsaoLigacao.ano || ' '}</Text>
            <Text style={[s.valc, { width: '6.75%', fontFamily: 'Helvetica-Bold' }]}>URBANO</Text>
          </View>
        </View>

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.lbl, { width: '10.09%', textAlign: 'center' }]}>Observações:</Text>
            <Text style={[s.val, { width: '89.91%', minHeight: 40 }]}></Text>
          </View>
        </View>
        <Text style={s.v6Tag}>V6</Text>

        {/* Moldura fina (borda esquerda/direita) ao redor de toda a seção 2, igual ao
            artifact de referência ("section2-frame") — mesma espessura sutil (B) dos
            demais traços da tabela, estendendo até depois da assinatura. */}
        <View style={{ borderLeftWidth: B, borderRightWidth: B, borderColor: '#000000' }}>
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, { width: '100%' }]}>2. CARACTERÍSTICAS DA GERAÇÃO DA UNIDADE CONSUMIDORA</Text>
          </View>
        </View>
        <Text style={s.subhead}>Estrutura dos painéis utilizados na usina:</Text>
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.hdrPlain, { width: '6%' }]}>N°</Text>
            <Text style={[s.hdrPlain, { width: '8%' }]}>Qtd.</Text>
            <Text style={[s.hdrPlain, { width: '22%' }]}>Fabricante</Text>
            <Text style={[s.hdrPlain, { width: '26%' }]}>Modelo dos painéis</Text>
            <Text style={[s.hdrPlain, { width: '14%' }]}>Área total do arranjo (M²)</Text>
            <Text style={[s.hdrPlain, { width: '12%' }]}>Potência (kW)</Text>
            <Text style={[s.hdrPlain, { width: '12%' }]}>Subtotal (kW)</Text>
          </View>
          {Array.from({ length: Math.max(modulosList.length, 5) }).map((_, i) => {
            const m = modulosList[i];
            const unitKw = m ? parseFloat(String(m.potencia_wp || '0').replace(',', '.')) / 1000 : 0;
            const qty = m ? parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0 : 0;
            const areaLinha = m ? (parseFloat(String(m.area_unitaria_m2 || '0').replace(',', '.')) || 0) * qty : 0;
            return (
              <View key={i} style={s.row} wrap={false}>
                <Text style={[s.valc, { width: '6%' }]}>{m ? i + 1 : ' '}</Text>
                <Text style={[s.valc, { width: '8%' }]}>{m ? qty : ' '}</Text>
                <Text style={[s.valc, { width: '22%' }]}>{m?.fabricante || ' '}</Text>
                <Text style={[s.valc, { width: '26%' }]}>{m?.modelo || ' '}</Text>
                <Text style={[s.valc, { width: '14%' }]}>{m ? fmtBR(areaLinha) : ' '}</Text>
                <Text style={[s.valc, { width: '12%' }]}>{m ? fmtBR(unitKw) : ' '}</Text>
                <Text style={[s.valc, { width: '12%' }]}>{m ? fmtBR(unitKw * qty) : ' '}</Text>
              </View>
            );
          })}
          <View style={s.row} wrap={false}>
            <Text style={[s.val, { width: '62%' }]}></Text>
            <Text style={[s.lbl, { width: '14%', textAlign: 'center' }]}>Área Total: {fmtBR(areaTotalArranjos)}m²</Text>
            <Text style={[s.lbl, { width: '24%', textAlign: 'center' }]}>Potência Total (kW): {fmtBR(getTotalKwpFromModulos(projectData))}</Text>
          </View>
        </View>

        <Text style={s.subhead}>Estrutura do(s) inversor(es) utilizado(s) na usina:</Text>
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.hdrPlain, { width: '6%' }]}>N°</Text>
            <Text style={[s.hdrPlain, { width: '8%' }]}>Qtd.</Text>
            <Text style={[s.hdrPlain, { width: '22%' }]}>Fabricante</Text>
            <Text style={[s.hdrPlain, { width: '26%' }]}>Modelo do(s) inversor(es)</Text>
            <Text style={[s.hdrPlain, { width: '13%' }]}>Potência (kW)</Text>
            <Text style={[s.hdrPlain, { width: '13%' }]}>Subtotal (kW)</Text>
            <Text style={[s.hdrPlain, { width: '12%' }]}>Tensão nominal (V)</Text>
          </View>
          {Array.from({ length: Math.max(inversoresList.length, 5) }).map((_, i) => {
            const inv = inversoresList[i];
            const unitKw = inv ? parseFloat(String(inv.potencia || '0').replace(',', '.')) : 0;
            const qty = inv ? parseFloat(String(inv.quantidade || '0').replace(',', '.')) || 0 : 0;
            return (
              <View key={i} style={s.row} wrap={false}>
                <Text style={[s.valc, { width: '6%' }]}>{inv ? i + 1 : ' '}</Text>
                <Text style={[s.valc, { width: '8%' }]}>{inv ? qty : ' '}</Text>
                <Text style={[s.valc, { width: '22%' }]}>{inv?.fabricante || ' '}</Text>
                <Text style={[s.valc, { width: '26%' }]}>{inv?.modelo || ' '}</Text>
                <Text style={[s.valc, { width: '13%' }]}>{inv ? fmtBR(unitKw) : ' '}</Text>
                <Text style={[s.valc, { width: '13%' }]}>{inv ? fmtBR(unitKw * qty) : ' '}</Text>
                <Text style={[s.valc, { width: '12%' }]}>{inv?.tensao || ' '}</Text>
              </View>
            );
          })}
          <View style={s.row} wrap={false}>
            <Text style={[s.val, { width: '75%' }]}></Text>
            <Text style={[s.lbl, { width: '25%', textAlign: 'center' }]}>Potência Total (kW): {fmtBR(getTotalInversorKw(projectData))}</Text>
          </View>
        </View>

        <View style={[s.tbl, { marginTop: 10 }]}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, { width: '62%' }]}>NECESSITA DE AUTOTRAFO OU DE TRANSFORMADOR DE ACOPLAMENTO?</Text>
            <Text style={[s.redCell, { width: '14%' }]}>{get('necessita_autotrafo') || ' '}</Text>
            <Text style={{ width: '24%' }}></Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={{ width: '50%' }}></Text>
            <Text style={[s.lbl, { width: '12%', textAlign: 'right' }]}>POTÊNCIA:</Text>
            <Text style={[s.val, { width: '14%' }]}>{get('potencia_autotrafo')}</Text>
            <Text style={{ width: '24%' }}></Text>
          </View>
        </View>

        <View style={[s.tbl, { marginTop: 8 }]}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, { width: '62%' }]}>ATENDIMENTO COM TRAFO EXCLUSIVO (GRUPO &quot;A&quot; E CONSUMIDORES RURAIS)?</Text>
            <Text style={[s.redCell, { width: '14%' }]}>{get('atendimento_trafo_exclusivo') || ' '}</Text>
            <Text style={{ width: '24%' }}></Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={{ width: '50%' }}></Text>
            <Text style={[s.lbl, { width: '12%', textAlign: 'right' }]}>POTÊNCIA:</Text>
            <Text style={[s.val, { width: '14%' }]}>{get('potencia_trafo_exclusivo')}</Text>
            <Text style={{ width: '24%' }}></Text>
          </View>
        </View>

        <View style={s.sig}>
          <View style={s.sigLine} />
          <Text style={s.sigText}>Assinatura do Projetista</Text>
        </View>
        <View style={{ marginTop: 15, borderTopWidth: B, borderColor: '#000000' }} />
        </View>
      </Page>

      {/* ══════════════════ Folha 5: Ajustes de Proteções / Requisitos de Segurança ══════════════════ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.sheetLabel}>Folha 5 de 6</Text>

        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, { width: '100%' }]}>3. AJUSTES RECOMENDADOS DAS PROTEÇÕES - PARAMETRIZAÇÕES DO INVERSOR</Text>
          </View>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar2, { width: '44%' }]}>DESCRIÇÃO</Text>
            <Text style={[s.bar2, { width: '28%' }]}>PARÂMETROS</Text>
            <Text style={[s.bar2, { width: '28%' }]}>TEMPO DE ATUAÇÃO</Text>
          </View>
          {[
            ['Tensão no ponto de Conexão:', 'V < 80% (0,8 PU) Vn', 'Desligar em 0,2 s', '#f2b48a'],
            ['Tensão no ponto de Conexão:', 'V > 110% (1,1 PU) Vn', 'Desligar em 0,2 s', '#f6dcc3'],
            ['Regime Normal de Operação:', '80% <= V <= 110%', 'Condições normais', '#f2b48a'],
            ['Subfrequência:', 'f < 57,5 HZ', 'Desligar em até 0,2 s', '#f6dcc3'],
            ['Sobrefrequência:', 'f > 62,0 HZ', 'Desligar em 0,2 s', '#f2b48a'],
            ['Frequência Nominal da Rede:', 'f = 60 HZ', 'Condições normais', '#f6dcc3'],
            ['Após a perda da rede (ilhamento), deverá interromper o fornecimento de energia à rede:', 'Ilhamento', 'Interromper em até 2s', '#f2b48a'],
            ['Após a retomada das condições normais de tensão e frequência da rede, religar:', 'Reconexão', 'Após 180s', '#f6dcc3'],
          ].map((row, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={[s.val, { width: '44%', backgroundColor: row[3] }]}>{row[0]}</Text>
              <Text style={[s.valc, { width: '28%', backgroundColor: row[3] }]}>{row[1]}</Text>
              <Text style={[s.valc, { width: '28%', backgroundColor: row[3] }]}>{row[2]}</Text>
            </View>
          ))}
        </View>

        <View style={[s.tbl, { marginTop: 8 }]}>
          <View style={s.row} wrap={false}>
            <Text style={[s.bar, { width: '100%' }]}>4. REQUISITOS DE SEGURANÇA</Text>
          </View>
        </View>

        <Text style={s.paragraph}>
          O projeto deve ser elaborado atendendo todos os requisitos de segurança solicitado no item 10 da NDU013 e NDU015. Para os sistemas de Geração Distribuída, é necessária a instalação de dispositivo de proteção contra surto (DPS) devidamente projetado e de acordo com as indicações estabelecidas na ABNT NBR 5419:2015 e os diagramas, conforme Desenhos NDU013.
        </Text>
        <Text style={s.h3}>4.1 Variações de Tensão e Fequência</Text>
        <Text style={s.paragraph}>
          Condições anormais de operação podem surgir na rede elétrica e requerem uma resposta do sistema de Geração Distribuída conectado a essa rede. Esta resposta é para garantir a segurança das equipes de manutenção da rede e das pessoas em geral, bem como para evitar danos aos equipamentos conectados à rede, incluindo o sistema de geração distribuída.
        </Text>
        <Text style={s.h3}>4.2 Proteção Anti-Ilhamento</Text>
        <Text style={s.paragraph}>
          Na ocorrência de uma eventual falta na rede da Energisa durante a operação de paralelismo, o sistema de Geração deve desligar-se através do inversor e isolar a geração da rede, no máximo, em 2 segundos. O inversor deve garantir o sincronismo da geração com a rede e evitar conexões indevidas. Em nenhuma hipótese será permitido o ilhamento de geradores conectados ao sistema Elétrico da Energisa.
        </Text>
        <Text style={s.h3}>4.3 Reconexão</Text>
        <Text style={s.paragraph}>
          Depois de uma &ldquo;desconexão&rdquo; devido a uma condição anormal da rede, o sistema de Geração Distribuída não pode retomar o fornecimento de energia à rede elétrica (reconexão) por um período mínimo de 180 segundos após a retomada das condições normais de tensão e frequência da rede.
        </Text>
        <Text style={s.h3}>4.4 Aterramento</Text>
        <Text style={s.paragraph}>
          O sistema de Geração Distribuída deverá estar conectado ao sistema de aterramento da unidade consumidora. As instalações de Centrais Geradoras deverão estar providas de sistemas de aterramento que garantam que, em quaisquer circunstâncias, não sejam geradas tensões de contato superiores aos limites estabelecidos conforme NBR 5410. O estudo relativo ao sistema de aterramento da geração distribuída deverá ser de responsabilidade do responsável técnico pelo projeto.
        </Text>
        <Text style={s.h3}>4.5 Sinalização de Segurança</Text>
        <Text style={s.paragraph}>
          A sinalização de segurança deve ser instalada junto ao padrão de entrada de energia, próximo à caixa de medição/proteção. Deverá ser instalada uma placa de advertência com os seguintes dizeres:
        </Text>
        <Text style={{ textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 8, marginBottom: 4 }}>
          &quot;CUIDADO - RISCO DE CHOQUE ELÉTRICO - GERAÇÃO PRÓPRIA&quot;
        </Text>
        <Text style={s.paragraph}>
          Sendo identificado com tinta anticorrosiva, não sendo aceita a utilização de adesivos. A placa de advertência deverá ser confeccionada em PVC ou acrílico com espessura mínima de 1mm e conforme modelo do desenho NDU013 pág. 65.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <View style={{ marginLeft: 60 }}>
            <Image src={imgUrl('/images/placa-energisa-memorial.png')} style={{ width: 110, height: 'auto' }} />
          </View>
          <View style={{ flex: 1, alignItems: 'center', paddingLeft: '30%' }}>
            <View style={{ width: '47%', borderTopWidth: 1, borderColor: '#111111', marginBottom: 3 }} />
            <Text style={s.sigText}>Assinatura do Projetista</Text>
          </View>
        </View>
      </Page>

      {/* ══════════════════ Folha 6: Diagrama Unifilar ══════════════════ */}
      <Page size="A4" orientation="landscape" style={s.page}>
        <Text style={s.sheetLabel}>Folha 6 de 6</Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#29ade0', marginBottom: 6 }}>
          Diagrama Unifilar para Sistemas Fotovoltaicos Conforme NDU013.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 220 }}>
            <View style={[s.tbl, { marginTop: 0, marginBottom: 5 }]}>
              <View style={s.row} wrap={false}>
                <Text style={{ width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '2 6 4' }}>Dados do Projeto:</Text>
              </View>
              {[
                ['Tensão Nominal (V):', get('tensao_atendimento'), true],
                ['N° de fases:', get('numero_fases') || '1', false],
                ['Cabos por fase:', get('cabos_por_fase') || '1', false],
                ['Bitola fase (mm²):', get('secao_fase_mm2'), false],
                ['Bitola neutro (mm²):', get('secao_neutro_mm2'), false],
                ['Bitola terra (mm²):', get('secao_aterramento_mm2'), false],
                ['Proteção (A):', get('disjuntor_corrente_a'), false],
              ].map(([lbl, val, bold], i) => (
                <View key={i} style={s.row} wrap={false}>
                  <Text style={[s.lbl, { width: '38%' }]}>{lbl as string}</Text>
                  <Text style={[s.val, { width: '62%' }, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>{val as string}</Text>
                </View>
              ))}
            </View>

            <View style={[s.tbl, { marginTop: 0, marginBottom: 5 }]}>
              <View style={s.row} wrap={false}>
                <Text style={{ width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '2 6 4' }}>Módulo(s) solar(es):</Text>
              </View>
              {[
                ['Fabricante:', modulosList[0]?.fabricante || '', false],
                ['Modelo:', modulosList[0]?.modelo || '', false],
                ['Qtd. módulos:', String(modulosList.reduce((a, m) => a + (parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0), 0) || ''), false],
                ['Potência total:', `${fmtBR(getTotalKwpFromModulos(projectData))} kWp`, true],
              ].map(([lbl, val, bold], i) => (
                <View key={i} style={s.row} wrap={false}>
                  <Text style={[s.lbl, { width: '38%' }]}>{lbl as string}</Text>
                  <Text style={[s.val, { width: '62%' }, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>{val as string}</Text>
                </View>
              ))}
            </View>

            <View style={[s.tbl, { marginTop: 0, marginBottom: 5 }]}>
              <View style={s.row} wrap={false}>
                <Text style={{ width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '2 6 4' }}>Inversor(es):</Text>
              </View>
              {[
                ['Fabricante:', inversoresList[0]?.fabricante || '', false],
                ['Modelo:', inversoresList[0]?.modelo || '', false],
                ['Qtd. inversores:', String(inversoresList.reduce((a, iv) => a + (parseFloat(String(iv.quantidade || '0').replace(',', '.')) || 0), 0) || ''), false],
                ['Potência total:', `${fmtBR(getTotalInversorKw(projectData))} kW`, true],
                ['DPS CA (A):', get('dps_ca_ka'), false],
                ['DPS CC (A):', get('dps_cc_ka'), false],
              ].map(([lbl, val, bold], i) => (
                <View key={i} style={s.row} wrap={false}>
                  <Text style={[s.lbl, { width: '38%' }]}>{lbl as string}</Text>
                  <Text style={[s.val, { width: '62%' }, bold ? { fontFamily: 'Helvetica-Bold' } : {}]}>{val as string}</Text>
                </View>
              ))}
            </View>

            <View style={[s.tbl, { marginTop: 0, marginBottom: 5 }]}>
              <View style={s.row} wrap={false}>
                <Text style={{ width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 7, padding: '2 6 4' }}>Localização da UC:</Text>
              </View>
              {[
                ['Código (UC):', get('conta_contrato'), false],
                ['Titular:', get('nomeClienteFinal').toUpperCase(), false],
                ['Logradouro:', `${get('endereco_local').toUpperCase()}${get('numero_endereco_cliente') ? `, ${get('numero_endereco_cliente')}` : ''}`, false],
                ['Bairro:', get('bairro_cliente'), false],
                ['Cidade:', get('client_city'), false],
                ['CEP:', get('cliente_cep'), false],
                ['Fuso:', get('coord_utm_fuso'), false],
                ['Latitude (X):', get('coord_utm_x'), false],
                ['Longitude (Y):', get('coord_utm_y'), false],
              ].map(([lbl, val], i) => (
                <View key={i} style={s.row} wrap={false}>
                  <Text style={[s.lbl, { width: '38%' }]}>{lbl as string}</Text>
                  <Text style={[s.val, { width: '62%' }]}>{val as string}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flex: 1, position: 'relative' }}>
            <View style={{ position: 'absolute', left: 130, bottom: 6, width: 145, alignItems: 'center' }}>
              <View style={{ width: '88%', borderTopWidth: 1, borderColor: '#111111', marginBottom: 3 }} />
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold' }}>Assinatura do Projetista</Text>
            </View>

            <View style={{ position: 'absolute', top: '35%', left: 12, width: 130 }}>
              <Image src={imgUrl('/images/placa-energisa-memorial2.png')} style={{ width: 128, height: 'auto' }} />
              <Text style={{ width: 130, textAlign: 'center', fontFamily: 'Helvetica-Bold', marginTop: 6, fontSize: 6.5 }}>
                A sinalização de segurança deve ser instalada junto ao padrão de entrada de energia, próximo a caixa de medição proteção. Deverá ser instalada uma placa de advertência com os seguintes dizeres: CUIDADO - RISCO DE CHOQUE ELÉTRICO
              </Text>
            </View>

            <View style={{ position: 'relative', width: '64%', marginLeft: '30%' }}>
              <Image src={imgUrl('/images/unifilar-energisa.png')} style={{ width: '100%', height: 'auto' }} />
              <Text style={{ position: 'absolute', top: '21%', left: '1.5%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>13,8 kV</Text>
              <Text style={{ position: 'absolute', top: '15%', left: '47%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{get('disjuntor_corrente_a') ? `${get('disjuntor_corrente_a')}A` : ''}</Text>
              <Text style={{ position: 'absolute', top: '18%', left: '88%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{get('disjuntor_quadro_ca_corrente_a') ? `${get('disjuntor_quadro_ca_corrente_a')}A` : ''}</Text>
              <Text style={{ position: 'absolute', top: '33%', left: '84%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{get('dps_ca_ka') ? `${get('dps_ca_ka')}kA` : ''}</Text>
              <Text style={{ position: 'absolute', top: '73%', left: '26%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{fmtBR(getTotalInversorKw(projectData))} kW</Text>
              <Text style={{ position: 'absolute', top: '92%', left: '76%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{fmtBR(getTotalKwpFromModulos(projectData))} kWp</Text>
              <Text style={{ position: 'absolute', top: '57%', left: '52%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{get('disjuntor_cc_corrente_a') ? `${get('disjuntor_cc_corrente_a')}A` : ''}</Text>
              <Text style={{ position: 'absolute', top: '75%', left: '52%', fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{get('dps_cc_ka') ? `${get('dps_cc_ka')}kA` : ''}</Text>
            </View>

            <View style={{ marginLeft: '40%', marginRight: '3%', marginTop: 8 }}>
              <Text style={{ textAlign: 'center', fontSize: 8, fontFamily: 'Helvetica-Bold', marginBottom: 4 }}>Notas:</Text>
              <Text style={{ textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 }}>1 - O sistema de GD deverá estar conectada ao sistema de aterramento da UC.</Text>
              <Text style={{ textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 }}>2 - O sistema de GD deve possuir dispositivo de proteção contra sobrecorrentes, a fim de limitar e interromper o fornecimento de energia, como proporcionar proteção à rede da Energisa contra eventuais defeitos a partir do sistema de Geração Distribuída.</Text>
              <Text style={{ textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 }}>3 - O inversor deve garantir o sincronismo da geração com a rede e evitar conexões indevidas. Em nenhuma hipótese sera permitido o ilhamento de geradores conectados ao sistema Elétrico da Energisa.</Text>
              <Text style={{ textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 }}>4 - O aumento à revelia da capacidade de geração não é permitido sob pena de interromper o canal de geração da unidade consumidora.</Text>
              <Text style={{ textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 }}>5 - É vedada a divisão de centrais geradoras.</Text>
              <Text style={{ textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 }}>6 - A adesão ao sistema de compensação de energia elétrica não se aplica aos consumidores livres ou especiais.</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingTop: 6, borderTopWidth: 0 }}>
          <Text style={{ fontSize: 5.6, color: '#222222', lineHeight: 1.3, flex: 1 }}>
            OBSERVAÇÃO: DIAGRAMA UNIFILAR GERADO AUTOMATICAMENTE DE ACORDO COM O PREENCHIMENTO DO DOCUMENTO, SENDO O PROJETISTA, O RESPONSÁVEL LEGAL PELO PROJETO APRESENTADO JUNTO À ENERGISA. JUNTO A ESSE PROJETO DEVEM SER APRESENTADAS AS DEMAIS DOCUMENTAÇÕES DE PROJETO. A NÃO APRESENTAÇÃO DA DOCUMENTAÇÃO GERADA POR ESSE FORMULÁRIO, JUNTO AO EXCEL E AO RESTANTE DAS DOCUMENTAÇÕES PODERÁ RESULTAR NA REPROVA DO PROJETO.
          </Text>
          <Text style={{ fontSize: 5.6, color: '#222222' }}>V6</Text>
        </View>
      </Page>
    </Document>
  );
}
