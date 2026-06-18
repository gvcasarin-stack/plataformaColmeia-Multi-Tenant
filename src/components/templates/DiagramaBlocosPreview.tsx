'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getTotalKwp, getTotalModulosQtd, getAllModulos, getAllInversores, parseStringsModulos } from '@/lib/utils/equipmentParser';

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

  const modulosQtd = getTotalModulosQtd(pd);
  const modulosWp = parseFloat(String(pd?.modulos_potencia_wp || '0')) || 0;

  const kwpTotal = getTotalKwp(pd);
  const potenciaTotal = kwpTotal > 0 ? fmt2(kwpTotal) : '___';

  const stringsLine = (() => {
    const totalStrings = parseInt(String(pd?.modulos_total_strings || '0')) || 0;
    let stringsModulos: string[] = [];
    try {
      const parsed = JSON.parse(String(pd?.modulos_strings_modulos || '[]'));
      stringsModulos = Array.isArray(parsed) ? parsed.filter((v: any) => v !== '' && v !== null && v !== undefined) : [];
    } catch { stringsModulos = []; }

    if (totalStrings > 0 && stringsModulos.length > 0) {
      const counts: Record<number, number> = {};
      for (const v of stringsModulos) {
        const n = parseInt(String(v)) || 0;
        if (n > 0) counts[n] = (counts[n] || 0) + 1;
      }
      const parts = Object.entries(counts).map(([mods, qty]) => {
        const m = parseInt(mods);
        return `${qty} ${qty === 1 ? 'String' : 'Strings'} de ${String(m).padStart(2, '0')} módulos`;
      });
      if (parts.length > 0) return parts.join(' + ');
    }

    if (totalStrings > 0 && modulosQtd > 0) {
      const perString = Math.round(modulosQtd / totalStrings);
      if (perString > 0) return `${totalStrings} ${totalStrings === 1 ? 'String' : 'Strings'} de ${String(perString).padStart(2, '0')} módulos`;
    }

    const qtd = parseInt(String(pd?.inversores_quantidade_mppt || pd?.strings_quantidade || '0')) || 0;
    const perStr = qtd > 0 && modulosQtd > 0 ? Math.round(modulosQtd / qtd) : 0;
    if (qtd > 0 && perStr > 0) return `${qtd} ${qtd === 1 ? 'String' : 'Strings'} de ${String(perStr).padStart(2, '0')} módulos`;
    return null;
  })();

  const fabricante = pd?.inversores_fabricante ? String(pd.inversores_fabricante).toUpperCase() : '___';
  const invPotencia = fmt2(pd?.inversores_potencia);

  // Per-physical-unit data for multi-inverter columns
  const modulosListFull = getAllModulos(pd);
  const inversoresListFull = getAllInversores(pd);
  const physicalInvData: Array<{ fabricante: string; potencia: string; moduloWp: number; moduloQtd: number }> = [];
  for (const inv of inversoresListFull) {
    const qty = parseInt(String(inv.quantidade || '1')) || 1;
    for (let u = 0; u < qty; u++) {
      const cfg = inv.units_config?.[u];
      let moduloWp = modulosWp;
      let moduloQtd = 0;
      if (cfg) {
        const modIdx = cfg.modulo_idx ?? 0;
        const mod = modulosListFull[modIdx];
        if (mod) moduloWp = parseFloat(String(mod.potencia_wp || '0')) || 0;
        const strings = parseStringsModulos(cfg.strings_modulos || '[]', modIdx);
        moduloQtd = strings.reduce((acc, s) => acc + s.quantidade, 0);
      }
      physicalInvData.push({
        fabricante: String(inv.fabricante || '').toUpperCase() || '___',
        potencia: fmt2(inv.potencia),
        moduloWp,
        moduloQtd,
      });
    }
  }

  const hasStringbox = !!(pd?.setup_quadro_cc && pd.setup_quadro_cc !== 'nao');
  const stringboxLabel = pd?.setup_quadro_cc === 'dps_chave_seccionadora' ? 'DPS e Chave Seccionadora'
    : pd?.setup_quadro_cc === 'dps_disjuntor_cc' ? 'DPS e Disjuntor CC'
    : 'DPS';
  const numInversores = pd?.setup_mais_de_um_inversor === 'sim' && pd?.setup_tipo_inversor !== 'microinversor'
    ? (parseInt(String(pd?.setup_total_inversores || '2')) || 2)
    : 1;
  const configuracaoSaidas = String(pd?.setup_configuracao_saidas || 'independentes');

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
        {numInversores === 1 ? (
          <>
            {/* 1. Módulos */}
            <div style={BOX}>
              <div style={BOLD}>{modulosQtd > 0 ? modulosQtd : '___'} Módulos Fotovoltaicos</div>
              <div style={NORMAL}>de {modulosWp > 0 ? modulosWp : '___'} Wp cada</div>
              {stringsLine && <div style={NORMAL}>{stringsLine}</div>}
              <div style={NORMAL}>Potência total: {potenciaTotal} kWp</div>
            </div>
            <div style={V_LINE} />
            {hasStringbox && (
              <>
                <div style={BOX}>
                  <div style={BOLD}>Quadro de Proteção CC (Stringbox):</div>
                  <div style={NORMAL}>{stringboxLabel}</div>
                </div>
                <div style={V_LINE} />
              </>
            )}
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
            {/* 4. QGBT */}
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
          </>
        ) : configuracaoSaidas === 'agrupadas' ? (
          <>
            {/* Multi-inversor agrupadas: colunas → barramento centro-a-centro → Quadro CA único → QGBT */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              {Array.from({ length: numInversores }).map((_, i) => {
                const unit = physicalInvData[i];
                const uFab = unit?.fabricante ?? fabricante;
                const uPot = unit?.potencia ?? invPotencia;
                const uWp = unit?.moduloWp ?? modulosWp;
                const uQtd = unit?.moduloQtd ?? 0;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={BOX}>
                      <div style={BOLD}>{uQtd > 0 ? uQtd : '___'} Módulos Fotovoltaicos</div>
                      <div style={NORMAL}>de {uWp > 0 ? uWp : '___'} Wp cada</div>
                    </div>
                    <div style={V_LINE} />
                    {hasStringbox && (
                      <>
                        <div style={BOX}>
                          <div style={BOLD}>Quadro de Proteção CC (Stringbox):</div>
                          <div style={NORMAL}>{stringboxLabel}</div>
                        </div>
                        <div style={V_LINE} />
                      </>
                    )}
                    <div style={BOX}>
                      <div style={BOLD}>Inversor Fotovoltaico {i + 1}:</div>
                      <div style={BOLD}>{uFab} {uPot}kW</div>
                      <div style={NORMAL}>Proteções do Inversor: (27), (59),</div>
                      <div style={NORMAL}>(25) e 78 (anti-ilhamento)</div>
                    </div>
                    <div style={V_LINE} />
                  </div>
                );
              })}
            </div>
            {/* Funil simétrico — mesmo padrão das saídas independentes */}
            <div style={{ position: 'relative', width: `${numInversores * 216 - 16}px`, height: '22px' }}>
              {Array.from({ length: numInversores }).map((_, i) => {
                const lc = (numInversores * 216 - 16) / 2;
                const bc = i * 216 + 100;
                if (bc < lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 100}px`, width: '75px', height: '1.5px', backgroundColor: '#000' }} />;
                if (bc > lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 25}px`, width: '75px', height: '1.5px', backgroundColor: '#000' }} />;
                return null;
              })}
              {Array.from({ length: numInversores }).map((_, i) => {
                const lc = (numInversores * 216 - 16) / 2;
                const bc = i * 216 + 100;
                if (bc < lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 175}px`, width: '1px', height: '22px', backgroundColor: '#000' }} />;
                if (bc > lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 25}px`, width: '1px', height: '22px', backgroundColor: '#000' }} />;
                return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 100}px`, width: '1px', height: '22px', backgroundColor: '#000' }} />;
              })}
            </div>
            {/* Quadro CA único — largura igual às colunas */}
            <div style={{ border: '1.5px solid #000', width: `${numInversores * 216 - 16}px`, padding: '8px 10px', textAlign: 'center', backgroundColor: '#FFFFFF', fontSize: '8px', lineHeight: '1.5', boxSizing: 'border-box' }}>
              <div style={BOLD}>Quadro de Proteção CA:</div>
              <div style={NORMAL}>DPS e Disjuntor</div>
            </div>
            <div style={V_LINE} />
            {/* QGBT */}
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
          </>
        ) : (
          <>
            {/* Multi-inversor independentes: colunas → barramento centro-a-centro → N linhas independentes → QGBT largo */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              {Array.from({ length: numInversores }).map((_, i) => {
                const unit = physicalInvData[i];
                const uFab = unit?.fabricante ?? fabricante;
                const uPot = unit?.potencia ?? invPotencia;
                const uWp = unit?.moduloWp ?? modulosWp;
                const uQtd = unit?.moduloQtd ?? 0;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={BOX}>
                      <div style={BOLD}>{uQtd > 0 ? uQtd : '___'} Módulos Fotovoltaicos</div>
                      <div style={NORMAL}>de {uWp > 0 ? uWp : '___'} Wp cada</div>
                    </div>
                    <div style={V_LINE} />
                    {hasStringbox && (
                      <>
                        <div style={BOX}>
                          <div style={BOLD}>Quadro de Proteção CC (Stringbox):</div>
                          <div style={NORMAL}>{stringboxLabel}</div>
                        </div>
                        <div style={V_LINE} />
                      </>
                    )}
                    <div style={BOX}>
                      <div style={BOLD}>Inversor Fotovoltaico {i + 1}:</div>
                      <div style={BOLD}>{uFab} {uPot}kW</div>
                      <div style={NORMAL}>Proteções do Inversor: (27), (59),</div>
                      <div style={NORMAL}>(25) e 78 (anti-ilhamento)</div>
                    </div>
                    <div style={V_LINE} />
                    <div style={BOX}>
                      <div style={BOLD}>Quadro de Proteção CA:</div>
                      <div style={NORMAL}>DPS e Disjuntor</div>
                    </div>
                    <div style={V_LINE} />
                  </div>
                );
              })}
            </div>
            {/* Funil simétrico: blocos à esquerda do centro → linha vai à direita; à direita → vai à esquerda */}
            <div style={{ position: 'relative', width: `${numInversores * 216 - 16}px`, height: '22px' }}>
              {/* Horizontais */}
              {Array.from({ length: numInversores }).map((_, i) => {
                const lc = (numInversores * 216 - 16) / 2;
                const bc = i * 216 + 100;
                if (bc < lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 100}px`, width: '75px', height: '1.5px', backgroundColor: '#000' }} />;
                if (bc > lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 25}px`, width: '75px', height: '1.5px', backgroundColor: '#000' }} />;
                return null;
              })}
              {/* Verticais (quedas ao QGBT) */}
              {Array.from({ length: numInversores }).map((_, i) => {
                const lc = (numInversores * 216 - 16) / 2;
                const bc = i * 216 + 100;
                if (bc < lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 175}px`, width: '1px', height: '22px', backgroundColor: '#000' }} />;
                if (bc > lc) return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 25}px`, width: '1px', height: '22px', backgroundColor: '#000' }} />;
                return <div key={i} style={{ position: 'absolute', top: 0, left: `${i * 216 + 100}px`, width: '1px', height: '22px', backgroundColor: '#000' }} />;
              })}
            </div>
            {/* QGBT largo — N entradas independentes visíveis no topo */}
            <div style={{ position: 'relative', width: `${numInversores * 216 - 16}px` }}>
              <div style={{ border: '1.5px solid #000', width: '100%', padding: '8px 10px', textAlign: 'center', backgroundColor: '#FFFFFF', fontSize: '8px', lineHeight: '1.5', boxSizing: 'border-box' }}>
                <div style={NORMAL}>QGBT</div>
                <div style={NORMAL}>Quadro de baixa tensão</div>
              </div>
              <div style={{ position: 'absolute', top: 0, left: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', height: '100%' }}>
                <div style={H_LINE} />
                <div style={{ ...BOX, width: '140px' }}>
                  <div style={NORMAL}>Unidade</div>
                  <div style={NORMAL}>Consumidora/Geradora</div>
                </div>
              </div>
            </div>
            <div style={V_LINE} />
          </>
        )}

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
        <div style={{ border: '1.2px solid #000', display: 'flex', flexDirection: 'row', marginTop: '48px', width: '100%', fontFamily: 'Arial, sans-serif', height: '120px', boxSizing: 'border-box', overflow: 'hidden' }}>

          {/* LEFT COLUMN */}
          <div style={{ width: '28%', borderRight: '0.8px solid #000', display: 'flex', flexDirection: 'column', height: '120px' }}>
            {/* PRODUTO — 30px */}
            <div style={{ height: '30px', borderBottom: '0.7px solid #000', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold' }}>PRODUTO</div>
              <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>GFV {potenciaTotal} kWp</div>
            </div>
            {/* Sub-col rows — 90px */}
            <div style={{ display: 'flex', flexDirection: 'row', height: '90px' }}>
              <div style={{ flex: 1, borderRight: '0.6px solid #000', display: 'flex', flexDirection: 'column' }}>
                {(['DATA', 'ESCALA', 'TAMANHO', 'FOLHA', 'REVISÃO'] as const).map((label, i) => {
                  const values = [dataDoc, 'S/ ESCALA', 'A3', '1/1', 'R0'];
                  const h = i < 4 ? '16px' : '26px';
                  return (
                    <div key={label} style={{ height: h, borderBottom: i < 4 ? '0.5px solid #000' : undefined, padding: '1px 3px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: i < 4 ? 'space-between' : 'center', gap: i >= 4 ? '2px' : undefined, overflow: 'hidden' }}>
                      <span style={{ fontSize: '5px', fontWeight: 'bold', lineHeight: 1 }}>{label}</span>
                      <span style={{ fontSize: '5.5px', textAlign: 'center', lineHeight: 1 }}>{values[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ width: '28%', display: 'flex', flexDirection: 'column' }}>
                {['R1:', 'R2:', 'R3:', 'R4:', 'R5:'].map((r, i) => (
                  <div key={r} style={{ height: i < 4 ? '16px' : '26px', borderBottom: i < 4 ? '0.5px solid #000' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5.5px', boxSizing: 'border-box' }}>{r}</div>
                ))}
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN */}
          <div style={{ flex: 1, borderRight: '0.8px solid #000', display: 'flex', flexDirection: 'column', height: '120px' }}>
            {/* Title — 30px */}
            <div style={{ height: '30px', borderBottom: '0.7px solid #000', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', alignSelf: 'flex-start' }}>TÍTULO</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1 }}>DIAGRAMA DE BLOCOS</div>
            </div>
            {/* Owner — 48px */}
            <div style={{ height: '48px', borderBottom: '0.5px solid #000', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', overflow: 'hidden' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1 }}>Proprietário e Obra:</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>Nome: {owner}</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>Endereço: {endereco}</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>Cidade: {uf ? `${cidade} - ${uf}` : cidade}</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>CEP: {cep}</div>
            </div>
            {/* Responsável — 42px */}
            <div style={{ height: '42px', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', overflow: 'hidden' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1 }}>Responsável Técnico:</div>
              <div style={{ fontSize: '6px', fontWeight: 'bold', lineHeight: 1 }}>{respNome}</div>
              <div style={{ fontSize: '5.5px', lineHeight: 1 }}>TÉCNICO EM ELETROTÉCNICA</div>
              <div style={{ fontSize: '5.5px', lineHeight: 1 }}>CFT: {respCft}</div>
            </div>
          </div>

          {/* RIGHT COLUMN — Logo */}
          <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', height: '120px', boxSizing: 'border-box' }}>
            {pd?.logo_empresa_url
              ? <img src={pd.logo_empresa_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : null}
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
