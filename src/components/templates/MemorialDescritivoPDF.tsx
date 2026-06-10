import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

interface MemorialDescritivoPDFProps {
  projectData?: Record<string, any>;
  placaAdvertencia?: { nome: string; imagem_url: string } | null;
}

const PLACEHOLDER_MAP: Record<string, string> = {
  '{{classificacao_da_usina}}': 'tipo_fornecimento',
  '{{potencia}}': 'potencia',
  '{{tensao_atendimento}}': 'tensao_atendimento',
  '{{modalidade_compensacao}}': 'modalidade_compensacao',
  '{{cliente_nome}}': 'nomeClienteFinal',
  '{{cliente_cpf}}': 'cpf_cnpj_cliente_final',
  '{{distribuidora}}': 'distribuidora',
  '{{estado}}': 'client_state',
  '{{cidade}}': 'client_city',
  '{{conta_contrato}}': 'conta_contrato',
  '{{classe_uc}}': 'classe_uc',
  '{{endereco}}': 'endereco_local',
  '{{numero_poste_transformador}}': 'numero_poste_transformador',
  '{{coord_utm_x}}': 'coord_utm_x',
  '{{coord_utm_y}}': 'coord_utm_y',
  '{{coord_utm_fuso}}': 'coord_utm_fuso',
  '{{tipo_conexao}}': 'tipo_conexao',
  '{{tipo_ramal}}': 'tipo_ramal',
  '{{disjuntor_polos}}': 'disjuntor_polos',
  '{{disjuntor_tensao_v}}': 'disjuntor_tensao_v',
  '{{disjuntor_corrente_a}}': 'disjuntor_corrente_a',
  '{{disjuntor_ca_corrente_a}}': 'disjuntor_ca_corrente_a',
  '{{secao_fase_mm2}}': 'secao_fase_mm2',
  '{{secao_neutro_mm2}}': 'secao_neutro_mm2',
  '{{secao_fase_rl_mm2}}': 'secao_fase_rl_mm2',
  '{{secao_neutro_rl_mm2}}': 'secao_neutro_rl_mm2',
  '{{modulos_fabricante}}': 'modulos_fabricante',
  '{{modulos_modelo}}': 'modulos_modelo',
  '{{modulos_potencia_wp}}': 'modulos_potencia_wp',
  '{{modulos_voc}}': 'modulos_voc',
  '{{modulos_isc}}': 'modulos_isc',
  '{{modulos_vpmp}}': 'modulos_vpmp',
  '{{modulos_ipmp}}': 'modulos_ipmp',
  '{{modulos_quantidade}}': 'modulos_quantidade',
  '{{inversores_fabricante}}': 'inversores_fabricante',
  '{{inversores_modelo}}': 'inversores_modelo',
  '{{inversores_quantidade}}': 'inversores_quantidade',
  '{{inversores_potencia}}': 'inversores_potencia',
  '{{inversores_potencia_max_saida}}': 'inversores_potencia_max_saida',
  '{{inversores_tensao}}': 'inversores_tensao',
  '{{inversores_vcc_max}}': 'inversores_vcc_max',
  '{{inversores_icc_max}}': 'inversores_icc_max',
  '{{inversores_vpmp_max}}': 'inversores_vpmp_max',
  '{{inversores_vpmp_min}}': 'inversores_vpmp_min',
  '{{inversores_vcc_partida}}': 'inversores_vcc_partida',
  '{{inversores_tensao_max_ca}}': 'inversores_tensao_max_ca',
  '{{inversores_tensao_min_ca}}': 'inversores_tensao_min_ca',
  '{{inversores_corrente_nominal}}': 'inversores_corrente_nominal',
  '{{inversores_faixa_tensao}}': 'inversores_faixa_tensao',
  '{{inversores_quantidade_mppt}}': 'inversores_quantidade_mppt',
  '{{inversores_entradas_por_mppt}}': 'inversores_entradas_por_mppt',
  '{{inversores_tipo_conexao_saida}}': 'inversores_tipo_conexao_saida',
  '{{inversores_fator_potencia}}': 'inversores_fator_potencia',
  '{{inversores_rendimento}}': 'inversores_rendimento',
  '{{inversores_dht_corrente}}': 'inversores_dht_corrente',
  '{{numero_condutores_fase}}': 'numero_condutores_fase',
  '{{disjuntor_padrao_entrada}}': 'disjuntorPadraoEntrada',
  '{{responsavel_nome}}': 'responsavel_nome',
  '{{responsavel_profissao}}': 'responsavel_profissao',
  '{{responsavel_registro}}': 'responsavel_registro',
  '{{data}}': 'data_documento',
  '{{secao_aterramento_mm2}}': 'secao_aterramento_mm2',
  '{{modulos_eficiencia}}': 'modulos_eficiencia',
  '{{modulos_comprimento_m}}': 'modulos_comprimento_m',
  '{{modulos_largura_m}}': 'modulos_largura_m',
  '{{modulos_area_unitaria_m2}}': 'modulos_area_unitaria_m2',
  '{{modulos_peso_kg}}': 'modulos_peso_kg',
  '{{cabo_isolacao_material}}': 'cabo_isolacao_material',
  '{{cabo_cc_secao_mm2}}': 'cabo_cc_secao_mm2',
  '{{cabo_cc_capacidade_corrente_a}}': 'cabo_cc_capacidade_corrente_a',
  '{{cabo_cc_fator_temperatura}}': 'cabo_cc_fator_temperatura',
  '{{cabo_cc_fator_agrupamento}}': 'cabo_cc_fator_agrupamento',
  '{{cabo_ca_secao_mm2}}': 'cabo_ca_secao_mm2',
  '{{cabo_ca_capacidade_corrente_a}}': 'cabo_ca_capacidade_corrente_a',
  '{{cabo_ca_fator_temperatura}}': 'cabo_ca_fator_temperatura',
  '{{cabo_ca_fator_agrupamento}}': 'cabo_ca_fator_agrupamento',
};

const STATE_NAMES: Record<string, string> = {
  AC: 'ACRE', AL: 'ALAGOAS', AP: 'AMAPÁ', AM: 'AMAZONAS', BA: 'BAHIA',
  CE: 'CEARÁ', DF: 'DISTRITO FEDERAL', ES: 'ESPÍRITO SANTO', GO: 'GOIÁS',
  MA: 'MARANHÃO', MT: 'MATO GROSSO', MS: 'MATO GROSSO DO SUL',
  MG: 'MINAS GERAIS', PA: 'PARÁ', PB: 'PARAÍBA', PR: 'PARANÁ',
  PE: 'PERNAMBUCO', PI: 'PIAUÍ', RJ: 'RIO DE JANEIRO',
  RN: 'RIO GRANDE DO NORTE', RS: 'RIO GRANDE DO SUL', RO: 'RONDÔNIA',
  RR: 'RORAIMA', SC: 'SANTA CATARINA', SP: 'SÃO PAULO', SE: 'SERGIPE',
  TO: 'TOCANTINS',
};

const DECIMAL_FIELDS = new Set([
  'potencia',
  'inversores_potencia',
  'inversores_potencia_max_saida',
  'secao_aterramento_mm2',
  'secao_fase_mm2',
  'secao_neutro_mm2',
  'cabo_cc_secao_mm2',
  'cabo_ca_secao_mm2',
]);

function v(placeholder: string, projectData?: Record<string, any>): string {
  const fieldKey = PLACEHOLDER_MAP[`{{${placeholder}}}`];
  const raw = fieldKey && projectData ? projectData[fieldKey] : undefined;
  if (raw !== undefined && raw !== null && raw !== '' && raw !== 0) {
    if (fieldKey && DECIMAL_FIELDS.has(fieldKey)) {
      const num = parseFloat(String(raw).replace(',', '.'));
      if (!isNaN(num)) return num.toFixed(2).replace('.', ',');
    }
    if (fieldKey === 'client_state') {
      const abbr = String(raw).toUpperCase();
      return STATE_NAMES[abbr] || abbr;
    }
    return String(raw).toUpperCase();
  }
  return '___';
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#374151',
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 50,
    lineHeight: 1.5,
  },
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#374151',
    paddingTop: 42,
    paddingBottom: 42,
    paddingHorizontal: 50,
    lineHeight: 1.5,
    flex: 1,
    justifyContent: 'space-between',
  },
  h1: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  h2: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  h3: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  para: {
    marginBottom: 10,
    textAlign: 'justify',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  small: {
    fontSize: 8,
  },
  placeholder: {
    color: '#9CA3AF',
    fontFamily: 'Helvetica-Oblique',
  },
  tableContainer: {
    borderWidth: 0.5,
    borderColor: '#9CA3AF',
    marginBottom: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#D1D5DB',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tdLabel: {
    backgroundColor: '#F9FAFB',
    padding: '4pt 6pt',
    borderRightWidth: 0.5,
    borderRightColor: '#D1D5DB',
  },
  tdValue: {
    padding: '4pt 6pt',
  },
  tdHeader: {
    backgroundColor: '#F3F4F6',
    padding: '4pt 6pt',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: '#D1D5DB',
  },
  tdCenter: {
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  listBullet: {
    width: 12,
    fontSize: 9,
  },
  listText: {
    flex: 1,
    fontSize: 10,
  },
  monoBox: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
  },
  monoText: {
    fontFamily: 'Courier',
    fontSize: 9,
  },
  coverTitle: {
    textAlign: 'center',
    marginBottom: 30,
  },
  coverDesc: {
    textAlign: 'center',
    marginBottom: 30,
  },
  coverFooter: {
    textAlign: 'center',
  },
  imageContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  figureImage: {
    width: '100%',
    objectFit: 'contain',
  },
  placaImage: {
    width: 260,
    height: 185,
    objectFit: 'contain',
  },
  figureCaption: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionBreak: {
    marginTop: 0,
  },
});

// Helper sub-components

const InfoRow = ({
  label,
  value,
  isLast,
  labelWidth,
}: {
  label: string;
  value: string;
  isLast?: boolean;
  labelWidth?: string;
}) => (
  <View style={isLast ? styles.tableRowLast : styles.tableRow} wrap={false}>
    <Text
      style={[
        styles.tdLabel,
        styles.bold,
        { width: labelWidth || '40%', fontSize: 9 },
      ]}
    >
      {label}
    </Text>
    <Text style={[styles.tdValue, { flex: 1 }]}>
      {value || '___'}
    </Text>
  </View>
);

const Li = ({ children }: { children: string }) => (
  <View style={styles.listItem}>
    <Text style={styles.listBullet}>{'\u2022'}</Text>
    <Text style={styles.listText}>{children}</Text>
  </View>
);

const SH2 = ({ children }: { children: string }) => (
  <Text style={styles.h2}>{children}</Text>
);

const SH3 = ({ children }: { children: string }) => (
  <Text style={styles.h3}>{children}</Text>
);

export function MemorialDescritivoPDF({
  projectData,
  placaAdvertencia,
}: MemorialDescritivoPDFProps) {
  // Computed values
  const tensaoStr = projectData?.tensao_atendimento;
  const corrente = parseFloat(String(projectData?.disjuntor_corrente_a || '0')) || 0;
  const tipoConexao = projectData?.tipo_conexao;
  const vn = tensaoStr === '127/220' ? 220 : tensaoStr === '220/380' ? 380 : 0;
  const nf = tipoConexao === 'Trifásico' ? Math.sqrt(3) : 1;
  const nfLabel = tipoConexao === 'Trifásico' ? '√3' : '1';
  const canCalc = vn > 0 && corrente > 0;
  const pdKva = canCalc ? (vn * corrente * nf) / 1000 : 0;
  const pdKw = pdKva * 0.92;

  const condutorMap: Record<string, { total: string; nFase: string; nFaseNum: number }> = {
    'Monofásico': { total: 'dois', nFase: 'um', nFaseNum: 1 },
    'Bifásico':   { total: 'três', nFase: 'dois', nFaseNum: 2 },
    'Trifásico':  { total: 'quatro', nFase: 'três', nFaseNum: 3 },
  };
  const cond = tipoConexao ? condutorMap[tipoConexao] : null;
  const secaoFaseRL = projectData?.secao_fase_rl_mm2;
  const secaoNeutroRL = projectData?.secao_neutro_rl_mm2;
  const hasRL = secaoFaseRL && secaoNeutroRL;

  const caboCCCapacidade = parseFloat(String(projectData?.cabo_cc_capacidade_corrente_a || '0')) || 0;
  const caboCCFatorTemp = parseFloat(String(projectData?.cabo_cc_fator_temperatura || '1')) || 1;
  const caboCCFatorAgrup = parseFloat(String(projectData?.cabo_cc_fator_agrupamento || '1')) || 1;
  const caboCCFinal =
    caboCCCapacidade > 0
      ? (caboCCCapacidade * caboCCFatorTemp * caboCCFatorAgrup).toFixed(2).replace('.', ',')
      : null;

  const caboCACapacidade = parseFloat(String(projectData?.cabo_ca_capacidade_corrente_a || '0')) || 0;
  const caboCAFatorTemp = parseFloat(String(projectData?.cabo_ca_fator_temperatura || '1')) || 1;
  const caboCAFatorAgrup = parseFloat(String(projectData?.cabo_ca_fator_agrupamento || '1')) || 1;
  const caboCAFinal =
    caboCACapacidade > 0
      ? (caboCACapacidade * caboCAFatorTemp * caboCAFatorAgrup).toFixed(2).replace('.', ',')
      : null;

  const caixaDims =
    projectData?.caixa_medicao_comprimento_mm &&
    projectData?.caixa_medicao_altura_mm &&
    projectData?.caixa_medicao_largura_mm
      ? `${projectData.caixa_medicao_comprimento_mm} mm x ${projectData.caixa_medicao_altura_mm} mm x ${projectData.caixa_medicao_largura_mm} mm`
      : '___';

  // Shorthand getters for cover page
  const classificacao = v('classificacao_da_usina', projectData);
  const potencia = v('potencia', projectData);
  const tensao = v('tensao_atendimento', projectData);
  const modalidade = v('modalidade_compensacao', projectData);
  const clienteNome = v('cliente_nome', projectData);
  const clienteCpf = v('cliente_cpf', projectData);
  const responsavelNome = v('responsavel_nome', projectData);
  const responsavelProfissao = v('responsavel_profissao', projectData);
  const responsavelRegistro = v('responsavel_registro', projectData);
  const cidade = v('cidade', projectData);
  const estado = v('estado', projectData);
  const data = v('data', projectData);
  const distribuidora = v('distribuidora', projectData);

  return (
    <Document hyphenationCallback={(word) => [word]}>
      <Page size="A4" style={styles.page} wrap>
        {/* ==================== CAPA ==================== */}
        <View style={{ minHeight: 750, flexDirection: 'column' }}>

          {/* Título no topo */}
          <Text style={styles.h1}>MEMORIAL TÉCNICO DESCRITIVO</Text>

          {/* Descrição do projeto — centralizada verticalmente no espaço do meio */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.7, marginBottom: 4 }}>
              {`${classificacao} UTILIZANDO UM SISTEMA FOTOVOLTAICO DE ${potencia}\u00A0kWp`}
            </Text>
            <Text style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.7, marginBottom: 4 }}>
              {`CONECTADO À REDE DE ENERGIA ELÉTRICA DE BAIXA TENSÃO EM ${tensao} V`}
            </Text>
            <Text style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.7 }}>
              {`CARACTERIZADO COMO ${modalidade}`}
            </Text>
          </View>

          {/* Dados do cliente e responsável — próximo ao rodapé inferior */}
          <View style={{ alignItems: 'center', marginBottom: 55 }}>
            <Text style={[styles.bold, { fontSize: 11, marginBottom: 3 }]}>{clienteNome}</Text>
            <Text style={{ marginBottom: 16 }}>CPF: {clienteCpf}</Text>
            <Text style={[styles.bold, { fontSize: 11, marginBottom: 3 }]}>{responsavelNome}</Text>
            <Text style={{ marginBottom: 3 }}>{responsavelProfissao}</Text>
            <Text>REGISTRO: {responsavelRegistro}</Text>
          </View>

          {/* Local e data — rodapé inferior */}
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.bold, { marginBottom: 3 }]}>{cidade} – {estado}</Text>
            <Text>{data}</Text>
          </View>

        </View>

        {/* ==================== LISTA DE SIGLAS ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>LISTA DE SIGLAS E ABREVIATURAS</SH2>
          <Text style={{ marginBottom: 3 }}>ABNT: Associação Brasileira de Normas Técnicas</Text>
          <Text style={{ marginBottom: 3 }}>ANEEL: Agência Nacional de Energia Elétrica</Text>
          <Text style={{ marginBottom: 3 }}>BT: Baixa tensão (220/127 V, 380/220 V)</Text>
          <Text style={{ marginBottom: 3 }}>C.A: Corrente Alternada</Text>
          <Text style={{ marginBottom: 3 }}>C.C: Corrente Contínua</Text>
          <Text style={{ marginBottom: 3 }}>CD: Custo de disponibilidade (30 kWh, 50kWh ou 100 kWh em sistemas de baixa tensão monofásicos, bifásicos ou trifásicos, respectivamente)</Text>
          <Text style={{ marginBottom: 3 }}>CI: Carga Instalada</Text>
          <Text style={{ marginBottom: 3 }}>DSP: Dispositivo Supressor de Surto</Text>
          <Text style={{ marginBottom: 3 }}>DSV: Dispositivo de seccionamento visível</Text>
          <Text style={{ marginBottom: 3 }}>FP: Fator de potência</Text>
          <Text style={{ marginBottom: 3 }}>FV: Fotovoltaico</Text>
          <Text style={{ marginBottom: 3 }}>GD: Geração distribuída</Text>
          <Text style={{ marginBottom: 3 }}>HSP: Horas de sol pleno</Text>
          <Text style={{ marginBottom: 3 }}>IEC: International Electrotechnical Commission</Text>
          <Text style={{ marginBottom: 3 }}>IN: Corrente Nominal</Text>
          <Text style={{ marginBottom: 3 }}>IDG: Corrente nominal do disjuntor de entrada da unidade consumidora em ampères (A)</Text>
          <Text style={{ marginBottom: 3 }}>Ist: Corrente de curto-circuito de módulo fotovoltaico em ampères (A)</Text>
          <Text style={{ marginBottom: 3 }}>kW: kilo-watt</Text>
          <Text style={{ marginBottom: 3 }}>kWp: kilo-watt pico</Text>
          <Text style={{ marginBottom: 3 }}>kWh: kilo-watt-hora</Text>
          <Text style={{ marginBottom: 3 }}>MicroGD: Microgeração distribuída</Text>
          <Text style={{ marginBottom: 3 }}>MT: Média tensão (13.8 kV, 34.5 kV)</Text>
          <Text style={{ marginBottom: 3 }}>NF: Fator referente ao número de fases, igual a 1 para sistemas monofásicos e bifásicos ou √3 para sistemas trifásicos</Text>
          <Text style={{ marginBottom: 3 }}>PRODIST: Procedimentos de Distribuição</Text>
          <Text style={{ marginBottom: 3 }}>PD: Potência disponibilizada para a unidade consumidora onde será instalada a geração distribuída</Text>
          <Text style={{ marginBottom: 3 }}>PR: Pára-raio</Text>
          <Text style={{ marginBottom: 3 }}>QGD: Quadro Geral de Distribuição</Text>
          <Text style={{ marginBottom: 3 }}>QGBT: Quadro Geral de Baixa Tensão</Text>
          <Text style={{ marginBottom: 3 }}>REN: Resolução Normativa</Text>
          <Text style={{ marginBottom: 3 }}>SPDA: Sistema de Proteção contra Descargas Atmosféricas</Text>
          <Text style={{ marginBottom: 3 }}>SFV: Sistema Fotovoltaico</Text>
          <Text style={{ marginBottom: 3 }}>SFVCR: Sistema Fotovoltaico Conectado à Rede</Text>
          <Text style={{ marginBottom: 3 }}>TC: Transformador de corrente</Text>
          <Text style={{ marginBottom: 3 }}>TP: Transformador de potencial</Text>
          <Text style={{ marginBottom: 3 }}>UC: Unidade Consumidora</Text>
          <Text style={{ marginBottom: 3 }}>UTM: Universal Transversa de Mercator</Text>
          <Text style={{ marginBottom: 3 }}>VN: Tensão nominal de atendimento em volts (V)</Text>
          <Text style={{ marginBottom: 3 }}>Voc: Tensão de circuito aberto de módulo fotovoltaico em volts (V)</Text>
        </View>

        {/* ==================== SUMÁRIO ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>SUMÁRIO</SH2>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>1.</Text> OBJETIVO</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>2.</Text> REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>3.</Text> DOCUMENTOS OBRIGATÓRIOS</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>4.</Text> DADOS DA UNIDADE CONSUMIDORA</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>5.</Text> LEVANTAMENTO DE CARGA E CONSUMO</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>5.1.</Text> Levantamento de Carga</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>6.</Text> PADRÃO DE ENTRADA</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>6.1.</Text> Tipo de Ligação e Tensão de Atendimento</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>6.2.</Text> Disjuntor de Entrada</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>6.3.</Text> Potência Disponibilizada</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>6.4.</Text> Caixa de Medição</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>6.5.</Text> Ramal de Entrada</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>7.</Text> DIMENSIONAMENTO DO GERADOR</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>8.</Text> DIMENSIONAMENTO DO INVERSOR</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>9.</Text> DIMENSIONAMENTO DA PROTEÇÃO</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>9.1.</Text> Chaves Seccionadoras e Disjuntores</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>9.2.</Text> DPS</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>9.3.</Text> Aterramento</Text>
          <Text style={{ marginBottom: 4, paddingLeft: 20 }}><Text style={styles.bold}>9.4.</Text> Requisitos de Proteção</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>10.</Text> DIMENSIONAMENTO DOS CABOS</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>11.</Text> PLACA DE ADVERTÊNCIA</Text>
          <Text style={{ marginBottom: 4 }}><Text style={styles.bold}>12.</Text> ANEXOS</Text>
        </View>

        {/* ==================== 1. OBJETIVO ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>1. OBJETIVO</SH2>
          <Text style={styles.para}>
            O presente memorial técnico descritivo tem como objetivo apresentar a metodologia utilizada para
            elaboração e apresentação à {distribuidora} - {estado}, dos documentos mínimos
            necessários, em conformidade com a REN 482, com o PRODIST Módulo 3 secção 3.7, e com as normas
            técnicas nacionais (ABNT) ou internacionais (europeia e americana), para SOLICITAÇÃO DO PARECER DE ACESSO de
            uma {classificacao} conectada à rede de distribuição de energia elétrica através
            sistema fotovoltaico de {potencia} kWp, composto
            por {v('modulos_quantidade', projectData)} módulos de {v('modulos_potencia_wp', projectData)} Wp
            e {v('inversores_quantidade', projectData)} inversor(es) de {v('inversores_potencia', projectData)} kW,
            caracterizado como {modalidade}.
          </Text>
        </View>

        {/* ==================== 2. REFERÊNCIAS NORMATIVAS ==================== */}
        <View style={{ marginBottom: 20 }}>
          <SH2>2. REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</SH2>
          <Text style={styles.para}>
            Para elaboração deste memorial técnico descritivo, no âmbito da área de concessão do estado
            do {estado} foram utilizadas as normas e resoluções, nas respectivas revisões vigentes, conforme descritas abaixo:
          </Text>
          <Li>a)  ABNT NBR 5410: Instalações Elétricas de Baixa Tensão.</Li>
          <Li>b)  ABNT NBR 10899: Energia Solar Fotovoltaica – Terminologia.</Li>
          <Li>c)  ABNT NBR 11704: Sistemas Fotovoltaicos – Classificação.</Li>
          <Li>d)  ABNT NBR 16149: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição.</Li>
          <Li>e)  ABNT NBR 16150: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição – Procedimentos de ensaio de conformidade.</Li>
          <Li>f)  ABNT NBR IEC 62116: Procedimento de Ensaio de Anti-ilhamento para Inversores de Sistemas Fotovoltaicos Conectados à Rede Elétrica.</Li>
          <Li>g)  EQUATORIAL ENERGIA NT.020.EQTL.Normas e Padrões – Conexão de Microgeração Distribuída ao Sistema de Baixa Tensão.</Li>
          <Li>h)  EQUATORIAL ENERGIA NT.001.EQTL.Normas e Padrões – Fornecimento de Energia Elétrica em Baixa Tensão.</Li>
          <Li>i)  EQUATORIAL ENERGIA NT.030.EQTL.Normas e Padrões - Padrões Construtivos de Caixas de Medição e Proteção.</Li>
          <Li>j)  ANEEL Procedimentos de Distribuição de Energia Elétrica no Sistema Elétrico Nacional – PRODIST: Módulo 3 – Acesso ao Sistema de Distribuição. Revisão 6. 2016, Seção 3.7.</Li>
          <Li>k)  ANEEL Resolução Normativa nº 1000, de 07 de dezembro de 2021, que estabelece as condições gerais de fornecimento de energia elétrica.</Li>
          <Li>l)  ANEEL Resolução Normativa ANEEL nº 482, de 17 de abril de 2012, que estabelece as condições gerais para o acesso de micro geração e mini geração distribuída aos sistemas de distribuição de energia elétrica e o sistema de compensação de energia elétrica.</Li>
          <Li>m)  IEC 61727 Photovoltaic (PV) Systems - Characteristics of the Utility Interface.</Li>
          <Li>n)  IEC 62116:2014 Utility-interconnected photovoltaic inverters - Test procedure of islanding prevention measures.</Li>
        </View>

        {/* ==================== 3. DOCUMENTOS OBRIGATÓRIOS ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>3. DOCUMENTOS OBRIGATÓRIOS</SH2>
          <Text style={[styles.italic, { marginBottom: 8 }]}>
            Tabela 1 – Documentos obrigatórios para a solicitação de acesso de microgeração distribuída
          </Text>
          {/* Table header */}
          <View style={styles.tableContainer}>
            <View style={styles.tableRow}>
              <Text style={[styles.tdHeader, { flex: 3 }]}>Documentos Obrigatórios</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 55 }]}>Até 10 kW</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 65 }]}>Acima de 10 kW</Text>
              <Text style={[styles.tdHeader, { flex: 2 }]}>Observações</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>1. Formulário de Solicitação de Acesso</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}></Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>2. ART do Responsável Técnico</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}></Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>3. Diagrama unifilar do sistema de geração, carga, proteção e medição</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}></Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>4. Diagrama de blocos do sistema de geração, carga e proteção</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>NÃO</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>Até 10kW apenas o diagrama unifilar</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>5. Memorial Técnico Descritivo</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}></Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>6. Projeto Elétrico (Planta de Situação, Diagrama Funcional, Arranjos Físicos, Datasheet)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>NÃO</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>Itens integrantes do Projeto Elétrico</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>7. Certificados de Conformidade dos Inversores ou registro INMETRO</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>Inversor acima de 10 kW: apenas certificados de conformidade</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>8. Dados para registro da central geradora (ANEEL)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}></Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>9. Lista de UCs participantes do sistema de compensação</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM*</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM*</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>*Apenas para autoconsumo remoto, geração compartilhada e EMUC</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>10. Instrumento jurídico de solidariedade entre integrantes</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM*</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM*</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>*Apenas para EMUC e geração compartilhada</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>11. Documento de reconhecimento ANEEL (cogeração qualificada)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM*</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM*</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>*Apenas para cogeração qualificada</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>12. Contrato de aluguel ou arrendamento da UC</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM*</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM*</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>*Quando a UC geradora for alugada ou arrendada</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>13. Procuração</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM*</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM*</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>*Quando a solicitação for feita por terceiros</Text>
            </View>
            <View style={styles.tableRowLast} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>14. Autorização de uso de área comum em condomínio</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 55 }]}>SIM*</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 65 }]}>SIM*</Text>
              <Text style={[styles.tdValue, { flex: 2 }]}>*Quando utilizar área comum do condomínio</Text>
            </View>
          </View>
          <Text style={[styles.small, styles.italic]}>NOTA 1: Para inversores até 10 kW é obrigatório o registro de concessão do INMETRO.</Text>
        </View>

        {/* ==================== 4. DADOS DA UC ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>4. DADOS DA UNIDADE CONSUMIDORA</SH2>
          <View style={styles.tableContainer}>
            <InfoRow label="Número da Conta Contrato" value={v('conta_contrato', projectData)} />
            <InfoRow label="Classe" value={v('classe_uc', projectData)} />
            <InfoRow label="Nome do Titular da CC" value={v('cliente_nome', projectData)} />
            <InfoRow
              label="Endereço Completo"
              value={`${v('endereco', projectData)}, ${v('cidade', projectData)} - ${v('estado', projectData)}`}
            />
            <InfoRow
              label="Número de identificação do poste e/ou transformador mais próximo"
              value={v('numero_poste_transformador', projectData)}
            />
            <InfoRow
              label="Coordenadas georreferenciadas"
              value={`X: ${v('coord_utm_x', projectData)}, Y: ${v('coord_utm_y', projectData)}, Fuso UTM: ${v('coord_utm_fuso', projectData)}`}
              isLast
            />
          </View>
          {projectData?.planta_situacao_url !== 'nao_incluir' && (
            <View style={styles.imageContainer}>
              {projectData?.planta_situacao_url && projectData.planta_situacao_url !== 'pending_upload' ? (
                <>
                  <Image
                    src={projectData.planta_situacao_url}
                    style={styles.figureImage}
                    cache={false}
                  />
                  <Text style={styles.figureCaption}>Figura 1: Localização da unidade consumidora.</Text>
                </>
              ) : (
                <Text style={styles.placeholder}>{'{{planta_situacao_imagem}}'}</Text>
              )}
            </View>
          )}
        </View>

        {/* ==================== 5. LEVANTAMENTO DE CARGA ==================== */}
        <View style={{ marginBottom: 20, break: 'page' }}>
          <SH2>5. LEVANTAMENTO DE CARGA E CONSUMO</SH2>
          <SH3>5.1. Levantamento de Carga</SH3>
          <Text style={[styles.italic, { marginBottom: 8 }]}>Tabela 2 – Levantamento de carga</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableRow}>
              <Text style={[styles.tdHeader, { width: 30 }]}>ITEM</Text>
              <Text style={[styles.tdHeader, { flex: 3 }]}>DESCRIÇÃO</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 40 }]}>P (W)</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 45 }]}>QUANT.</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 45 }]}>CI (kW)</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 30 }]}>FP</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 45 }]}>CI (kVA)</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 30 }]}>FD</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 40 }]}>D(kW)</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 45, borderRightWidth: 0 }]}>D(kVA)</Text>
            </View>
            {(() => {
              // Parsear carga_levantamento salvo no banco (JSON)
              let rows: any[] = [];
              try {
                const raw = projectData?.carga_levantamento;
                if (raw) {
                  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  if (Array.isArray(parsed) && parsed.length > 0) rows = parsed;
                }
              } catch { /* ignore */ }

              function parseBR(val: string): number {
                return parseFloat(String(val).replace(',', '.')) || 0;
              }
              function fmtBR(val: number): string {
                return val.toFixed(2).replace('.', ',');
              }

              if (rows.length === 0) {
                return (
                  <View style={styles.tableRowLast}>
                    <Text style={[styles.tdValue, styles.italic, styles.tdCenter, { flex: 1 }]}>
                      Dados do levantamento de carga a serem preenchidos
                    </Text>
                  </View>
                );
              }

              let totC = 0, totE = 0, totG = 0, totH = 0;
              const renderedRows = rows.map((row: any, idx: number) => {
                const A = parseBR(row.potencia_w);
                const B = parseBR(row.quantidade);
                const D = parseBR(row.fp);
                const F = parseBR(row.fd);
                const C = (A * B) / 1000;
                const E = D > 0 ? C / D : 0;
                const G = C * F;
                const H = E * F;
                totC += C; totE += E; totG += G; totH += H;
                const isLast = idx === rows.length - 1;
                const rowStyle = isLast ? styles.tableRowLast : styles.tableRow;
                return (
                  <View key={row.id || idx} style={rowStyle}>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 30 }]}>{idx + 1}</Text>
                    <Text style={[styles.tdValue, { flex: 3 }]}>{row.descricao}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 40 }]}>{row.potencia_w}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45 }]}>{row.quantidade}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45 }]}>{fmtBR(C)}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 30 }]}>{row.fp}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45 }]}>{fmtBR(E)}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 30 }]}>{row.fd}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 40 }]}>{fmtBR(G)}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45, borderRightWidth: 0 }]}>{fmtBR(H)}</Text>
                  </View>
                );
              });

              return (
                <>
                  {renderedRows}
                  <View style={styles.tableRowLast}>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 30 }]}></Text>
                    <Text style={[styles.tdValue, { flex: 3 }]}></Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 40 }]}></Text>
                    <Text style={[styles.tdHeader, styles.tdCenter, { width: 45 }]}>TOTAL</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45 }]}>{fmtBR(totC)}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 30 }]}></Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45 }]}>{fmtBR(totE)}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 30 }]}></Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 40 }]}>{fmtBR(totG)}</Text>
                    <Text style={[styles.tdValue, styles.tdCenter, { width: 45, borderRightWidth: 0 }]}>{fmtBR(totH)}</Text>
                  </View>
                </>
              );
            })()}
          </View>
        </View>

        {/* ==================== 6. PADRÃO DE ENTRADA ==================== */}
        <View style={{ marginBottom: 20 }}>
          <SH2>6. PADRÃO DE ENTRADA</SH2>

          <SH3>6.1. Tipo de Ligação e Tensão de Atendimento</SH3>
          <Text style={styles.para}>
            {cond && hasRL
              ? `A unidade consumidora está ligada em ramal de ligação em baixa tensão, através de um circuito ${v('tipo_conexao', projectData)} a ${cond.total} condutores, sendo ${cond.nFase} condutor${cond.nFaseNum > 1 ? 'es' : ''} FASE de seção transversal de ${String(secaoFaseRL).toUpperCase()} mm² e um condutor NEUTRO de seção transversal de ${String(secaoNeutroRL).toUpperCase()} mm², com tensão de atendimento em ${v('tensao_atendimento', projectData)} V, derivado de uma rede ${v('tipo_ramal', projectData)} de distribuição secundária da ${distribuidora} no estado do ${estado}.`
              : `A unidade consumidora está ligada em ramal de ligação em baixa tensão, através de um circuito ${v('tipo_conexao', projectData)}, com tensão de atendimento em ${v('tensao_atendimento', projectData)} V, derivado de uma rede ${v('tipo_ramal', projectData)} de distribuição secundária da ${distribuidora} no estado do ${estado}.`
            }
          </Text>

          <SH3>6.2. Disjuntor de Entrada</SH3>
          <Text style={styles.para}>
            No ponto de entrega/conexão é instalado um disjuntor termomagnético, em conformidade com
            as normas e padrões da {distribuidora}, com as seguintes características:
          </Text>
          <View style={styles.tableContainer}>
            <InfoRow label="NÚMERO DE POLOS" value={v('disjuntor_polos', projectData)} />
            <InfoRow label="TENSÃO NOMINAL" value={`${v('disjuntor_tensao_v', projectData)} V`} />
            <InfoRow label="CORRENTE NOMINAL" value={`${v('disjuntor_corrente_a', projectData)} A`} />
            <InfoRow label="FREQUÊNCIA NOMINAL" value="60 Hz" />
            <InfoRow label="ELEMENTO DE PROTEÇÃO" value="TERMOMAGNÉTICO" />
            <InfoRow label="CAPACIDADE MÁXIMA DE INTERRUPÇÃO" value="3,0 kA" />
            <InfoRow label="ACIONAMENTO" value="MANUAL" />
            <InfoRow label="CURVA DE ATUAÇÃO (DISPARO)" value="C" isLast />
          </View>

          <View wrap={false}>
          <SH3>6.3. Potência Disponibilizada</SH3>
          <Text style={styles.para}>
            A potência disponibilizada para a unidade consumidora onde será instalada
            a {classificacao} é igual à:
          </Text>
          </View>
          <View style={styles.monoBox}>
            <Text style={styles.monoText}>PD [kVA] = (VN [V] × IDG [A] × NF) / 1000</Text>
            <Text style={styles.monoText}>PD [kW] = PD [kVA] × FP</Text>
            <Text style={[styles.monoText, { marginTop: 6 }]}>VN = {vn > 0 ? `${vn} V` : v('tensao_atendimento', projectData)} (tensão de linha)</Text>
            <Text style={styles.monoText}>IDG = {v('disjuntor_corrente_a', projectData)} A</Text>
            <Text style={styles.monoText}>NF = {tipoConexao ? `${nfLabel} (${tipoConexao})` : 'conforme tipo de ligação'}</Text>
            <Text style={styles.monoText}>FP = 0,92</Text>
            {canCalc && (
              <>
                <Text style={[styles.monoText, { marginTop: 6, borderTopWidth: 0.5, borderTopColor: '#D1D5DB', paddingTop: 4 }]}>
                  PD [kVA] = ({vn} × {corrente} × {nfLabel}) / 1000 = {pdKva.toFixed(2).replace('.', ',')} kVA
                </Text>
                <Text style={[styles.monoText, styles.bold]}>
                  PD [kW] = {pdKva.toFixed(2).replace('.', ',')} × 0,92 = {pdKw.toFixed(3).replace('.', ',')} kW
                </Text>
              </>
            )}
          </View>
          <Text style={[styles.small, styles.italic, { marginBottom: 10 }]}>
            NOTA 2: A potência de geração deve ser menor ou igual à potência disponibilizada PD em kW.
          </Text>

          <SH3>6.4. Caixa de Medição</SH3>
          <Text style={styles.para}>
            A caixa de medição é polifásica em material polimérico, com dimensões de {caixaDims}{' '}
            (comprimento, altura e largura), está instalada em fachada, no ponto de entrega
            caracterizado como o limite da via pública com a propriedade, atendendo aos requisitos de localização,
            facilidade de acesso e layout, em conformidade com as normas da concessionária NT.001.EQTL e NT.030.EQTL.
          </Text>
          <Text style={styles.para}>
            O aterramento da caixa de medição é com haste(s) de aço cobreado de comprimento 1500 mm e diâmetro
            16 mm (5/8"), condutor de 10 mm² com conector tipo cunha para haste de material protegido contra
            corrosão, sob pressão de parafusos, sem o emprego de solda e acessível à inspeção.
          </Text>
          {projectData?.caixa_medicao_imagem_url ? (
            <View style={styles.imageContainer}>
              <Image
                src={projectData.caixa_medicao_imagem_url}
                style={[styles.figureImage, { maxHeight: 256 }]}
                cache={false}
              />
              <Text style={styles.figureCaption}>
                Figura 2: Desenho dimensional da caixa de medição — {projectData.caixa_medicao_nome || 'Modelo selecionado'}.
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholder, { marginBottom: 10 }]}>{'{{caixa_medicao_imagem}}'}</Text>
          )}

          <SH3>6.5. Ramal de Entrada</SH3>
          <Text style={styles.para}>
            {(() => {
              const condutorMapRE: Record<string, { total: string; nFase: string; nFaseNum: number }> = {
                'Monofásico': { total: 'dois', nFase: 'um', nFaseNum: 1 },
                'Bifásico':   { total: 'três', nFase: 'dois', nFaseNum: 2 },
                'Trifásico':  { total: 'quatro', nFase: 'três', nFaseNum: 3 },
              };
              const condRE = tipoConexao ? condutorMapRE[tipoConexao] : null;
              const secaoFaseRE = projectData?.secao_fase_mm2;
              const secaoNeutroRE = projectData?.secao_neutro_mm2;
              const hasRE = secaoFaseRE && secaoNeutroRE;
              if (condRE && hasRE) {
                return `O ramal de entrada da unidade consumidora é através de um circuito ${v('tipo_conexao', projectData)} a ${condRE.total} condutores, sendo ${condRE.nFase} condutor${condRE.nFaseNum > 1 ? 'es' : ''} FASE de seção transversal de ${String(secaoFaseRE).toUpperCase()} mm² e um condutor NEUTRO de seção transversal de ${String(secaoNeutroRE).toUpperCase()} mm² com isolação em HEPR/XLPE 90ºC e tensão de atendimento de ${v('tensao_atendimento', projectData)} V.`;
              }
              return `O ramal de entrada da unidade consumidora é através de um circuito ${v('tipo_conexao', projectData)}, sendo condutor(es) FASE de seção transversal de ${v('secao_fase_mm2', projectData)} mm² e condutor NEUTRO de seção transversal de ${v('secao_neutro_mm2', projectData)} mm² com isolação em HEPR/XLPE 90ºC e tensão de atendimento de ${v('tensao_atendimento', projectData)} V.`;
            })()}
          </Text>
        </View>

        {/* ==================== 7. DIMENSIONAMENTO DO GERADOR ==================== */}
        <View style={styles.sectionBreak}>
          <SH2>7. DIMENSIONAMENTO DO GERADOR</SH2>
          <Text style={{ marginBottom: 6 }}>Características técnicas dos módulos fotovoltaicos:</Text>
          <Text style={[styles.italic, { marginBottom: 8 }]}>Tabela 4 – Características técnicas dos módulos fotovoltaicos</Text>
          <View style={styles.tableContainer}>
            <InfoRow label="Fabricante" value={v('modulos_fabricante', projectData)} />
            <InfoRow label="Modelo" value={v('modulos_modelo', projectData)} />
            <InfoRow label="Potência nominal – Pn [W]" value={v('modulos_potencia_wp', projectData)} />
            <InfoRow label="Tensão de circuito aberto – Voc [V]" value={v('modulos_voc', projectData)} />
            <InfoRow label="Corrente de curto-circuito – Isc [A]" value={v('modulos_isc', projectData)} />
            <InfoRow label="Tensão de máxima potência – Vpmp [V]" value={v('modulos_vpmp', projectData)} />
            <InfoRow label="Corrente de máxima potência – Ipmp [A]" value={v('modulos_ipmp', projectData)} />
            <InfoRow label="Eficiência [%]" value={v('modulos_eficiencia', projectData)} />
            <InfoRow label="Comprimento [m]" value={v('modulos_comprimento_m', projectData)} />
            <InfoRow label="Largura [m]" value={v('modulos_largura_m', projectData)} />
            <InfoRow label="Área [m²]" value={v('modulos_area_unitaria_m2', projectData)} />
            <InfoRow label="Peso [kg]" value={v('modulos_peso_kg', projectData)} />
            <InfoRow label="Quantidade" value={v('modulos_quantidade', projectData)} />
            <InfoRow
              label="Potência total instalada"
              value={`${v('modulos_quantidade', projectData)} × ${v('modulos_potencia_wp', projectData)} Wp = ${potencia} kWp`}
              isLast
            />
          </View>
        </View>

        {/* ==================== 8. DIMENSIONAMENTO DO INVERSOR ==================== */}
        <View style={{ marginBottom: 20 }}>
          <SH2>8. DIMENSIONAMENTO DO INVERSOR</SH2>
          <Text style={{ marginBottom: 6 }}>Características técnicas do inversor:</Text>
          <Text style={[styles.italic, { marginBottom: 8 }]}>Tabela 5 – Características técnicas do inversor</Text>
          <View style={styles.tableContainer}>
            <InfoRow label="Fabricante" value={v('inversores_fabricante', projectData)} />
            <InfoRow label="Modelo" value={v('inversores_modelo', projectData)} />
            <InfoRow label="Quantidade" value={v('inversores_quantidade', projectData)} />
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdLabel, styles.bold, { flex: 1 }]}>Entrada</Text>
            </View>
            <InfoRow label="Máxima tensão CC – Vcc-máx [V]" value={v('inversores_vcc_max', projectData)} />
            <InfoRow label="Máxima corrente CC – Icc-máx [A]" value={v('inversores_icc_max', projectData)} />
            <InfoRow label="Máxima tensão MPPT – Vpmp-máx [V]" value={v('inversores_vpmp_max', projectData)} />
            <InfoRow label="Mínima tensão MPPT – Vpmp-min [V]" value={v('inversores_vpmp_min', projectData)} />
            <InfoRow label="Tensão CC de partida – Vcc-part [V]" value={v('inversores_vcc_partida', projectData)} />
            <InfoRow label="Quantidade de MPPTs" value={v('inversores_quantidade_mppt', projectData)} />
            <InfoRow label="Quantidade de entradas por MPPT" value={v('inversores_entradas_por_mppt', projectData)} />
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdLabel, styles.bold, { flex: 1 }]}>Saída</Text>
            </View>
            <InfoRow label="Potência nominal – Pn [kW]" value={v('inversores_potencia', projectData)} />
            <InfoRow label="Máxima potência na saída CA – Pca-máx [kW]" value={v('inversores_potencia_max_saida', projectData)} />
            <InfoRow label="Tensão nominal CA [V]" value={v('inversores_tensao', projectData)} />
            <InfoRow label="Máxima tensão CA – Vca-máx [V]" value={v('inversores_tensao_max_ca', projectData)} />
            <InfoRow label="Mínima tensão CA – Vca-min [V]" value={v('inversores_tensao_min_ca', projectData)} />
            <InfoRow label="Corrente máxima CA [A]" value={v('inversores_corrente_nominal', projectData)} />
            <InfoRow label="Frequência [Hz]" value="60" />
            <InfoRow label="THD de corrente [%]" value={v('inversores_dht_corrente', projectData)} />
            <InfoRow label="Fator de potência" value={v('inversores_fator_potencia', projectData)} />
            <InfoRow label="Tipo de conexão" value={v('inversores_tipo_conexao_saida', projectData)} />
            <InfoRow label="Eficiência máxima [%]" value={v('inversores_rendimento', projectData)} isLast />
          </View>
        </View>

        {/* ==================== 9. DIMENSIONAMENTO DA PROTEÇÃO ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>9. DIMENSIONAMENTO DA PROTEÇÃO</SH2>

          <SH3>9.1. Chaves Seccionadoras e Disjuntores</SH3>
          <Text style={[styles.bold, { marginBottom: 4 }]}>Chave Seccionadora CC:</Text>
          <Li>Acoplado ao Inversor Fotovoltaico.</Li>
          <Text style={[styles.bold, { marginBottom: 4, marginTop: 6 }]}>Disjuntor CA:</Text>
          <Li>{`Número de polos: ${v('disjuntor_polos', projectData)}`}</Li>
          <Li>{`Tensão nominal CA [V]: ${v('tensao_atendimento', projectData)}`}</Li>
          <Li>{`Corrente Nominal [A]: ${v('disjuntor_ca_corrente_a', projectData)}`}</Li>
          <Li>Frequência [Hz]: 60</Li>
          <Li>Capacidade máxima de interrupção [kA]: 3,0</Li>
          <Li>Curva de atuação: C</Li>

          <SH3>9.2. DPS</SH3>
          <Text style={[styles.bold, { marginBottom: 4, marginTop: 4 }]}>Tipo CC:</Text>
          <Li>Classe: II</Li>
          <Li>Tensão CC [V]: 1000</Li>
          <Li>Corrente nominal [kA]: 20</Li>
          <Li>Corrente máxima [kA]: 40</Li>
          <Text style={[styles.bold, { marginBottom: 4, marginTop: 6 }]}>Tipo CA:</Text>
          <Li>Classe: II</Li>
          <Li>Tensão CA [V]: 275</Li>
          <Li>Corrente nominal [kA]: 20</Li>
          <Li>Corrente máxima [kA]: 40</Li>

          <SH3>9.3. Aterramento</SH3>
          <Text style={styles.para}>
            A geração distribuída deve possuir uma malha de terra, esta malha de terra deve ser conectada ao
            sistema de aterramento existente da unidade consumidora, tornando os sistemas de aterramento equipotencializados.
          </Text>
          <Li>Geometria da malha e distância entre hastes: TN-S;</Li>
          <Li>Hastes de aterramento: haste cobreada com diâmetro de 3/4" e comprimento de 2400 mm;</Li>
          <Li>Quantidade de hastes: 1;</Li>
          <Li>{`Cabos do aterramento da malha, da interligação com a geração e da equipotencialização: malha de aterramento de cobre com isolação em PVC seção transversal de ${v('secao_aterramento_mm2', projectData)} mm²;`}</Li>
          <Li>Conector tipo cunha para haste;</Li>
          <Li>Valor da resistência de aterramento: 15 ohms;</Li>
          <Li>Barramento de equipotencialização: Barramento de cobre de medidas 1/2" x 1/16".</Li>

          <View break><SH3>9.4. Requisitos de Proteção</SH3></View>
          <Text style={[styles.bold, styles.tdCenter, { marginBottom: 8 }]}>Tabela 7 – Características técnicas do gerador</Text>
          <View style={styles.tableContainer}>
            <View style={styles.tableRow}>
              <Text style={[styles.tdHeader, { flex: 3 }]}>Requisito de Proteção</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 60 }]}>Obrigatório</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 80 }]}>Ajuste</Text>
              <Text style={[styles.tdHeader, styles.tdCenter, { width: 90, borderRightWidth: 0 }]}>Tempo máximo de atuação</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Elemento de interrupção (52)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>Não aplicável</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>Não aplicável</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Proteção de subtensão (27)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>0,8 p. u.</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>0,4 seg</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Proteção de sobretensão (59)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>1,1 p. u.</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>0,2 seg</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Proteção de subfrequência (81U)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>59,5 Hz</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>0,2 seg</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Proteção de sobrefrequência (81O)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>60,5 Hz</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>0,2 seg</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Relé de sincronismo (25)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>10º/10% tensão/0,3 Hz</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>Não aplicável</Text>
            </View>
            <View style={styles.tableRow} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>Anti-ilhamento (78 e 81 df/dt – ROCOF)</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>-</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>0,2 seg</Text>
            </View>
            <View style={styles.tableRowLast} wrap={false}>
              <Text style={[styles.tdValue, { flex: 3 }]}>
                Proteção de injeção de componente C.C na rede elétrica (sistemas com inversor sem transformador para separação galvânica)
              </Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 60 }]}>Sim</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 80 }]}>Icc {'\u003E'} 0,5 · IN</Text>
              <Text style={[styles.tdValue, styles.tdCenter, { width: 90 }]}>1 seg</Text>
            </View>
          </View>
        </View>

        {/* ==================== 10. DIMENSIONAMENTO DOS CABOS ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>10. DIMENSIONAMENTO DOS CABOS</SH2>

          <Text style={[styles.bold, { marginBottom: 6 }]}>Cabos CC:</Text>
          <Li>Isolação: XLPE/XLPO</Li>
          <Li>Isolamento: 1,8 kV</Li>
          <Li>{`Seção Transversal [mm²]: ${v('cabo_cc_secao_mm2', projectData)}`}</Li>
          <Li>Método de Instalação: B1 (Cabos instalados ao ar livre), em temperatura ambiente de 40º C, instalação ao ar livre exposta ao sol, modo de instalação 1.</Li>
          <Li>{`Capacidade de corrente básica do cabo: ${v('cabo_cc_capacidade_corrente_a', projectData)} A`}</Li>
          <Li>{`Fator de correção por temperatura: ${v('cabo_cc_fator_temperatura', projectData)}`}</Li>
          <Li>{`Fator de Agrupamento: ${v('cabo_cc_fator_agrupamento', projectData)}`}</Li>
          {caboCCFinal ? (
            <Li>{`Capacidade final do cabo (A) = ${caboCCCapacidade} × ${caboCCFatorTemp.toFixed(2).replace('.', ',')} × ${caboCCFatorAgrup.toFixed(2).replace('.', ',')} = ${caboCCFinal} A`}</Li>
          ) : (
            <Li>Capacidade final do cabo (A) = aguardando preenchimento dos dados</Li>
          )}

          <Text style={[styles.bold, { marginBottom: 6, marginTop: 10 }]}>Cabos CA:</Text>
          <Li>Isolação: PVC</Li>
          <Li>Isolamento: 1,0 kV</Li>
          <Li>{`Seção Transversal [mm²]: ${v('cabo_ca_secao_mm2', projectData)}`}</Li>
          <Li>Método de Instalação: B1 (cabos unipolares em eletrodutos aparentes), com dois condutores carregados.</Li>
          <Li>{`Capacidade de corrente básica do cabo: ${v('cabo_ca_capacidade_corrente_a', projectData)} A`}</Li>
          <Li>{`Fator de correção por temperatura: ${v('cabo_ca_fator_temperatura', projectData)}`}</Li>
          <Li>{`Fator de Agrupamento: ${v('cabo_ca_fator_agrupamento', projectData)}`}</Li>
          {caboCAFinal ? (
            <Li>{`Capacidade final do cabo (A) = ${caboCACapacidade} × ${caboCAFatorTemp.toFixed(2).replace('.', ',')} × ${caboCAFatorAgrup.toFixed(2).replace('.', ',')} = ${caboCAFinal} A`}</Li>
          ) : (
            <Li>Capacidade final do cabo (A) = aguardando preenchimento dos dados</Li>
          )}
        </View>

        {/* ==================== 11. PLACA DE ADVERTÊNCIA ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>11. PLACA DE ADVERTÊNCIA</SH2>
          <Text style={{ marginBottom: 6 }}>Características da Placa:</Text>
          <Li>Espessura: 2 mm</Li>
          <Li>Material: Policarbonato com aditivos anti-raios UV (ultravioleta)</Li>
          <Li>Gravação: As letras devem ser em Arial Black</Li>
          <Li>Acabamento: Deve possuir cor amarela, obtida por processo de masterização com 2%, assegurando opacidade que permita adequada visualização das marcações pintadas na superfície da placa</Li>
          {placaAdvertencia?.imagem_url ? (
            <View style={styles.imageContainer}>
              <Image
                src={placaAdvertencia.imagem_url}
                style={styles.placaImage}
                cache={false}
              />
              <Text style={styles.figureCaption}>Figura 4: Placa de advertência.</Text>
            </View>
          ) : (
            <Text style={[styles.placeholder, { marginTop: 10 }]}>{'{{placa_advertencia_imagem}}'}</Text>
          )}
        </View>

        {/* ==================== 12. ANEXOS ==================== */}
        <View break style={styles.sectionBreak}>
          <SH2>12. ANEXOS</SH2>
          <Li>Anexo I - Solicitação de Acesso</Li>
          <Li>Anexo II - Responsabilidade Técnica</Li>
          <Li>Anexo III - Datasheet Módulo</Li>
          <Li>Anexo IV - Registro Inmetro Módulo</Li>
          <Li>Anexo V - Datasheet Inversor</Li>
          <Li>Anexo VI - Registro Inmetro Inversor</Li>
          <Li>Anexo VII - Diagrama Unifilar</Li>
          <Li>Anexo VIII - Quadros de Proteção</Li>
          <Li>Anexo IX - Instalação do Sistema</Li>
          <Li>Anexo X - Diagrama de Blocos</Li>
          <Li>Anexo XI - Planta de Situação</Li>
        </View>
      </Page>
    </Document>
  );
}
