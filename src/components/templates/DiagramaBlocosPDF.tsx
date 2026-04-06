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

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>DIAGRAMA UNIFILAR DE BLOCOS</Text>

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
      </Page>
    </Document>
  );
}
