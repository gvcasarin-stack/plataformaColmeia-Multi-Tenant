'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface FormularioSolicitacaoPreviewProps {
  distribuidora: string;
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
  '{{distribuidora}}': 'distribuidora',
  '{{data}}': 'data_documento',
};

export function FormularioSolicitacaoPreview({ projectData }: FormularioSolicitacaoPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    if (!contentRef.current) return;
    setGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Formulário Solicitação de Acesso - ${clientName}.pdf`;

      contentRef.current.classList.add('pdf-printing');

      const opt = {
        margin: [8, 8, 8, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, width: 794, windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css'], before: '.break-before-page' },
      };

      await html2pdf().set(opt).from(contentRef.current).save();
      contentRef.current.classList.remove('pdf-printing');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      contentRef.current?.classList.remove('pdf-printing');
    } finally {
      setGenerating(false);
    }
  };

  const V = ({ children, upper }: { children: string; upper?: boolean }) => {
    const fieldKey = PLACEHOLDER_MAP[children];
    const raw = fieldKey && projectData ? projectData[fieldKey] : undefined;
    const hasValue = raw !== undefined && raw !== null && raw !== '' && raw !== 0;

    if (hasValue) {
      const display = upper ? String(raw).toUpperCase() : String(raw);
      return <span className="formulario-val font-medium">{display}</span>;
    }
    return (
      <span
        className="formulario-placeholder inline-flex items-center rounded border border-dashed border-orange-400 px-1 font-medium"
        style={{ fontSize: '8px', color: '#f97316' }}
      >
        {children}
      </span>
    );
  };

  // Valores derivados
  const potenciaKwp = (() => {
    const p = parseFloat(String(projectData?.potencia || '0'));
    return isNaN(p) || p === 0 ? null : p.toFixed(2).replace('.', ',');
  })();

  const inversoresQtd = Math.min(10, Math.max(1, parseInt(String(projectData?.inversores_quantidade || '1')) || 1));

  const totalInversoresPotencia = (() => {
    const p = parseFloat(String(projectData?.inversores_potencia || '0'));
    if (isNaN(p) || p === 0) return '';
    return (p * inversoresQtd).toFixed(2).replace('.', ',');
  })();

  // Estilos base
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: '6px', fontSize: '9px' };
  const tdStyle: React.CSSProperties = { border: '1px solid #374151', padding: '3px 5px', fontSize: '9px', verticalAlign: 'top' };
  const labelStyle: React.CSSProperties = { ...tdStyle, backgroundColor: '#f3f4f6', fontWeight: '600', color: '#374151', whiteSpace: 'nowrap', fontSize: '8px' };
  const thStyle: React.CSSProperties = { border: '1px solid #374151', padding: '3px 5px', backgroundColor: '#dbeafe', fontWeight: 'bold', fontSize: '8px', textAlign: 'left' };
  const sectionHeader: React.CSSProperties = { backgroundColor: '#1e40af', color: '#ffffff', fontWeight: 'bold', padding: '4px 6px', fontSize: '9px', border: '1px solid #1e3a8a', marginBottom: '0' };
  const subHeader: React.CSSProperties = { backgroundColor: '#dbeafe', color: '#1e3a8a', fontWeight: 'bold', padding: '3px 6px', fontSize: '9px', border: '1px solid #93c5fd' };

  return (
    <>
      <div className="mb-3 flex gap-2 items-center print:hidden">
        <Button
          onClick={handleGeneratePdf}
          disabled={generating}
          className="bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando PDF...</>
          ) : (
            <><FileDown className="mr-2 h-4 w-4" />Baixar PDF</>
          )}
        </Button>
      </div>

      <div
        ref={contentRef}
        className="bg-white text-gray-800"
        style={{ width: '794px', padding: '28px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', fontSize: '9px', lineHeight: '1.3' }}
      >
        {/* CABEÇALHO */}
        <div style={{ border: '2px solid #1e40af', marginBottom: '8px' }}>
          <div style={{ backgroundColor: '#1e40af', color: 'white', padding: '4px 8px', fontWeight: 'bold', fontSize: '9px', textAlign: 'center' }}>
            NT.00020.EQTL.Normas e Qualidade
          </div>
          <div style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px', borderTop: '1px solid #1e40af' }}>
            ANEXO I - Formulário de Solicitação de Orçamento de Microgeração Distribuída Grupo B
          </div>
        </div>

        {/* SEÇÃO 1 — UC */}
        <div style={{ marginBottom: '8px' }}>
          <div style={sectionHeader}>
            1. Identificação e Dados Cadastrais da Unidade Consumidora
          </div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelStyle}>Nome do Cliente / Razão Social (Titular da UC)</td>
                <td style={{ ...tdStyle, width: '50%' }}><V>{`{{cliente_nome}}`}</V></td>
                <td style={labelStyle}>CPF/CNPJ</td>
                <td style={tdStyle}><V>{`{{cliente_cpf}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Endereço</td>
                <td style={tdStyle}><V>{`{{endereco}}`}</V></td>
                <td style={labelStyle}>Celular</td>
                <td style={tdStyle}><V>{`{{cliente_celular}}`}</V>{' '}Fixo:{' '}<V>{`{{cliente_telefone_fixo}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>CEP</td>
                <td style={tdStyle}><V>{`{{cliente_cep}}`}</V>{' '}Município:{' '}<V>{`{{cidade}}`}</V></td>
                <td style={labelStyle}>UF</td>
                <td style={tdStyle}><V>{`{{estado}}`}</V>{' '}E-mail:{' '}<V>{`{{cliente_email}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Tipo de Orçamento</td>
                <td style={tdStyle}>Orçamento de Conexão</td>
                <td style={labelStyle}>Conta Contrato (Se UC existente)</td>
                <td style={tdStyle}><V>{`{{conta_contrato}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Tipo de Solicitação</td>
                <td colSpan={3} style={tdStyle}><V>{`{{tipo_solicitacao}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Tarifa Branca?</td>
                <td style={tdStyle}><V>{`{{tarifa_branca}}`}</V></td>
                <td style={labelStyle}>Possui Cargas Especiais?</td>
                <td style={tdStyle}><V>{`{{possui_cargas_especiais}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Ramo de Atividade</td>
                <td style={tdStyle}><V upper>{`{{classe_uc}}`}</V></td>
                <td style={labelStyle}>Classe</td>
                <td style={tdStyle}><V>{`{{classe_uc}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Tipo de Ligação</td>
                <td style={tdStyle}><V upper>{`{{tipo_conexao}}`}</V></td>
                <td style={labelStyle}>Tensão de Atendimento da UC</td>
                <td style={tdStyle}><V>{`{{tensao_atendimento}}`}</V> V</td>
              </tr>
              <tr>
                <td style={labelStyle}>Carga Declarada da UC</td>
                <td style={tdStyle}><V>{`{{carga_declarada_kw}}`}</V> kW</td>
                <td style={labelStyle}>Disjuntor de Entrada da UC</td>
                <td style={tdStyle}><V>{`{{disjuntor_corrente_a}}`}</V> A</td>
              </tr>
              <tr>
                <td style={labelStyle}>Potência Disponibilizada (PD) para a UC</td>
                <td style={tdStyle}><V>{`{{potencia_disponibilizada_kw}}`}</V> kW</td>
                <td style={labelStyle}>Tipo de Ramal</td>
                <td style={tdStyle}><V upper>{`{{tipo_ramal}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Nº do Poste ou Transformador mais próximo</td>
                <td colSpan={3} style={tdStyle}><V>{`{{numero_poste_transformador}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>Coordenadas UTM — Fuso <V>{`{{coord_utm_fuso}}`}</V></td>
                <td colSpan={3} style={tdStyle}>
                  X = <V>{`{{coord_utm_x}}`}</V>&nbsp;&nbsp;&nbsp; Y = <V>{`{{coord_utm_y}}`}</V>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Responsável Legal */}
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelStyle}>Nome do Responsável Legal</td>
                <td style={tdStyle}><V>{`{{responsavel_legal_nome}}`}</V></td>
                <td style={labelStyle}>Telefone do Responsável Legal</td>
                <td style={tdStyle}><V>{`{{responsavel_legal_telefone}}`}</V></td>
                <td style={labelStyle}>E-mail do Responsável Legal</td>
                <td style={tdStyle}><V>{`{{responsavel_legal_email}}`}</V></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SEÇÃO 2 — Responsável Técnico */}
        <div style={{ marginBottom: '8px' }}>
          <div style={sectionHeader}>2. Dados Cadastrais do Responsável Técnico</div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelStyle}>Nome Completo</td>
                <td style={{ ...tdStyle, width: '30%' }}><V>{`{{responsavel_nome}}`}</V></td>
                <td style={labelStyle}>Título Profissional</td>
                <td style={tdStyle}><V upper>{`{{responsavel_profissao}}`}</V></td>
                <td style={labelStyle}>Registro Nº</td>
                <td style={tdStyle}><V>{`{{responsavel_registro}}`}</V></td>
                <td style={labelStyle}>UF</td>
                <td style={tdStyle}><V>{`{{responsavel_uf}}`}</V></td>
              </tr>
              <tr>
                <td style={labelStyle}>E-mail</td>
                <td colSpan={3} style={tdStyle}><V>{`{{responsavel_email}}`}</V></td>
                <td style={labelStyle}>Telefone Celular</td>
                <td colSpan={3} style={tdStyle}><V>{`{{cliente_celular}}`}</V></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SEÇÃO 3 — Microgeração */}
        <div style={{ marginBottom: '8px' }}>
          <div style={sectionHeader}>3. Características da Microgeração Distribuída</div>
          <div style={subHeader}>Dados Gerais da Central Geradora</div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={labelStyle}>Tipo de Fonte Primária</td>
                <td style={tdStyle}>SOLAR FOTOVOLTAICA</td>
                <td style={labelStyle}>Tipo de Geração</td>
                <td style={tdStyle}>EMPREGANDO CONVERSOR ELETRÔNICO/INVERSOR</td>
              </tr>
              <tr>
                <td style={labelStyle}>Modalidade de Compensação</td>
                <td style={tdStyle}><V upper>{`{{modalidade_compensacao}}`}</V></td>
                <td style={labelStyle}>Potência Geração Total da UC (PGT)</td>
                <td style={tdStyle}>{potenciaKwp ? `${potenciaKwp} kW` : <V>{`{{potencia}}`}</V>}</td>
              </tr>
              <tr>
                <td style={labelStyle}>Data Início de Operação</td>
                <td colSpan={3} style={tdStyle}><V>{`{{data_inicio_operacao}}`}</V></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* UNIDADES GERADORAS */}
        <div style={{ border: '1px solid #374151', marginBottom: '8px' }}>
          <div style={{ ...sectionHeader, backgroundColor: '#065f46' }}>
            Informações das Unidades Geradoras (UG)
          </div>

          <div style={{ padding: '6px' }}>
            {/* Módulos */}
            <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '4px' }}>1. Solar Fotovoltaica</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Potência do Módulo (W)</th>
                  <th style={thStyle}>Quantidade</th>
                  <th style={thStyle}>Potência de Pico (kWp)</th>
                  <th style={thStyle}>Área do arranjo (m²)</th>
                  <th style={thStyle}>Fabricante(s) dos Módulos</th>
                  <th style={thStyle}>Modelo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>1</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{modulos_potencia_wp}}`}</V></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{modulos_quantidade}}`}</V></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{potenciaKwp ?? <V>{`{{potencia}}`}</V>}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{modulos_area_m2}}`}</V></td>
                  <td style={tdStyle}><V>{`{{modulos_fabricante}}`}</V></td>
                  <td style={tdStyle}><V>{`{{modulos_modelo}}`}</V></td>
                </tr>
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}><V>{`{{modulos_quantidade}}`}</V></td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{potenciaKwp ?? ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}><V>{`{{modulos_area_m2}}`}</V></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                </tr>
              </tbody>
            </table>

            {/* Inversores */}
            <div style={{ fontWeight: 'bold', fontSize: '9px', marginBottom: '4px', marginTop: '8px' }}>2. Dados dos Inversores</div>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Fabricante*</th>
                  <th style={thStyle}>Modelo*</th>
                  <th style={thStyle}>Potência Nominal (kW)</th>
                  <th style={thStyle}>Faixa de tensão (V)</th>
                  <th style={thStyle}>Corrente Nominal (A)</th>
                  <th style={thStyle}>Fator de Potência</th>
                  <th style={thStyle}>Rendimento (%)</th>
                  <th style={thStyle}>DHT Corrente (%)</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: inversoresQtd }).map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{i + 1}</td>
                    <td style={tdStyle}><V>{`{{inversores_fabricante}}`}</V></td>
                    <td style={tdStyle}><V>{`{{inversores_modelo}}`}</V></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{inversores_potencia}}`}</V></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{inversores_faixa_tensao}}`}</V></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{inversores_corrente_nominal}}`}</V></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{inversores_fator_potencia}}`}</V></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{inversores_rendimento}}`}</V></td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}><V>{`{{inversores_dht_corrente}}`}</V></td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>TOTAL</td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{totalInversoresPotencia}</td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                  <td style={tdStyle}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SEÇÃO 6 — Declarações */}
        <div style={{ marginBottom: '8px' }}>
          <div style={sectionHeader}>6. Solicitações e Declarações</div>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={tdStyle}>
                  Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da ABNT e às normas dos órgãos oficiais competentes.
                </td>
                <td style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center', width: '40px' }}>SIM</td>
              </tr>
              <tr>
                <td style={tdStyle}>
                  Solicito que a contagem do prazo para realização da vistoria pela CONCESSIONÁRIA, conforme art. 68 da Resolução Normativa nº 1.000/2021, inicie-se somente após minha solicitação.
                </td>
                <td style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
              </tr>
              <tr>
                <td style={tdStyle}>
                  Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade.
                </td>
                <td style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
              </tr>
              <tr>
                <td style={tdStyle}>
                  Declaro, para todos os fins, que todas as informações prestadas neste documento são verdadeiras.
                </td>
                <td style={{ ...tdStyle, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* RODAPÉ */}
        <div style={{ marginTop: '16px' }}>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={tdStyle}>
                  Em caso de dúvidas entrar em contato com os canais de atendimento disponibilizados na norma NT.00020.EQTL.Normas e Qualidade.
                </td>
                <td style={{ ...tdStyle, width: '180px' }}>
                  Local: <V>{`{{cidade}}`}</V>-<V>{`{{estado}}`}</V>
                </td>
                <td style={{ ...tdStyle, width: '80px' }}>
                  Data: <V>{`{{data}}`}</V>
                </td>
                <td style={{ ...tdStyle, width: '120px', textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #374151', marginTop: '24px', paddingTop: '4px', fontSize: '8px' }}>
                    Assinatura do Responsável
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: '7px', color: '#6b7280', textAlign: 'center', marginTop: '4px' }}>
            GERÊNCIA CORPORATIVA DE NORMAS E QUALIDADE. NT.00020.EQTL.Normas e Qualidade — ANEXO I — FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE MICROGERAÇÃO DISTRIBUÍDA GRUPO B — REVISÃO 06. DATA: 04/11/2025.
          </div>
        </div>
      </div>
    </>
  );
}
