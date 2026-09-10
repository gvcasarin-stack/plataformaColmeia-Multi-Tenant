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

// Estilos reutilizados do restante do app (mesma convenção de
// FormularioSolicitacaoPreview.tsx: tabelas HTML com border/padding inline).
const B = '1px solid #000000';
const T: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '11px', lineHeight: '1.3' };
const LBL: React.CSSProperties = { backgroundColor: '#FFFFFF', color: '#000000', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', border: B, whiteSpace: 'nowrap' };
const LBL_FILL: React.CSSProperties = { ...LBL, backgroundColor: '#D9D9D9' };
const VAL: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', border: B, textAlign: 'center' };
const HEAD: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', border: B, textAlign: 'center' };
const CELL: React.CSSProperties = { backgroundColor: '#FFFFFF', fontSize: '11px', padding: '4px 8px', border: B, textAlign: 'center' };
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
    if (hasValue) return <>{String(raw)}</>;
    return (
      <span style={{ color: '#FF6B00', borderBottom: '1px dashed #FF6B00', fontSize: '9px', fontStyle: 'italic', fontWeight: 'normal' }}>
        {children}
      </span>
    );
  };

  const formaAlocacao = String(projectData?.forma_alocacao_creditos || '');
  const isPercentual = formaAlocacao === 'Percentual do Excedente';
  const isOrdem = formaAlocacao === 'Ordem de Prioridade';
  const beneficiarias: { conta_contrato: string; percentual?: number; ordem?: number }[] = Array.isArray(projectData?.rateio_beneficiarias)
    ? projectData.rateio_beneficiarias
    : [];
  const totalPercentual = beneficiarias.reduce((sum, b) => sum + (Number(b.percentual) || 0), 0);
  const ordenadas = isOrdem
    ? [...beneficiarias].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    : beneficiarias;

  const totalRows = 20;
  const emptyRows = Array.from({ length: Math.max(0, totalRows - beneficiarias.length) });

  return (
    <>
      <div style={{ width: '794px', padding: '24px', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', backgroundColor: '#FFFFFF', color: '#000000' }}>

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
              <td style={VAL} colSpan={3}><V>{`{{forma_alocacao_creditos}}`}</V></td>
            </tr>
            <tr>
              <td style={{ ...CELL, border: B }} colSpan={4}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* ===== TABELA DE RATEIO ===== */}
        <div style={{ paddingLeft: '65px', paddingTop: '10px' }}>
          {isPercentual ? (
            <table style={{ ...T, width: '290px' }}>
              <tbody>
                <tr><td style={HEAD}>% Total</td></tr>
                <tr><td style={totalPercentual === 100 ? GREEN : { ...CELL, backgroundColor: '#FEF3C7', fontWeight: 'bold' }}>{totalPercentual}</td></tr>
                <tr>
                  <td style={{ ...HEAD, padding: 0 }}>
                    <table style={{ ...T, tableLayout: 'fixed' }}>
                      <tbody>
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
                  </td>
                </tr>
              </tbody>
            </table>
          ) : isOrdem ? (
            <table style={{ ...T, width: '520px', tableLayout: 'fixed' }}>
              <tbody>
                <tr>
                  <td style={{ ...HEAD, width: '150px' }}>Conta Contrato</td>
                  <td style={{ ...HEAD, width: '200px' }}>Classe de Consumo</td>
                  <td style={{ ...HEAD, width: '170px' }}>Endereço</td>
                </tr>
                {ordenadas.map((b, i) => (
                  <tr key={i}>
                    <td style={CELL}>{b.conta_contrato}</td>
                    <td style={CELL}>&nbsp;</td>
                    <td style={CELL}>&nbsp;</td>
                  </tr>
                ))}
                {emptyRows.map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td style={CELL}>&nbsp;</td>
                    <td style={CELL}>&nbsp;</td>
                    <td style={CELL}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '11px', color: '#FF6B00', fontStyle: 'italic' }}>
              Selecione a Forma de Alocação dos Créditos em "Conferir Informações do Projeto" para preencher esta lista.
            </p>
          )}
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
