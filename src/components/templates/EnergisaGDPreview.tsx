'use client';

import { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getAllModulos, getAllInversores, getTotalKwpFromModulos, getTotalInversorKw, fmtBR } from '@/lib/utils/equipmentParser';

interface EnergisaGDPreviewProps {
  projectData?: Record<string, any>;
}

// Estilos reutilizados entre as folhas (mesma convenção de AnexoFCPFLPreview.tsx)
const T: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '8.5pt',
  fontFamily: 'Arial, sans-serif',
  marginTop: '10px',
};

const BAR: React.CSSProperties = {
  backgroundColor: '#29ade0',
  color: '#ffffff',
  fontWeight: 'bold',
  padding: '4px 6px',
  border: '1px solid #aaa',
  fontSize: '8.5pt',
  textAlign: 'center',
};

const LBL: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid #aaa',
  fontSize: '8.5pt',
  backgroundColor: '#fff',
  fontWeight: 'bold',
};

const VAL: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid #aaa',
  fontSize: '8.5pt',
  backgroundColor: '#fff',
};

const VALC: React.CSSProperties = { ...VAL, textAlign: 'center' };

const HDR_PLAIN: React.CSSProperties = { ...VAL, textAlign: 'center', fontWeight: 800, color: '#111' };
const HDR_ORANGE: React.CSSProperties = { ...HDR_PLAIN, color: '#E07B18' };
const BAR2: React.CSSProperties = { ...LBL, backgroundColor: '#f2b48a', color: '#1a1a1a', textAlign: 'center' };
const RED_CELL: React.CSSProperties = { ...VAL, backgroundColor: '#c0392b', color: '#fff', fontWeight: 800, textAlign: 'center' };
const HL_YELLOW: React.CSSProperties = { backgroundColor: '#F7F0DA' };
const WARN: React.CSSProperties = { color: '#e00000' };
const CORAL: React.CSSProperties = { backgroundColor: '#f2b48a' };
const PEACH: React.CSSProperties = { backgroundColor: '#f6dcc3' };
const V6_TAG: React.CSSProperties = { fontSize: '7.5pt', fontWeight: 700, padding: '2px 0 0', textAlign: 'left', border: 'none' };

const MESES_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
// data_documento vem em DD/MM/AAAA (ou por extenso) — usado só para derivar mês/ano
// da "Previsão de ligação" da folha 4, mesmo padrão de parsing do Diagrama Unifilar.
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

function SheetLabel({ n }: { n: number }) {
  return (
    <div style={{ fontSize: '8pt', color: '#888', marginTop: '28px', marginBottom: '2px' }}>
      Folha {n} de 6
    </div>
  );
}

function DocHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-grupo-energisa.png" alt="Grupo Energisa" style={{ width: '100px', height: 'auto', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: '12pt', fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: '10pt', fontWeight: 700, marginTop: '4px' }}>{subtitle}</div>
      </div>
      <div style={{ width: '100px' }} />
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div style={{ marginTop: '24px', textAlign: 'center' }}>
      <div style={{ width: '260px', margin: '0 auto', borderTop: '1px solid #111' }} />
      <span style={{ fontSize: '8.5pt', fontWeight: 'bold' }}>{label}</span>
    </div>
  );
}

// Folha 3 — Checklist regulatório (Resolução Normativa nº 1.000/2021). Os itens obrigatórios
// já vêm marcados; 1.1/1.2 dependem de o titular ser pessoa jurídica (CNPJ) ou física (CPF).
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

export function EnergisaGDPreview({ projectData = {} }: EnergisaGDPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const get = (key: string) => projectData[key] || '';
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

  const potenciaGeracaoKwp = getTotalKwpFromModulos(projectData) || parseFloat(String(get('potencia')).replace(',', '.')) || 0;
  const potenciaInversoresKw = getTotalInversorKw(projectData);

  const handleGeneratePdf = async () => {
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { EnergisaGDPDF } = await import('./EnergisaGDPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Formulário GD Energisa - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(EnergisaGDPDF, { projectData })
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
      console.error('Erro ao gerar PDF do Formulário GD Energisa:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#000', maxWidth: '900px', margin: '0 auto', padding: '8px' }}>

      {/* ══════════════════ Folha 1: Formulário de Orçamento de Conexão ══════════════════ */}
      <SheetLabel n={1} />
      <DocHeader title="FORMULÁRIO DE ORÇAMENTO DE CONEXÃO" subtitle="GERAÇÃO DISTRIBUÍDA" />

      <table style={T}>
        <colgroup>
          {Array.from({ length: 12 }).map((_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}
        </colgroup>
        <tbody>
          <tr><td colSpan={12} style={BAR}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</td></tr>
          <tr>
            <td colSpan={2} style={LBL}>Código do cliente (UC):</td>
            <td colSpan={6} style={VALC}>{get('conta_contrato')}</td>
            <td colSpan={1} style={LBL}>Classe:</td>
            <td colSpan={3} style={VALC}>{get('classe_uc')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Titular da UC:</td>
            <td colSpan={10} style={VALC}>{get('nomeClienteFinal').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Logradouro:</td>
            <td colSpan={10} style={VALC}>{get('endereco_local').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>N°:</td>
            <td colSpan={1} style={VALC}>{get('numero_endereco_cliente')}</td>
            <td colSpan={1} style={LBL}>Bairro:</td>
            <td colSpan={2} style={VALC}>{get('bairro_cliente')}</td>
            <td colSpan={1} style={LBL}>UF:</td>
            <td colSpan={1} style={VALC}>{get('client_state')}</td>
            <td colSpan={1} style={LBL}>CEP:</td>
            <td colSpan={3} style={VALC}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={4} style={VAL}>{get('cliente_email')}</td>
            <td colSpan={2} style={LBL}>Cidade:</td>
            <td colSpan={4} style={VALC}>{get('client_city')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Telefone:</td>
            <td colSpan={4} style={VALC}>{get('cliente_telefone_fixo')}</td>
            <td colSpan={2} style={LBL}>Celular:</td>
            <td colSpan={4} style={VALC}>{get('cliente_celular')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>CNPJ/CPF:</td>
            <td colSpan={10} style={VALC}>{get('cpf_cnpj_cliente_final')}</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>2. DADOS DA UNIDADE CONSUMIDORA NO ATO DA VISTORIA - UC</td></tr>
          <tr>
            <td colSpan={3} style={LBL}>Potência Instalada (kW):</td>
            <td colSpan={3} style={VALC}>{potenciaInversoresKw ? potenciaInversoresKw.toFixed(0) : ''}</td>
            <td colSpan={4} style={LBL}>Tensão de Atendimento (V):</td>
            <td colSpan={2} style={VALC}>{get('tensao_atendimento')}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Tipo de Conexão:</td>
            <td colSpan={3} style={VALC}>{get('tipo_conexao').toUpperCase()}</td>
            <td colSpan={6} style={{ backgroundColor: '#c9c9c9', border: '1px solid #aaa' }}>&nbsp;</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Tipo de Ramal:</td>
            <td colSpan={3} style={VALC}>{get('tipo_ramal').toUpperCase()}</td>
            <td colSpan={6} style={{ backgroundColor: '#c9c9c9', border: '1px solid #aaa' }}>&nbsp;</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>3. DADOS DA GERAÇÃO</td></tr>
          <tr>
            <td colSpan={3} style={LBL}>Potência Instalada de Geração (kWp):</td>
            <td colSpan={9} style={VALC}>{potenciaGeracaoKwp ? potenciaGeracaoKwp.toFixed(2).replace('.', ',') : ''}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Tipo da Fonte de Geração:</td>
            <td colSpan={3} style={VALC}>SOLAR FOTOVOLTAICA</td>
            <td colSpan={2} style={LBL}>Tipo de Geração:</td>
            <td colSpan={4} style={VAL}>Empregando conversor eletrônico/inversor</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>5. CONTATOS NA DISTRIBUIDORA</td></tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, backgroundColor: '#d9d9d9' }}>Empresa</td>
            <td colSpan={10} style={VALC}>Energisa</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, backgroundColor: '#d9d9d9' }}>Telefone</td>
            <td colSpan={3} style={VALC}>0800 728 2891</td>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={5} style={VAL}>geracaodistribuida.eto@energisa.com.br</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Responsável/Área:</td>
            <td colSpan={2} style={VALC}>DCMD/COPC</td>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center', backgroundColor: '#d9d9d9' }}>LINK GISA</td>
            <td colSpan={5} style={VALC}>https://l.ead.me/bbThiX</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>6. DADOS DO RESPONSÁVEL TÉCNICO:</td></tr>
          <tr>
            <td colSpan={3} style={LBL}>Cliente/Procurador Legal:</td>
            <td colSpan={9} style={VALC}>{get('responsavel_legal_nome').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Telefone</td>
            <td colSpan={4} style={VALC}>{get('responsavel_legal_telefone')}</td>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={4} style={VAL}>{get('responsavel_legal_email')}</td>
          </tr>
          <tr><td colSpan={12} style={V6_TAG}>V6</td></tr>
        </tbody>
      </table>

      <SignatureBlock label="Assinatura do Responsável" />

      {/* ══════════════════ Folha 2: Relação de Carga e Cálculo de Demanda ══════════════════ */}
      <SheetLabel n={2} />
      <DocHeader title="FORMULÁRIO DE RELAÇÃO DE CARGA" subtitle="E CÁLCULO DE DEMANDA" />

      <table style={T}>
        <colgroup>
          {Array.from({ length: 12 }).map((_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}
        </colgroup>
        <tbody>
          <tr><td colSpan={12} style={BAR}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</td></tr>
          <tr>
            <td colSpan={2} style={LBL}>Código do cliente (UC):</td>
            <td colSpan={6} style={VALC}>{get('conta_contrato')}</td>
            <td colSpan={1} style={LBL}>Classe:</td>
            <td colSpan={3} style={VALC}>{get('classe_uc')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Titular da UC:</td>
            <td colSpan={10} style={VALC}>{get('nomeClienteFinal').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Logradouro:</td>
            <td colSpan={10} style={VALC}>{get('endereco_local').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>N°:</td>
            <td colSpan={1} style={VALC}>{get('numero_endereco_cliente')}</td>
            <td colSpan={2} style={LBL}>Bairro:</td>
            <td colSpan={3} style={VALC}>{get('bairro_cliente')}</td>
            <td colSpan={2} style={LBL}>Cidade:</td>
            <td colSpan={2} style={VAL}>{get('client_city')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={4} style={VAL}>{get('cliente_email')}</td>
            <td colSpan={1} style={LBL}>UF:</td>
            <td colSpan={1} style={VALC}>{get('client_state')}</td>
            <td colSpan={1} style={LBL}>CEP:</td>
            <td colSpan={3} style={VALC}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Telefone:</td>
            <td colSpan={3} style={VAL}>{get('cliente_telefone_fixo')}</td>
            <td colSpan={2} style={LBL}>Celular:</td>
            <td colSpan={5} style={VAL}>{get('cliente_celular')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>CNPJ/CPF:</td>
            <td colSpan={10} style={VALC}>{get('cpf_cnpj_cliente_final')}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...T, marginTop: '0' }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '26%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '14%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={BAR}>QUANTIDADE</td>
            <td style={BAR}>EQUIPAMENTO</td>
            <td style={BAR}>POT. INSTALADA<br />UND (W)</td>
            <td style={BAR}>POTÊNCIA TOTAL<br />TOTAL (kW)</td>
            <td style={BAR}>FATOR DE<br />DEMANDA</td>
            <td style={BAR}>DEMANDA<br />(kW)</td>
          </tr>
          {Array.from({ length: 16 }).map((_, i) => (
            <tr key={i}>
              <td style={VAL}>&nbsp;</td>
              <td style={VAL}></td>
              <td style={VAL}></td>
              <td style={VAL}></td>
              <td style={VAL}></td>
              <td style={VAL}></td>
            </tr>
          ))}
          <tr>
            <td style={{ ...VAL, borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}></td>
            <td style={{ ...VAL, borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}></td>
            <td style={{ ...LBL, textAlign: 'center' }}>TOTAL</td>
            <td style={VALC}></td>
            <td style={{ ...LBL, textAlign: 'center' }}>TOTAL</td>
            <td style={VALC}></td>
          </tr>
          <tr><td colSpan={6} style={V6_TAG}>V6</td></tr>
        </tbody>
      </table>

      <SignatureBlock label="Assinatura do Projetista" />

      {/* ══════════════════ Folha 3: Checklist/Declarações ══════════════════ */}
      <SheetLabel n={3} />
      <DocHeader title="FORMULÁRIO DE ORÇAMENTO DE CONEXÃO" subtitle="GERAÇÃO DISTRIBUÍDA" />

      <table style={{ ...T, fontSize: '9.5pt' }}>
        <colgroup>
          <col style={{ width: '88%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <tbody>
          {checklistSecoes.map((secao) => (
            <Fragment key={secao.titulo}>
              <tr><td colSpan={2} style={BAR}>{secao.titulo}</td></tr>
              {secao.itens.map(([texto, marca]) => (
                <tr key={texto}>
                  <td style={{ ...VAL, lineHeight: 1.5 }}>{texto}</td>
                  <td style={{ ...VAL, textAlign: 'center', fontWeight: 'bold' }}>{marca || ' '}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>

    {/* Folhas 4-6: no artifact de referência essas folhas usam um container mais
        largo (1300px) que as folhas 1-3 (900px), para acomodar a tabela de 16
        colunas da folha 4 e o diagrama/legenda da folha 6 sem ficarem espremidos. */}
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#000', maxWidth: '1300px', margin: '0 auto', padding: '8px' }}>

      {/* ══════════════════ Folha 4: Memorial Descritivo UFV-Solar ══════════════════ */}
      <SheetLabel n={4} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
        <img src="/images/logo-grupo-energisa.png" alt="Grupo Energisa" style={{ width: '88px', height: 'auto', display: 'block' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: '12pt', fontWeight: 800 }}>MEMORIAL DESCRITIVO DE GERAÇÃO DISTRIBUÍDA UFV-SOLAR</div>
        <div style={{ width: '88px' }} />
      </div>

      <table style={T}>
        <colgroup>
          {Array.from({ length: 16 }).map((_, i) => <col key={i} style={{ width: '6.25%' }} />)}
        </colgroup>
        <tbody>
          <tr><td colSpan={16} style={BAR}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</td></tr>
          <tr>
            <td colSpan={2} style={LBL}>Código do cliente (UC):</td>
            <td colSpan={5} style={VALC}>{get('conta_contrato')}</td>
            <td colSpan={2} style={LBL}>Classe:</td>
            <td colSpan={2} style={VALC}>{get('classe_uc')}</td>
            <td colSpan={2} style={LBL}>CNPJ/CPF:</td>
            <td colSpan={3} style={VALC}>{get('cpf_cnpj_cliente_final')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Titular da UC:</td>
            <td colSpan={14} style={VALC}>{get('nomeClienteFinal').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Logradouro:</td>
            <td colSpan={14} style={VALC}>{get('endereco_local').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>N°:</td>
            <td colSpan={1} style={VALC}>{get('numero_endereco_cliente')}</td>
            <td colSpan={2} style={LBL}>Bairro:</td>
            <td colSpan={3} style={VALC}>{get('bairro_cliente')}</td>
            <td colSpan={2} style={LBL}>Cidade:</td>
            <td colSpan={6} style={VALC}>{get('client_city')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={6} style={VAL}>{get('cliente_email')}</td>
            <td colSpan={1} style={LBL}>UF:</td>
            <td colSpan={1} style={VALC}>{get('client_state')}</td>
            <td colSpan={1} style={VAL}>&nbsp;</td>
            <td colSpan={2} style={LBL}>CEP:</td>
            <td colSpan={3} style={VAL}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Telefone:</td>
            <td colSpan={3} style={VAL}>{get('cliente_telefone_fixo')}</td>
            <td colSpan={1} style={LBL}>Celular:</td>
            <td colSpan={3} style={VAL}>{get('cliente_celular')}</td>
            <td colSpan={2} style={VAL}>&nbsp;</td>
            <td colSpan={3} style={{ ...LBL, textAlign: 'center' }}>N° de fases:</td>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Ramal:</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Tipo do Padrão:</td>
            <td colSpan={4} style={{ ...LBL, textAlign: 'center' }}>Nível de tensão (V):</td>
            <td colSpan={5} style={{ ...LBL, textAlign: 'center', ...WARN, ...HL_YELLOW }}>Potência Máxima Disponibilizada (kW):</td>
          </tr>
          <tr>
            <td colSpan={2} style={VALC}>{get('tipo_conexao').toUpperCase()}</td>
            <td colSpan={4} style={VALC}>{get('tensao_atendimento')}</td>
            <td colSpan={5} style={{ ...VALC, ...HL_YELLOW }}>{get('potencia_disponibilizada_kw')}</td>
            <td colSpan={3} style={VALC}>{get('numero_fases') || '1'}</td>
            <td colSpan={2} style={VALC}>{get('tipo_ramal').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Disjuntor geral (A):</td>
            <td colSpan={4} style={{ ...LBL, textAlign: 'center' }}>Fator de Potência:</td>
            <td colSpan={3} style={{ ...LBL, textAlign: 'center' }}>Demanda Contratada (kW):</td>
            <td colSpan={2} style={HDR_PLAIN}>DPS CA (kA)</td>
            <td colSpan={2} style={HDR_PLAIN}>DISJUNTOR CA</td>
            <td colSpan={2} style={HDR_PLAIN}>DPS CC (kA)</td>
            <td colSpan={1} style={{ ...HDR_PLAIN, fontSize: '7pt' }}>DISJUNTOR CC</td>
          </tr>
          <tr>
            <td colSpan={2} style={VALC}>{get('disjuntor_corrente_a')}</td>
            <td colSpan={4} style={VALC}>{get('inversores_fator_potencia')}</td>
            <td colSpan={3} style={VALC}>{get('carga_declarada_kw')}</td>
            <td colSpan={2} style={VALC} rowSpan={3}>{get('dps_ca_ka')}</td>
            <td colSpan={2} style={VALC} rowSpan={3}>{get('disjuntor_ca_corrente_a')}</td>
            <td colSpan={2} style={VALC} rowSpan={3}>{get('dps_cc_ka')}</td>
            <td colSpan={1} style={VALC} rowSpan={3}>{get('disjuntor_cc_corrente_a')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Modalidade:</td>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Potência Trafo:</td>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Nº de hastes:</td>
            <td colSpan={3} style={{ ...LBL, textAlign: 'center' }}>Demanda Contratada (kWg):</td>
          </tr>
          <tr>
            <td colSpan={2} style={VALC}>{get('modalidade_compensacao')}</td>
            <td colSpan={2} style={VALC}>{get('potencia_trafo')}</td>
            <td colSpan={2} style={VALC}>{get('numero_hastes')}</td>
            <td colSpan={3} style={VALC}>{get('carga_declarada_kw')}</td>
          </tr>
          <tr>
            <td colSpan={6} style={{ ...LBL, textAlign: 'center' }} rowSpan={2}>Coordenadas do padrão de entrada em UTM:</td>
            <td colSpan={3} style={{ ...LBL, textAlign: 'center' }}>FUSO</td>
            <td colSpan={4} style={{ ...LBL, textAlign: 'center' }}>X (LONG)</td>
            <td colSpan={3} style={{ ...LBL, textAlign: 'center' }}>Y (LAT)</td>
          </tr>
          <tr>
            <td colSpan={3} style={VALC}>{get('coord_utm_fuso')}</td>
            <td colSpan={4} style={VALC}>{get('coord_utm_x')}</td>
            <td colSpan={3} style={VALC}>{get('coord_utm_y')}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...T, marginTop: '0', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '10.09%' }} /><col style={{ width: '10.09%' }} /><col style={{ width: '12%' }} />
          <col style={{ width: '5.32%' }} /><col style={{ width: '18.75%' }} /><col style={{ width: '12.75%' }} />
          <col style={{ width: '12.25%' }} /><col style={{ width: '6%' }} /><col style={{ width: '6%' }} /><col style={{ width: '6.75%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={HDR_ORANGE} rowSpan={2}>Tipo Tensão:</td>
            <td style={HDR_ORANGE} rowSpan={2}>Cabos por fase:</td>
            <td style={HDR_ORANGE} rowSpan={2}>Potência De Geração (kW):</td>
            <td style={HDR_ORANGE} rowSpan={2}>Bitola Fase:</td>
            <td style={HDR_ORANGE} rowSpan={2}>Bitola Neutro:</td>
            <td style={HDR_ORANGE} rowSpan={2}>Bitola Terra:</td>
            <td style={HDR_ORANGE} rowSpan={2}>Sistema GD já instalado?</td>
            <td style={{ ...HDR_ORANGE, textAlign: 'center' }} colSpan={2}>Previsão de ligação (Mês)</td>
            <td style={HDR_ORANGE} rowSpan={2}>Zona:</td>
          </tr>
          <tr>
            <td style={HDR_ORANGE}>Mês:</td>
            <td style={HDR_ORANGE}>Ano:</td>
          </tr>
          <tr>
            <td style={{ ...VALC, fontWeight: 'bold' }}>BAIXA</td>
            <td style={VALC}>{get('cabos_por_fase') || '1'}</td>
            <td style={{ ...VALC, fontWeight: 'bold' }}>{fmtBR(getTotalInversorKw(projectData))}</td>
            <td style={VALC}>{get('secao_fase_mm2')}</td>
            <td style={VALC}>{get('secao_neutro_mm2')}</td>
            <td style={VALC}>{get('secao_aterramento_mm2')}</td>
            <td style={{ ...VALC, fontWeight: 'bold' }}>NÃO</td>
            <td style={VALC}>{previsaoLigacao.mes}</td>
            <td style={VALC}>{previsaoLigacao.ano}</td>
            <td style={{ ...VALC, fontWeight: 'bold' }}>URBANO</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...T, marginTop: '0' }}>
        <tbody>
          <tr><td style={{ ...LBL, textAlign: 'center', verticalAlign: 'top', width: '10.09%' }}>Observações:</td><td style={{ ...VAL, height: '58px', width: '89.91%' }}>&nbsp;</td></tr>
        </tbody>
      </table>
      <div style={V6_TAG}>V6</div>

      <table style={{ ...T, marginTop: '0' }}>
        <tbody><tr><td style={BAR}>2. CARACTERÍSTICAS DA GERAÇÃO DA UNIDADE CONSUMIDORA</td></tr></tbody>
      </table>
      <div style={{ fontWeight: 800, fontSize: '9pt', textAlign: 'center', color: '#E07B18', padding: '4px 0' }}>Estrutura dos painéis utilizados na usina:</div>
      <table style={{ ...T, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '6%' }} /><col style={{ width: '8%' }} /><col style={{ width: '22%' }} />
          <col style={{ width: '26%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} /><col style={{ width: '12%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={HDR_PLAIN}>N°</td><td style={HDR_PLAIN}>Qtd.</td><td style={HDR_PLAIN}>Fabricante</td>
            <td style={HDR_PLAIN}>Modelo dos painéis</td><td style={HDR_PLAIN}>Área total do arranjo (M²)</td>
            <td style={HDR_PLAIN}>Potência (kW)</td><td style={HDR_PLAIN}>Subtotal (kW)</td>
          </tr>
          {Array.from({ length: Math.max(modulosList.length, 5) }).map((_, i) => {
            const m = modulosList[i];
            const unitKw = m ? parseFloat(String(m.potencia_wp || '0').replace(',', '.')) / 1000 : 0;
            const qty = m ? parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0 : 0;
            const areaLinha = m ? (parseFloat(String(m.area_unitaria_m2 || '0').replace(',', '.')) || 0) * qty : 0;
            return (
              <tr key={i}>
                <td style={VALC}>{m ? i + 1 : ''}</td>
                <td style={VALC}>{m ? qty : ''}</td>
                <td style={VALC}>{m?.fabricante || ''}</td>
                <td style={VALC}>{m?.modelo || ''}</td>
                <td style={VALC}>{m ? fmtBR(areaLinha) : ''}</td>
                <td style={VALC}>{m ? fmtBR(unitKw) : ''}</td>
                <td style={VALC}>{m ? fmtBR(unitKw * qty) : ''}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={4} style={VAL}></td>
            <td style={{ ...LBL, textAlign: 'center' }}>Área Total: {fmtBR(areaTotalArranjos)}m²</td>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Potência Total (kW): {fmtBR(getTotalKwpFromModulos(projectData))}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontWeight: 800, fontSize: '9pt', textAlign: 'center', color: '#E07B18', padding: '10px 0 4px' }}>Estrutura do(s) inversor(es) utilizado(s) na usina:</div>
      <table style={{ ...T, tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '6%' }} /><col style={{ width: '8%' }} /><col style={{ width: '22%' }} />
          <col style={{ width: '26%' }} /><col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={HDR_PLAIN}>N°</td><td style={HDR_PLAIN}>Qtd.</td><td style={HDR_PLAIN}>Fabricante</td>
            <td style={HDR_PLAIN}>Modelo do(s) inversor(es)</td><td style={HDR_PLAIN}>Potência (kW)</td>
            <td style={HDR_PLAIN}>Subtotal (kW)</td><td style={HDR_PLAIN}>Tensão nominal (V)</td>
          </tr>
          {Array.from({ length: Math.max(inversoresList.length, 5) }).map((_, i) => {
            const inv = inversoresList[i];
            const unitKw = inv ? parseFloat(String(inv.potencia || '0').replace(',', '.')) : 0;
            const qty = inv ? parseFloat(String(inv.quantidade || '0').replace(',', '.')) || 0 : 0;
            return (
              <tr key={i}>
                <td style={VALC}>{inv ? i + 1 : ''}</td>
                <td style={VALC}>{inv ? qty : ''}</td>
                <td style={VALC}>{inv?.fabricante || ''}</td>
                <td style={VALC}>{inv?.modelo || ''}</td>
                <td style={VALC}>{inv ? fmtBR(unitKw) : ''}</td>
                <td style={VALC}>{inv ? fmtBR(unitKw * qty) : ''}</td>
                <td style={VALC}>{inv?.tensao || ''}</td>
              </tr>
            );
          })}
          <tr>
            <td colSpan={5} style={VAL}></td>
            <td colSpan={2} style={{ ...LBL, textAlign: 'center' }}>Potência Total (kW): {fmtBR(getTotalInversorKw(projectData))}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...T, marginTop: '14px', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '50%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '24%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={{ ...BAR }}>NECESSITA DE AUTOTRAFO OU DE TRANSFORMADOR DE ACOPLAMENTO?</td>
            <td style={{ ...RED_CELL }}>{get('necessita_autotrafo') || ' '}</td>
            <td style={{ border: 'none' }}></td>
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td>
            <td style={{ ...LBL, textAlign: 'right' }}>POTÊNCIA:</td>
            <td style={VAL}>{get('potencia_autotrafo')}</td>
            <td style={{ border: 'none' }}></td>
          </tr>
        </tbody>
      </table>
      <table style={{ ...T, marginTop: '10px', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '50%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '24%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={{ ...BAR }}>ATENDIMENTO COM TRAFO EXCLUSIVO (GRUPO &quot;A&quot; E CONSUMIDORES RURAIS)?</td>
            <td style={{ ...RED_CELL }}>{get('atendimento_trafo_exclusivo') || ' '}</td>
            <td style={{ border: 'none' }}></td>
          </tr>
          <tr>
            <td style={{ border: 'none' }}></td>
            <td style={{ ...LBL, textAlign: 'right' }}>POTÊNCIA:</td>
            <td style={VAL}>{get('potencia_trafo_exclusivo')}</td>
            <td style={{ border: 'none' }}></td>
          </tr>
        </tbody>
      </table>

      <SignatureBlock label="Assinatura do Projetista" />

      {/* ══════════════════ Folha 5: Ajustes de Proteções / Requisitos de Segurança ══════════════════ */}
      <SheetLabel n={5} />

      <table style={T}>
        <tbody>
          <tr><td colSpan={3} style={BAR}>3. AJUSTES RECOMENDADOS DAS PROTEÇÕES - PARAMETRIZAÇÕES DO INVERSOR</td></tr>
          <tr>
            <td style={{ ...BAR2, width: '44%' }}>DESCRIÇÃO</td>
            <td style={{ ...BAR2, width: '28%' }}>PARÂMETROS</td>
            <td style={{ ...BAR2, width: '28%' }}>TEMPO DE ATUAÇÃO</td>
          </tr>
          {[
            ['Tensão no ponto de Conexão:', 'V < 80% (0,8 PU) Vn', 'Desligar em 0,2 s', CORAL],
            ['Tensão no ponto de Conexão:', 'V > 110% (1,1 PU) Vn', 'Desligar em 0,2 s', PEACH],
            ['Regime Normal de Operação:', '80% <= V <= 110%', 'Condições normais', CORAL],
            ['Subfrequência:', 'f < 57,5 HZ', 'Desligar em até 0,2 s', PEACH],
            ['Sobrefrequência:', 'f > 62,0 HZ', 'Desligar em 0,2 s', CORAL],
            ['Frequência Nominal da Rede:', 'f = 60 HZ', 'Condições normais', PEACH],
            ['Após a perda da rede (ilhamento), deverá interromper o fornecimento de energia à rede:', 'Ilhamento', 'Interromper em até 2s', CORAL],
            ['Após a retomada das condições normais de tensão e frequência da rede, religar:', 'Reconexão', 'Após 180s', PEACH],
          ].map((row, i) => (
            <tr key={i}>
              <td style={{ ...VAL, ...(row[3] as React.CSSProperties), lineHeight: 1.4 }}>{row[0] as string}</td>
              <td style={{ ...VALC, ...(row[3] as React.CSSProperties) }}>{row[1] as string}</td>
              <td style={{ ...VALC, ...(row[3] as React.CSSProperties) }}>{row[2] as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ ...T, marginTop: '8px' }}>
        <tbody><tr><td style={BAR}>4. REQUISITOS DE SEGURANÇA</td></tr></tbody>
      </table>

      <div style={{ fontSize: '9.2pt', lineHeight: 1.48, textAlign: 'justify', padding: '5px 2px' }}>
        O projeto deve ser elaborado atendendo todos os requisitos de segurança solicitado no item 10 da NDU013 e NDU015. Para os sistemas de Geração Distribuída, é necessária a instalação de dispositivo de proteção contra surto (DPS) devidamente projetado e de acordo com as indicações estabelecidas na ABNT NBR 5419:2015 e os diagramas, conforme Desenhos NDU013.

        <div style={{ fontSize: '9.6pt', margin: '7px 0 2px', textDecoration: 'underline' }}>4.1 Variações de Tensão e Fequência</div>
        Condições anormais de operação podem surgir na rede elétrica e requerem uma resposta do sistema de Geração Distribuída conectado a essa rede. Esta resposta é para garantir a segurança das equipes de manutenção da rede e das pessoas em geral, bem como para evitar danos aos equipamentos conectados à rede, incluindo o sistema de geração distribuída.

        <div style={{ fontSize: '9.6pt', margin: '7px 0 2px', textDecoration: 'underline' }}>4.2 Proteção Anti-Ilhamento</div>
        Na ocorrência de uma eventual falta na rede da Energisa durante a operação de paralelismo, o sistema de Geração deve desligar-se através do inversor e isolar a geração da rede, no máximo, em 2 segundos. O inversor deve garantir o sincronismo da geração com a rede e evitar conexões indevidas. Em nenhuma hipótese será permitido o ilhamento de geradores conectados ao sistema Elétrico da Energisa.

        <div style={{ fontSize: '9.6pt', margin: '7px 0 2px', textDecoration: 'underline' }}>4.3 Reconexão</div>
        Depois de uma &ldquo;desconexão&rdquo; devido a uma condição anormal da rede, o sistema de Geração Distribuída não pode retomar o fornecimento de energia à rede elétrica (reconexão) por um período mínimo de 180 segundos após a retomada das condições normais de tensão e frequência da rede.

        <div style={{ fontSize: '9.6pt', margin: '7px 0 2px', textDecoration: 'underline' }}>4.4 Aterramento</div>
        O sistema de Geração Distribuída deverá estar conectado ao sistema de aterramento da unidade consumidora. As instalações de Centrais Geradoras deverão estar providas de sistemas de aterramento que garantam que, em quaisquer circunstâncias, não sejam geradas tensões de contato superiores aos limites estabelecidos conforme NBR 5410. O estudo relativo ao sistema de aterramento da geração distribuída deverá ser de responsabilidade do responsável técnico pelo projeto.

        <div style={{ fontSize: '9.6pt', margin: '7px 0 2px', textDecoration: 'underline' }}>4.5 Sinalização de Segurança</div>
        A sinalização de segurança deve ser instalada junto ao padrão de entrada de energia, próximo à caixa de medição/proteção. Deverá ser instalada uma placa de advertência com os seguintes dizeres:
        <div style={{ textAlign: 'center', fontWeight: 800, padding: '5px 0' }}>&quot;CUIDADO - RISCO DE CHOQUE ELÉTRICO - GERAÇÃO PRÓPRIA&quot;</div>
        Sendo identificado com tinta anticorrosiva, não sendo aceita a utilização de adesivos. A placa de advertência deverá ser confeccionada em PVC ou acrílico com espessura mínima de 1mm e conforme modelo do desenho NDU013 pág. 65.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', marginTop: '10px' }}>
        <div style={{ marginLeft: '101px' }}>
          <img src="/images/placa-energisa-memorial.png" alt="Placa de Advertência Energisa" style={{ width: '192px', height: 'auto', display: 'block' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'center', paddingLeft: '30%' }}>
          <div style={{ width: '47%', margin: '0 auto 3px auto', borderTop: '1px solid #111' }} />
          <span style={{ fontSize: '8.5pt', fontWeight: 'bold' }}>Assinatura do Projetista</span>
        </div>
      </div>

      {/* ══════════════════ Folha 6: Diagrama Unifilar ══════════════════ */}
      <SheetLabel n={6} />
      <div style={{ fontWeight: 800, fontSize: '13pt', marginBottom: '6px', color: '#29ade0' }}>
        Diagrama Unifilar para Sistemas Fotovoltaicos Conforme NDU013.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: '12px' }}>
        <div>
          <table style={{ ...T, marginTop: 0, marginBottom: '6px' }}>
            <colgroup><col style={{ width: '38%' }} /><col style={{ width: '62%' }} /></colgroup>
            <tbody>
              <tr><td colSpan={2} style={{ background: 'transparent', color: '#000', textDecoration: 'underline', border: 'none', padding: '2px 6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Dados do Projeto:</td></tr>
              <tr><td style={LBL}>Tensão Nominal (V):</td><td style={{ ...VAL, fontWeight: 'bold' }}>{get('tensao_atendimento')}</td></tr>
              <tr><td style={LBL}>N° de fases:</td><td style={VAL}>{get('numero_fases') || '1'}</td></tr>
              <tr><td style={LBL}>Cabos por fase:</td><td style={VAL}>{get('cabos_por_fase') || '1'}</td></tr>
              <tr><td style={LBL}>Bitola fase (mm²):</td><td style={VAL}>{get('secao_fase_mm2')}</td></tr>
              <tr><td style={LBL}>Bitola neutro (mm²):</td><td style={VAL}>{get('secao_neutro_mm2')}</td></tr>
              <tr><td style={LBL}>Bitola terra (mm²):</td><td style={VAL}>{get('secao_aterramento_mm2')}</td></tr>
              <tr><td style={LBL}>Proteção (A):</td><td style={VAL}>{get('disjuntor_corrente_a')}</td></tr>
            </tbody>
          </table>

          <table style={{ ...T, marginTop: 0, marginBottom: '6px' }}>
            <colgroup><col style={{ width: '38%' }} /><col style={{ width: '62%' }} /></colgroup>
            <tbody>
              <tr><td colSpan={2} style={{ background: 'transparent', color: '#000', textDecoration: 'underline', border: 'none', padding: '2px 6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Módulo(s) solar(es):</td></tr>
              <tr><td style={LBL}>Fabricante:</td><td style={VAL}>{modulosList[0]?.fabricante || ''}</td></tr>
              <tr><td style={LBL}>Modelo:</td><td style={VAL}>{modulosList[0]?.modelo || ''}</td></tr>
              <tr><td style={LBL}>Qtd. módulos:</td><td style={VAL}>{modulosList.reduce((a, m) => a + (parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0), 0) || ''}</td></tr>
              <tr><td style={LBL}>Potência total:</td><td style={{ ...VAL, fontWeight: 'bold' }}>{fmtBR(getTotalKwpFromModulos(projectData))} kWp</td></tr>
            </tbody>
          </table>

          <table style={{ ...T, marginTop: 0, marginBottom: '6px' }}>
            <colgroup><col style={{ width: '38%' }} /><col style={{ width: '62%' }} /></colgroup>
            <tbody>
              <tr><td colSpan={2} style={{ background: 'transparent', color: '#000', textDecoration: 'underline', border: 'none', padding: '2px 6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Inversor(es):</td></tr>
              <tr><td style={LBL}>Fabricante:</td><td style={VAL}>{inversoresList[0]?.fabricante || ''}</td></tr>
              <tr><td style={LBL}>Modelo:</td><td style={VAL}>{inversoresList[0]?.modelo || ''}</td></tr>
              <tr><td style={LBL}>Qtd. inversores:</td><td style={VAL}>{inversoresList.reduce((a, i) => a + (parseFloat(String(i.quantidade || '0').replace(',', '.')) || 0), 0) || ''}</td></tr>
              <tr><td style={LBL}>Potência total:</td><td style={{ ...VAL, fontWeight: 'bold' }}>{fmtBR(getTotalInversorKw(projectData))} kW</td></tr>
              <tr><td style={LBL}>DPS CA (A):</td><td style={VAL}>{get('dps_ca_ka')}</td></tr>
              <tr><td style={LBL}>DPS CC (A):</td><td style={VAL}>{get('dps_cc_ka')}</td></tr>
            </tbody>
          </table>

          <table style={{ ...T, marginTop: 0, marginBottom: '6px' }}>
            <colgroup><col style={{ width: '38%' }} /><col style={{ width: '62%' }} /></colgroup>
            <tbody>
              <tr><td colSpan={2} style={{ background: 'transparent', color: '#000', textDecoration: 'underline', border: 'none', padding: '2px 6px 4px', textAlign: 'center', fontWeight: 'bold' }}>Localização da UC:</td></tr>
              <tr><td style={LBL}>Código (UC):</td><td style={VAL}>{get('conta_contrato')}</td></tr>
              <tr><td style={LBL}>Titular:</td><td style={VAL}>{get('nomeClienteFinal').toUpperCase()}</td></tr>
              <tr><td style={LBL}>Logradouro:</td><td style={VAL}>{get('endereco_local').toUpperCase()}{get('numero_endereco_cliente') ? `, ${get('numero_endereco_cliente')}` : ''}</td></tr>
              <tr><td style={LBL}>Bairro:</td><td style={VAL}>{get('bairro_cliente')}</td></tr>
              <tr><td style={LBL}>Cidade:</td><td style={VAL}>{get('client_city')}</td></tr>
              <tr><td style={LBL}>CEP:</td><td style={VAL}>{get('cliente_cep')}</td></tr>
              <tr><td style={LBL}>Fuso:</td><td style={VAL}>{get('coord_utm_fuso')}</td></tr>
              <tr><td style={LBL}>Latitude (X):</td><td style={VAL}>{get('coord_utm_x')}</td></tr>
              <tr><td style={LBL}>Longitude (Y):</td><td style={VAL}>{get('coord_utm_y')}</td></tr>
            </tbody>
          </table>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '165px', bottom: '6px', width: '185px', textAlign: 'center' }}>
            <div style={{ width: '88%', margin: '0 auto 3px auto', borderTop: '1px solid #111' }} />
            <span style={{ fontSize: '9px', fontWeight: 700 }}>Assinatura do Projetista</span>
          </div>
          <div style={{ position: 'absolute', top: '35%', left: '15px', display: 'block' }}>
            <img src="/images/placa-energisa-memorial2.png" alt="Placa de Advertência Energisa" style={{ width: '162px', height: 'auto', display: 'block' }} />
            <div style={{ width: '185px', textAlign: 'center', fontWeight: 700, marginTop: '8px', fontSize: '9.6px' }}>
              A sinalização de segurança deve ser instalada junto ao padrão de entrada de energia, próximo a caixa de medição proteção. Deverá ser instalada uma placa de advertência com os seguintes dizeres: CUIDADO - RISCO DE CHOQUE ELÉTRICO
            </div>
          </div>

          <div style={{ position: 'relative', width: '63.8%', marginLeft: '25%', marginTop: 0 }}>
            <img src="/images/unifilar-energisa.png" alt="Diagrama Unifilar Energisa" style={{ width: '100%', height: 'auto', display: 'block' }} />
            <span style={{ position: 'absolute', top: '21%', left: '1.5%', fontSize: '10px', fontWeight: 700, color: '#000' }}>13,8 kV</span>
            <span style={{ position: 'absolute', top: '15%', left: '47%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{get('disjuntor_corrente_a') ? `${get('disjuntor_corrente_a')}A` : ''}</span>
            <span style={{ position: 'absolute', top: '18%', left: '88%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{get('disjuntor_quadro_ca_corrente_a') ? `${get('disjuntor_quadro_ca_corrente_a')}A` : ''}</span>
            <span style={{ position: 'absolute', top: '33%', left: '84%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{get('dps_ca_ka') ? `${get('dps_ca_ka')}kA` : ''}</span>
            <span style={{ position: 'absolute', top: '73%', left: '28%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{fmtBR(getTotalInversorKw(projectData))} kW</span>
            <span style={{ position: 'absolute', top: '92%', left: '79%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{fmtBR(getTotalKwpFromModulos(projectData))} kWp</span>
            <span style={{ position: 'absolute', top: '57%', left: '52%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{get('disjuntor_cc_corrente_a') ? `${get('disjuntor_cc_corrente_a')}A` : ''}</span>
            <span style={{ position: 'absolute', top: '75%', left: '52%', fontSize: '10px', fontWeight: 700, color: '#000' }}>{get('dps_cc_ka') ? `${get('dps_cc_ka')}kA` : ''}</span>
          </div>

          <div style={{ textAlign: 'center', fontSize: '10.2px', fontWeight: 700, lineHeight: 1.6, padding: '10px 20px 4px', marginLeft: '43%', marginRight: '3%' }}>
            <div style={{ fontWeight: 800, marginBottom: '4px' }}>Notas:</div>
            <div>1 - O sistema de GD deverá estar conectada ao sistema de aterramento da UC.</div>
            <div>2 - O sistema de GD deve possuir dispositivo de proteção contra sobrecorrentes, a fim de limitar e interromper o fornecimento de energia, como proporcionar proteção à rede da Energisa contra eventuais defeitos a partir do sistema de Geração Distribuída.</div>
            <div>3 - O inversor deve garantir o sincronismo da geração com a rede e evitar conexões indevidas. Em nenhuma hipótese sera permitido o ilhamento de geradores conectados ao sistema Elétrico da Energisa.</div>
            <div>4 - O aumento à revelia da capacidade de geração não é permitido sob pena de interromper o canal de geração da unidade consumidora.</div>
            <div>5 - É vedada a divisão de centrais geradoras.</div>
            <div>6 - A adesão ao sistema de compensação de energia elétrica não se aplica aos consumidores livres ou especiais.</div>
          </div>
        </div>
      </div>

      <div style={{ fontSize: '5.6pt', lineHeight: 1.3, color: '#222', marginTop: '8px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
        <span>OBSERVAÇÃO: DIAGRAMA UNIFILAR GERADO AUTOMATICAMENTE DE ACORDO COM O PREENCHIMENTO DO DOCUMENTO, SENDO O PROJETISTA, O RESPONSÁVEL LEGAL PELO PROJETO APRESENTADO JUNTO À ENERGISA. JUNTO A ESSE PROJETO DEVEM SER APRESENTADAS AS DEMAIS DOCUMENTAÇÕES DE PROJETO. A NÃO APRESENTAÇÃO DA DOCUMENTAÇÃO GERADA POR ESSE FORMULÁRIO, JUNTO AO EXCEL E AO RESTANTE DAS DOCUMENTAÇÕES PODERÁ RESULTAR NA REPROVA DO PROJETO.</span>
        <span>V6</span>
      </div>

      <div className="mt-8 flex justify-center">
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
              Baixar PDF — Formulário GD Energisa
            </>
          )}
        </Button>
      </div>
    </div>
    </>
  );
}
