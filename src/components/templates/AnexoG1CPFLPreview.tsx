'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface AnexoG1CPFLPreviewProps {
  projectData?: Record<string, any>;
}

const NAVY = '#1a3a6b';
const B = '1px solid #000000';
const ROWS_MIN = 29;

function fmtTotal(n: number): string {
  return n.toFixed(2).replace('.', ',');
}

// ANEXO G.1 — Formulário para cadastro de Unidades Consumidoras participantes do
// Sistema de Compensação (CPFL/RGE). Reaproveita os mesmos campos já coletados em
// "Conferir Informações" para a Lista de Rateio da Equatorial (conta_contrato da
// unidade geradora e rateio_beneficiarias), já que o formulário da CPFL/RGE pede
// exatamente os mesmos dados. Folha considerada como A4, igual ao PDF gerado.
export function AnexoG1CPFLPreview({ projectData }: AnexoG1CPFLPreviewProps) {
  const [generating, setGenerating] = useState(false);

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { AnexoG1CPFLPDF } = await import('./AnexoG1CPFLPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Anexo G.1 - Lista de Rateio CPFL-RGE - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(AnexoG1CPFLPDF, { projectData })
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
      console.error('Erro ao gerar PDF do Anexo G.1:', err);
    } finally {
      setGenerating(false);
    }
  };

  const codigoUC = String(projectData?.conta_contrato || '');
  const beneficiarias: { conta_contrato: string; percentual?: number }[] = Array.isArray(projectData?.rateio_beneficiarias)
    ? projectData.rateio_beneficiarias
    : [];
  const totalPercentual = beneficiarias.reduce((sum, b) => sum + (Number(b.percentual) || 0), 0);

  // Layout de 2 colunas por linha (Nº UC + % duas vezes), igual ao Anexo G.1 oficial.
  const totalRows = Math.max(ROWS_MIN, Math.ceil(beneficiarias.length / 2));

  const HEAD: React.CSSProperties = { backgroundColor: NAVY, color: '#FFFFFF', fontWeight: 'bold', fontSize: '10.5px', textAlign: 'center', padding: '5px 6px', border: B };
  const CELL: React.CSSProperties = { fontSize: '10.5px', textAlign: 'center', padding: '3px 6px', border: B, height: '18px' };

  return (
    <>
      {/* ===== Folha A4 ===== */}
      <div style={{ background: '#6b6f76', padding: '28px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '794px', minHeight: '1123px', background: '#FFFFFF', padding: '54px 58px', boxShadow: '0 8px 28px rgba(0,0,0,.35)', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', color: '#000000', fontSize: '11px', lineHeight: 1.45 }}>

          <p style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12.5px', margin: '0 0 16px' }}>
            ANEXO G.1 – Formulário para cadastro de Unidades Consumidoras participantes do Sistema de Compensação
          </p>

          <p style={{ textAlign: 'justify', margin: '0 0 20px' }}>
            Solicito que o excedente de energia injetada na rede pela unidade consumidora denominada abaixo de{' '}
            <strong>&ldquo;Unidade consumidora com geração distribuída&rdquo;</strong>, que esteja disponível para alocação
            nos termos da REN ANEEL 1.000/2021, seja rateada entre as unidades consumidoras abaixo relacionadas na TABELA
            1, conforme percentuais discriminados, podendo inclusive a unidade geradora ser uma instalação beneficiada
            com o excedente.
          </p>

          <div style={{ display: 'flex', width: '100%', border: B, marginBottom: '26px' }}>
            <div style={{ flex: '1 1 auto', backgroundColor: NAVY, color: '#FFFFFF', fontWeight: 'bold', fontSize: '10.5px', padding: '8px 12px', display: 'flex', alignItems: 'center', borderRight: B }}>
              CÓDIGO DA UNIDADE CONSUMIDORA COM<br />GERAÇÃO DISTRIBUÍDA:
            </div>
            <div style={{ flex: '0 0 160px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '13px', padding: '8px 12px' }}>
              {codigoUC}
            </div>
          </div>

          <div style={{ backgroundColor: NAVY, color: '#FFFFFF', fontWeight: 'bold', fontSize: '10.5px', textAlign: 'center', padding: '6px 8px', border: B }}>
            TABELA 1 - Unidade(s) Consumidora(s) Beneficiária(s) do Excedente de Energia
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '35%' }} /><col style={{ width: '15%' }} /><col style={{ width: '35%' }} /><col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={HEAD}>Nº Unidade Consumidora</th>
                <th style={HEAD}>%</th>
                <th style={HEAD}>Nº Unidade Consumidora</th>
                <th style={HEAD}>%</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalRows }).map((_, r) => {
                const left = beneficiarias[r * 2];
                const right = beneficiarias[r * 2 + 1];
                return (
                  <tr key={r}>
                    <td style={CELL}>{left?.conta_contrato || ' '}</td>
                    <td style={CELL}>{left?.percentual !== undefined ? left.percentual : ' '}</td>
                    <td style={CELL}>{right?.conta_contrato || ' '}</td>
                    <td style={CELL}>{right?.percentual !== undefined ? right.percentual : ' '}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...CELL, textAlign: 'left', fontWeight: 'bold' }} colSpan={3}>Somatória</td>
                <td style={{ ...CELL, textAlign: 'right', fontWeight: 'bold' }}>{fmtTotal(totalPercentual)}</td>
              </tr>
            </tfoot>
          </table>
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
            <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Anexo G.1</>
          )}
        </Button>
      </div>
    </>
  );
}
