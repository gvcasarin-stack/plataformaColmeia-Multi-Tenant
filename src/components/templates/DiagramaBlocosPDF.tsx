import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { getTotalKwp, getTotalModulosQtd, getAllModulos, getAllInversores, parseStringsModulos, getStatusTag } from '@/lib/utils/equipmentParser';

interface DiagramaBlocosPDFProps {
  projectData?: Record<string, any>;
}

const BC = '#000000';
const BOX_W = 165;

// Folha A4 paisagem em escala real (1mm = 72/25.4pt) — mesma técnica usada em
// PadraoEntradaEnergisaPDF.tsx. Moldura NBR 10068 + selo com o mesmo tamanho
// físico (192.5 x 35.7mm) usado na prancha de Padrão de Entrada (A3).
const PT_PER_MM = 72 / 25.4;
const mm = (v: number) => v * PT_PER_MM;
const FRAME = { x: 25, y: 10, w: 262, h: 190 }; // direita=287, baixo=200
// Padrão NBR 10068 para A4: o selo ocupa a largura inteira do quadro
// (25-287mm), mantendo a mesma altura (35.7mm) da prancha A3.
const SELO = { x: 25, y: 164.3, w: 262, h: 35.7 };
const SC = '#161513';

const s = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: BC,
    width: BOX_W,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  boldLine: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  normalLine: {
    fontSize: 7,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  statusTag: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    textAlign: 'center',
    marginBottom: 3,
  },
  vLine: {
    width: 1,
    height: 22,
    backgroundColor: BC,
  },
  hLine: {
    height: 1,
    width: 22,
    backgroundColor: BC,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  redeText: {
    color: '#1F4E79',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
    lineHeight: 1.4,
  },
  redeBar: {
    width: 35,
    height: 1,
    backgroundColor: BC,
    marginBottom: 4,
  },
});

function fmt2(val: string | number | undefined): string {
  if (!val && val !== 0) return '___';
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n) || n === 0) return '___';
  return n.toFixed(2).replace('.', ',');
}

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Normaliza a data (ja em DD/MM/AAAA, ou por extenso "DD de mes de AAAA", como
// data_documento e salvo) para DD/MM/AAAA — formato exigido no selo da prancha.
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

export function DiagramaBlocosPDF({ projectData }: DiagramaBlocosPDFProps) {
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
  const modulosTagSingle = getStatusTag(modulosListFull);
  const physicalInvData: Array<{ fabricante: string; potencia: string; moduloWp: number; moduloQtd: number; moduloStatusTag: string }> = [];
  for (const inv of inversoresListFull) {
    const qty = parseInt(String(inv.quantidade || '1')) || 1;
    for (let u = 0; u < qty; u++) {
      const cfg = inv.units_config?.[u];
      let moduloWp = modulosWp;
      let moduloQtd = 0;
      let moduloStatusTag = '';
      if (cfg) {
        const modIdx = cfg.modulo_idx ?? 0;
        const mod = modulosListFull[modIdx];
        if (mod) moduloWp = parseFloat(String(mod.potencia_wp || '0')) || 0;
        const strings = parseStringsModulos(cfg.strings_modulos || '[]', modIdx);
        moduloQtd = strings.reduce((acc, s) => acc + s.quantidade, 0);
        const referencedModulos = strings
          .map(st => modulosListFull[st.modulo_idx ?? modIdx])
          .filter(Boolean) as typeof modulosListFull;
        moduloStatusTag = getStatusTag(referencedModulos.length > 0 ? referencedModulos : (mod ? [mod] : []));
      }
      physicalInvData.push({
        fabricante: String(inv.fabricante || '').toUpperCase() || '___',
        potencia: fmt2(inv.potencia),
        moduloWp,
        moduloQtd,
        moduloStatusTag,
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

  const PDF_GAP = 10;
  const pdfColW = numInversores === 1 ? BOX_W
    : Math.min(BOX_W, Math.floor((475 - PDF_GAP * (numInversores - 1)) / numInversores));
  const pdfStep = pdfColW + PDF_GAP;
  const pdfCenter = pdfColW / 2;
  const pdfSectionW = numInversores * pdfStep - PDF_GAP;
  const pdfLayoutCenter = pdfSectionW / 2;
  const pdfHW = Math.round(pdfStep * 75 / 216);
  const FUNNEL_H = 18;

  function renderFunnel() {
    return (
      <View style={{ position: 'relative', width: pdfSectionW, height: FUNNEL_H }}>
        {Array.from({ length: numInversores }).map((_, i) => {
          const bc = i * pdfStep + pdfCenter;
          if (bc < pdfLayoutCenter) return <View key={`fh${i}`} style={{ position: 'absolute', top: 0, left: bc, width: pdfHW, height: 1, backgroundColor: BC }} />;
          if (bc > pdfLayoutCenter) return <View key={`fh${i}`} style={{ position: 'absolute', top: 0, left: bc - pdfHW, width: pdfHW, height: 1, backgroundColor: BC }} />;
          return null;
        })}
        {Array.from({ length: numInversores }).map((_, i) => {
          const bc = i * pdfStep + pdfCenter;
          if (bc < pdfLayoutCenter) return <View key={`fv${i}`} style={{ position: 'absolute', top: 0, left: bc + pdfHW, width: 1, height: FUNNEL_H, backgroundColor: BC }} />;
          if (bc > pdfLayoutCenter) return <View key={`fv${i}`} style={{ position: 'absolute', top: 0, left: bc - pdfHW, width: 1, height: FUNNEL_H, backgroundColor: BC }} />;
          return <View key={`fv${i}`} style={{ position: 'absolute', top: 0, left: bc, width: 1, height: FUNNEL_H, backgroundColor: BC }} />;
        })}
      </View>
    );
  }

  // ── Seal fields ────────────────────────────────────────────────────────────
  const owner    = String(pd?.nomeClienteFinal   || 'NOME DO PROPRIETARIO');
  const endereco = String(pd?.endereco_local      || 'ENDERECO DA OBRA');
  const cidade   = String(pd?.client_city         || 'Cidade');
  const uf       = String(pd?.client_state        || '');
  const cep      = String(pd?.cliente_cep         || '00.000-000');
  const respNome = String(pd?.responsavel_nome    || 'RESPONSAVEL TECNICO');
  const respCft  = String(pd?.responsavel_registro || '00000000000');
  const dataDoc  = pd?.data_documento
    ? formatDataBR(String(pd.data_documento))
    : (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })();

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={{ backgroundColor: '#FFFFFF', fontFamily: 'Helvetica', fontSize: 8 }}>
        <View style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* borda de corte */}
          <View style={{ position: 'absolute', left: mm(0.5), top: mm(0.5), width: mm(296), height: mm(209), borderWidth: 0.75, borderColor: SC }} />
          {/* quadro NBR 10068 (margem esq. 25mm p/ encadernação) */}
          <View style={{ position: 'absolute', left: mm(FRAME.x), top: mm(FRAME.y), width: mm(FRAME.w), height: mm(FRAME.h), borderWidth: 0.75, borderColor: SC }} />
          {/* marcas de centragem */}
          <View style={{ position: 'absolute', left: mm(155.65), top: mm(0.5), width: 0.75, height: mm(9.5), backgroundColor: SC }} />
          <View style={{ position: 'absolute', left: mm(155.65), top: mm(200), width: 0.75, height: mm(9.5), backgroundColor: SC }} />
          <View style={{ position: 'absolute', left: mm(0.5), top: mm(104.65), width: mm(24.5), height: 0.75, backgroundColor: SC }} />
          <View style={{ position: 'absolute', left: mm(287), top: mm(104.65), width: mm(9.5), height: 0.75, backgroundColor: SC }} />

        <View style={{ position: 'absolute', left: mm(FRAME.x), top: mm(FRAME.y), width: mm(FRAME.w), height: mm(164.3 - FRAME.y), paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', fontFamily: 'Helvetica', fontSize: 8 }}>
        {numInversores === 1 ? (
          <>
            {/* 1. Módulos */}
            {modulosTagSingle && <Text style={s.statusTag}>{modulosTagSingle}</Text>}
            <View style={s.box}>
              <Text style={s.boldLine}>{modulosQtd > 0 ? modulosQtd : '___'} Módulos Fotovoltaicos</Text>
              <Text style={s.normalLine}>de {modulosWp > 0 ? modulosWp : '___'} Wp cada</Text>
              {stringsLine && <Text style={s.normalLine}>{stringsLine}</Text>}
              <Text style={s.normalLine}>Potência total: {potenciaTotal} kWp</Text>
            </View>
            <View style={s.vLine} />
            {hasStringbox && (
              <>
                <View style={s.box}>
                  <Text style={s.boldLine}>Quadro de Proteção CC (Stringbox):</Text>
                  <Text style={s.normalLine}>{stringboxLabel}</Text>
                </View>
                <View style={s.vLine} />
              </>
            )}
            {/* 2. Inversor */}
            <View style={s.box}>
              <Text style={s.boldLine}>Inversor Fotovoltaico:</Text>
              <Text style={s.boldLine}>{fabricante} {invPotencia}kW</Text>
              <Text style={s.normalLine}>Proteções CC Acopladas:</Text>
              <Text style={s.normalLine}>DPS e Chave Seccionadora</Text>
              <Text style={s.normalLine}>Proteções do Inversor: (27), (59),</Text>
              <Text style={s.normalLine}>(25) e 78 (anti-ilhamento)</Text>
            </View>
            <View style={s.vLine} />
            {/* 3. Quadro CA */}
            <View style={s.box}>
              <Text style={s.boldLine}>Quadro de Proteção CA:</Text>
              <Text style={s.normalLine}>DPS e Disjuntor</Text>
            </View>
            <View style={s.vLine} />
            {/* 4. QGBT */}
            <View style={{ width: BOX_W, position: 'relative' }}>
              <View style={s.box}>
                <Text style={s.normalLine}>QGBT</Text>
                <Text style={s.normalLine}>Quadro de baixa tensão</Text>
              </View>
              <View style={{ position: 'absolute', top: 0, left: BOX_W, flexDirection: 'row', alignItems: 'center', height: '100%' }}>
                <View style={[s.hLine, { alignSelf: 'center' }]} />
                <View style={[s.box, { width: 120 }]}>
                  <Text style={s.normalLine}>Unidade</Text>
                  <Text style={s.normalLine}>Consumidora/Geradora</Text>
                </View>
              </View>
            </View>
            <View style={s.vLine} />
          </>
        ) : configuracaoSaidas === 'agrupadas' ? (
          <>
            <View style={{ width: pdfSectionW, flexDirection: 'row', justifyContent: 'space-between' }}>
              {Array.from({ length: numInversores }).map((_, i) => {
                const unit = physicalInvData[i];
                const uFab = unit?.fabricante ?? '___';
                const uPot = unit?.potencia ?? '___';
                const uWp = unit?.moduloWp ?? modulosWp;
                const uQtd = unit?.moduloQtd ?? 0;
                const uStatusTag = unit?.moduloStatusTag || '';
                return (
                  <View key={i} style={{ width: pdfColW, alignItems: 'center' }}>
                    {uStatusTag && <Text style={s.statusTag}>{uStatusTag}</Text>}
                    <View style={[s.box, { width: pdfColW }]}>
                      <Text style={s.boldLine}>{uQtd > 0 ? uQtd : '___'} Módulos Fotovoltaicos</Text>
                      <Text style={s.normalLine}>de {uWp > 0 ? uWp : '___'} Wp cada</Text>
                    </View>
                    <View style={s.vLine} />
                    {hasStringbox && (
                      <>
                        <View style={[s.box, { width: pdfColW }]}>
                          <Text style={s.boldLine}>Quadro de Proteção CC (Stringbox):</Text>
                          <Text style={s.normalLine}>{stringboxLabel}</Text>
                        </View>
                        <View style={s.vLine} />
                      </>
                    )}
                    <View style={[s.box, { width: pdfColW }]}>
                      <Text style={s.boldLine}>Inversor Fotovoltaico {i + 1}:</Text>
                      <Text style={s.boldLine}>{uFab} {uPot}kW</Text>
                      <Text style={s.normalLine}>Proteções do Inversor: (27), (59),</Text>
                      <Text style={s.normalLine}>(25) e 78 (anti-ilhamento)</Text>
                    </View>
                    <View style={s.vLine} />
                  </View>
                );
              })}
            </View>
            {renderFunnel()}
            <View style={{ borderWidth: 1, borderColor: BC, width: pdfSectionW, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' }}>
              <Text style={s.boldLine}>Quadro de Proteção CA:</Text>
              <Text style={s.normalLine}>DPS e Disjuntor</Text>
            </View>
            <View style={s.vLine} />
            <View style={{ width: pdfColW, position: 'relative' }}>
              <View style={[s.box, { width: pdfColW }]}>
                <Text style={s.normalLine}>QGBT</Text>
                <Text style={s.normalLine}>Quadro de baixa tensão</Text>
              </View>
              <View style={{ position: 'absolute', top: 0, left: pdfColW, flexDirection: 'row', alignItems: 'center', height: '100%' }}>
                <View style={[s.hLine, { alignSelf: 'center' }]} />
                <View style={[s.box, { width: 120 }]}>
                  <Text style={s.normalLine}>Unidade</Text>
                  <Text style={s.normalLine}>Consumidora/Geradora</Text>
                </View>
              </View>
            </View>
            <View style={s.vLine} />
          </>
        ) : (
          <>
            <View style={{ width: pdfSectionW, flexDirection: 'row', justifyContent: 'space-between' }}>
              {Array.from({ length: numInversores }).map((_, i) => {
                const unit = physicalInvData[i];
                const uFab = unit?.fabricante ?? '___';
                const uPot = unit?.potencia ?? '___';
                const uWp = unit?.moduloWp ?? modulosWp;
                const uQtd = unit?.moduloQtd ?? 0;
                const uStatusTag = unit?.moduloStatusTag || '';
                return (
                  <View key={i} style={{ width: pdfColW, alignItems: 'center' }}>
                    {uStatusTag && <Text style={s.statusTag}>{uStatusTag}</Text>}
                    <View style={[s.box, { width: pdfColW }]}>
                      <Text style={s.boldLine}>{uQtd > 0 ? uQtd : '___'} Módulos Fotovoltaicos</Text>
                      <Text style={s.normalLine}>de {uWp > 0 ? uWp : '___'} Wp cada</Text>
                    </View>
                    <View style={s.vLine} />
                    {hasStringbox && (
                      <>
                        <View style={[s.box, { width: pdfColW }]}>
                          <Text style={s.boldLine}>Quadro de Proteção CC (Stringbox):</Text>
                          <Text style={s.normalLine}>{stringboxLabel}</Text>
                        </View>
                        <View style={s.vLine} />
                      </>
                    )}
                    <View style={[s.box, { width: pdfColW }]}>
                      <Text style={s.boldLine}>Inversor Fotovoltaico {i + 1}:</Text>
                      <Text style={s.boldLine}>{uFab} {uPot}kW</Text>
                      <Text style={s.normalLine}>Proteções do Inversor: (27), (59),</Text>
                      <Text style={s.normalLine}>(25) e 78 (anti-ilhamento)</Text>
                    </View>
                    <View style={s.vLine} />
                    <View style={[s.box, { width: pdfColW }]}>
                      <Text style={s.boldLine}>Quadro de Proteção CA:</Text>
                      <Text style={s.normalLine}>DPS e Disjuntor</Text>
                    </View>
                    <View style={s.vLine} />
                  </View>
                );
              })}
            </View>
            {renderFunnel()}
            <View style={{ width: pdfSectionW, position: 'relative' }}>
              <View style={{ borderWidth: 1, borderColor: BC, width: pdfSectionW, paddingVertical: 8, paddingHorizontal: 8, alignItems: 'center' }}>
                <Text style={s.normalLine}>QGBT</Text>
                <Text style={s.normalLine}>Quadro de baixa tensão</Text>
              </View>
              <View style={{ position: 'absolute', top: 0, left: pdfSectionW, flexDirection: 'row', alignItems: 'center', height: '100%' }}>
                <View style={[s.hLine, { alignSelf: 'center' }]} />
                <View style={[s.box, { width: 120 }]}>
                  <Text style={s.normalLine}>Unidade</Text>
                  <Text style={s.normalLine}>Consumidora/Geradora</Text>
                </View>
              </View>
            </View>
            <View style={s.vLine} />
          </>
        )}

        {/* 5. Disjuntor */}
        <View style={s.box}>
          <Text style={s.normalLine}>Disjuntor do</Text>
          <Text style={s.normalLine}>Padrão de Entrada</Text>
        </View>

        <View style={s.vLine} />

        {/* 6. Medidor */}
        <View style={s.box}>
          <Text style={s.normalLine}>Medidor Bidirecional</Text>
        </View>

        <View style={s.vLine} />

        {/* 7. Rede de Distribuição */}
        <View style={{ alignItems: 'center' }}>
          <View style={s.redeBar} />
          <Text style={s.redeText}>REDE DE</Text>
          <Text style={s.redeText}>DISTRIBUIÇÃO</Text>
        </View>

        </View>

        {/* ═══ SELO — mesmo tamanho/estrutura da prancha de Padrão de Entrada
            (A3): 192.5 x 35.7mm, encostado no canto inferior direito do
            quadro. ═══ */}
        <View style={{ position: 'absolute', left: mm(SELO.x), top: mm(SELO.y), width: mm(SELO.w), height: mm(SELO.h), borderWidth: 0.75, borderColor: SC, flexDirection: 'row' }}>
          {/* Coluna 1: Produto / Data / Escala / Tamanho / Folha / Revisão */}
          <View style={{ width: mm(55), borderRightWidth: 0.5, borderRightColor: SC }}>
            <View style={{ height: mm(8), borderBottomWidth: 0.5, borderBottomColor: SC, justifyContent: 'center', paddingHorizontal: 3 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>PRODUTO</Text>
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 1 }}>GFV {potenciaTotal} kWp</Text>
            </View>
            {([['DATA', dataDoc], ['ESCALA', 'S/ ESCALA'], ['TAMANHO', 'A4'], ['FOLHA', '1/1'], ['REVISÃO', 'R0']] as const).map(([lbl, val], i, arr) => (
              <View key={lbl} style={{ height: mm(5.54), borderBottomWidth: i < arr.length - 1 ? 0.35 : 0, borderBottomColor: SC, justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 5.6, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>{lbl}</Text>
                <Text style={{ fontSize: 6.2, textAlign: 'center' }}>{val}</Text>
              </View>
            ))}
          </View>

          {/* Coluna 2: Título + Proprietário e Obra + Responsável Técnico */}
          <View style={{ width: mm(150), borderRightWidth: 0.5, borderRightColor: SC }}>
            <View style={{ height: mm(8), borderBottomWidth: 0.5, borderBottomColor: SC, justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a', textAlign: 'center' }}>TÍTULO</Text>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>DIAGRAMA DE BLOCOS</Text>
            </View>
            <View style={{ height: mm(14.7), borderBottomWidth: 0.35, borderBottomColor: SC, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>Proprietário e Obra:</Text>
              <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 2 }}>Nome: {owner}</Text>
              <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 1.6 }}>Endereço: {endereco}</Text>
              <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 1.6 }}>Cidade: {uf ? `${cidade} - ${uf}` : cidade}</Text>
              <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 1.6 }}>CEP: {cep}</Text>
            </View>
            <View style={{ height: mm(13), justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>Responsável Técnico:</Text>
              <Text style={{ fontSize: 7.3, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>{respNome}</Text>
              <Text style={{ fontSize: 6.2, textAlign: 'center', marginTop: 1.6 }}>TÉCNICO EM ELETROTÉCNICA</Text>
              <Text style={{ fontSize: 6.2, textAlign: 'center', marginTop: 1.6 }}>CFT: {respCft}</Text>
            </View>
          </View>

          {/* Coluna 3: Logo da empresa */}
          <View style={{ width: mm(57), alignItems: 'center', justifyContent: 'center', padding: 3 }}>
            {pd?.logo_empresa_url
              ? <Image src={pd.logo_empresa_url} style={{ width: '100%', maxHeight: mm(27), objectFit: 'contain' }} />
              : null}
          </View>
        </View>
        </View>
      </Page>
    </Document>
  );
}
