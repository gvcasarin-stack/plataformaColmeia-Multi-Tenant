import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

interface AnexoFCPFLPDFProps {
  projectData?: Record<string, any>;
}

const PADRAO_CABOS: Record<string, string> = {
  A1: '6 mm²',  A2: '16 mm²', A3: '6 mm²',  A4: '16 mm²',
  B1: '16 mm²', B2: '25 mm²', B3: '16 mm²',
  C1: '16 mm²', C2: '25 mm²', C3: '35 mm²',
  C4: '50 mm²', C5: '70 mm²', C6: '95 mm²',
  C7: '10 mm²', C8: '16 mm²', C9: '25 mm²',
  C10: '35 mm²', C11: '50 mm²',
};

// ✅ Mesmos rótulos usados no seletor "Categoria do Padrão de Entrada" do modal
// Conferir Informações (ConferirInformacoesModal.tsx, CPFL_PADRAO_127_220/220_380)
const PADRAO_ENTRADA_LABELS: Record<string, string> = {
  A1: 'A1 - GED 13',
  A2: 'A2 - GED 13',
  B1: 'B1 - GED 13',
  B2: 'B2 - GED 13',
  C1: 'C1 - GED 13',
  C2: 'C2 - GED 13',
  C3: 'C3 - GED 13',
  C4: 'C4 - GED 13',
  C5: 'C5 - GED 13',
  C6: 'C6 - GED 13',
  A3: 'A3 - GED 13',
  A4: 'A4 - GED 13',
  B3: 'B3 - GED 13',
  C7: 'C7 - GED 13',
  C8: 'C8 - GED 13',
  C9: 'C9 - GED 13',
  C10: 'C10 - GED 13',
  C11: 'C11 - GED 13',
};

function decimalToDMS(decimal: string, type: 'lat' | 'lng'): string {
  const num = parseFloat(decimal);
  if (isNaN(num)) return decimal;
  const abs = Math.abs(num);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(1);
  const dir = type === 'lat' ? (num >= 0 ? 'N' : 'S') : (num >= 0 ? 'E' : 'W');
  return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(4, '0')}"${dir}`;
}

const B = 0.75;
const BC = '#888888';

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    color: '#000000',
  },
  title: { textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 10, marginBottom: 12, lineHeight: 1.4 },
  paragraph: { textAlign: 'justify', fontSize: 7.5, marginBottom: 8, lineHeight: 1.4 },
  tbl: { borderTopWidth: B, borderLeftWidth: B, borderColor: BC, marginBottom: 10 },
  row: { flexDirection: 'row' },
  sh: {
    backgroundColor: '#4a4a4a',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  shc: {
    backgroundColor: '#4a4a4a',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  l: {
    backgroundColor: '#FFFFFF',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  v: {
    backgroundColor: '#FFFFFF',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  vc: {
    backgroundColor: '#FFFFFF',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    textAlign: 'center',
  },
  checkboxRow: { flexDirection: 'row', flexWrap: 'wrap' },
  checkboxItem: { width: '50%', fontSize: 7.5, marginBottom: 3 },
});

export function AnexoFCPFLPDF({ projectData = {} }: AnexoFCPFLPDFProps) {
  const get = (key: string) => projectData[key] || '';

  const cabosSecao = PADRAO_CABOS[get('padrao_entrada')] || get('cabos_secao') || '';
  const caixaTipo = get('cpfl_tipo_poste_padrao') || get('caixa_medicao_tipo') || '';
  const padraoEntradaLabel = PADRAO_ENTRADA_LABELS[get('padrao_entrada')] || get('padrao_entrada');
  const municipio = [get('client_city'), get('client_state')].filter(Boolean).join(' - ');
  // ✅ Seção 2b (Dados Técnicos — se Minigeração) só deve ser preenchida quando o
  // projeto for classificado como Minigeração; em Microgeração, os campos ficam em branco.
  const isMinigeracao = get('tipo_fornecimento') === 'Minigeração Distribuída';

  const secao2bRows: [string, string][] = [
    ['2.1) Carga instalada (kW): *', ''],
    ['2.2) Demanda contratada (kW): *', ''],
    ['2.3) Quantidade de motores com potência acima de 75 CV: *', ''],
    ['2.4) Quantidade de motores com potência menor ou igual a 75 CV: *', ''],
    ['2.5) Potência instalada de geração (kVA): *', ''],
    ['2.6) Potência exportada de geração (kW): *', ''],
    ['2.7) Nome do responsável técnico: *', isMinigeracao ? get('responsavel_nome') : ''],
    ['2.8) Número do registro (CREA) do responsável técnico: *', isMinigeracao ? get('responsavel_registro') : ''],
    ['2.9) Número do telefone do responsável técnico:', ''],
    ['2.10) Data pretendida para entrada em operação (dd/mm/aaaa):', isMinigeracao ? get('data_inicio_operacao') : ''],
  ];

  const secao2cRows = [
    '2.1) Potência Nominal (kVA): *',
    '2.2) Tensão Primária (kV): *',
    '2.3) Tensão Secundária (V): *',
    '2.4) Impedância de curto-circuito (Z%): *',
    '2.5) Configuração de ligação: *',
    '2.6) Tensão de geração/Saída do inversor (Vca): *',
  ];

  const secao4Rows = [
    '4.1) Fabricante do aerogerador:',
    '4.2) Modelo do aerogerador:',
    '4.3) Eixo rotor (horizontal ou vertical):',
    '4.4) Altura máxima da pá ou atingida pela estrutura (m):',
    '4.5) Potência dos inversores (soma das potências dos inversores, kW): *',
    '4.6) Potência dos aerogeradores (soma potências dos aerogeradores, kW): *',
    '4.7) Data pretendida para entrada em operação (dd/mm/aaaa):',
    '4.8) Fabricante, modelo e tipo de conexão dos inversores:',
    '4.9) Quantidade de inversores: *',
    '4.10) Potência (soma das potências nominais dos inversores, kW): *',
  ];

  const secao5Rows = [
    '5.1) Rio onde se localiza a central geradora:',
    '5.2) Bacia onde se localiza o rio:',
    '5.3) Sub-bacia onde se localiza o rio:',
    '5.4) Tipo de turbina: *',
    '5.5) Potência turbina (soma potências nominais das turbinas, kVA): *',
    '5.6) Potência gerador (soma potências nominais dos geradores, kVA): *',
    '5.7) Fator de potência do gerador (entre 0 e 1): *',
    '5.8) Potência ativa do gerador (kW): *',
    '5.9) Potência aparente do gerador (kVA): *',
    '5.10) Tensão (kV):',
    '5.11) Nível Operacional Normal de Montante (m)',
    '5.12) Nível Operacional Normal de Jusante (m)',
    '5.13) Data pretendida para entrada em operação (dd/mm/aaaa):',
    '5.14) Fabricante, modelo e tipo de conexão dos inversores:',
    '5.15) Quantidade de inversores: *',
    '5.16) Potência (soma das potências nominais dos inversores, kW): *',
  ];

  const secao6Rows = [
    '6.1) Fabricante e modelo:',
    '6.2) Potência (soma das potências nominais dos geradores, kVA): *',
    '6.3) Fator de potência (entre 0 e 1): *',
    '6.4) Potência ativa (kW): *',
    '6.5) Fonte (indicar segundo lista do Item 7 a seguir, conforme aplicável): *',
    '6.6) Data pretendida para entrada em operação (dd/mm/aaaa):',
    '6.7) Ciclo (aberto/fechado): *',
    '6.8) Máquina Motriz: *',
    '6.9) Número do Despacho de qualificação como cogeradora: *',
    '6.10) Data do Despacho: *',
    '6.11) Tensão Terminal Nominal (Vn kV)',
    '6.12) Reatância síncrona de eixo direto (Xd, em pu)',
    '6.13) Reatância transitória de eixo direto (Xd\', em pu)',
    '6.14) Reatância sub-transitória de eixo direto (Xd\'\', em pu)',
    '6.15) Reatância de sequência negativa (X2, em pu)',
    '6.16) Reatância de sequência zero (X0, em pu)',
    '6.17) Reatância síncrona de eixo em quadratura (Xq, em pu)',
    '6.18) Resistência do enrolamento de armadura (Ra, em pu)',
    '6.19) Constante de inércia, em segundos (H)',
    '6.20) Constante de amortecimento, em pu/pu. (D)',
    '6.21) Fabricante, modelo e tipo de conexão dos inversores:',
    '6.22) Quantidade de inversores: *',
    '6.23) Potência (soma das potências nominais dos inversores, kW): *',
  ];

  const fontesBiomassa = [
    'Biogás (floresta)',
    'Biogás (resíduo sólido urbano, RU)',
    'Biogás (resíduo animal, RA)',
    'Biogás (agroindustrial)',
    'Carvão vegetal',
    'Gás de alto-forno (de biomassa)',
    'Lenha',
    'Licor negro',
    'Resíduos de madeira',
    'Etanol',
    'Óleos vegetais',
    'Bagaço de cana-de-açúcar',
    'Capim elefante',
    'Casca de arroz',
  ];

  const fontesFossil = [
    'Gás de alto-forno (de petróleo)',
    'Gás de refinaria (de petróleo)',
    'Óleo combustível',
    'Óleo diesel',
    'Outros energéticos de petróleo',
    'Carvão mineral',
    'Calor de processo (de carvão mineral)',
    'Gás de alto-forno (de carvão mineral)',
    'Gás natural',
    'Calor de processo (de gás natural)',
    'Calor de processo (de outras fontes fósseis)',
    'Turfa',
    'Xisto',
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>
          ANEXO F – Dados para Registro de Micro e Minigeradores Distribuídos Participantes do{'\n'}
          Sistema de Compensação de Energia Elétrica
        </Text>

        <Text style={s.paragraph}>
          Na ocasião da Solicitação de Acesso, as informações pedidas para este Anexo F são
          mandatórias e serão remetidas pela CPFL à ANEEL, conforme por esta própria determinado, após
          a liberação da conexão. O acessante deverá estar ciente de que a citada liberação também depende
          do correto preenchimento do que aqui se solicita. Este refere-se a cada unidade consumidora que
          tiver aprovada central de micro ou minigeração distribuída aderente ao sistema de compensação de
          energia elétrica e deverá ser preenchida pelo acessante (deixar em branco o que não se aplicar).
        </Text>
        <Text style={s.paragraph}>
          Na ocasião da Consulta de Acesso é incentivado que o acessante envie este anexo preenchido,
          em especial os itens marcados com asterisco. Somente com as informações destes itens será
          possível avaliar a viabilidade e estimar as obras em virtude da conexão de minigeradores.
          Sem eles, a Informação de Acesso da CPFL conterá apenas os dados elétricos da região em
          que pretende-se conexão.
        </Text>

        {/* Seção 1: Dados da UC */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>1) Dados da Unidade Consumidora (UC):</Text></View>
          </View>
          {([
            ['1.1) Nome do titular: *', get('nomeClienteFinal')],
            ['1.2) CNPJ ou CPF (titular): *', get('cpf_cnpj_cliente_final')],
            ['1.3) Número da UC (se existente) *', get('conta_contrato')],
            ['1.4) Endereço do titular', get('endereco_local').toUpperCase()],
            ['1.5) CEP do titular', get('cliente_cep')],
            ['1.6) Município do titular', municipio.toUpperCase()],
            ['1.7) Latitude (SIRGAS 2000)', get('latitude') ? decimalToDMS(get('latitude'), 'lat') : ''],
            ['1.8) Longitude (SIRGAS 2000)', get('longitude') ? decimalToDMS(get('longitude'), 'lng') : ''],
            ['1.9) Telefone do titular:', get('cliente_celular') || get('cliente_telefone_fixo')],
            ['1.10) E-mail do titular:', get('cliente_email')],
            ['1.11) Usina foi objeto de Outorga ou Registro?', '[ ] Sim     [X] Não     Se sim, preencher os campos abaixo'],
            ['1.12) CEG', ''],
            ['1.13) Número do Ato de Outorga ou Registro', ''],
            ['1.14) Ano do Ato de Outorga ou Registro', ''],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.v, { width: '58%' }]}><Text>{value}</Text></View>
            </View>
          ))}
        </View>

        {/* Seção 2a: Microgeração */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>2a) Dados Técnicos da Unidade Consumidora (se Microgeração)</Text></View>
            <View style={[s.shc, { width: '29%' }]}><Text>Existente</Text></View>
            <View style={[s.shc, { width: '29%' }]}><Text>Novo</Text></View>
          </View>
          {([
            ['2.1) Padrão de Entrada (categoria - GED 13/RIC BT):', padraoEntradaLabel],
            ['2.2) Tipo de Atendimento (aéreo/subterrâneo):', get('tipo_ramal').toUpperCase()],
            ['2.3) Número de Fases da Instalação (Monofásico/Bifásico/Trifásico):', get('fases_instalacao') ? String(get('fases_instalacao')).toUpperCase() : ''],
            ['2.4) Cabos (seção transversal):', cabosSecao],
            ['2.5) Caixa de Medição ou Tipo de Poste Padrão (Caixa tipo / segundo GED 14945):', caixaTipo],
            ['2.6) Demanda Disponibilizada (se MT) ou Carga Instalada (se BT):', get('carga_declarada_kw')],
            ['2.7) Disjuntor (A):', get('disjuntor_corrente_a')],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '29%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '29%' }]}><Text>{value}</Text></View>
            </View>
          ))}
        </View>

        {/* Seção 2b: Minigeração */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>2b) Dados Técnicos da Unidade Consumidora (se Minigeração)</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Existente</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Acréscimo</Text></View>
            <View style={[s.shc, { width: '19.34%' }]}><Text>Total</Text></View>
          </View>
          {secao2bRows.map(([label, value], i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.34%' }]}><Text>{value}</Text></View>
            </View>
          ))}
        </View>

        {/* Seção 2c: Transformadores */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>2c) Dados dos transformadores de acoplamento (se Minigeração)</Text></View>
            <View style={[s.shc, { width: '14.5%' }]}><Text>T1</Text></View>
            <View style={[s.shc, { width: '14.5%' }]}><Text>T2</Text></View>
            <View style={[s.shc, { width: '14.5%' }]}><Text>T3</Text></View>
            <View style={[s.shc, { width: '14.5%' }]}><Text>T4</Text></View>
          </View>
          {secao2cRows.map((label, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '14.5%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '14.5%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '14.5%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '14.5%' }]}><Text> </Text></View>
            </View>
          ))}
        </View>

        {/* Seção 3: UFV */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>3) Dados Unidades Geradoras Fotovoltaicas Solares (UFV):</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Existente</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Acréscimo</Text></View>
            <View style={[s.shc, { width: '19.34%' }]}><Text>Total</Text></View>
          </View>
          {([
            ['3.1) Quantidade total de módulos:', get('modulos_quantidade')],
            ['3.2) Listar fabricantes dos módulos:', get('modulos_fabricante')],
            ['3.3) Listar modelos dos módulos:', get('modulos_modelo')],
            ['3.4) Área total ocupada pelos arranjos (m²):', get('modulos_area_m2')],
            ['3.5) Quantidade total de inversores:', get('inversores_quantidade') || (get('inversores_modelo') ? '1' : '')],
            ['3.6) Listar fabricantes dos inversores:', get('inversores_fabricante')],
            ['3.7) Listar modelos dos inversores:', get('inversores_modelo')],
            ['3.8) Potência de pico dos módulos (soma das potências dos módulos, kWp): *', get('potencia')],
            ['3.9) Potência Nominal dos inversores (soma das potências nominais dos inversores, kW): *', get('inversores_potencia')],
            ['3.10) Data pretendida para entrada em operação (dd/mm/aaaa):', get('data_inicio_operacao')],
          ] as [string, string][]).map(([label, value], i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.34%' }]}><Text>{value}</Text></View>
            </View>
          ))}
        </View>

        {/* Seção 4: EOL */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>4) Dados das Unidades Geradoras Eólicas (EOL):</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Existente</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Acréscimo</Text></View>
            <View style={[s.shc, { width: '19.34%' }]}><Text>Total</Text></View>
          </View>
          {secao4Rows.map((label, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.34%' }]}><Text> </Text></View>
            </View>
          ))}
        </View>

        {/* Seção 5: Hidráulica */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>5) Dados das Unidades Geradoras Hidráulicas (CGH/PCH):</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Existente</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Acréscimo</Text></View>
            <View style={[s.shc, { width: '19.34%' }]}><Text>Total</Text></View>
          </View>
          {secao5Rows.map((label, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.34%' }]}><Text> </Text></View>
            </View>
          ))}
        </View>

        {/* Seção 6: Biomassa / Solar Térmica / Cogeração */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '42%' }]}><Text>6) Dados das Unidades Geradoras de Biomassa / Solar Térmica / Cogeração:</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Existente</Text></View>
            <View style={[s.shc, { width: '19.33%' }]}><Text>Acréscimo</Text></View>
            <View style={[s.shc, { width: '19.34%' }]}><Text>Total</Text></View>
          </View>
          {secao6Rows.map((label, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.l, { width: '42%' }]}><Text>{label}</Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.33%' }]}><Text> </Text></View>
              <View style={[s.vc, { width: '19.34%' }]}><Text> </Text></View>
            </View>
          ))}
        </View>

        {/* Seção 7: Fontes Primárias */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}>
              <Text>7) Fontes Primárias de Energia da Central Geradora Elétrica (para preenchimento do item 6.5)</Text>
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={[s.v, { width: '100%' }]}>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginBottom: 2 }}>
                7.1) Origem em biomassa (floresta, resíduos sólidos, resíduos animais, biocombustíveis líquidos, agroindustriais):
              </Text>
              {fontesBiomassa.map((f) => (
                <Text key={f} style={{ marginLeft: 10, marginBottom: 1 }}>- {f}</Text>
              ))}
              <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 4, marginBottom: 2 }}>7.2) Eólica (cinética do vento):</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', marginTop: 2, marginBottom: 2 }}>
                7.3) Fóssil (petróleo, carvão mineral, gás natural, outros):
              </Text>
              {fontesFossil.map((f) => (
                <Text key={f} style={{ marginLeft: 10, marginBottom: 1 }}>- {f}</Text>
              ))}
              <Text style={{ marginTop: 4 }}>7.4) Hídrica (potencial hidráulico)</Text>
              <Text>7.5) Nuclear (urânio)</Text>
              <Text>7.6) Solar (radiação solar)</Text>
              <Text>7.7) Undi-elétrica (cinética da água)</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
