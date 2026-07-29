import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { getPotenciaGeracao, fmtBR } from '@/lib/utils/equipmentParser';

interface AnexoECPFLPDFProps {
  projectData?: Record<string, any>;
}

const B = 0.75;
const BC = '#888888';

// ✅ Caixinha de marcação desenhada (tamanho fixo sempre igual, preenchida quando
// marcada) — em vez de texto "[X]"/"[ ]", que ficava com peso visual desigual.
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      style={{
        width: 7,
        height: 7,
        borderWidth: 0.75,
        borderColor: '#000000',
        backgroundColor: checked ? '#000000' : '#FFFFFF',
      }}
    />
  );
}

function CheckboxLine({ checked, label, style }: { checked: boolean; label: string; style?: any }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 1.5 }, style]}>
      <Checkbox checked={checked} />
      <Text style={{ marginLeft: 4 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    color: '#000000',
  },
  tbl: { borderTopWidth: B, borderLeftWidth: B, borderColor: BC, marginBottom: 10 },
  row: { flexDirection: 'row' },
  sh: {
    backgroundColor: '#B8CCE4',
    color: '#1a3a6b',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    padding: 5,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  subheader: {
    backgroundColor: '#e8f0fa',
    fontFamily: 'Helvetica-Oblique',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  l: {
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    width: '32%',
  },
  v: {
    backgroundColor: '#FFFFFF',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
  },
  full: {
    backgroundColor: '#FFFFFF',
    fontSize: 7.5,
    padding: 4,
    borderRightWidth: B,
    borderBottomWidth: B,
    borderColor: BC,
    lineHeight: 1.4,
  },
});

export function AnexoECPFLPDF({ projectData = {} }: AnexoECPFLPDFProps) {
  const get = (key: string) => projectData[key] || '';

  const municipio = [get('client_city'), get('client_state')].filter(Boolean).join(' - ');
  const hasInverter = !!get('inversores_modelo') || !!get('inversores_fabricante');
  const potencia = get('potencia') ? `${get('potencia')} kW` : '';
  // ✅ 2.2 Potência: deve ser a MENOR entre a potência total dos módulos (kWp) e a
  // potência total dos inversores (kW) — não o campo genérico "potencia" do projeto.
  const potenciaGeracaoKw = getPotenciaGeracao(projectData);
  const potenciaGeracao = potenciaGeracaoKw > 0 ? `${fmtBR(potenciaGeracaoKw)} kW` : '';
  // ✅ 2.4 Potência nominal de conexão à rede: também com 2 casas decimais
  const inversoresPotenciaKw = parseFloat(String(get('inversores_potencia')).replace(',', '.')) || 0;
  const potenciaConexaoRede = inversoresPotenciaKw > 0 ? `${fmtBR(inversoresPotenciaKw)} kW` : potencia;

  const fases = get('fases_instalacao') || '';
  const tensaoInversor = fases.toLowerCase().includes('trif') ? '380 V' : '220 V';

  const logoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/images/logocpfl.png`
    : '/images/logocpfl.png';

  const documentacaoTecnica = [
    '3.1 Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, que identifique o número do registro válido e o nome do responsável técnico, o local da obra ou serviço e as atividades profissionais desenvolvidas, caso seja exigível na legislação específica e na forma prevista nessa legislação.',
    '3.2 Indicação do local do padrão ou da subestação de entrada no imóvel, exclusivamente nos casos em que ainda não estiverem instalados ou houver previsão de necessidade de aprovação prévia de projeto na norma técnica da distribuidora.',
    '3.3 Diagrama unifilar e de blocos e memorial descritivo do sistema de geração e proteção.',
    '3.4 Relatório de ensaio, em língua portuguesa, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão com a rede, sempre que houver a utilização de conversores.',
    '3.5 Dados necessários ao registro da central geradora distribuída conforme disponível no site da ANEEL.',
    '3.6 Lista de unidades consumidoras participantes do sistema de compensação, indicando o percentual ou a ordem de utilização dos excedentes. (Opcional)',
    '3.7 Cópia de instrumento jurídico que comprove a participação dos integrantes para os casos de múltiplas unidades consumidoras e geração compartilhada. (Caso aplicável)',
    '3.8 Documento que comprove o reconhecimento, pela ANEEL, da cogeração qualificada (Caso aplicável)',
    '3.9 Dados de segurança das barragens no caso do uso de sistemas com fontes hídricas, conforme Resolução Normativa nº 696/2015. (Caso aplicável)',
    '3.10 Para centrais fotovoltaicas enquadradas como despacháveis, comprovação de que o sistema de armazenamento atende o disposto no art. 655-B da Resolução Normativa nº 1.000/2021. (Caso aplicável)',
    '3.11 Documento que comprove o aporte da Garantia de Fiel Cumprimento, se aplicável, conforme previsto no art. 655-C da Resolução Normativa nº 1.000/2021. (Caso aplicável)',
  ];

  const declaracoes: [boolean, string][] = [
    [true, 'Solicito que a contagem do prazo para realização da vistoria pela distribuidora, conforme art. 91 da Resolução Normativa nº 1.000/2021, inicie-se somente após minha solicitação. (Opcional)'],
    [true, 'Renuncio ao direito de desistir do orçamento de conexão nos termos dos §§ 7º e 8º do art. 89 da Resolução Normativa nº 1.000/2021. (Opcional)'],
    [true, 'Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade. (Opcional)'],
    [true, 'Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da Associação Brasileira de Normas Técnicas - ABNT e às normas dos órgãos oficiais competentes, e ao art. 8º da Lei nº 9.074, de 1995, naquilo que for aplicável. (Obrigatório)'],
  ];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={[s.tbl, { flexDirection: 'row' }]} wrap={false}>
          <View style={{
            flex: 1,
            backgroundColor: '#1a3a6b',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 8,
            borderRightWidth: B,
            borderBottomWidth: B,
            borderColor: BC,
          }}>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 10, textAlign: 'center', lineHeight: 1.5 }}>
              FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE CONEXÃO{'\n'}DE MICROGERAÇÃO E MINIGERAÇÃO DISTRIBUÍDA
            </Text>
          </View>
          <View style={{
            width: 130,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 8,
            borderRightWidth: B,
            borderBottomWidth: B,
            borderColor: BC,
          }}>
            <Image src={logoUrl} style={{ width: 90, height: 40, objectFit: 'contain' }} cache={false} />
          </View>
        </View>

        {/* Seção 1: Identificação da UC */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>1. Identificação da Unidade Consumidora (UC)</Text></View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={[s.subheader, { width: '100%' }]}><Text>No caso de UC existente sem alteração da potência disponibilizada</Text></View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>1.1 Código da UC:</Text></View>
            <View style={[s.v, { width: '68%' }]}><Text>{get('conta_contrato')}</Text></View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={[s.subheader, { width: '100%' }]}>
              <Text>
                Somente nos casos de UC nova ou alteração de potência em UC existente (a distribuidora pode dispensar a
                apresentação total ou parcial destes itens)
              </Text>
            </View>
          </View>
          {[
            '1.1 Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021.',
            '1.2 Endereço das instalações (ou número de identificação das instalações já existentes) e o endereço ou meio de comunicação para entrega da fatura, das correspondências e das notificações.',
            '1.3 Declaração descritiva da carga instalada.',
            '1.4 Informação das cargas que possam provocar perturbações no sistema de distribuição.',
            '1.5 Informação e documentação das atividades desenvolvidas nas instalações.',
            '1.6 Apresentação de licença ou declaração emitida pelo órgão competente caso as instalações ou a extensão de rede de responsabilidade do consumidor e demais usuários ocuparem áreas protegidas pela legislação, tais como unidades de conservação, reservas legais, áreas de preservação permanente, territórios indígenas e quilombolas.',
            '1.7 Documento, com data, que comprove a propriedade ou posse do imóvel onde será implantada a central geradora ou, no caso de unidade flutuante, autorização, licença ou documento equivalente emitido pelas autoridades competentes.',
            '1.8 Indicação de um ponto de conexão de interesse, da tensão de conexão, do número de fases e das características de qualidade desejadas, que devem ser objeto da análise de viabilidade e de custos pela distribuidora. (Opcional).',
          ].map((text, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.full, { width: '100%' }]}><Text>{text}</Text></View>
            </View>
          ))}
        </View>

        {/* Seção 2: Dados Técnicos */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>2. Dados Técnicos da Microgeração ou Minigeração Distribuída</Text></View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>2.1 Tipo de fonte primária:</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <CheckboxLine checked={true} label="Solar fotovoltaica" />
              <CheckboxLine checked={false} label="Hidráulica" />
              <CheckboxLine checked={false} label="Eólica" />
              <CheckboxLine checked={false} label="Biomassa" />
              <CheckboxLine checked={false} label="Cogeração qualificada" />
              <CheckboxLine checked={false} label="Outra (especificar):" />
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>2.2 Potência:</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <Text>{potenciaGeracao} {potenciaGeracao ? '(Valor de potência instalada total de geração, em kW)' : ''}</Text>
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>2.3 Tipo de geração:</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <CheckboxLine checked={false} label="Empregando máquina síncrona sem conversor" />
              <CheckboxLine checked={hasInverter} label="Empregando conversor eletrônico/inversor" />
              <CheckboxLine checked={false} label="Mista" />
              <CheckboxLine checked={false} label="Outra (especificar):" />
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>2.4 Dados do inversor (se houver):</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <Text>Fabricante: {get('inversores_fabricante')}</Text>
              <Text>Modelo: {get('inversores_modelo')}</Text>
              <Text>Quantidade instalada: {get('inversores_quantidade') || (hasInverter ? '1' : '')}</Text>
              <Text>Tensão nominal de conexão à rede: {get('tensao_rede') || tensaoInversor}</Text>
              <Text>Potência nominal de conexão à rede: {potenciaConexaoRede}</Text>
              <Text style={{ fontFamily: 'Helvetica-Oblique', fontSize: 6.5, color: '#555555', marginTop: 2 }}>
                (caso sejam empregados mais de um modelo de conversor, replicar as informações acima para os outros modelos)
              </Text>
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>2.5 Modalidade de Compensação de Excedentes</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <CheckboxLine checked={true} label="Autoconsumo local" />
              <CheckboxLine checked={false} label="Autoconsumo remoto" />
              <CheckboxLine checked={false} label="Múltiplas Unidades Consumidoras" />
              <CheckboxLine checked={false} label="Geração compartilhada" />
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>2.6 Armazenamento (se houver):</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <Text>{get('armazenamento') || '(Descrição do Sistema de Armazenamento - "bateria")'}</Text>
            </View>
          </View>
        </View>

        {/* Seção 3: Documentação Técnica */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>3. Documentação Técnica</Text></View>
          </View>
          {documentacaoTecnica.map((text, i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.full, { width: '100%' }]}><Text>{text}</Text></View>
            </View>
          ))}
        </View>

        {/* Seção 4: Solicitações e Declarações */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>4. Solicitações e Declarações</Text></View>
          </View>
          {declaracoes.map(([check, text], i) => (
            <View key={i} style={s.row} wrap={false}>
              <View style={[s.full, { width: '5%', alignItems: 'center', justifyContent: 'center' }]}><Checkbox checked={check} /></View>
              <View style={[s.full, { width: '95%' }]}><Text>{text}</Text></View>
            </View>
          ))}
          <View style={s.row} wrap={false}>
            <View style={[s.full, { width: '5%', alignItems: 'center', justifyContent: 'center', paddingTop: 6 }]}><Checkbox checked={false} /></View>
            <View style={[s.full, { width: '95%' }]}>
              <Text>Solicito dispensa da análise de inversão de fluxo por enquadramento no art. 73-A, na seguinte regra: (Opcional)</Text>
              <CheckboxLine checked={false} label='não injeção na rede de distribuição de energia elétrica ("Grid Zero").' style={{ marginTop: 3, marginLeft: 8 }} />
              <CheckboxLine checked={false} label="enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência de geração compatível com o consumo no horário de geração." style={{ marginLeft: 8 }} />
              <CheckboxLine checked={false} label="modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW, observado o item 6." style={{ marginLeft: 8 }} />
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={[s.full, { width: '5%', alignItems: 'center', justifyContent: 'center' }]}><Checkbox checked={true} /></View>
            <View style={[s.full, { width: '95%' }]}><Text>Declaro, para todos os fins, que todas as informações prestadas neste documento são verdadeiras. (Obrigatório)</Text></View>
          </View>
        </View>

        {/* Seção 5: Identificação do Solicitante */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>5. Identificação do solicitante</Text></View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>5.1 Nome do consumidor ou de seu representante:</Text></View>
            <View style={[s.v, { width: '68%' }]}><Text>{get('nomeClienteFinal') || get('responsavel_nome')}</Text></View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={s.l}><Text>5.2 Informações para contato (telefone/e-mail):</Text></View>
            <View style={[s.v, { width: '68%' }]}>
              <Text>{[get('cliente_celular') || get('cliente_telefone_fixo'), get('cliente_email')].filter(Boolean).join(' / ')}</Text>
            </View>
          </View>
          <View style={s.row} wrap={false}>
            <View style={[s.full, { width: '100%', paddingTop: 14, paddingBottom: 8 }]}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ marginBottom: 2 }}>{municipio}</Text>
                  <View style={{ width: '100%', borderTopWidth: 0.5, borderColor: '#555555' }}>
                    <Text style={{ fontSize: 6, color: '#555555', paddingTop: 2, textAlign: 'center' }}>Local</Text>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ marginBottom: 2 }}>{get('data_inicio_operacao')}</Text>
                  <View style={{ width: '100%', borderTopWidth: 0.5, borderColor: '#555555' }}>
                    <Text style={{ fontSize: 6, color: '#555555', paddingTop: 2, textAlign: 'center' }}>Data</Text>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ marginBottom: 2 }}> </Text>
                  <View style={{ width: '100%', borderTopWidth: 0.5, borderColor: '#555555' }}>
                    <Text style={{ fontSize: 6, color: '#555555', paddingTop: 2, textAlign: 'center' }}>Assinatura do Responsável</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Seção 6: Termo de Aceite */}
        <View style={s.tbl}>
          <View style={s.row} wrap={false}>
            <View style={[s.sh, { width: '100%' }]}><Text>6. Termo de Aceite das condições para afastamento da análise de inversão de fluxo (Opcional)</Text></View>
          </View>
          <View style={s.row}>
            <View style={[s.full, { width: '100%' }]}>
              <Text style={{ marginBottom: 6 }}>
                Solicito o afastamento da análise de inversão de fluxo, nos termos do inciso III do caput do art. 73-A da
                Resolução Normativa nº 1.000/2021, e declaro estar ciente de que:
              </Text>
              <Text style={{ marginBottom: 4 }}>1) a unidade consumidora será enquadrada na modalidade autoconsumo local;</Text>
              <Text style={{ marginBottom: 4 }}>
                2) fica vedada, em qualquer hipótese, a alocação ou realocação de excedentes ou de créditos de energia em
                unidade consumidora distinta de onde ocorreu a geração de energia elétrica, afastando-se as disposições de
                que trata o art. 655-M da Resolução Normativa nº 1.000/2021; e
              </Text>
              <Text style={{ marginBottom: 4 }}>
                3) para alteração de enquadramento da modalidade da microgeração deverá ser encerrado o contrato e
                solicitado novo orçamento de conexão, vedada a aplicação do art. 655-M.
              </Text>
              <Text style={{ marginBottom: 16 }}>
                Declaro também reconhecer que essa opção é irrevogável e irretratável, implicando no meu dever de observar
                o que estabelece o art. 73-A da referida Resolução.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }} wrap={false}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ marginBottom: 2 }}> </Text>
                  <View style={{ width: '100%', borderTopWidth: 0.5, borderColor: '#555555' }}>
                    <Text style={{ fontSize: 6, color: '#555555', paddingTop: 2, textAlign: 'center' }}>Local</Text>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ marginBottom: 2 }}> </Text>
                  <View style={{ width: '100%', borderTopWidth: 0.5, borderColor: '#555555' }}>
                    <Text style={{ fontSize: 6, color: '#555555', paddingTop: 2, textAlign: 'center' }}>Data</Text>
                  </View>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ marginBottom: 2 }}> </Text>
                  <View style={{ width: '100%', borderTopWidth: 0.5, borderColor: '#555555' }}>
                    <Text style={{ fontSize: 6, color: '#555555', paddingTop: 2, textAlign: 'center' }}>Assinatura do Responsável</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Rodapé */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, borderTopWidth: 0.5, borderColor: BC, paddingTop: 4 }}>
          <Text style={{ fontSize: 6, color: '#555555' }}>Formulário em atendimento à Resolução Homologatória nº 3.354, de 23/07/2024.</Text>
          <Text style={{ fontSize: 6, color: '#555555' }}>Uso Público CPFL</Text>
        </View>
      </Page>
    </Document>
  );
}
