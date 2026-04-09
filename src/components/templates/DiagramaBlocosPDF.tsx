import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
    width: '20%',
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
  sealSubRowLast: { height: 26, padding: 1, flexDirection: 'column', justifyContent: 'space-between' },
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
  sealRight: { width: '15%', height: 120, alignItems: 'center', justifyContent: 'center', padding: 4 },
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
        {/* 1. Módulos */}
        <View style={s.box}>
          <Text style={s.boldLine}>{modulosQtd > 0 ? modulosQtd : '___'} Módulos Fotovoltaicos</Text>
          <Text style={s.normalLine}>de {modulosWp > 0 ? modulosWp : '___'} Wp cada</Text>
          {stringsLine && <Text style={s.normalLine}>{stringsLine}</Text>}
          <Text style={s.normalLine}>Potência total: {potenciaTotal} kWp</Text>
        </View>

        <View style={s.vLine} />

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

        {/* 4. QGBT centralizado + Unidade Consumidora à direita */}
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
            <Text style={s.sealLogoText}>[Logo]</Text>
          </View>

        </View>
      </Page>
    </Document>
  );
}
