'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getPotenciaGeracao, fmtBR } from '@/lib/utils/equipmentParser';

interface AnexoECPFLPreviewProps {
  projectData?: Record<string, any>;
}

export function AnexoECPFLPreview({ projectData = {} }: AnexoECPFLPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const handleGeneratePdf = async () => {
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { AnexoECPFLPDF } = await import('./AnexoECPFLPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Anexo E - Formulário de Solicitação de Acesso - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(AnexoECPFLPDF, { projectData })
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF do Anexo E:', err);
    } finally {
      setDownloading(false);
    }
  };

  const get = (key: string) => projectData[key] || '';

  // ── Estilos inline ──────────────────────────────────────────────────────────
  const T: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '8.5pt',
    fontFamily: 'Arial, sans-serif',
    marginBottom: '0',
  };

  const SH: React.CSSProperties = {
    backgroundColor: '#B8CCE4',
    color: '#1a3a6b',
    fontWeight: 'bold',
    padding: '5px 7px',
    border: '1px solid #888',
    fontSize: '8.5pt',
  };

  const L: React.CSSProperties = {
    padding: '4px 7px',
    border: '1px solid #aaa',
    verticalAlign: 'top',
    fontSize: '8.5pt',
    backgroundColor: '#fff',
    width: '32%',
    fontWeight: 'bold',
  };

  const V: React.CSSProperties = {
    padding: '4px 7px',
    border: '1px solid #aaa',
    verticalAlign: 'top',
    fontSize: '8.5pt',
    backgroundColor: '#fff',
  };

  const FULL: React.CSSProperties = {
    padding: '4px 7px',
    border: '1px solid #aaa',
    verticalAlign: 'top',
    fontSize: '8.5pt',
    backgroundColor: '#fff',
  };

  const SUBHEADER: React.CSSProperties = {
    padding: '4px 7px',
    border: '1px solid #aaa',
    verticalAlign: 'top',
    fontSize: '8.5pt',
    backgroundColor: '#e8f0fa',
    fontStyle: 'italic',
  };

  const SP: React.CSSProperties = { height: '10px' };

  const CHECKED = '☒';
  const UNCHECKED = '☐';

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

  // Tensão nominal do inversor — padrão 220 V se monofásico, 380 V se trifásico
  const fases = get('fases_instalacao') || '';
  const tensaoInversor = fases.toLowerCase().includes('trif') ? '380 V' : '220 V';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#000', maxWidth: '800px', margin: '0 auto', padding: '8px' }}>

      {/* ── Cabeçalho ── */}
      <table style={{ ...T, marginBottom: '10px' }}>
        <tbody>
          <tr>
            <td style={{
              padding: '8px 10px',
              border: '1px solid #888',
              backgroundColor: '#1a3a6b',
              textAlign: 'center',
              verticalAlign: 'middle',
            }}>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '10pt', lineHeight: '1.5' }}>
                FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE CONEXÃO
                <br />DE MICROGERAÇÃO E MINIGERAÇÃO DISTRIBUÍDA
              </div>
            </td>
            <td style={{
              padding: '8px 14px',
              border: '1px solid #888',
              backgroundColor: '#fff',
              textAlign: 'center',
              verticalAlign: 'middle',
              width: '130px',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logocpfl.png" alt="CPFL Energia / RGE" style={{ maxWidth: '110px', maxHeight: '50px', objectFit: 'contain' }} />
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Seção 1: Identificação da UC ── */}
      <table style={T}>
        <tbody>
          <tr><td colSpan={2} style={SH}>1. Identificação da Unidade Consumidora (UC)</td></tr>
          <tr><td colSpan={2} style={SUBHEADER}>No caso de UC existente sem alteração da potência disponibilizada</td></tr>
          <tr>
            <td style={L}>1.1 Código da UC:</td>
            <td style={V}>{get('conta_contrato')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={SUBHEADER}>
              Somente nos casos de UC nova ou alteração de potência em UC existente (a distribuidora pode dispensar a
              apresentação total ou parcial destes itens)
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={FULL}>
              1.1 Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021.
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={FULL}>
              1.2 Endereço das instalações (ou número de identificação das instalações já existentes) e o endereço ou meio
              de comunicação para entrega da fatura, das correspondências e das notificações.
            </td>
          </tr>
          <tr><td colSpan={2} style={FULL}>1.3 Declaração descritiva da carga instalada.</td></tr>
          <tr><td colSpan={2} style={FULL}>1.4 Informação das cargas que possam provocar perturbações no sistema de distribuição.</td></tr>
          <tr><td colSpan={2} style={FULL}>1.5 Informação e documentação das atividades desenvolvidas nas instalações.</td></tr>
          <tr>
            <td colSpan={2} style={FULL}>
              1.6 Apresentação de licença ou declaração emitida pelo órgão competente caso as instalações ou a extensão
              de rede de responsabilidade do consumidor e demais usuários ocuparem áreas protegidas pela legislação,
              tais como unidades de conservação, reservas legais, áreas de preservação permanente, territórios indígenas
              e quilombolas.
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={FULL}>
              1.7 Documento, com data, que comprove a propriedade ou posse do imóvel onde será implantada a central
              geradora ou, no caso de unidade flutuante, autorização, licença ou documento equivalente emitido pelas
              autoridades competentes.
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={FULL}>
              1.8 Indicação de um ponto de conexão de interesse, da tensão de conexão, do número de fases e das
              características de qualidade desejadas, que devem ser objeto da análise de viabilidade e de custos pela
              distribuidora. (Opcional).
            </td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 2: Dados Técnicos ── */}
      <table style={T}>
        <tbody>
          <tr><td colSpan={2} style={SH}>2. Dados Técnicos da Microgeração ou Minigeração Distribuída</td></tr>

          {/* 2.1 Tipo de fonte primária */}
          <tr>
            <td style={L}>2.1 Tipo de fonte primária:</td>
            <td style={V}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px', lineHeight: '1.6' }}>
                <span>{CHECKED} Solar fotovoltaica</span>
                <span>{UNCHECKED} Hidráulica</span>
                <span>{UNCHECKED} Eólica</span>
                <span>{UNCHECKED} Biomassa</span>
                <span>{UNCHECKED} Cogeração qualificada</span>
                <span>{UNCHECKED} Outra (especificar): </span>
              </div>
            </td>
          </tr>

          {/* 2.2 Potência */}
          <tr>
            <td style={L}>2.2 Potência:</td>
            <td style={V}>
              {potenciaGeracao} {potenciaGeracao && <span style={{ color: '#555' }}>(Valor de potência instalada total de geração, em kW)</span>}
            </td>
          </tr>

          {/* 2.3 Tipo de geração */}
          <tr>
            <td style={L}>2.3 Tipo de geração:</td>
            <td style={V}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.6' }}>
                <span>{UNCHECKED} Empregando máquina síncrona sem conversor</span>
                <span>{hasInverter ? CHECKED : UNCHECKED} Empregando conversor eletrônico/inversor</span>
                <span>{UNCHECKED} Mista</span>
                <span>{UNCHECKED} Outra (especificar): </span>
              </div>
            </td>
          </tr>

          {/* 2.4 Dados do inversor */}
          <tr>
            <td style={L}>2.4 Dados do inversor (se houver):</td>
            <td style={V}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.8' }}>
                <span>Fabricante: <strong>{get('inversores_fabricante')}</strong></span>
                <span>Modelo: <strong>{get('inversores_modelo')}</strong></span>
                <span>Quantidade instalada: <strong>{get('inversores_quantidade') || (hasInverter ? '1' : '')}</strong></span>
                <span>Tensão nominal de conexão à rede: <strong>{get('tensao_rede') || tensaoInversor}</strong></span>
                <span>Potência nominal de conexão à rede: <strong>{potenciaConexaoRede}</strong></span>
                <span style={{ color: '#555', fontStyle: 'italic', fontSize: '7.5pt' }}>
                  (caso sejam empregados mais de um modelo de conversor, replicar as informações acima para os outros modelos)
                </span>
              </div>
            </td>
          </tr>

          {/* 2.5 Modalidade de Compensação */}
          <tr>
            <td style={L}>2.5 Modalidade de Compensação de Excedentes</td>
            <td style={V}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.6' }}>
                <span>{CHECKED} Autoconsumo local</span>
                <span>{UNCHECKED} Autoconsumo remoto</span>
                <span>{UNCHECKED} Múltiplas Unidades Consumidoras</span>
                <span>{UNCHECKED} Geração compartilhada</span>
              </div>
            </td>
          </tr>

          {/* 2.6 Armazenamento */}
          <tr>
            <td style={L}>2.6 Armazenamento (se houver):</td>
            <td style={V}>{get('armazenamento') || '(Descrição do Sistema de Armazenamento - "bateria")'}</td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 3: Documentação Técnica ── */}
      <table style={T}>
        <tbody>
          <tr><td style={SH}>3. Documentação Técnica</td></tr>
          {[
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
          ].map((text, i) => (
            <tr key={i}><td style={FULL}>{text}</td></tr>
          ))}
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 4: Solicitações e Declarações ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '95%' }} />
        </colgroup>
        <tbody>
          <tr><td colSpan={2} style={SH}>4. Solicitações e Declarações</td></tr>
          {[
            [CHECKED, 'Solicito que a contagem do prazo para realização da vistoria pela distribuidora, conforme art. 91 da Resolução Normativa nº 1.000/2021, inicie-se somente após minha solicitação. (Opcional)'],
            [CHECKED, 'Renuncio ao direito de desistir do orçamento de conexão nos termos dos §§ 7º e 8º do art. 89 da Resolução Normativa nº 1.000/2021. (Opcional)'],
            [CHECKED, 'Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade. (Opcional)'],
            [CHECKED, 'Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da Associação Brasileira de Normas Técnicas - ABNT e às normas dos órgãos oficiais competentes, e ao art. 8º da Lei nº 9.074, de 1995, naquilo que for aplicável. (Obrigatório)'],
          ].map(([check, text], i) => (
            <tr key={i}>
              <td style={{ ...FULL, textAlign: 'center', verticalAlign: 'middle', width: '5%' }}>{check}</td>
              <td style={FULL}>{text}</td>
            </tr>
          ))}

          {/* Linha do "Solicito dispensa" com sub-checkboxes */}
          <tr>
            <td style={{ ...FULL, textAlign: 'center', verticalAlign: 'top', width: '5%' }}>{UNCHECKED}</td>
            <td style={FULL}>
              <div>Solicito dispensa da análise de inversão de fluxo por enquadramento no art. 73-A, na seguinte regra: (Opcional)</div>
              <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '10px' }}>
                <span>{UNCHECKED} não injeção na rede de distribuição de energia elétrica ("Grid Zero").</span>
                <span>{UNCHECKED} enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência de geração compatível com o consumo no horário de geração.</span>
                <span>{UNCHECKED} modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW, observado o item 6.</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style={{ ...FULL, textAlign: 'center', verticalAlign: 'middle', width: '5%' }}>{CHECKED}</td>
            <td style={FULL}>Declaro, para todos os fins, que todas as informações prestadas neste documento são verdadeiras. (Obrigatório)</td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 5: Identificação do Solicitante ── */}
      <table style={T}>
        <tbody>
          <tr><td colSpan={2} style={SH}>5. Identificação do solicitante</td></tr>
          <tr>
            <td style={L}>5.1 Nome do consumidor ou de seu representante:</td>
            <td style={V}>{get('nomeClienteFinal') || get('responsavel_nome')}</td>
          </tr>
          <tr>
            <td style={L}>5.2 Informações para contato (telefone/e-mail):</td>
            <td style={V}>
              {[get('cliente_celular') || get('cliente_telefone_fixo'), get('cliente_email')].filter(Boolean).join(' / ')}
            </td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...FULL, paddingTop: '16px', paddingBottom: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', minHeight: '36px' }}>
                    {municipio}
                  </div>
                  <div style={{ fontSize: '7.5pt', color: '#555' }}>Local</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', minHeight: '36px' }}>
                    {get('data_inicio_operacao')}
                  </div>
                  <div style={{ fontSize: '7.5pt', color: '#555' }}>Data</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', minHeight: '36px' }}>&nbsp;</div>
                  <div style={{ fontSize: '7.5pt', color: '#555' }}>Assinatura do Responsável</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 6: Termo de Aceite ── */}
      <table style={T}>
        <tbody>
          <tr><td style={SH}>6. Termo de Aceite das condições para afastamento da análise de inversão de fluxo (Opcional)</td></tr>
          <tr>
            <td style={FULL}>
              <p style={{ marginBottom: '6px', lineHeight: '1.5' }}>
                Solicito o afastamento da análise de inversão de fluxo, nos termos do inciso III do caput do art. 73-A da
                Resolução Normativa nº 1.000/2021, e declaro estar ciente de que:
              </p>
              <p style={{ marginBottom: '4px', lineHeight: '1.5' }}>
                1) a unidade consumidora será enquadrada na modalidade autoconsumo local;
              </p>
              <p style={{ marginBottom: '4px', lineHeight: '1.5' }}>
                2) fica vedada, em qualquer hipótese, a alocação ou realocação de excedentes ou de créditos de energia em
                unidade consumidora distinta de onde ocorreu a geração de energia elétrica, afastando-se as disposições de
                que trata o art. 655-M da Resolução Normativa nº 1.000/2021; e
              </p>
              <p style={{ marginBottom: '4px', lineHeight: '1.5' }}>
                3) para alteração de enquadramento da modalidade da microgeração deverá ser encerrado o contrato e
                solicitado novo orçamento de conexão, vedada a aplicação do art. 655-M.
              </p>
              <p style={{ marginBottom: '16px', lineHeight: '1.5' }}>
                Declaro também reconhecer que essa opção é irrevogável e irretratável, implicando no meu dever de observar
                o que estabelece o art. 73-A da referida Resolução.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', minHeight: '36px' }}>&nbsp;</div>
                  <div style={{ fontSize: '7.5pt', color: '#555' }}>Local</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', minHeight: '36px' }}>&nbsp;</div>
                  <div style={{ fontSize: '7.5pt', color: '#555' }}>Data</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', minHeight: '36px' }}>&nbsp;</div>
                  <div style={{ fontSize: '7.5pt', color: '#555' }}>Assinatura do Responsável</div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Rodapé ── */}
      <div style={{ marginTop: '10px', borderTop: '1px solid #aaa', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#555' }}>
        <span>Formulário em atendimento à Resolução Homologatória nº 3.354, de 23/07/2024.</span>
        <span>Uso Público CPFL</span>
      </div>

      {/* ── Botão PDF ── */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleGeneratePdf}
          disabled={downloading}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
        >
          {downloading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-5 w-5" />
              Gerar PDF do Formulário de Solicitação
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
