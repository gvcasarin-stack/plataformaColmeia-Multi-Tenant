'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface ListaRateioEquatorialPreviewProps {
  projectData?: Record<string, any>;
}

const PLACEHOLDER_MAP: Record<string, string> = {
  '{{conta_contrato}}': 'conta_contrato',
  '{{data_documento}}': 'data_documento',
  '{{modalidade_compensacao}}': 'modalidade_compensacao',
  '{{forma_alocacao_creditos}}': 'forma_alocacao_creditos',
};

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Normaliza a data (já em DD/MM/AAAA, ou por extenso "DD de mês de AAAA", como
// data_documento é salvo) para DD/MM/AAAA — mesma conversão do Diagrama Unifilar.
function formatDataBR(raw: string): string {
  const str = raw.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const match = str.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})$/i);
  if (match) {
    const monthIndex = MESES_PT.indexOf(match[2]);
    if (monthIndex !== -1) {
      return `${match[1].padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}/${match[3]}`;
    }
  }
  return str;
}

// Estilos reutilizados do restante do app (mesma convenção de
// FormularioSolicitacaoPreview.tsx: tabelas HTML com border/padding inline).
const B = '1px solid #000000';
const T: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '11px', lineHeight: '1.3' };
const LBL: React.CSSProperties = { backgroundColor: '#FFFFFF', color: '#000000', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', border: B, whiteSpace: 'nowrap' };
const LBL_FILL: React.CSSProperties = { ...LBL, backgroundColor: '#D9D9D9' };
const VAL: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', border: B, textAlign: 'center' };
const ROW_H = '28px';
const HEAD: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', padding: '0 8px', height: ROW_H, boxSizing: 'border-box', border: B, textAlign: 'center' };
const CELL: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '11px', padding: '0 8px', height: ROW_H, boxSizing: 'border-box', border: B, textAlign: 'center' };
const GREEN: React.CSSProperties = { ...CELL, backgroundColor: '#4CAF50', color: '#FFFFFF', fontWeight: 'bold' };

export function ListaRateioEquatorialPreview({ projectData }: ListaRateioEquatorialPreviewProps) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ListaRateioEquatorialPDF } = await import('./ListaRateioEquatorialPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Lista de Rateio Equatorial - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(ListaRateioEquatorialPDF, { projectData })
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

  // Mostra valor real ou placeholder sublinhado em laranja, igual ao padrão dos outros templates
  const V = ({ children }: { children: string }) => {
    const fieldKey = PLACEHOLDER_MAP[children];
    const raw = fieldKey && projectData ? projectData[fieldKey] : undefined;
    const hasValue = raw !== undefined && raw !== null && raw !== '';
    if (hasValue) return <>{fieldKey === 'data_documento' ? formatDataBR(String(raw)) : String(raw)}</>;
    return (
      <span style={{ color: '#FF6B00', borderBottom: '1px dashed #FF6B00', fontSize: '9px', fontStyle: 'italic', fontWeight: 'normal' }}>
        {children}
      </span>
    );
  };

  const formaAlocacao = String(projectData?.forma_alocacao_creditos || '');
  // Enquanto a forma de alocação ainda não foi escolhida em "Conferir Informações",
  // mostramos a grade "Percentual do Excedente" vazia como padrão — o documento
  // fica sempre com a cara final (folha preenchida), em vez de aparecer em branco.
  const isOrdem = formaAlocacao === 'Ordem de Prioridade';
  const isPercentual = !isOrdem;

  const beneficiarias: { conta_contrato: string; percentual?: number; ordem?: number }[] = Array.isArray(projectData?.rateio_beneficiarias)
    ? projectData.rateio_beneficiarias
    : [];
  const totalPercentual = beneficiarias.reduce((sum, b) => sum + (Number(b.percentual) || 0), 0);
  const ordenadas = isOrdem
    ? [...beneficiarias].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    : beneficiarias;

  const totalRows = 30;
  const emptyRows = Array.from({ length: Math.max(0, totalRows - beneficiarias.length) });

  return (
    <>
      {/* ===== Folha A4 ===== */}
      <div style={{ background: '#6b6f76', padding: '28px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '900px', minHeight: '1273px', background: '#FFFFFF', padding: '65px 58px', boxShadow: '0 8px 28px rgba(0,0,0,.35)', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', color: '#000000' }}>

          {/* ===== CABEÇALHO ===== */}
          <table style={{ ...T, marginBottom: 0 }}>
            <tbody>
              <tr>
                <td style={{ ...CELL, width: '150px', textAlign: 'center', padding: '10px 8px' }}>
                  <img src="/images/logo-equatorial.png" style={{ maxWidth: '128px', width: '100%', objectFit: 'contain' }} alt="Grupo Equatorial" />
                </td>
                <td style={{ ...CELL, textAlign: 'center' }}>
                  <div style={{ fontSize: '14.5px', fontWeight: 'bold', lineHeight: 1.35 }}>
                    LISTA DE RATEIO PARA AS UNIDADES CONSUMIDORAS PARTICIPANTES DO SISTEMA DE COMPENSAÇÃO
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '3px' }}>
                    (Autoconsumo Remoto, Geração Compartilhada e EMUC)
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== IDENTIFICAÇÃO ===== */}
          <table style={{ ...T, marginTop: '-1px' }}>
            <tbody>
              <tr>
                <td style={{ ...LBL, borderTop: 'none' }}>Conta Contrato da Unidade Geradora</td>
                <td style={{ ...VAL, borderTop: 'none' }}><V>{`{{conta_contrato}}`}</V></td>
                <td style={{ ...LBL, borderTop: 'none' }}>Data solicitação</td>
                <td style={{ ...VAL, borderTop: 'none' }}><V>{`{{data_documento}}`}</V></td>
              </tr>
              <tr>
                <td style={LBL_FILL}>Enquadramento</td>
                <td style={VAL} colSpan={3}><V>{`{{modalidade_compensacao}}`}</V></td>
              </tr>
              <tr>
                <td style={LBL_FILL}>Forma de alocação dos créditos</td>
                {isPercentual ? (
                  <td style={{ ...VAL, padding: 0 }} colSpan={3}>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '40%', padding: '2px 8px' }}>Percentual do Excedente</div>
                      <div style={{ width: '60%', padding: '2px 8px', borderLeft: B }}>Prencher as porcentagens</div>
                    </div>
                  </td>
                ) : isOrdem ? (
                  <td style={{ ...VAL, padding: 0 }} colSpan={3}>
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '40%', padding: '2px 8px' }}>Ordem de Prioridade</div>
                      <div style={{ width: '60%', padding: '2px 8px', borderLeft: B }}>Preencher as beneficiárias na ordem desejada</div>
                    </div>
                  </td>
                ) : (
                  <td style={VAL} colSpan={3}><V>{`{{forma_alocacao_creditos}}`}</V></td>
                )}
              </tr>
              <tr>
                <td style={{ ...CELL, border: B }} colSpan={4}>&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* ===== TABELA DE RATEIO ===== */}
          <div style={{ paddingLeft: '65px', paddingTop: '34px' }}>
            {isOrdem ? (
              <table style={{ ...T, width: '290px', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ ...HEAD, width: '50%' }}>Ordem</td>
                    <td style={{ ...HEAD, width: '50%' }}>Conta Contrato</td>
                  </tr>
                  {ordenadas.map((b, i) => (
                    <tr key={i}>
                      <td style={CELL}>{b.ordem ?? ''}</td>
                      <td style={CELL}>{b.conta_contrato}</td>
                    </tr>
                  ))}
                  {emptyRows.map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={CELL}>&nbsp;</td>
                      <td style={CELL}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table style={{ ...T, width: '290px', tableLayout: 'fixed' }}>
                <tbody>
                  <tr>
                    <td style={{ ...HEAD, width: '50%' }}>% Total</td>
                    <td style={{ border: 'none', width: '50%', height: ROW_H, boxSizing: 'border-box' }}></td>
                  </tr>
                  <tr>
                    <td style={{ ...(totalPercentual === 100 ? GREEN : { ...CELL, backgroundColor: '#FEF3C7', fontWeight: 'bold' }), width: '50%' }}>{totalPercentual}</td>
                    <td style={{ border: 'none', width: '50%', height: ROW_H, boxSizing: 'border-box' }}></td>
                  </tr>
                  <tr>
                    <td style={{ ...HEAD, width: '50%' }}>% do Excedente</td>
                    <td style={{ ...HEAD, width: '50%' }}>Conta Contrato</td>
                  </tr>
                  {beneficiarias.map((b, i) => (
                    <tr key={i}>
                      <td style={CELL}>{b.percentual ?? ''}</td>
                      <td style={CELL}>{b.conta_contrato}</td>
                    </tr>
                  ))}
                  {emptyRows.map((_, i) => (
                    <tr key={`empty-${i}`}>
                      <td style={CELL}>&nbsp;</td>
                      <td style={CELL}>&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
            <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Lista de Rateio</>
          )}
        </Button>
      </div>
    </>
  );
}
