import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface FormularioSolicitacaoPDFProps {
  projectData?: Record<string, any>;
}

const PLACEHOLDER_MAP: Record<string, string> = {
  '{{cliente_nome}}': 'nomeClienteFinal',
  '{{cliente_cpf}}': 'cpf_cnpj_cliente_final',
  '{{endereco}}': 'endereco_local',
  '{{cliente_cep}}': 'cliente_cep',
  '{{cidade}}': 'client_city',
  '{{estado}}': 'client_state',
  '{{cliente_email}}': 'cliente_email',
  '{{cliente_celular}}': 'cliente_celular',
  '{{cliente_telefone_fixo}}': 'cliente_telefone_fixo',
  '{{conta_contrato}}': 'conta_contrato',
  '{{tipo_solicitacao}}': 'tipo_solicitacao',
  '{{tarifa_branca}}': 'tarifa_branca',
  '{{possui_cargas_especiais}}': 'possui_cargas_especiais',
  '{{classe_uc}}': 'classe_uc',
  '{{tipo_conexao}}': 'tipo_conexao',
  '{{tensao_atendimento}}': 'tensao_atendimento',
  '{{carga_declarada_kw}}': 'carga_declarada_kw',
  '{{disjuntor_corrente_a}}': 'disjuntor_corrente_a',
  '{{potencia_disponibilizada_kw}}': 'potencia_disponibilizada_kw',
  '{{tipo_ramal}}': 'tipo_ramal',
  '{{numero_poste_transformador}}': 'numero_poste_transformador',
  '{{coord_utm_x}}': 'coord_utm_x',
  '{{coord_utm_y}}': 'coord_utm_y',
  '{{coord_utm_fuso}}': 'coord_utm_fuso',
  '{{responsavel_legal_nome}}': 'responsavel_legal_nome',
  '{{responsavel_legal_telefone}}': 'responsavel_legal_telefone',
  '{{responsavel_legal_email}}': 'responsavel_legal_email',
  '{{responsavel_nome}}': 'responsavel_nome',
  '{{responsavel_profissao}}': 'responsavel_profissao',
  '{{responsavel_registro}}': 'responsavel_registro',
  '{{responsavel_email}}': 'responsavel_email',
  '{{responsavel_uf}}': 'responsavel_uf',
  '{{modalidade_compensacao}}': 'modalidade_compensacao',
  '{{potencia}}': 'potencia',
  '{{data_inicio_operacao}}': 'data_inicio_operacao',
  '{{modulos_potencia_wp}}': 'modulos_potencia_wp',
  '{{modulos_quantidade}}': 'modulos_quantidade',
  '{{modulos_area_m2}}': 'modulos_area_m2',
  '{{modulos_fabricante}}': 'modulos_fabricante',
  '{{modulos_modelo}}': 'modulos_modelo',
  '{{inversores_fabricante}}': 'inversores_fabricante',
  '{{inversores_modelo}}': 'inversores_modelo',
  '{{inversores_potencia}}': 'inversores_potencia',
  '{{inversores_faixa_tensao}}': 'inversores_faixa_tensao',
  '{{inversores_corrente_nominal}}': 'inversores_corrente_nominal',
  '{{inversores_fator_potencia}}': 'inversores_fator_potencia',
  '{{inversores_rendimento}}': 'inversores_rendimento',
  '{{inversores_dht_corrente}}': 'inversores_dht_corrente',
  '{{data}}': 'data_documento',
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

function fmtKW(val: string | number | undefined): string {
  if (val === undefined || val === null || val === '') return '___';
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n) || n === 0) return '___';
  return n.toFixed(2).replace('.', ',');
}

function v(placeholder: string, projectData?: Record<string, any>): string {
  const fieldKey = PLACEHOLDER_MAP[`{{${placeholder}}}`];
  const raw = fieldKey && projectData ? projectData[fieldKey] : undefined;
  if (raw !== undefined && raw !== null && raw !== '' && raw !== 0) {
    if (fieldKey === 'client_state') {
      const abbr = String(raw).toUpperCase();
      return STATE_NAMES[abbr] || abbr;
    }
    return String(raw).toUpperCase();
  }
  return '___';
}

const B = 0.5;
const BC = '#000000';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#000000',
    lineHeight: 1.3,
  },
  tbl: {
    borderLeftWidth: B,
    borderTopWidth: B,
    borderColor: BC,
    marginBottom: 4,
  },
  row: { flexDirection: 'row' },
  sh: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 5,
    paddingRight: 5,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  ssh: {
    backgroundColor: '#D9D9D9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 5,
    paddingRight: 5,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  lr: {
    backgroundColor: '#D9D9D9',
    color: '#000000',
    fontFamily: 'Helvetica-Bold',
    fontSize: 5.5,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  l: {
    backgroundColor: '#D9D9D9',
    fontSize: 5.5,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  d: {
    backgroundColor: '#FFFFFF',
    fontSize: 6,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 5,
    paddingRight: 5,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  okCell: {
    backgroundColor: '#70AD47',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 5,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 3,
    paddingRight: 3,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  noOkCell: {
    backgroundColor: '#FFFFFF',
    color: '#C00000',
    fontSize: 5,
    padding: 2,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  ch: {
    backgroundColor: '#D9D9D9',
    fontFamily: 'Helvetica-Bold',
    fontSize: 5,
    padding: 2,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  tot: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    padding: 2,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  bold: { fontFamily: 'Helvetica-Bold' },
  center: { textAlign: 'center' },
  small: { fontSize: 4, color: '#595959', fontFamily: 'Helvetica-Oblique' },
  sectionLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6, marginBottom: 2 },
  chBlue: {
    backgroundColor: '#595959',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 5,
    padding: 2,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  dPeach: {
    backgroundColor: '#FCE4D6',
    fontSize: 6,
    padding: 2,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  totGray: {
    backgroundColor: '#808080',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    padding: 2,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
});

export function FormularioSolicitacaoPDF({ projectData }: FormularioSolicitacaoPDFProps) {
  const pd = projectData;
  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/images/logo.equatorial.png`
    : '/images/logo.equatorial.png';

  const potenciaNum = parseFloat(String(pd?.potencia || '0')) || 0;
  const potenciaKwp = potenciaNum > 0 ? potenciaNum.toFixed(2).replace('.', ',') : '___';
  const cargaDeclarada = parseFloat(String(pd?.carga_declarada_kw || '0')) || 0;
  const potenciaDisp = parseFloat(String(pd?.potencia_disponibilizada_kw || '0')) || 0;
  const okCarga = cargaDeclarada > 0 && potenciaDisp > 0 && cargaDeclarada <= potenciaDisp;
  const okPGT = potenciaNum > 0 && potenciaDisp > 0 && potenciaNum <= potenciaDisp;
  const inversoresQtd = Math.min(30, Math.max(1, parseInt(String(pd?.inversores_quantidade || '1')) || 1));
  const totalInvPotencia = (() => {
    const p = parseFloat(String(pd?.inversores_potencia || '0'));
    if (isNaN(p) || p === 0) return '___';
    return (p * inversoresQtd).toFixed(2).replace('.', ',');
  })();

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ===== CABEÇALHO ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.d, { width: '25%', justifyContent: 'center', alignItems: 'center' }]}>
              <Image src={logoUrl} style={{ width: 90, height: 40, objectFit: 'contain' }} cache={false} />
            </View>
            <View style={[s.d, { flex: 1 }]}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, textAlign: 'center' }}>NT.00020.EQTL.Normas e Qualidade</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'center', marginTop: 3 }}>
                ANEXO I - Formulário de Solicitação de Orçamento de Microgeração Distribuída Grupo B
              </Text>
            </View>
          </View>
        </View>

        {/* ===== SEÇÃO 1 — Identificação (8 colunas: 16,22,10,14,10,14,7,7) ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}>
              <Text>{'1. Identificação e Dados Cadastrais da Unidade Consumidora - '}
                <Text style={{ color: '#FF6600' }}>PREENCHER, OBRIGATORIAMENTE, TODOS OS CAMPOS</Text>
              </Text>
            </View>
          </View>
          {/* Nome / CPF — label em cima, valor embaixo */}
          <View style={s.row}>
            <View style={[s.lr, { width: '52%' }]}><Text>Nome do Cliente / Razão Social (Titular da UC)</Text></View>
            <View style={[s.lr, { width: '48%' }]}><Text>CPF/CNPJ</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '52%' }]}><Text>{v('cliente_nome', pd)}</Text></View>
            <View style={[s.d, { width: '48%' }]}><Text>{v('cliente_cpf', pd)}</Text></View>
          </View>
          {/* Endereço / Contatos — label em cima, valor embaixo */}
          <View style={s.row}>
            <View style={[s.lr, { width: '52%' }]}><Text>Endereço</Text></View>
            <View style={[s.l, { width: '48%' }]}><Text>Contatos telefônicos</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '52%' }]}><Text>{v('endereco', pd)}</Text></View>
            <View style={[s.l, { width: '14%' }]}><Text>Celular</Text></View>
            <View style={[s.d, { width: '17%' }]}><Text>{v('cliente_celular', pd)}</Text></View>
            <View style={[s.d, { width: '17%' }]}><Text>Fixo: {v('cliente_telefone_fixo', pd)}</Text></View>
          </View>
          {/* CEP / Município / UF / E-mail */}
          <View style={s.row}>
            <View style={[s.lr, { width: '8%' }]}><Text>CEP:</Text></View>
            <View style={[s.d, { width: '12%' }]}><Text>{v('cliente_cep', pd)}</Text></View>
            <View style={[s.lr, { width: '8%' }]}><Text>Município</Text></View>
            <View style={[s.d, { width: '12%' }]}><Text>{v('cidade', pd)}</Text></View>
            <View style={[s.lr, { width: '5%' }]}><Text>UF</Text></View>
            <View style={[s.d, { width: '8%' }]}><Text>{v('estado', pd)}</Text></View>
            <View style={[s.lr, { width: '7%' }]}><Text>E-mail</Text></View>
            <View style={[s.d, { width: '40%' }]}><Text>{v('cliente_email', pd)}</Text></View>
          </View>
          {/* Tipo de orçamento / Conta Contrato */}
          <View style={s.row}>
            <View style={[s.l, { width: '38%' }]}><Text>Tipo de orçamento desejado</Text></View>
            <View style={[s.d, { width: '10%' }]}><Text style={s.bold}>Orçamento de Conexão</Text></View>
            <View style={[s.lr, { width: '24%' }]}><Text>Conta Contrato (Se UC existente)</Text></View>
            <View style={[s.d, { width: '14%' }]}><Text>{v('conta_contrato', pd)}</Text></View>
            <View style={[s.l, { width: '14%' }]}><Text>Tipo de orçamento desejado</Text></View>
          </View>
          {/* Tipo de Solicitação */}
          <View style={s.row}>
            <View style={[s.lr, { width: '38%' }]}><Text>Tipo de Solicitação (selecionar)</Text></View>
            <View style={[s.d, { width: '62%' }]}><Text>{v('tipo_solicitacao', pd)}</Text></View>
          </View>
          {/* INFORMAR CONTA CONTRATO */}
          <View style={s.row}>
            <View style={[s.d, { width: '55%', backgroundColor: '#FFFF99', textAlign: 'center' }]}>
              <Text style={s.bold}>INFORMAR O NÚMERO DA CONTA CONTRATO E POTÊNCIA DA GD EXISTENTE</Text>
            </View>
            <View style={[s.l, { width: '25%' }]}><Text>Potência de Geração Existente</Text></View>
            <View style={[s.d, { width: '12%' }]}><Text></Text></View>
            <View style={[s.l, { width: '8%', textAlign: 'center' }]}><Text>kW</Text></View>
          </View>
          {/* Tarifa Branca */}
          <View style={s.row}>
            <View style={[s.lr, { width: '16%' }]}><Text>Tarifa Branca?</Text></View>
            <View style={[s.d, { width: '22%' }]}><Text>{v('tarifa_branca', pd)}</Text></View>
            <View style={[s.l, { width: '34%' }]}><Text>Terá adição de módulos em inversor existente?</Text></View>
            <View style={[s.d, { width: '28%' }]}><Text></Text></View>
          </View>
          {/* Cargas Especiais */}
          <View style={s.row}>
            <View style={[s.lr, { width: '16%' }]}><Text>Possui Cargas Especiais?</Text></View>
            <View style={[s.d, { width: '22%' }]}><Text>{v('possui_cargas_especiais', pd)}</Text></View>
            <View style={[s.l, { width: '24%' }]}><Text>Detalhar - Cargas especiais -</Text></View>
            <View style={[s.d, { width: '38%' }]}><Text></Text></View>
          </View>
          {/* Ramo de Atividade */}
          <View style={s.row}>
            <View style={[s.lr, { width: '38%' }]}><Text>Ramo de Atividade (Descrição)</Text></View>
            <View style={[s.d, { width: '62%' }]}><Text>{v('classe_uc', pd)}</Text></View>
          </View>
          {/* Classe / Tipo Ligação / Tensão */}
          <View style={s.row}>
            <View style={[s.lr, { width: '16%' }]}><Text>Classe (selecionar)</Text></View>
            <View style={[s.d, { width: '22%' }]}><Text>{v('classe_uc', pd)}</Text></View>
            <View style={[s.lr, { width: '24%' }]}><Text>Tipo de Ligação (selecionar)</Text></View>
            <View style={[s.d, { width: '10%' }]}><Text>{v('tipo_conexao', pd)}</Text></View>
            <View style={[s.lr, { width: '21%' }]}><Text>Tensão de Atendimento da UC</Text></View>
            <View style={[s.d, { width: '7%' }]}><Text>{v('tensao_atendimento', pd)} V</Text></View>
          </View>
          {/* Carga Declarada / Disjuntor / PD */}
          <View style={s.row}>
            <View style={[s.lr, { width: '38%' }]}><Text>Carga Declarada da UC</Text></View>
            <View style={[s.d, { width: '10%' }]}><Text>{fmtKW(pd?.carga_declarada_kw)} kW</Text></View>
            <View style={[s.lr, { width: '24%' }]}><Text>Disjuntor de Entrada da UC (selecionar)</Text></View>
            <View style={[s.d, { width: '14%' }]}><Text>{v('disjuntor_corrente_a', pd)} A</Text></View>
            <View style={[s.lr, { width: '7%' }]}><Text>Potência Disponibilizada (PD)</Text></View>
            <View style={[s.d, { width: '7%' }]}><Text>{fmtKW(pd?.potencia_disponibilizada_kw)} kW</Text></View>
          </View>
          {/* OK Carga / Ramal / Poste */}
          <View style={s.row}>
            <View style={[okCarga ? s.okCell : s.noOkCell, { width: '38%' }]}>
              <Text>OK: Carga Declarada {'<='} Potência Disponibilizada</Text>
            </View>
            <View style={[s.lr, { width: '10%' }]}><Text>Tipo de Ramal</Text></View>
            <View style={[s.d, { width: '14%' }]}><Text>{v('tipo_ramal', pd)}</Text></View>
            <View style={[s.lr, { width: '24%' }]}><Text>Nº poste ou transformador mais próximo</Text></View>
            <View style={[s.d, { width: '14%' }]}><Text>{v('numero_poste_transformador', pd)}</Text></View>
          </View>
          {/* Coordenadas UTM */}
          <View style={s.row}>
            <View style={[s.l, { width: '48%' }]}><Text>Coordenadas do ponto de entrega em UTM Fuso 23 ou Coordenadas Decimais</Text></View>
            <View style={[s.d, { width: '52%' }]}>
              <Text>Fuso: {v('coord_utm_fuso', pd)}  X = {v('coord_utm_x', pd)}  Y = {v('coord_utm_y', pd)}</Text>
            </View>
          </View>
          {/* Responsável Legal */}
          <View style={s.row}>
            <View style={[s.lr, { width: '38%' }]}><Text>Nome do Responsável Legal</Text></View>
            <View style={[s.d, { width: '24%' }]}><Text>{v('responsavel_legal_nome', pd)}</Text></View>
            <View style={[s.lr, { width: '24%' }]}><Text>Telefone do Responsável Legal</Text></View>
            <View style={[s.d, { width: '14%' }]}><Text>{v('responsavel_legal_telefone', pd)}</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '100%' }]}>
              <Text>
                <Text style={{ color: '#000000', fontFamily: 'Helvetica-Bold', fontSize: 5 }}>E-mail do Responsável Legal</Text>
                {'  '}{v('responsavel_legal_email', pd)}
              </Text>
            </View>
          </View>
        </View>

        {/* ===== SEÇÃO 2 — Responsável Técnico ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}><Text>2. Dados Cadastrais do Responsável Técnico</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.lr, { width: '14%' }]}><Text>Nome Completo</Text></View>
            <View style={[s.d, { width: '27%' }]}><Text>{v('responsavel_nome', pd)}</Text></View>
            <View style={[s.lr, { width: '13%' }]}><Text>Titulo Profissional</Text></View>
            <View style={[s.d, { width: '11%' }]}><Text>{v('responsavel_profissao', pd)}</Text></View>
            <View style={[s.lr, { width: '13%' }]}><Text>Registro Profissional</Text></View>
            <View style={[s.d, { width: '12%' }]}><Text>Nº {v('responsavel_registro', pd)}</Text></View>
            <View style={[s.lr, { width: '5%' }]}><Text>UF</Text></View>
            <View style={[s.d, { width: '5%' }]}><Text>{v('responsavel_uf', pd)}</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.lr, { width: '14%' }]}><Text>E-mail</Text></View>
            <View style={[s.d, { width: '27%' }]}><Text>{v('responsavel_email', pd)}</Text></View>
            <View style={[s.l, { width: '10%' }]}><Text>Telefone Fixo</Text></View>
            <View style={[s.d, { width: '12%' }]}><Text></Text></View>
            <View style={[s.l, { width: '10%' }]}><Text>Telefone Celular</Text></View>
            <View style={[s.d, { width: '12%' }]}><Text>{v('cliente_celular', pd)}</Text></View>
            <View style={[s.l, { width: '8%' }]}><Text>Empresa (opcional)</Text></View>
            <View style={[s.d, { width: '7%' }]}><Text></Text></View>
          </View>
        </View>

        {/* ===== SEÇÃO 3 — Características (5 colunas: 28,30,22,12,8) ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}><Text>3. Características da Microgeração Distribuída</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.ssh, { width: '58%' }]}><Text>Dados Gerais da Central Geradora</Text></View>
            <View style={[s.ssh, { width: '22%' }]}><Text>Descrição</Text></View>
            <View style={[s.ssh, { width: '20%' }]}><Text>Observações</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.lr, { width: '28%' }]}><Text>Tipo de Fonte Primária (selecionar)</Text></View>
            <View style={[s.d, { width: '30%' }]}><Text>SOLAR FOTOVOLTAICA</Text></View>
            <View style={[s.l, { width: '22%' }]}><Text>Especificar se necessário</Text></View>
            <View style={[s.d, { width: '20%' }]}><Text>-</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.lr, { width: '28%' }]}><Text>Tipo de Geração (selecionar)</Text></View>
            <View style={[s.d, { width: '30%' }]}><Text>EMPREGANDO CONVERSOR ELETRÔNICO/INVERSOR</Text></View>
            <View style={[s.l, { width: '22%' }]}><Text>Especificar se necessário</Text></View>
            <View style={[s.d, { width: '20%' }]}><Text>-</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.lr, { width: '28%' }]}><Text>Modalidade de Compensação (selecionar)</Text></View>
            <View style={[s.d, { width: '30%' }]}><Text>{v('modalidade_compensacao', pd)}</Text></View>
            <View style={[s.l, { width: '22%' }]}><Text></Text></View>
            <View style={[s.lr, { width: '12%' }]}><Text>Potência Geração do Orçamento</Text></View>
            <View style={[s.d, { width: '8%' }]}><Text>{potenciaKwp} kW</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '58%', backgroundColor: '#FFFF99', textAlign: 'center' }]}>
              <Text style={s.bold}>NÃO É NECESSÁRIO PREENCHER A LISTA DE RATEIO</Text>
            </View>
            <View style={[s.l, { width: '22%' }]}><Text></Text></View>
            <View style={[s.lr, { width: '12%' }]}><Text>Potência Geração Total da UC (PGT)</Text></View>
            <View style={[s.d, { width: '8%' }]}><Text>{potenciaKwp} kW</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.l, { width: '28%' }]}><Text>Armazenamento (se houver)</Text></View>
            <View style={[s.d, { width: '30%' }]}><Text></Text></View>
            <View style={[s.l, { width: '22%' }]}><Text></Text></View>
            <View style={[s.l, { width: '12%' }]}><Text>Potência Máxima Injetável (se aplicável)</Text></View>
            <View style={[s.d, { width: '8%' }]}><Text>- kW</Text></View>
          </View>
          <View style={s.row}>
            <View style={[okPGT ? s.okCell : s.noOkCell, { width: '58%' }]}><Text>OK: PGT {'<='} PD</Text></View>
            <View style={[s.l, { width: '22%' }]}><Text></Text></View>
            <View style={[s.lr, { width: '12%' }]}><Text>Data Início de Operação</Text></View>
            <View style={[okPGT ? s.okCell : s.d, { width: '8%' }]}><Text>{v('data_inicio_operacao', pd)}</Text></View>
          </View>
        </View>

        {/* ===== SEÇÃO 4 — Documentos (3 colunas: 5,65,30) ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}><Text>4. Documentos necessários que devem ser anexados à Solicitação de Orçamento de Conexão:</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.ch, { width: '5%' }]}><Text></Text></View>
            <View style={[s.ch, { width: '65%' }]}><Text>Descrição</Text></View>
            <View style={[s.ch, { width: '30%' }]}><Text>Observações</Text></View>
          </View>
          {([
            ['1.', 'Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021.', ''],
            ['2.', 'Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, que identifique o número do registro válido e o nome do responsável técnico, o local da obra ou serviço e as atividades profissionais desenvolvidas, caso seja exigível na legislação específica e na forma prevista nessa legislação.', ''],
            ['3.', 'Indicação do local do padrão ou da subestação de entrada no imóvel, exclusivamente nos casos em que ainda não estiverem instalados.', ''],
            ['4.', 'Diagrama unifilar e de blocos do sistema de geração, carga e proteção.', ''],
            ['5.', 'Memorial Técnico Descritivo da instalação (Conforme Modelo do ANEXO III - MODELO DE MEMORIAL TÉCNICO DESCRITIVO).', ''],
            ['6.', 'Relatório de ensaio, em língua portuguesa, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão com a rede, sempre que houver a utilização de conversores.', ''],
            ['7.', 'Dados necessários ao registro da central geradora distribuída conforme disponível no site da ANEEL.', ''],
            ['8.', 'Lista de unidades consumidoras participantes do sistema de compensação (se houver), indicando o percentual ou a ordem de utilização dos excedentes (Opcional).', 'Para autoconsumo remoto, geração compartilhada e empreendimento de múltiplas unidades consumidoras'],
            ['9.', 'Cópia de instrumento jurídico que comprove a participação dos integrantes para os casos de múltiplas unidades consumidoras e geração compartilhada. (Caso aplicável)', 'Apenas para os casos de empreendimentos com múltiplas unidades consumidoras e geração compartilhada.'],
            ['10.', 'Documento que comprove o reconhecimento pela ANEEL, da cogeração qualificada (se houver).', 'Apenas para cogeração qualificada'],
            ['11.', 'Dados de segurança das barragens no caso do uso de sistemas com fontes hídricas, conforme Resolução Normativa nº 696/2015. (Caso aplicável)', ''],
            ['12.', 'Para centrais fotovoltaicas enquadradas como despacháveis, comprovação de que o sistema de armazenamento atende o disposto no art. 655-B da Resolução Normativa nº 1.000/2021. (Caso aplicável)', ''],
            ['13.', 'Documento com data que comprove a propriedade ou posse do imóvel onde será implantada a unidade consumidora com microgeração ou minigeração distribuída.', 'Apenas nos casos de Ligação Nova de UC com Microgeração ou Alteração da Potência Disponibilizada de UC Existente'],
            ['14.', 'Formulário de Troca de Padrão (Conforme ANEXO IV - FORMULÁRIO DE TROCA DE PADRÃO).', 'Apenas no caso de unidade consumidora existente com alteração de potência disponibilizada que implique em troca de padrão'],
            ['15.', 'Autorização de uso de área comum em condomínio (quando necessário, conforme observação).', 'Quando uma UC individualmente construir uma central geradora utilizando a área comum do condomínio'],
            ['16.', 'Procuração Autenticada (quando necessário, conforme observação).', 'Quando a solicitação for feita por terceiros'],
            ['17.', 'Apresentação de licença ou declaração emitida pelo órgão competente caso as instalações ou a extensão de rede de responsabilidade do consumidor e demais usuários ocuparem áreas protegidas pela legislação. (Caso aplicável)', ''],
          ] as [string, string, string][]).map(([num, desc, obs]) => (
            <View key={num} style={s.row}>
              <View style={[s.d, { width: '5%', textAlign: 'center' }]}><Text>{num}</Text></View>
              <View style={[s.d, { width: '65%', fontSize: 6 }]}><Text>{desc}</Text></View>
              <View style={[s.d, { width: '30%', fontSize: 6, color: '#595959' }]}><Text>{obs}</Text></View>
            </View>
          ))}
        </View>

        {/* ===== SEÇÃO 5 ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}><Text>5. Documentos necessários que devem ser anexados à Solicitação de Orçamento Estimado:</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '100%', fontSize: 6, lineHeight: 1.4 }]}>
              <Text>Para solicitar orçamento estimado é necessário preencher apenas os dados básicos da unidade consumidora, a tensão de atendimento e indicação da potência de geração no campo que surgirá ao lado do tipo de orçamento. Devem ser enviados também documentos de identificação do consumidor e, caso existam, procurações e documentações dos representantes legais, conforme Tabela 3 da norma NT.00020.EQTL. Caso o orçamento estimado seja solicitado para uma localização onde ainda não exista unidade consumidora, é necessário anexar à solicitação planta de situação conforme modelo da norma NT.00020.EQTL.</Text>
            </View>
          </View>
        </View>

        {/* ===== SEÇÃO 6 — Declarações (2 colunas: 92,8) ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}><Text>6. Solicitações e Declarações</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '92%', fontSize: 6 }]}><Text>Solicito que a contagem do prazo para realização da vistoria pela CONCESSIONÁRIA, conforme art. 68 da Resolução Normativa nº 1.000/2021, inicie-se somente após minha solicitação.</Text></View>
            <View style={[s.d, { width: '8%', textAlign: 'center' }]}><Text style={s.bold}>SIM</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '92%', fontSize: 6 }]}><Text>Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade.</Text></View>
            <View style={[s.d, { width: '8%', textAlign: 'center' }]}><Text style={s.bold}>SIM</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '92%', fontSize: 6 }]}><Text>Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da Associação Brasileira de Normas Técnica - ABNT e às normas dos órgãos oficiais competentes, e ao art. 8º da Lei nº 9.074, de 1995, naquilo que for aplicável.</Text></View>
            <View style={[s.d, { width: '8%', textAlign: 'center' }]}><Text style={s.bold}>SIM</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '100%', fontSize: 6 }]}><Text>Solicito dispensa da análise de inversão de fluxo por enquadramento no art. 73-A da REN 1000, na seguinte regra:</Text></View>
          </View>
          {([
            ['Não injeção na rede de distribuição de energia elétrica ("Grid Zero")', 'NÃO'],
            ['Enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência de geração compatível com o consumo no horário de geração', 'NÃO'],
            ['Modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW, observado o item 7 ("Fast Track")', 'NÃO'],
          ] as [string, string][]).map(([text, val]) => (
            <View key={text} style={s.row}>
              <View style={[s.d, { width: '92%', fontSize: 6, paddingLeft: 10 }]}><Text>▪ {text}</Text></View>
              <View style={[s.d, { width: '8%', textAlign: 'center' }]}><Text style={s.bold}>{val}</Text></View>
            </View>
          ))}
          <View style={s.row}>
            <View style={[s.d, { width: '92%', fontSize: 6 }]}><Text>Declaro, para todos os fins, que todas as informações prestadas neste documento são verdadeiras.</Text></View>
            <View style={[s.d, { width: '8%', textAlign: 'center' }]}><Text style={s.bold}>SIM</Text></View>
          </View>
        </View>

        {/* ===== SEÇÃO 7 — Termo de Aceite ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}><Text>7. Termo de Aceite das condições para afastamento da análise de inversão de fluxo (Opcional)</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '100%', fontSize: 6, lineHeight: 1.4 }]}>
              <Text>Solicito o afastamento da análise de inversão de fluxo, nos termos do inciso III do caput do art. 73-A da Resolução Normativa nº 1.000/2021, e declaro estar ciente de que: 1) a unidade consumidora será enquadrada na modalidade autoconsumo local; 2) fica vedada, em qualquer hipótese, a alocação ou realocação de excedentes ou de créditos de energia em unidade consumidora distinta de onde ocorreu a geração de energia elétrica; e 3) para alteração de enquadramento da modalidade da microgeração deverá ser encerrado o contrato e solicitado novo orçamento de conexão, vedada a aplicação do art. 655-M. Declaro também reconhecer que essa opção é irrevogável e irretratável, implicando no meu dever de observar o que estabelece o art. 73-A da referida Resolução.</Text>
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '100%', fontSize: 6 }]}>
              <Text>Local e Data: _______________________________{'        '}Assinatura: _______________________________</Text>
            </View>
          </View>
        </View>

        {/* ===== SEÇÃO 8 + RODAPÉ (3 colunas: 35,35,30) ===== */}
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.d, { width: '35%', fontSize: 6, lineHeight: 1.4 }]}>
              <Text style={s.bold}>8. Este formulário deve ser preenchido e encaminhado aos canais de atendimento Corporativo da Concessionária{'\n'}</Text>
              <Text>
                <Text style={s.bold}>ALAGOAS</Text>{' - Sede de regionais (Maceió, Arapiraca, Matriz de Camaragibe e Santana do Ipanema)\n'}
                <Text style={s.bold}>AMAPÁ</Text>{' - Sede de regionais (Macapá)\n'}
                <Text style={s.bold}>GOIÁS</Text>{' - Sede de regionais (Goiânia, Luziânia, Anápolis, Rio Verde e Iporá)\n'}
                <Text style={s.bold}>MARANHÃO</Text>{' - Sede de regionais (São Luís, Imperatriz, Timon, Balsas e Bacabal)\n'}
                <Text style={s.bold}>PARÁ</Text>{' - Sede de regionais (Belém, Castanhal, Marabá, Santarém e Altamira)\n'}
                <Text style={s.bold}>PIAUÍ</Text>{' - Sede de regionais (Teresina, Parnaíba, Picos, Bom Jesus e Floriano)\n'}
                <Text style={s.bold}>RIO GRANDE DO SUL</Text>{' - Sede de regionais (Porto Alegre, Osório e Pelotas)\n\n'}
                {'Em caso de dúvidas entrar em contato com os canais de atendimento disponibilizados na norma NT.00020.EQTL.Normas e Qualidade.'}
              </Text>
            </View>
            <View style={[s.d, { width: '35%', fontSize: 6, lineHeight: 1.4 }]}>
              <Text>Eu, acessante identificado neste formulário, venho por meio deste instrumento, solicitar o acesso para microgeração distribuída, fornecendo meus dados cadastrais assim como os documentos necessários, em conformidade com as normas e resoluções aplicáveis.</Text>
            </View>
            <View style={[s.d, { width: '30%', fontSize: 6 }]}>
              <View style={{ borderWidth: 0.5, borderColor: BC, padding: 3 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6 }}>{v('responsavel_nome', pd)}</Text>
                <Text style={{ fontSize: 6, marginTop: 2 }}>
                  {v('responsavel_profissao', pd)}{'\n'}Reg.: {v('responsavel_registro', pd)}
                </Text>
              </View>
            </View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '35%', fontSize: 6 }]}>
              <Text>{v('cidade', pd)}-{v('estado', pd)}</Text>
              <Text style={{ borderTopWidth: 0.5, borderColor: BC, marginTop: 14, paddingTop: 2, fontSize: 5, color: '#595959' }}>Local</Text>
            </View>
            <View style={[s.d, { width: '35%', fontSize: 6 }]}>
              <Text>{v('data', pd)}</Text>
              <Text style={{ borderTopWidth: 0.5, borderColor: BC, marginTop: 14, paddingTop: 2, fontSize: 5, color: '#595959' }}>Data</Text>
            </View>
            <View style={[s.d, { width: '30%', fontSize: 6, textAlign: 'center' }]}>
              <Text style={{ borderTopWidth: 0.5, borderColor: BC, marginTop: 28, paddingTop: 2, fontSize: 5, color: '#595959' }}>Assinatura do Responsável</Text>
            </View>
          </View>
        </View>

        <Text style={[s.small, { textAlign: 'center', marginTop: 2 }]}>
          GERÊNCIA CORPORATIVA DE NORMAS E QUALIDADE. NT.00020.EQTL.Normas e Qualidade ANEXO I - FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE MICROGERAÇÃO DISTRIBUÍDA GRUPO B REVISÃO 06. DATA: 04/11/2025.
        </Text>
      </Page>

      {/* ===== PÁGINA 2 — UNIDADES GERADORAS ===== */}
      <Page size="A4" style={s.page}>
        <View style={[s.tbl, { marginBottom: 6 }]}>
          <View style={s.row}>
            <View style={[s.sh, { width: '100%' }]}>
              <Text>{'Informações das Unidades Geradoras (UG): '}
                <Text style={{ color: '#FF9999' }}>(PREENCHER CONFORME O TIPO DE FONTE DE GERAÇÃO)</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 1. Solar Fotovoltaica */}
        <Text style={s.sectionLabel}>1. Solar Fotovoltaica</Text>
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.chBlue, { width: '5%' }]}><Text>Item</Text></View>
            <View style={[s.chBlue, { width: '16%' }]}><Text>Potência do Módulo (W)</Text></View>
            <View style={[s.chBlue, { width: '12%' }]}><Text>Quantidade</Text></View>
            <View style={[s.chBlue, { width: '18%' }]}><Text>Potência de Pico (kWp):</Text></View>
            <View style={[s.chBlue, { width: '16%' }]}><Text>Área do arranjo (m²):</Text></View>
            <View style={[s.chBlue, { width: '20%' }]}><Text>Fabricante(s) dos Módulos</Text></View>
            <View style={[s.chBlue, { width: '13%' }]}><Text>Modelo</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.d, { width: '5%', textAlign: 'center' }]}><Text>1</Text></View>
            <View style={[s.d, { width: '16%', textAlign: 'center' }]}><Text>{v('modulos_potencia_wp', pd)}</Text></View>
            <View style={[s.d, { width: '12%', textAlign: 'center' }]}><Text>{v('modulos_quantidade', pd)}</Text></View>
            <View style={[s.d, { width: '18%', textAlign: 'center' }]}><Text>{potenciaKwp}</Text></View>
            <View style={[s.d, { width: '16%', textAlign: 'center' }]}><Text>{v('modulos_area_m2', pd)}</Text></View>
            <View style={[s.d, { width: '20%' }]}><Text>{v('modulos_fabricante', pd)}</Text></View>
            <View style={[s.d, { width: '13%' }]}><Text>{v('modulos_modelo', pd)}</Text></View>
          </View>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={s.row}>
              <View style={[s.dPeach, { width: '5%', textAlign: 'center' }]}><Text>{i + 2}</Text></View>
              <View style={[s.dPeach, { width: '16%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '12%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '18%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '16%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '20%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '13%' }]}><Text></Text></View>
            </View>
          ))}
          <View style={s.row}>
            <View style={[s.totGray, { width: '5%' }]}><Text>TOTAL</Text></View>
            <View style={[s.totGray, { width: '16%' }]}><Text></Text></View>
            <View style={[s.tot, { width: '12%' }]}><Text>{v('modulos_quantidade', pd)}</Text></View>
            <View style={[s.tot, { width: '18%' }]}><Text>{potenciaKwp}</Text></View>
            <View style={[s.tot, { width: '16%' }]}><Text>{v('modulos_area_m2', pd)}</Text></View>
            <View style={[s.totGray, { width: '20%' }]}><Text></Text></View>
            <View style={[s.totGray, { width: '13%' }]}><Text></Text></View>
          </View>
        </View>
        <Text style={[s.small, { marginBottom: 4 }]}>Obs: Célula fotovoltaica é a unidade básica, módulo é o conjunto de células e arranjo é o agrupamento de módulos, o gerador fotovoltaico é o conjunto de arranjos.</Text>

        {/* 2. Dados dos Inversores */}
        <Text style={s.sectionLabel}>2. Dados dos Inversores</Text>
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.chBlue, { width: '4%' }]}><Text>Item</Text></View>
            <View style={[s.chBlue, { width: '14%' }]}><Text>Fabricante*</Text></View>
            <View style={[s.chBlue, { width: '16%' }]}><Text>Modelo*</Text></View>
            <View style={[s.chBlue, { width: '12%' }]}><Text>Potência Nominal (kW)</Text></View>
            <View style={[s.chBlue, { width: '13%' }]}><Text>Faixa de tensão de operação (V)</Text></View>
            <View style={[s.chBlue, { width: '10%' }]}><Text>Corrente Nominal (A)</Text></View>
            <View style={[s.chBlue, { width: '11%' }]}><Text>Fator de Potência</Text></View>
            <View style={[s.chBlue, { width: '10%' }]}><Text>Rendimento (%)</Text></View>
            <View style={[s.chBlue, { width: '10%' }]}><Text>DHT de Corrente (%)</Text></View>
          </View>
          {Array.from({ length: inversoresQtd }).map((_, i) => (
            <View key={i} style={s.row}>
              <View style={[s.d, { width: '4%', textAlign: 'center' }]}><Text>{i + 1}</Text></View>
              <View style={[s.d, { width: '14%' }]}><Text>{v('inversores_fabricante', pd)}</Text></View>
              <View style={[s.d, { width: '16%' }]}><Text>{v('inversores_modelo', pd)}</Text></View>
              <View style={[s.d, { width: '12%', textAlign: 'center' }]}><Text>{v('inversores_potencia', pd)}</Text></View>
              <View style={[s.d, { width: '13%', textAlign: 'center' }]}><Text>{v('inversores_faixa_tensao', pd)}</Text></View>
              <View style={[s.d, { width: '10%', textAlign: 'center' }]}><Text>{v('inversores_corrente_nominal', pd)}</Text></View>
              <View style={[s.d, { width: '11%', textAlign: 'center' }]}><Text>{v('inversores_fator_potencia', pd)}</Text></View>
              <View style={[s.d, { width: '10%', textAlign: 'center' }]}><Text>{v('inversores_rendimento', pd)}</Text></View>
              <View style={[s.d, { width: '10%', textAlign: 'center' }]}><Text>{v('inversores_dht_corrente', pd)}</Text></View>
            </View>
          ))}
          {Array.from({ length: Math.max(0, 30 - inversoresQtd) }).map((_, i) => (
            <View key={i} style={s.row}>
              <View style={[s.dPeach, { width: '4%', textAlign: 'center' }]}><Text>{inversoresQtd + i + 1}</Text></View>
              <View style={[s.dPeach, { width: '14%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '16%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '12%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '13%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '10%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '11%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '10%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '10%' }]}><Text></Text></View>
            </View>
          ))}
          <View style={s.row}>
            <View style={[s.totGray, { width: '4%' }]}><Text>TOTAL</Text></View>
            <View style={[s.totGray, { width: '14%' }]}><Text></Text></View>
            <View style={[s.totGray, { width: '16%' }]}><Text></Text></View>
            <View style={[s.tot, { width: '12%' }]}><Text>{totalInvPotencia}</Text></View>
            <View style={[s.totGray, { width: '13%' }]}><Text></Text></View>
            <View style={[s.totGray, { width: '10%' }]}><Text></Text></View>
            <View style={[s.totGray, { width: '11%' }]}><Text></Text></View>
            <View style={[s.totGray, { width: '10%' }]}><Text></Text></View>
            <View style={[s.totGray, { width: '10%' }]}><Text></Text></View>
          </View>
        </View>
        <Text style={[s.small, { marginBottom: 4 }]}>Obs: Unidades Geradoras Fotovoltaicas e Eólicas</Text>

        {/* 3. Eólica */}
        <Text style={s.sectionLabel}>3. Eólica</Text>
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.chBlue, { width: '4%' }]}><Text>Item</Text></View>
            <View style={[s.chBlue, { width: '16%' }]}><Text>Fabricante/Modelo</Text></View>
            <View style={[s.chBlue, { width: '9%' }]}><Text>Eixo do rotor (horiz./vert.)*</Text></View>
            <View style={[s.chBlue, { width: '8%' }]}><Text>Altura Máxima da Pá (m)*</Text></View>
            <View style={[s.chBlue, { width: '8%' }]}><Text>Diâmetro do rotor (m)</Text></View>
            <View style={[s.chBlue, { width: '9%' }]}><Text>Controle de Potência</Text></View>
            <View style={[s.chBlue, { width: '8%' }]}><Text>Vel. rotação nom./Sobrevel. máx. (rpm)</Text></View>
            <View style={[s.chBlue, { width: '9%' }]}><Text>Vel. vento Entrada (m/s)</Text></View>
            <View style={[s.chBlue, { width: '9%' }]}><Text>Vel. vento Saída (m/s)</Text></View>
            <View style={[s.chBlue, { width: '9%' }]}><Text>Pot. Entrada (kW)</Text></View>
            <View style={[s.chBlue, { width: '9%' }]}><Text>Pot. Saída (kW)</Text></View>
            <View style={[s.chBlue, { width: '6%' }]}><Text>MD²/4 (kg.m²)</Text></View>
            <View style={[s.chBlue, { width: '6%' }]}><Text>Cert.</Text></View>
          </View>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={s.row}>
              <View style={[s.dPeach, { width: '4%', textAlign: 'center' }]}><Text>{i + 1}</Text></View>
              {([16, 9, 8, 8, 9, 8, 9, 9, 9, 9, 6, 6] as number[]).map((w, j) => (
                <View key={j} style={[s.dPeach, { width: `${w}%` }]}><Text></Text></View>
              ))}
            </View>
          ))}
          <View style={s.row}>
            <View style={[s.tot, { width: '4%' }]}><Text>TOTAL</Text></View>
            {([16, 9, 8, 8, 9, 8, 9, 9, 9, 9, 6, 6] as number[]).map((w, j) => (
              <View key={j} style={[s.dPeach, { width: `${w}%` }]}><Text></Text></View>
            ))}
          </View>
        </View>
        <Text style={[s.small, { marginBottom: 4 }]}>Obs: No caso de aerogerador não convencional informar a altura máxima atingida pela estrutura. (1) Passo variável (Stall), Estol (pitch), Estol ativo (active stall), etc.</Text>

        {/* 4. Hidráulica */}
        <Text style={s.sectionLabel}>4. Hidráulica</Text>
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.chBlue, { width: '4%' }]}><Text>Item</Text></View>
            {(['Rio', 'Bacia / SubBacia', 'Tipo turbina', 'Fabricante Turbina', 'Potência Turbina (kVA)', 'Fabricante Gerador', 'Potência Gerador (kVA)', 'Fator de Potência', 'Potência Gerador (kW)'] as string[]).map(h => (
              <View key={h} style={[s.chBlue, { flex: 1 }]}><Text>{h}</Text></View>
            ))}
          </View>
          {[1, 2, 3].map(i => (
            <View key={i} style={s.row}>
              <View style={[s.dPeach, { width: '4%', textAlign: 'center' }]}><Text>{i}</Text></View>
              {Array.from({ length: 9 }).map((_, j) => <View key={j} style={[s.dPeach, { flex: 1 }]}><Text></Text></View>)}
            </View>
          ))}
          <View style={s.row}>
            <View style={[s.totGray, { width: '4%' }]}><Text>TOTAL</Text></View>
            {Array.from({ length: 9 }).map((_, j) => <View key={j} style={[s.totGray, { flex: 1 }]}><Text></Text></View>)}
          </View>
        </View>

        {/* 5. Térmica */}
        <Text style={s.sectionLabel}>5. Térmica (Biomassa/Solar Térmica/Cogeração)</Text>
        <View style={s.tbl}>
          <View style={s.row}>
            <View style={[s.chBlue, { width: '20%' }]}><Text>Informação</Text></View>
            <View style={[s.chBlue, { width: '20%' }]}><Text>Especificação</Text></View>
            <View style={[s.chBlue, { width: '20%' }]}><Text>Unidade</Text></View>
            <View style={[s.chBlue, { width: '20%' }]}><Text>Periodicidade</Text></View>
            <View style={[s.chBlue, { width: '20%' }]}><Text>Observação</Text></View>
          </View>
          {([
            ['Fabricante das Turbinas*', ''],
            ['Tipo de Turbina* (1)', ''],
            ['Fabricante/Modelo do Gerador', ''],
            ['Potência Nominal de Placa', 'kVA'],
            ['Potência Máxima em Regime Contínuo', 'kW'],
            ['Corrente Nominal', 'A'],
            ['Tensão Nominal', 'kV'],
            ['Frequência Nominal', 'Hz'],
            ['Velocidade Nominal', 'rpm'],
            ['Número de fases', ''],
            ['Tipo e Ligação (2)', ''],
            ['Número de pólos', ''],
            ['Fator de Potência Máximo* (3)', ''],
          ] as [string, string][]).map(([label, unit]) => (
            <View key={label} style={s.row}>
              <View style={[s.l, { width: '20%' }]}><Text>{label}</Text></View>
              <View style={[s.dPeach, { width: '20%' }]}><Text></Text></View>
              <View style={unit ? [s.d, { width: '20%' }] : [s.dPeach, { width: '20%' }]}><Text>{unit}</Text></View>
              <View style={[s.dPeach, { width: '20%' }]}><Text></Text></View>
              <View style={[s.dPeach, { width: '20%' }]}><Text></Text></View>
            </View>
          ))}
        </View>
        {/* Rodapé legenda Térmica */}
        <View style={{ marginTop: 2 }}>
          <Text style={s.small}>(1) G/V/O</Text>
          <Text style={s.small}>(2) Y ou Δ</Text>
          <Text style={s.small}>(3) Sobre-excitado ou Sub-excitado</Text>
        </View>
      </Page>
    </Document>
  );
}
