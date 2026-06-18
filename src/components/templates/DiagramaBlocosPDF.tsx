import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { getTotalKwp, getTotalModulosQtd, getAllModulos, getAllInversores, parseStringsModulos } from '@/lib/utils/equipmentParser';

interface DiagramaBlocosPDFProps {
  projectData?: Record<string, any>;
}

const BC = '#000000';
const BOX_W = 165;

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 60,
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 20,
    color: BC,
  },
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
  // ── Seal — alturas fixas para garantir layout correto no react-pdf ──
  sealOuter: {
    flexDirection: 'row',
    borderWidth: 1.2,
    borderColor: BC,
    marginTop: 48,
    width: '100%',
    height: 120,
    overflow: 'hidden',
  },
  sealLeft: {
    width: '28%',
    height: 120,
    borderRightWidth: 0.8,
    borderRightColor: BC,
    flexDirection: 'column',
  },
  sealProduto: {
    height: 30,
    borderBottomWidth: 0.7,
    borderBottomColor: BC,
    padding: 2,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  sealProdutoLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5.5 },
  sealProdutoValue: { fontFamily: 'Helvetica-Bold', fontSize: 9, textAlign: 'center', marginTop: 1 },
  sealSubcols: { flexDirection: 'row', height: 90 },
  sealSubLeft: { flex: 1, borderRightWidth: 0.6, borderRightColor: BC, flexDirection: 'column' },
  sealSubRow: { height: 16, padding: 1, flexDirection: 'column', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: BC },
  sealSubRowLast: { height: 26, padding: 1, flexDirection: 'column', justifyContent: 'center', gap: 2 },
  sealSubLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5 },
  sealSubValue: { fontSize: 5.5, textAlign: 'center' },
  sealRcol: { width: '28%', flexDirection: 'column' },
  sealRrow: { height: 16, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 0.5, borderBottomColor: BC },
  sealRrowLast: { height: 26, alignItems: 'center', justifyContent: 'center' },
  sealMid: { flex: 1, height: 120, borderRightWidth: 0.8, borderRightColor: BC, flexDirection: 'column' },
  sealTitleBlock: { height: 30, borderBottomWidth: 0.7, borderBottomColor: BC, padding: 2, alignItems: 'center', justifyContent: 'center' },
  sealTitleLabel: { fontFamily: 'Helvetica-Bold', fontSize: 5.5, alignSelf: 'flex-start' },
  sealTitleValue: { fontFamily: 'Helvetica-Bold', fontSize: 11, textAlign: 'center' },
  sealOwner: { height: 48, padding: 2, alignItems: 'center', justifyContent: 'space-evenly', borderBottomWidth: 0.5, borderBottomColor: BC },
  sealResp: { height: 42, padding: 2, alignItems: 'center', justifyContent: 'space-evenly' },
  sealOwnerBold: { fontFamily: 'Helvetica-Bold', fontSize: 5.5 },
  sealOwnerNormal: { fontSize: 6, textAlign: 'center' },
  sealRespBold: { fontFamily: 'Helvetica-Bold', fontSize: 6, textAlign: 'center' },
  sealRespNormal: { fontSize: 5.5, textAlign: 'center' },
  sealRight: { width: '20%', height: 120, alignItems: 'center', justifyContent: 'center', padding: 4 },
  sealLogoText: { fontSize: 6, color: '#999999' },
});

function fmt2(val: string | number | undefined): string {
  if (!val && val !== 0) return '___';
  const n = parseFloat(String(val).replace(',', '.'));
  if (isNaN(n) || n === 0) return '___';
  return n.toFixed(2).replace('.', ',');
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
  const dataDoc  = String(pd?.data_documento      || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {numInversores === 1 ? (
          <>
            {/* 1. Módulos */}
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
                return (
                  <View key={i} style={{ width: pdfColW, alignItems: 'center' }}>
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
                return (
                  <View key={i} style={{ width: pdfColW, alignItems: 'center' }}>
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

        {/* ═══ SELO ═══ */}
        <View style={s.sealOuter}>

          {/* LEFT COLUMN */}
          <View style={s.sealLeft}>
            <View style={s.sealProduto}>
              <Text style={s.sealProdutoLabel}>PRODUTO</Text>
              <Text style={s.sealProdutoValue}>GFV {potenciaTotal} kWp</Text>
            </View>
            <View style={s.sealSubcols}>
              <View style={s.sealSubLeft}>
                <View style={s.sealSubRow}><Text style={s.sealSubLabel}>DATA</Text><Text style={s.sealSubValue}>{dataDoc}</Text></View>
                <View style={s.sealSubRow}><Text style={s.sealSubLabel}>ESCALA</Text><Text style={s.sealSubValue}>S/ ESCALA</Text></View>
                <View style={s.sealSubRow}><Text style={s.sealSubLabel}>TAMANHO</Text><Text style={s.sealSubValue}>A3</Text></View>
                <View style={s.sealSubRow}><Text style={s.sealSubLabel}>FOLHA</Text><Text style={s.sealSubValue}>1/1</Text></View>
                <View style={s.sealSubRowLast}><Text style={s.sealSubLabel}>REVISAO</Text><Text style={s.sealSubValue}>R0</Text></View>
              </View>
              <View style={s.sealRcol}>
                <View style={s.sealRrow}><Text style={s.sealSubValue}>R1:</Text></View>
                <View style={s.sealRrow}><Text style={s.sealSubValue}>R2:</Text></View>
                <View style={s.sealRrow}><Text style={s.sealSubValue}>R3:</Text></View>
                <View style={s.sealRrow}><Text style={s.sealSubValue}>R4:</Text></View>
                <View style={s.sealRrowLast}><Text style={s.sealSubValue}>R5:</Text></View>
              </View>
            </View>
          </View>

          {/* MIDDLE COLUMN */}
          <View style={s.sealMid}>
            <View style={s.sealTitleBlock}>
              <Text style={s.sealTitleLabel}>TITULO</Text>
              <Text style={s.sealTitleValue}>DIAGRAMA DE BLOCOS</Text>
            </View>
            <View style={s.sealOwner}>
              <Text style={s.sealOwnerBold}>Proprietario e Obra:</Text>
              <Text style={s.sealOwnerNormal}>{`Nome: ${owner}`}</Text>
              <Text style={s.sealOwnerNormal}>{`Endereco: ${endereco}`}</Text>
              <Text style={s.sealOwnerNormal}>{`Cidade: ${uf ? `${cidade} - ${uf}` : cidade}`}</Text>
              <Text style={s.sealOwnerNormal}>{`CEP: ${cep}`}</Text>
            </View>
            <View style={s.sealResp}>
              <Text style={s.sealOwnerBold}>Responsavel Tecnico:</Text>
              <Text style={s.sealRespBold}>{respNome}</Text>
              <Text style={s.sealRespNormal}>TECNICO EM ELETROTECNICA</Text>
              <Text style={s.sealRespNormal}>{`CFT: ${respCft}`}</Text>
            </View>
          </View>

          {/* RIGHT COLUMN */}
          <View style={s.sealRight}>
            {pd?.logo_empresa_url
              ? <Image src={pd.logo_empresa_url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : null}
          </View>

        </View>
      </Page>
    </Document>
  );
}
