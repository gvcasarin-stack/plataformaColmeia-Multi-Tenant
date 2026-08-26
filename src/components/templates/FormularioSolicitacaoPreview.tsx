'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getAllModulos, getAllInversores, getTotalKwp, getTotalInversorKw, getPotenciaGeracao, getTotalModulosQtd, fmtBR } from '@/lib/utils/equipmentParser';

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

// Estilo base reutilizável
const T: React.CSSProperties = { width: '100%', borderCollapse: 'separate', borderSpacing: '0 3px', marginBottom: '4px', fontSize: '8px', lineHeight: '1.3' };
const B = '0.5px solid #000000';
// Section header — fundo branco, texto preto (igual ao original)
const SH: React.CSSProperties = { backgroundColor: '#FFFFFF', color: '#000000', fontWeight: 'bold', padding: '3px 5px', fontSize: '8px', border: B };
// Sub-header — cinza médio
const SSH: React.CSSProperties = { backgroundColor: '#D9D9D9', color: '#000000', fontWeight: 'bold', padding: '3px 5px', fontSize: '8px', border: B };
// Label obrigatório — fundo cinza médio, texto preto
const LR: React.CSSProperties = { backgroundColor: '#D9D9D9', color: '#000000', fontSize: '7px', padding: '1px 5px', border: B, fontWeight: '500', verticalAlign: 'top', whiteSpace: 'nowrap', overflow: 'hidden' };
// Label normal — fundo cinza médio, texto preto
const L: React.CSSProperties = { backgroundColor: '#D9D9D9', color: '#000000', fontSize: '7px', padding: '1px 5px', border: B, fontWeight: '500', verticalAlign: 'top', whiteSpace: 'nowrap', overflow: 'hidden' };
// Célula de dado — fundo branco
const D: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '8px', padding: '1px 6px', border: B, verticalAlign: 'middle', overflow: 'hidden', wordBreak: 'break-word' };
// OK verde forte
const OK: React.CSSProperties = { backgroundColor: '#70AD47', color: '#FFFFFF', fontSize: '7px', padding: '2px 5px', border: B, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' };
// Cabeçalho de coluna página 1 (cinza)
const CH: React.CSSProperties = { backgroundColor: '#D9D9D9', fontSize: '7px', padding: '3px 4px', border: B, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' };
// Cabeçalho de coluna página 2 (cinza escuro)
const CHBlue: React.CSSProperties = { backgroundColor: '#595959', color: '#FFFFFF', fontSize: '7px', padding: '3px 4px', border: B, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' };
// Célula vazia página 2 (pêssego)
const DPeach: React.CSSProperties = { backgroundColor: '#FCE4D6', fontSize: '7px', padding: '4px 5px', border: B, textAlign: 'center', verticalAlign: 'middle' };
// Célula TOTAL valor
const TOT: React.CSSProperties = { ...D, fontWeight: 'bold', textAlign: 'center' };
// Célula TOTAL cinza
const TOTGray: React.CSSProperties = { backgroundColor: '#808080', color: '#FFFFFF', fontSize: '7px', padding: '4px 5px', border: B, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' };

// ── Página 2 — estilos compactos (tabelas de equipamentos, sem border-spacing) ──
const Bc = '1px solid #000000';
const T2: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginBottom: '2px', fontSize: '8px', lineHeight: '1.3' };
const CHBlue2: React.CSSProperties = { backgroundColor: '#595959', color: '#FFFFFF', fontSize: '7px', padding: '2px 3px', border: Bc, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' };
const DPeach2: React.CSSProperties = { backgroundColor: '#FCE4D6', fontSize: '7px', padding: '2px 3px', border: Bc, textAlign: 'center', verticalAlign: 'middle' };
const D2: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '7px', padding: '2px 3px', border: Bc, verticalAlign: 'top', overflow: 'hidden', wordBreak: 'break-word' };
const TOT2: React.CSSProperties = { ...D2, fontWeight: 'bold', textAlign: 'center' };
const TOTGray2: React.CSSProperties = { backgroundColor: '#808080', color: '#FFFFFF', fontSize: '7px', padding: '2px 3px', border: Bc, fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle' };
const L2: React.CSSProperties = { backgroundColor: '#D9D9D9', color: '#000000', fontSize: '7px', padding: '2px 3px', border: Bc, fontWeight: '500', verticalAlign: 'top', overflow: 'hidden' };

export function FormularioSolicitacaoPreview({ projectData }: FormularioSolicitacaoPreviewProps) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FormularioSolicitacaoPDF } = await import('./FormularioSolicitacaoPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Formulário Solicitação de Acesso - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(FormularioSolicitacaoPDF, { projectData })
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
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Componente V — mostra valor ou placeholder sublinhado em laranja
  const V = ({ children, upper }: { children: string; upper?: boolean }) => {
    const fieldKey = PLACEHOLDER_MAP[children];
    const raw = fieldKey && projectData ? projectData[fieldKey] : undefined;
    const hasValue = raw !== undefined && raw !== null && raw !== '' && raw !== 0;
    if (hasValue) {
      const display = upper ? String(raw).toUpperCase() : String(raw);
      return <strong>{display}</strong>;
    }
    return (
      <span style={{ color: '#FF6B00', borderBottom: '1px dashed #FF6B00', fontSize: '7px', fontStyle: 'italic' }}>
        {children}
      </span>
    );
  };

  // Valores derivados via equipmentParser (suporta múltiplos modelos)
  const modulosList = getAllModulos(projectData);
  const inversoresList = getAllInversores(projectData);

  const kwpTotal = getTotalKwp(projectData);
  const potenciaKwp = kwpTotal > 0 ? fmtBR(kwpTotal) : null;

  // Área total do arranjo — soma a área de cada linha (mesmo cálculo usado por
  // linha: area_unitaria_m2 × quantidade), em vez de usar modulos_area_m2 (campo
  // separado, que ficava desatualizado em relação à lista real de módulos).
  const areaTotal = modulosList.reduce((sum, m) => {
    const qty = parseFloat(String(m.quantidade || '1').replace(',', '.')) || 1;
    const areaUnit = parseFloat(String(m.area_unitaria_m2 || '0').replace(',', '.')) || 0;
    return sum + areaUnit * qty;
  }, 0);

  const invKwTotal = getTotalInversorKw(projectData);
  const totalInvPotencia = invKwTotal > 0 ? fmtBR(invKwTotal) : '';

  const pgNum = getPotenciaGeracao(projectData);
  const potenciaGeracao = pgNum > 0 ? fmtBR(pgNum) : null;

  const cargaDeclarada = parseFloat(String(projectData?.carga_declarada_kw || '0')) || 0;
  const potenciaDisp = parseFloat(String(projectData?.potencia_disponibilizada_kw || '0')) || 0;
  const okCarga = cargaDeclarada > 0 && potenciaDisp > 0 && cargaDeclarada <= potenciaDisp;
  const okPGT = pgNum > 0 && potenciaDisp > 0 && pgNum <= potenciaDisp;

  const totalModulosQtd = getTotalModulosQtd(projectData);

  // Linhas vazias para completar as tabelas
  const emptyModuloRows = Array.from({ length: Math.max(0, 10 - modulosList.length) });
  const emptyInversorRows = Array.from({ length: Math.max(0, 30 - inversoresList.length) });

  const modalidadeComp = String(projectData?.modalidade_compensacao || '');
  const modalidadeBanner = (() => {
    if (!modalidadeComp) return null;
    if (modalidadeComp.toLowerCase().includes('autoconsumo local'))
      return 'NÃO É NECESSÁRIO PREENCHER A LISTA DE RATEIO';
    return 'PREENCHER LISTA DE RATEIO DE CLIENTES NA GUIA 2 (OPCIONAL)';
  })();

  const dataInicioOperacao = (() => {
    const raw = projectData?.data_inicio_operacao;
    if (raw) return String(raw);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  })();
  const dataAssinatura = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const localAssinatura = [projectData?.client_city, projectData?.client_state].filter(Boolean).join(' - ');

  const tipoSol = String(projectData?.tipo_solicitacao || '');
  const showPotenciaGD = tipoSol.startsWith('AUMENTO DA POTÊNCIA DE GERAÇÃO');
  const bannerText = (() => {
    switch (tipoSol) {
      case 'LIGAÇÃO NOVA DE UNIDADE CONSUMIDORA COM GERAÇÃO DISTRIBUÍDA': return null;
      case 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA':
        return 'INFORMAR O NÚMERO DA CONTA CONTRATO';
      case 'CONEXÃO DE GD EM UNIDADE CONSUMIDORA EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA':
        return 'INFORMAR O NÚMERO DA CONTA CONTRATO E PREENCHER O FORMULÁRIO DE TROCA DE PADRÃO NO ANEXO IV';
      case 'AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE SEM AUMENTO DE POTÊNCIA DISPONIBILIZADA':
        return 'INFORMAR O NÚMERO DA CONTA CONTRATO E POTÊNCIA DA GD EXISTENTE';
      case 'AUMENTO DA POTÊNCIA DE GERAÇÃO EM UC COM GD EXISTENTE COM AUMENTO DE POTÊNCIA DISPONIBILIZADA':
        return 'INFORMAR NÚMERO DA CONTA CONTRATO, POTÊNCIA DA GD EXISTENTE E PREENCHER ANEXO IV';
      default: return null;
    }
  })();

  return (
    <>
      <div
        style={{ width: '794px', padding: '18px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', fontSize: '8px', backgroundColor: '#FFFFFF', lineHeight: '1.25', color: '#000000' }}
      >

        {/* ===== CABEÇALHO ===== */}
        <table style={{ ...T, marginBottom: '4px', border: B }}>
          <tbody>
            <tr>
              <td style={{ ...D, width: '180px', textAlign: 'center', padding: '6px 4px', borderRight: B }}>
                <img src="/images/logo.equatorial.png" style={{ width: '110px', objectFit: 'contain' }} alt="Grupo Equatorial" />
              </td>
              <td style={{ ...D, textAlign: 'center', verticalAlign: 'middle', padding: '6px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '11px' }}>NT.00020.EQTL.Normas e Qualidade</div>
                <div style={{ fontWeight: 'bold', fontSize: '12px', marginTop: '5px' }}>
                  ANEXO I - Formulário de Solicitação de Orçamento de Microgeração Distribuída Grupo B
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 1 ===== */}
        <table style={T}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '17%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={8} style={SH}>
                1. Identificação e Dados Cadastrais da Unidade Consumidora -{' '}
                <span style={{ color: '#FF6600' }}>PREENCHER, OBRIGATORIAMENTE, TODOS OS CAMPOS</span>
              </td>
            </tr>

            {/* Nome / CPF — label em cima, valor embaixo */}
            <tr>
              <td colSpan={5} style={LR}>Nome do Cliente / Razão Social (Titular da Unidade Consumidora)</td>
              <td colSpan={3} style={LR}>CPF/CNPJ</td>
            </tr>
            <tr>
              <td colSpan={5} style={D}><V>{`{{cliente_nome}}`}</V></td>
              <td colSpan={3} style={D}><V>{`{{cliente_cpf}}`}</V></td>
            </tr>

            {/* Endereço / Contatos — label em cima, valor embaixo */}
            <tr>
              <td colSpan={5} style={LR}>Endereço</td>
              <td colSpan={3} style={L}>Contatos telefônicos</td>
            </tr>
            <tr>
              <td colSpan={5} style={D}><V>{`{{endereco}}`}</V></td>
              <td style={L}>Celular</td>
              <td style={D}><V>{`{{cliente_celular}}`}</V></td>
              <td style={{ ...D, textAlign: 'center' }}>Fixo: -</td>
            </tr>

            {/* CEP / Município / UF / E-mail */}
            <tr>
              <td style={{ ...LR, width: '8%' }}>CEP:</td>
              <td style={{ ...D, width: '12%' }}><V>{`{{cliente_cep}}`}</V></td>
              <td style={{ ...LR, width: '8%' }}>Município</td>
              <td style={{ ...D, width: '12%' }}><V>{`{{cidade}}`}</V></td>
              <td style={{ ...LR, width: '7%' }}>UF (selecionar)</td>
              <td style={{ ...D, width: '8%' }}><V>{`{{estado}}`}</V></td>
              <td style={{ ...LR, width: '7%' }}>E-mail</td>
              <td style={{ ...D, width: '38%' }}><V>{`{{cliente_email}}`}</V></td>
            </tr>

            {/* Tipo de orçamento / espaço em branco / Conta Contrato */}
            <tr>
              <td style={L} colSpan={1}>Tipo de orçamento desejado</td>
              <td style={{ ...D, fontWeight: 'bold', whiteSpace: 'nowrap' }} colSpan={1}>Orçamento de Conexão</td>
              <td style={D} colSpan={1}></td>
              <td style={LR} colSpan={2}>Conta Contrato (Se UC existente)</td>
              <td style={D} colSpan={3}><V>{`{{conta_contrato}}`}</V></td>
            </tr>

            {/* Tipo de Solicitação */}
            <tr>
              <td style={LR} colSpan={2}>Tipo de Solicitação (selecionar)</td>
              <td style={D} colSpan={6}><V>{`{{tipo_solicitacao}}`}</V></td>
            </tr>

            {/* INFORMAR CONTA CONTRATO */}
            {bannerText && (
              <tr>
                {showPotenciaGD ? (
                  <>
                    <td colSpan={5} style={{ ...D, textAlign: 'center', fontWeight: 'bold', fontSize: '8px', backgroundColor: '#FFFF99', padding: '2px' }}>
                      {bannerText}
                    </td>
                    <td style={L}>Potência de Geração Existente</td>
                    <td style={D}></td>
                    <td style={{ ...L, textAlign: 'center' }}>kW</td>
                  </>
                ) : (
                  <td colSpan={8} style={{ ...D, textAlign: 'center', fontWeight: 'bold', fontSize: '8px', backgroundColor: '#FFFF99', padding: '2px' }}>
                    {bannerText}
                  </td>
                )}
              </tr>
            )}

            {/* Tarifa Branca / Terá adição de módulos (condicional) */}
            <tr>
              <td style={LR} colSpan={1}>Tarifa Branca?</td>
              <td style={D}><V>{`{{tarifa_branca}}`}</V></td>
              {showPotenciaGD ? (
                <>
                  <td style={L} colSpan={3}>Terá adição de módulos em inversor existente?</td>
                  <td style={D} colSpan={3}></td>
                </>
              ) : (
                <td style={D} colSpan={6}></td>
              )}
            </tr>

            {/* Possui Cargas Especiais */}
            <tr>
              <td style={LR} colSpan={1}>Possui Cargas Especiais?</td>
              <td style={D}><V>{`{{possui_cargas_especiais}}`}</V></td>
              <td style={L} colSpan={2}>Detalhar - Cargas especiais -</td>
              <td style={D} colSpan={4}></td>
            </tr>

            {/* Ramo de Atividade */}
            <tr>
              <td style={LR} colSpan={2}>Ramo de Atividade (Descrição)</td>
              <td style={D} colSpan={6}><V upper>{`{{classe_uc}}`}</V></td>
            </tr>

            {/* Classe / Tipo Ligação / Tensão */}
            <tr>
              <td style={LR}>Classe (selecionar)</td>
              <td style={D}><V>{`{{classe_uc}}`}</V></td>
              <td style={LR} colSpan={2}>Tipo de Ligação (selecionar)</td>
              <td style={D}><V upper>{`{{tipo_conexao}}`}</V></td>
              <td style={LR} colSpan={2}>Tensão de Atendimento da UC</td>
              <td style={D}><V>{`{{tensao_atendimento}}`}</V> V</td>
            </tr>

            {/* Carga Declarada / Disjuntor / Potência Disponibilizada */}
            <tr>
              <td style={LR} colSpan={1}>Carga Declarada da UC</td>
              <td style={D} colSpan={1}><V>{`{{carga_declarada_kw}}`}</V> kW</td>
              <td style={LR} colSpan={2}>Disjuntor de Entrada da UC (selecionar)</td>
              <td style={D} colSpan={1}><V>{`{{disjuntor_corrente_a}}`}</V> A</td>
              <td style={{ ...LR, whiteSpace: 'nowrap' }} colSpan={2}>Potência Disponibilizada (PD) para a UC</td>
              <td style={D} colSpan={1}><V>{`{{potencia_disponibilizada_kw}}`}</V> kW</td>
            </tr>

            {/* OK Carga / Tipo Ramal / Nº Poste */}
            <tr>
              <td colSpan={2} style={okCarga ? OK : { ...D, color: '#C00000', fontSize: '7px', textAlign: 'center' }}>
                {okCarga ? '✓ OK: Carga Declarada ≤ Potência Disponibilizada' : 'OK: Carga Declarada ≤ Potência Disponibilizada'}
              </td>
              <td style={LR} colSpan={1}>Tipo de Ramal (selecionar)</td>
              <td style={D}><V upper>{`{{tipo_ramal}}`}</V></td>
              <td style={LR} colSpan={2}>Nº de identificação do poste ou transformador mais próximo</td>
              <td style={D} colSpan={2}><V>{`{{numero_poste_transformador}}`}</V></td>
            </tr>

            {/* Coordenadas UTM */}
            <tr>
              <td colSpan={2} style={{ ...L, whiteSpace: 'normal', fontSize: '7px' }}>
                Preencher as coordenadas do ponto de entrega do acessante em UTM Fuso 23 ou Coordenadas Decimais
              </td>
              <td style={{ ...LR, whiteSpace: 'nowrap' }}>Fuso:</td>
              <td style={D}><V>{`{{coord_utm_fuso}}`}</V></td>
              <td style={{ ...LR, whiteSpace: 'nowrap' }}>X =</td>
              <td style={D}><V>{`{{coord_utm_x}}`}</V></td>
              <td style={{ ...LR, whiteSpace: 'nowrap' }}>Y =</td>
              <td style={D}><V>{`{{coord_utm_y}}`}</V></td>
            </tr>

            {/* Responsável Legal - linha 1 */}
            <tr>
              <td colSpan={2} style={LR}>Nome do Responsável Legal</td>
              <td colSpan={2} style={D}><V>{`{{responsavel_legal_nome}}`}</V></td>
              <td colSpan={2} style={LR}>Telefone do Responsável Legal</td>
              <td colSpan={2} style={D}><V>{`{{responsavel_legal_telefone}}`}</V></td>
            </tr>
            <tr>
              <td colSpan={2} style={LR}>E-mail do Responsável Legal</td>
              <td colSpan={6} style={D}><V>{`{{responsavel_legal_email}}`}</V></td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 2 ===== */}
        <table style={T}>
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <tbody>
            <tr><td colSpan={9} style={SH}>2. Dados Cadastrais do Responsável Técnico</td></tr>
            <tr>
              <td style={LR}>Nome Completo</td>
              <td style={D} colSpan={2}><V>{`{{responsavel_nome}}`}</V></td>
              <td style={LR}>Titulo Profissional</td>
              <td style={D}><V upper>{`{{responsavel_profissao}}`}</V></td>
              <td style={LR}>Registro Profissional</td>
              <td style={D}>Nº <V>{`{{responsavel_registro}}`}</V></td>
              <td style={LR}>UF</td>
              <td style={D}><V>{`{{responsavel_uf}}`}</V></td>
            </tr>
            <tr>
              <td style={LR}>E-mail</td>
              <td style={D} colSpan={2}><V>{`{{responsavel_email}}`}</V></td>
              <td style={L}>Telefone Fixo</td>
              <td style={D}></td>
              <td style={L}>Telefone Celular</td>
              <td style={D}><V>{`{{cliente_celular}}`}</V></td>
              <td style={L}>Empresa (opcional)</td>
              <td style={D}></td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 3 ===== */}
        <table style={T}>
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '24%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <tbody>
            <tr><td colSpan={5} style={SH}>3. Características da Microgeração Distribuída</td></tr>
            <tr>
              <td colSpan={5} style={SSH}>Dados Gerais da Central Geradora</td>
            </tr>

            {/* Tipo de Fonte */}
            <tr>
              <td style={LR}>Tipo de Fonte Primária (selecionar)</td>
              <td style={D}>SOLAR FOTOVOLTAICA</td>
              <td style={L}>Especificar se necessário</td>
              <td colSpan={2} style={D}>-</td>
            </tr>

            {/* Tipo de Geração */}
            <tr>
              <td style={LR}>Tipo de Geração (selecionar)</td>
              <td style={D}>EMPREGANDO CONVERSOR ELETRÔNICO/INVERSOR</td>
              <td style={L}>Especificar se necessário</td>
              <td colSpan={2} style={D}>-</td>
            </tr>

            {/* Modalidade / Potência do Orçamento */}
            <tr>
              <td style={LR}>Modalidade de Compensação (selecionar)</td>
              <td style={D}><V upper>{`{{modalidade_compensacao}}`}</V></td>
              <td style={L}></td>
              <td style={LR}>Potência Geração do Orçamento</td>
              <td style={D}>{potenciaGeracao ?? '___'} kW</td>
            </tr>

            {/* NÃO É NECESSÁRIO / PREENCHER LISTA DE RATEIO */}
            <tr>
              {modalidadeBanner ? (
                <td colSpan={2} style={{ ...D, backgroundColor: '#FFFF99', textAlign: 'center', fontWeight: 'bold', fontSize: '7px' }}>
                  {modalidadeBanner}
                </td>
              ) : (
                <td colSpan={2} style={D}></td>
              )}
              <td style={L}></td>
              <td style={LR}>Potência Geração Total da UC (PGT)</td>
              <td style={D}>{potenciaGeracao ?? '___'} kW</td>
            </tr>

            {/* Armazenamento / Potência Máxima Injetável */}
            <tr>
              <td style={L}>Armazenamento (se houver)</td>
              <td style={D}></td>
              <td style={L}></td>
              <td style={L}>Potência Máxima Injetável (se aplicável)</td>
              <td style={D}>- kW</td>
            </tr>

            {/* OK PGT ≤ PD / Data Início */}
            <tr>
              <td colSpan={2} style={okPGT ? OK : { ...D, fontSize: '7px', textAlign: 'center', color: '#C00000' }}>
                {okPGT ? '✓ OK: PGT ≤ PD' : 'OK: PGT ≤ PD'}
              </td>
              <td style={L}></td>
              <td style={LR}>Data Início de Operação</td>
              <td style={okPGT ? OK : D}>{dataInicioOperacao}{okPGT ? ' ✓' : ''}</td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 4 — DOCUMENTOS ===== */}
        <table style={T}>
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '65%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <tbody>
            <tr><td colSpan={3} style={SH}>4. Documentos necessários que devem ser anexados à Solicitação de Orçamento de Conexão:</td></tr>
            <tr>
              <td style={CH}></td>
              <td style={CH}>Descrição</td>
              <td style={CH}>Observações</td>
            </tr>
            {[
              ['1.', 'Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021.', ''],
              ['2.', 'Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, que identifique o número do registro válido e o nome do responsável técnico, o local da obra ou serviço e as atividades profissionais desenvolvidas, caso seja exigível na legislação específica e na forma prevista nessa legislação', ''],
              ['3.', 'Indicação do local do padrão ou da subestação de entrada no imóvel, exclusivamente nos casos em que ainda não estiverem instalados', ''],
              ['4.', 'Diagrama unifilar e de blocos do sistema de geração, carga e proteção', ''],
              ['5.', 'Memorial Técnico Descritivo da instalação (Conforme Modelo do ANEXO III - MODELO DE MEMORIAL TÉCNICO DESCRITIVO)', ''],
              ['6.', 'Relatório de ensaio, em língua portuguesa, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão com a rede, sempre que houver a utilização de conversores.', ''],
              ['7.', 'Dados necessários ao registro da central geradora distribuída conforme disponível no site da ANEEL.', ''],
              ['8.', 'Lista de unidades consumidoras participantes do sistema de compensação (se houver), indicando o percentual ou a ordem de utilização dos excedentes (Opcional). (PLANILHA NA GUIA 2)', 'Para autoconsumo remoto, geração compartilhada e empreendimento de múltiplas unidades consumidoras'],
              ['9.', 'Cópia de instrumento jurídico que comprove a participação dos integrantes para os casos de múltiplas unidades consumidoras e geração compartilhada. (Caso aplicável)', 'Apenas para os casos de empreendimentos com múltiplas unidades consumidoras e geração compartilhada.'],
              ['10.', 'Documento que comprove o reconhecimento pela ANEEL, da cogeração qualificada (se houver)', 'Apenas para cogeração qualificada'],
              ['11.', 'Dados de segurança das barragens no caso do uso de sistemas com fontes hídricas, conforme Resolução Normativa nº 696/2015. (Caso aplicável)', ''],
              ['12.', 'Para centrais fotovoltaicas enquadradas como despacháveis, comprovação de que o sistema de armazenamento atende o disposto no art. 655-B da Resolução Normativa nº 1.000/2021. (Caso aplicável)', ''],
              ['13.', 'Documento com data que comprove a propriedade ou posse do imóvel onde será implantada a unidade consumidora com microgeração ou minigeração distribuída, e que, no caso de unidade flutuante, deve ser complementado por autorização, licença ou documento equivalente exigível pelas autoridades competentes, observada a possibilidade de dispensa prevista no §5º do art. 67 da Resolução Normativa nº 1.000/2021.', 'Apenas nos casos de Ligação Nova de UC com Microgeração ou Alteração da Potência Disponibilizada de UC Existente'],
              ['14.', 'Formulário de Troca de Padrão (de monofásico para bifásico ou trifásico, de bifásico para trifásico, de trifásico para bifásico ou monofásico, de bifásico para monofásico) (Conforme ANEXO IV - FORMULÁRIO DE TROCA DE PADRÃO)', 'Apenas no caso de unidade consumidora existente com alteração de potência disponibilizada que implique em troca de padrão'],
              ['15.', 'Autorização de uso de área comum em condomínio (quando necessário, conforme observação)', 'Quando uma UC individualmente construir uma central geradora utilizando a área comum do condomínio'],
              ['16.', 'Procuração Autenticada (quando necessário, conforme observação)', 'Quando a solicitação for feita por terceiros'],
              ['17.', 'Apresentação de licença ou declaração emitida pelo órgão competente caso as instalações ou a extensão de rede de responsabilidade do consumidor e demais usuários ocuparem áreas protegidas pela legislação, tais como unidades de conservação, reservas legais, áreas de preservação permanente, territórios indígenas e quilombolas. (Caso aplicável)', ''],
            ].map(([num, desc, obs]) => (
              <tr key={num}>
                <td style={{ ...D, textAlign: 'center', verticalAlign: 'top', fontSize: '7px' }}>{num}</td>
                <td style={{ ...D, fontSize: '7px', lineHeight: '1.3' }}>{desc}</td>
                <td style={{ ...D, fontSize: '7px', lineHeight: '1.3', color: '#595959' }}>{obs}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ===== SEÇÃO 5 — DOCUMENTOS ORÇAMENTO ESTIMADO ===== */}
        <table style={T}>
          <tbody>
            <tr><td style={SH}>5. Documentos necessários que devem ser anexados à Solicitação de Orçamento Estimado:</td></tr>
            <tr>
              <td style={{ ...D, fontSize: '7px', lineHeight: '1.4' }}>
                Para solicitar orçamento estimado é necessário preencher apenas os dados básicos da unidade consumidora, a tensão de atendimento e indicação da potência de geração no campo que surgirá ao lado do tipo de orçamento.
              </td>
            </tr>
            <tr>
              <td style={{ ...D, fontSize: '7px', lineHeight: '1.4' }}>
                Caso o orçamento estimado seja solicitado para uma localização onde ainda não exista unidade consumidora, é necessário anexar à solicitação planta de situação conforme modelo da norma NT.00020.EQTL.
              </td>
            </tr>
            <tr>
              <td style={{ ...D, fontSize: '7px', lineHeight: '1.4' }}>
                Devem ser enviados também documentos de identificação do consumidor e, caso existam, procurações e documentações dos representantes legais, conforme Tabela 3 da norma NT.00020.EQTL.
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 6 — DECLARAÇÕES ===== */}
        <table style={T}>
          <colgroup>
            <col style={{ width: '92%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <tbody>
            <tr><td colSpan={2} style={SH}>6. Solicitações e Declarações</td></tr>
            <tr>
              <td style={{ ...D, fontSize: '7px' }}>Solicito que a contagem do prazo para realização da vistoria pela CONCESSIONÁRIA, conforme art. 68 da Resolução Normativa nº 1.000/2021, inicie-se somente após minha solicitação.</td>
              <td style={{ ...D, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
            </tr>
            <tr>
              <td style={{ ...D, fontSize: '7px' }}>Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o documento ou meio para pagamento de custos de minha responsabilidade.</td>
              <td style={{ ...D, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
            </tr>
            <tr>
              <td style={{ ...D, fontSize: '7px' }}>
                Declaro que as instalações internas da minha unidade consumidora, incluindo a geração distribuída, atendem às normas e padrões da distribuidora, às normas da Associação Brasileira de Normas Técnica - ABNT e às normas dos órgãos oficiais competentes, e ao art. 8º da Lei nº 9.074, de 1995, naquilo que for aplicável.
              </td>
              <td style={{ ...D, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ ...D, fontSize: '7px' }}>Solicito dispensa da análise de inversão de fluxo por enquadramento no art. 73-A da REN 1000, na seguinte regra:</td>
            </tr>
            {[
              ['Não injeção na rede de distribuição de energia elétrica ("Grid Zero")', 'NÃO'],
              ['Enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência de geração compatível com o consumo no horário de geração', 'NÃO'],
              ['Modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW, observado o item 7 ("Fast Track")', 'NÃO'],
            ].map(([text, val]) => (
              <tr key={text}>
                <td style={{ ...D, fontSize: '7px', paddingLeft: '12px' }}>• {text}</td>
                <td style={{ ...D, fontWeight: 'bold', textAlign: 'center' }}>{val}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...D, fontSize: '7px' }}>Declaro, para todos os fins, que todas as informações prestadas neste documento são verdadeiras.</td>
              <td style={{ ...D, fontWeight: 'bold', textAlign: 'center' }}>SIM</td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 7 — TERMO DE ACEITE (Opcional) ===== */}
        <table style={T}>
          <tbody>
            <tr><td style={SH}>7. Termo de Aceite das condições para afastamento da análise de inversão de fluxo (Opcional)</td></tr>
            <tr>
              <td style={{ ...D, fontSize: '7px', lineHeight: '1.6' }}>
                <div>Solicito o afastamento da análise de inversão de fluxo, nos termos do inciso III do caput do art. 73-A da Resolução Normativa nº 1.000/2021, e declaro estar ciente de que:</div>
                <div>1) a unidade consumidora será enquadrada na modalidade autoconsumo local;</div>
                <div>2) fica vedada, em qualquer hipótese, a alocação ou realocação de excedentes ou de créditos de energia em unidade consumidora distinta de onde ocorreu a geração de energia elétrica, afastando-se as disposições de que trata o art. 655-M da Resolução Normativa nº 1.000/2021; e</div>
                <div>3) para alteração de enquadramento da modalidade da microgeração deverá ser encerrado o contrato e solicitado novo orçamento de conexão, vedada a aplicação do art. 655-M.</div>
                <div>Declaro também reconhecer que essa opção é irrevogável e irretratável, implicando no meu dever de observar o que estabelece o art. 73-A da referida Resolução.</div>
                <br /><br />
                <div>Local e Data: _______________________________</div>
                <br /><br />
                <div>Assinatura: _______________________________</div>
                <br /><br />
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== SEÇÃO 8 ===== */}
        <table style={T}>
          <tbody>
            <tr>
              <td style={SH}>8. Este formulário deve ser preenchido e encaminhado aos canais de atendimento Corporativo da Concessionária</td>
            </tr>
            <tr>
              {/* Esquerda 40% — lista de estados */}
              <td style={{ ...D, width: '40%', fontSize: '7px', lineHeight: '1.5', verticalAlign: 'top' }}>
                <div><strong>ALAGOAS</strong> - Sede de regionais (Maceió, Arapiraca, Matriz de Camaragibe e Santana do Ipanema)</div>
                <div><strong>AMAPÁ</strong> - Sede de regionais (Macapá)</div>
                <div><strong>GOIÁS</strong> - Sede de regionais (Goiânia, Luziânia, Anápolis, Rio Verde e Iporá)</div>
                <div><strong>MARANHÃO</strong> - Sede de regionais (São Luís, Imperatriz, Timon, Balsas e Bacabal)</div>
                <div><strong>PARÁ</strong> - Sede de regionais (Belém, Castanhal, Marabá, Santarém e Altamira)</div>
                <div><strong>PIAUÍ</strong> - Sede de regionais (Teresina, Parnaíba, Picos, Bom Jesus e Floriano)</div>
                <div><strong>RIO GRANDE DO SUL</strong> - Sede de regionais (Porto Alegre, Osório e Pelotas)</div>
                <br />
                <div>Em caso de dúvidas entrar em contato com os canais de atendimento disponibilizados na norma NT.00020.EQTL.Normas e Qualidade.</div>
              </td>
              {/* Direita 60% — declaração + assinaturas */}
              <td style={{ ...D, width: '60%', fontSize: '7px', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '130px' }}>
                  <div style={{ lineHeight: '1.2' }}>Eu, acessante identificado neste formulário, venho por meio deste instrumento, solicitar o acesso para microgeração distribuída, fornecendo meus dados cadastrais assim como os documentos necessários, em conformidade com as normas e resoluções aplicáveis.</div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '12px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '7px', marginBottom: '2px' }}>{localAssinatura}</div>
                      <div style={{ borderTop: B, paddingTop: '2px', fontSize: '6px', color: '#595959' }}>Local</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '7px', marginBottom: '2px' }}>{dataAssinatura}</div>
                      <div style={{ borderTop: B, paddingTop: '2px', fontSize: '6px', color: '#595959' }}>Data</div>
                    </div>
                    <div style={{ flex: 2, textAlign: 'center' }}>
                      <div style={{ fontSize: '7px', marginBottom: '2px' }}>&nbsp;</div>
                      <div style={{ borderTop: B, paddingTop: '2px', fontSize: '6px', color: '#595959' }}>Assinatura do Responsável</div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: '6px', color: '#595959', textAlign: 'center', marginTop: '3px' }}>
          GERÊNCIA CORPORATIVA DE NORMAS E QUALIDADE. NT.00020.EQTL.Normas e Qualidade ANEXO I - FORMULÁRIO DE SOLICITAÇÃO DE ORÇAMENTO DE MICROGERAÇÃO DISTRIBUÍDA GRUPO B REVISÃO 06. DATA: 04/11/2025.
        </div>

        {/* ===== PÁGINA 2 — UNIDADES GERADORAS ===== */}
        <div className="break-before-page" style={{ marginTop: '20px' }}>
          <table style={{ ...T2, border: Bc, marginBottom: '8px' }}>
            <tbody>
              <tr>
                <td colSpan={7} style={{ ...SH, fontSize: '8px', border: Bc }}>
                  Informações das Unidades Geradoras (UG):{' '}
                  <span style={{ color: '#FF9999' }}>(PREENCHER CONFORME O TIPO DE FONTE DE GERAÇÃO)</span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 1. Solar Fotovoltaica */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>1. Solar Fotovoltaica</div>
            <table style={T2}>
              <thead>
                <tr>
                  <th style={{ ...CHBlue2, width: '5%' }}>Item</th>
                  <th style={{ ...CHBlue2, width: '16%' }}>Potência do Módulo (W)</th>
                  <th style={{ ...CHBlue2, width: '12%' }}>Quantidade</th>
                  <th style={{ ...CHBlue2, width: '18%' }}>Potência de Pico (kWp):</th>
                  <th style={{ ...CHBlue2, width: '16%' }}>Área do arranjo (m²):</th>
                  <th style={{ ...CHBlue2, width: '20%' }}>Fabricante(s) dos Módulos</th>
                  <th style={{ ...CHBlue2, width: '13%' }}>Modelo</th>
                </tr>
              </thead>
              <tbody>
                {/* Uma linha por modelo de módulo */}
                {modulosList.map((m, i) => {
                  const wp = parseFloat(String(m.potencia_wp || '0').replace(',', '.')) || 0;
                  const qty = parseFloat(String(m.quantidade || '1').replace(',', '.')) || 1;
                  const kwp = wp * qty / 1000;
                  const area = parseFloat(String(m.area_unitaria_m2 || '0').replace(',', '.')) * qty || 0;
                  return (
                    <tr key={i}>
                      <td style={{ ...D2, textAlign: 'center', color: '#4472C4' }}>{i + 1}</td>
                      <td style={{ ...D2, textAlign: 'center' }}>{m.potencia_wp || <V>{`{{modulos_potencia_wp}}`}</V>}</td>
                      <td style={{ ...D2, textAlign: 'center' }}>{m.quantidade || '1'}</td>
                      <td style={{ ...D2, textAlign: 'center' }}>{kwp > 0 ? fmtBR(kwp) : (potenciaKwp ?? <V>{`{{potencia}}`}</V>)}</td>
                      <td style={{ ...D2, textAlign: 'center' }}>{area > 0 ? fmtBR(area) : (projectData?.modulos_area_m2 || '')}</td>
                      <td style={{ ...D2, textAlign: 'center' }}>{m.fabricante || <V>{`{{modulos_fabricante}}`}</V>}</td>
                      <td style={{ ...D2, textAlign: 'center' }}>{m.modelo || <V>{`{{modulos_modelo}}`}</V>}</td>
                    </tr>
                  );
                })}
                {/* Linhas vazias */}
                {emptyModuloRows.map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...DPeach2, textAlign: 'center' }}>{modulosList.length + i + 1}</td>
                    <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                    <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                  </tr>
                ))}
                {/* Total */}
                <tr>
                  <td style={TOTGray2}>TOTAL</td>
                  <td style={TOTGray2}></td>
                  <td style={TOT2}>{totalModulosQtd > 0 ? totalModulosQtd : ''}</td>
                  <td style={TOT2}>{potenciaKwp ?? ''}</td>
                  <td style={TOT2}>{areaTotal > 0 ? fmtBR(areaTotal) : (projectData?.modulos_area_m2 || '')}</td>
                  <td style={TOTGray2}></td><td style={TOTGray2}></td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '6px', color: '#595959', fontStyle: 'italic', marginTop: '1px' }}>
              Obs: Célula fotovoltaica é a unidade básica, módulo é o conjunto de células e arranjo é o agrupamento de módulos, o gerador fotovoltaico é o conjunto de arranjos.
            </div>
          </div>

          {/* 2. Dados dos Inversores */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>2. Dados dos Inversores</div>
            <table style={T2}>
              <thead>
                <tr>
                  <th style={{ ...CHBlue2, width: '4%' }}>Item</th>
                  <th style={{ ...CHBlue2, width: '14%' }}>Fabricante*</th>
                  <th style={{ ...CHBlue2, width: '16%' }}>Modelo*</th>
                  <th style={{ ...CHBlue2, width: '12%' }}>Potência Nominal (kW)</th>
                  <th style={{ ...CHBlue2, width: '13%' }}>Faixa de tensão de<br />operação (V)</th>
                  <th style={{ ...CHBlue2, width: '10%' }}>Corrente Nominal (A)</th>
                  <th style={{ ...CHBlue2, width: '11%' }}>Fator de Potência</th>
                  <th style={{ ...CHBlue2, width: '10%' }}>Rendimento (%)</th>
                  <th style={{ ...CHBlue2, width: '10%' }}>DHT de Corrente (%)</th>
                </tr>
              </thead>
              <tbody>
                {/* Uma linha por modelo de inversor */}
                {inversoresList.map((inv, i) => (
                  <tr key={i}>
                    <td style={{ ...D2, textAlign: 'center', color: '#4472C4' }}>{i + 1}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.fabricante || <V>{`{{inversores_fabricante}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.modelo || <V>{`{{inversores_modelo}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.potencia || <V>{`{{inversores_potencia}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.faixa_tensao || <V>{`{{inversores_faixa_tensao}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.corrente_nominal || <V>{`{{inversores_corrente_nominal}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.fator_potencia || <V>{`{{inversores_fator_potencia}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.rendimento || <V>{`{{inversores_rendimento}}`}</V>}</td>
                    <td style={{ ...D2, textAlign: 'center' }}>{inv.dht_corrente || <V>{`{{inversores_dht_corrente}}`}</V>}</td>
                  </tr>
                ))}
                {/* Linhas vazias */}
                {emptyInversorRows.map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...DPeach2, textAlign: 'center' }}>{inversoresList.length + i + 1}</td>
                    <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                    <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                    <td style={DPeach2}></td><td style={DPeach2}></td>
                  </tr>
                ))}
                {/* Total */}
                <tr>
                  <td style={TOTGray2}>TOTAL</td>
                  <td style={TOTGray2}></td><td style={TOTGray2}></td>
                  <td style={TOT2}>{totalInvPotencia}</td>
                  <td style={TOTGray2}></td><td style={TOTGray2}></td><td style={TOTGray2}></td>
                  <td style={TOTGray2}></td><td style={TOTGray2}></td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '6px', color: '#595959', fontStyle: 'italic', marginTop: '1px' }}>
              Obs: Unidades Geradoras Fotovoltaicas e Eólicas
            </div>
          </div>

          {/* 3. Eólica */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>3. Eólica</div>
            <table style={T2}>
              <thead>
                <tr>
                  <th style={{ ...CHBlue2, width: '4%' }}>Item</th>
                  <th style={{ ...CHBlue2, width: '16%' }}>Fabricante/Modelo</th>
                  <th style={{ ...CHBlue2, width: '9%' }}>Eixo do rotor (horiz./vert.)*</th>
                  <th style={{ ...CHBlue2, width: '8%' }}>Altura Máxima da Pá (m)*</th>
                  <th style={{ ...CHBlue2, width: '8%' }}>Diâmetro do rotor (m)</th>
                  <th style={{ ...CHBlue2, width: '9%' }}>Controle de Potência</th>
                  <th style={{ ...CHBlue2, width: '8%' }}>Vel. rotação nom./Sobrevel. máx. (rpm)</th>
                  <th style={{ ...CHBlue2, width: '9%' }}>Vel. vento Entrada serv. (m/s)</th>
                  <th style={{ ...CHBlue2, width: '9%' }}>Vel. vento Saída serv. (m/s)</th>
                  <th style={{ ...CHBlue2, width: '9%' }}>Pot. Gerada Entrada (kW)</th>
                  <th style={{ ...CHBlue2, width: '9%' }}>Pot. Gerada Saída (kW)</th>
                  <th style={{ ...CHBlue2, width: '6%' }}>MD²/4 (kg.m²)</th>
                  <th style={{ ...CHBlue2, width: '6%' }}>Cert. turbina</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...DPeach2, textAlign: 'center' }}>{i + 1}</td>
                    {Array.from({ length: 12 }).map((__, j) => <td key={j} style={DPeach2}></td>)}
                  </tr>
                ))}
                <tr>
                  <td style={TOTGray2}>TOTAL</td>
                  {Array.from({ length: 12 }).map((_, j) => <td key={j} style={TOTGray2}></td>)}
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '6px', color: '#595959', fontStyle: 'italic' }}>
              Obs: No caso de aerogerador não convencional informar a altura máxima atingida pela estrutura.<br />
              (1) Passo variável (Stall), Estol (pitch), Estol ativo (active stall), etc. &nbsp; (2) Data
            </div>
          </div>

          {/* 4. Hidráulica */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>4. Hidráulica</div>
            <table style={T2}>
              <thead>
                <tr>
                  <th style={{ ...CHBlue2, width: '4%' }}>Item</th>
                  <th style={CHBlue2}>Rio</th>
                  <th style={CHBlue2}>Bacia / SubBacia</th>
                  <th style={CHBlue2}>Tipo turbina</th>
                  <th style={CHBlue2}>Fabricante Turbina</th>
                  <th style={CHBlue2}>Potência Turbina (kVA)</th>
                  <th style={CHBlue2}>Fabricante Gerador</th>
                  <th style={CHBlue2}>Potência do Gerador (kVA)</th>
                  <th style={CHBlue2}>Fator de Potência do Gerador</th>
                  <th style={CHBlue2}>Potência do Gerador (kW)</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map(i => (
                  <tr key={i}>
                    <td style={{ ...DPeach2, textAlign: 'center' }}>{i}</td>
                    {Array.from({ length: 9 }).map((_, j) => <td key={j} style={DPeach2}></td>)}
                  </tr>
                ))}
                <tr>
                  <td style={TOTGray2}>TOTAL</td>
                  {Array.from({ length: 9 }).map((_, j) => <td key={j} style={TOTGray2}></td>)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Térmica */}
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '8px', marginBottom: '2px' }}>5. Térmica (Biomassa/Solar Térmica/Cogeração)</div>
            <table style={T2}>
              <thead>
                <tr>
                  <th style={CHBlue2}>Informação</th>
                  <th style={CHBlue2}>Especificação</th>
                  <th style={CHBlue2}>Unidade</th>
                  <th style={CHBlue2}>Periodicidade</th>
                  <th style={CHBlue2}>Observação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Fabricante das Turbinas*</td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Tipo de Turbina* <sup>(1)</sup></td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Fabricante/Modelo do Gerador</td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Potência Nominal de Placa</td>
                  <td style={DPeach2}></td><td style={{ ...D2, textAlign: 'center' }}>kVA</td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Potência Máxima em Regime Contínuo</td>
                  <td style={DPeach2}></td><td style={{ ...D2, textAlign: 'center' }}>kW</td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Corrente Nominal</td>
                  <td style={DPeach2}></td><td style={{ ...D2, textAlign: 'center' }}>A</td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Tensão Nominal</td>
                  <td style={DPeach2}></td><td style={{ ...D2, textAlign: 'center' }}>kV</td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Frequência Nominal</td>
                  <td style={DPeach2}></td><td style={{ ...D2, textAlign: 'center' }}>Hz</td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Velocidade Nominal</td>
                  <td style={DPeach2}></td><td style={{ ...D2, textAlign: 'center' }}>rpm</td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Número de fases</td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Tipo e Ligação <sup>(2)</sup></td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Número de pólos</td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
                <tr>
                  <td style={{ ...L2, whiteSpace: 'normal' }}>Fator de Potência Máximo* <sup>(3)</sup></td>
                  <td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td><td style={DPeach2}></td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: '7px', marginTop: '2px', lineHeight: '1.4' }}>
              <div><sup>(1)</sup> G/V/O</div>
              <div><sup>(2)</sup> Y ou Δ</div>
              <div><sup>(3)</sup> Sobre-excitado ou Sub-excitado</div>
            </div>
          </div>
        </div>

      </div>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleGeneratePdf}
          disabled={generating}
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
        >
          {generating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
          ) : (
            <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Formulário</>
          )}
        </Button>
      </div>
    </>
  );
}
