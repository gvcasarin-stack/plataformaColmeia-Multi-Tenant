'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface DiagramaBlocosPreviewProps {
  projectData?: Record<string, any>;
}

const BOX: React.CSSProperties = {
  border: '1.5px solid #000000',
  width: '200px',
  padding: '8px 10px',
  textAlign: 'center',
  backgroundColor: '#FFFFFF',
  fontSize: '8px',
  lineHeight: '1.5',
};

const BOLD: React.CSSProperties = { fontWeight: 'bold', fontSize: '8px' };
const NORMAL: React.CSSProperties = { fontSize: '7.5px' };
const V_LINE: React.CSSProperties = { width: '1px', height: '22px', backgroundColor: '#000000', margin: '0 auto' };
const H_LINE: React.CSSProperties = { height: '1px', width: '22px', backgroundColor: '#000000', flexShrink: 0 };

function fmt2(val: string | number | undefined): string {
  if (!val && val !== 0) return '___';
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n) || n === 0) return '___';
  return n.toFixed(2).replace('.', ',');
}

export function DiagramaBlocosPreview({ projectData }: DiagramaBlocosPreviewProps) {
  const [generating, setGenerating] = useState(false);

  const pd = projectData;

  const modulosQtd = parseInt(String(pd?.modulos_quantidade || '0')) || 0;
  const modulosWp = parseFloat(String(pd?.modulos_potencia_wp || '0')) || 0;

  const potenciaTotal = (() => {
    const p = parseFloat(String(pd?.potencia || '0'));
    if (p > 0) return fmt2(p);
    if (modulosQtd > 0 && modulosWp > 0) return fmt2((modulosQtd * modulosWp) / 1000);
    return '___';
  })();

  const stringsQtd = parseInt(String(pd?.inversores_quantidade_mppt || pd?.strings_quantidade || '0')) || 0;
  const modulosPorString = stringsQtd > 0 && modulosQtd > 0 ? Math.round(modulosQtd / stringsQtd) : 0;
  const stringsLine =
    stringsQtd > 0 && modulosPorString > 0
      ? `${stringsQtd} ${stringsQtd === 1 ? 'String' : 'Strings'} de ${String(modulosPorString).padStart(2, '0')} módulos`
      : null;

  const fabricante = pd?.inversores_fabricante ? String(pd.inversores_fabricante).toUpperCase() : '___';
  const invPotencia = fmt2(pd?.inversores_potencia);

  // ── Seal fields ────────────────────────────────────────────────────────────
  const owner    = String(pd?.nomeClienteFinal  || 'NOME DO PROPRIETÁRIO');
  const endereco = String(pd?.endereco_local     || 'ENDEREÇO DA OBRA');
  const cidade   = String(pd?.client_city        || 'Cidade');
  const uf       = String(pd?.client_state       || '');
  const cep      = String(pd?.cliente_cep        || '00.000-000');
  const respNome = String(pd?.responsavel_nome   || 'RESPONSÁVEL TÉCNICO');
  const respCft  = String(pd?.responsavel_registro || '00000000000');
  const dataDoc  = String(pd?.data_documento     || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { DiagramaBlocosPDF } = await import('./DiagramaBlocosPDF');
      const React = await import('react');
      const clientName = pd?.nomeClienteFinal || 'projeto';
      const filename = `Diagrama de Blocos - ${clientName}.pdf`;
      const blob = await pdf(React.createElement(DiagramaBlocosPDF, { projectData })).toBlob();
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

  return (
    <>
      {/* Diagrama */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', fontFamily: 'Arial, sans-serif' }}>
        {/* 1. Módulos */}
        <div style={BOX}>
          <div style={BOLD}>{modulosQtd > 0 ? modulosQtd : '___'} Módulos Fotovoltaicos</div>
          <div style={NORMAL}>de {modulosWp > 0 ? modulosWp : '___'} Wp cada</div>
          {stringsLine && <div style={NORMAL}>{stringsLine}</div>}
          <div style={NORMAL}>Potência total: {potenciaTotal} kWp</div>
        </div>

        <div style={V_LINE} />

        {/* 2. Inversor */}
        <div style={BOX}>
          <div style={BOLD}>Inversor Fotovoltaico:</div>
          <div style={BOLD}>{fabricante} {invPotencia}kW</div>
          <div style={NORMAL}>Proteções CC Acopladas:</div>
          <div style={NORMAL}>DPS e Chave Seccionadora</div>
          <div style={NORMAL}>Proteções do Inversor: (27), (59),</div>
          <div style={NORMAL}>(25) e 78 (anti-ilhamento)</div>
        </div>

        <div style={V_LINE} />

        {/* 3. Quadro CA */}
        <div style={BOX}>
          <div style={BOLD}>Quadro de Proteção CA:</div>
          <div style={NORMAL}>DPS e Disjuntor</div>
        </div>

        <div style={V_LINE} />

        {/* 4. QGBT centralizado + Unidade Consumidora à direita */}
        <div style={{ position: 'relative', width: '200px' }}>
          <div style={BOX}>
            <div style={NORMAL}>QGBT</div>
            <div style={NORMAL}>Quadro de baixa tensão</div>
          </div>
          <div style={{ position: 'absolute', top: 0, left: '200px', display: 'flex', flexDirection: 'row', alignItems: 'center', height: '100%' }}>
            <div style={H_LINE} />
            <div style={{ ...BOX, width: '140px' }}>
              <div style={NORMAL}>Unidade</div>
              <div style={NORMAL}>Consumidora/Geradora</div>
            </div>
          </div>
        </div>

        <div style={V_LINE} />

        {/* 5. Disjuntor */}
        <div style={BOX}>
          <div style={NORMAL}>Disjuntor do</div>
          <div style={NORMAL}>Padrão de Entrada</div>
        </div>

        <div style={V_LINE} />

        {/* 6. Medidor */}
        <div style={BOX}>
          <div style={NORMAL}>Medidor Bidirecional</div>
        </div>

        <div style={V_LINE} />

        {/* 7. Rede */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '40px', borderTop: '1.5px solid #000', marginBottom: '4px' }} />
          <div style={{ color: '#1F4E79', fontWeight: 'bold', fontSize: '8px', textAlign: 'center', lineHeight: '1.5' }}>
            REDE DE DISTRIBUIÇÃO
          </div>
        </div>

        {/* ═══ SELO ═══ */}
        <div style={{ border: '1.2px solid #000', display: 'flex', flexDirection: 'row', marginTop: '28px', width: '100%', fontFamily: 'Arial, sans-serif', fontSize: '6px' }}>

          {/* LEFT COLUMN */}
          <div style={{ width: '20%', borderRight: '0.8px solid #000', display: 'flex', flexDirection: 'column' }}>
            {/* PRODUTO */}
            <div style={{ borderBottom: '0.7px solid #000', padding: '3px 4px', minHeight: '30px' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold' }}>PRODUTO</div>
              <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', marginTop: '2px' }}>GFV {potenciaTotal} kWp</div>
            </div>
            {/* Sub-col rows */}
            <div style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
              <div style={{ flex: 1, borderRight: '0.6px solid #000', display: 'flex', flexDirection: 'column' }}>
                {[['DATA', dataDoc], ['ESCALA', 'S/ ESCALA'], ['TAMANHO', 'A3'], ['FOLHA', '1/1'], ['REVISÃO', 'R0']].map(([label, value], i, arr) => (
                  <div key={label} style={{ borderBottom: i < arr.length - 1 ? '0.5px solid #000' : undefined, padding: '2px 4px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '5.5px', fontWeight: 'bold' }}>{label}</span>
                    <span style={{ fontSize: '6px', textAlign: 'center' }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: '28%', display: 'flex', flexDirection: 'column' }}>
                {['R1:', 'R2:', 'R3:', 'R4:', 'R5:'].map((r, i, arr) => (
                  <div key={r} style={{ borderBottom: i < arr.length - 1 ? '0.5px solid #000' : undefined, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5.5px' }}>{r}</div>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN */}
          <div style={{ flex: 1, borderRight: '0.8px solid #000', display: 'flex', flexDirection: 'column' }}>
            {/* Title */}
            <div style={{ borderBottom: '0.7px solid #000', padding: '3px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '30px' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', alignSelf: 'flex-start' }}>TÍTULO</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center' }}>DIAGRAMA DE BLOCOS</div>
            </div>
            {/* Owner */}
            <div style={{ borderBottom: '0.5px solid #000', padding: '3px 6px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold' }}>Proprietário e Obra:</div>
              <div style={{ fontSize: '6px' }}>Nome: {owner}</div>
              <div style={{ fontSize: '6px' }}>Endereço: {endereco}</div>
              <div style={{ fontSize: '6px' }}>Cidade: {uf ? `${cidade} - ${uf}` : cidade}</div>
              <div style={{ fontSize: '6px' }}>CEP: {cep}</div>
            </div>
            {/* Responsável */}
            <div style={{ padding: '3px 6px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold' }}>Responsável Técnico:</div>
              <div style={{ fontSize: '6px', fontWeight: 'bold' }}>{respNome}</div>
              <div style={{ fontSize: '5.5px' }}>TÉCNICO EM ELETROTÉCNICA</div>
              <div style={{ fontSize: '5.5px' }}>CFT: {respCft}</div>
            </div>
          </div>

          {/* RIGHT COLUMN — Logo */}
          <div style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}>
            <span style={{ fontSize: '6px', color: '#999' }}>[Logo]</span>
          </div>

        </div>
      </div>

      {/* Botão PDF */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleGeneratePdf}
          disabled={generating}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
        >
          {generating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
          ) : (
            <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Diagrama de Blocos</>
          )}
        </Button>
      </div>
    </>
  );
}
