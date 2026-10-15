import { Document, Page, View, Text, Image, Svg, Polygon, Path, Circle, G } from '@react-pdf/renderer';

// ── Gerador de PDF da Planta de Situação (A3 paisagem) via @react-pdf/renderer
// — mesma tecnologia já usada no Diagrama Unifilar, Diagrama de Blocos e
// Padrão de Entrada (PDF vetorial nativo, sem passar por screenshot do
// navegador). Substitui a geração anterior via html2canvas/jsPDF, que tinha
// bordas do selo sumindo no PDF final (limitação conhecida do html2canvas com
// `transform: scale()` combinado com bordas aninhadas — o mesmo motivo pelo
// qual o selo "2x + scale(0.5)" existia na versão html2canvas). A
// pré-visualização interativa (arrastar polígono/tarjas, zoom, salvar)
// continua exatamente como está, em HTML — só a geração do PDF final muda.

interface PolygonConfig {
  points: Array<{ x: number; y: number }>;
  color: string;
  thickness: number;
  rotation?: number;
}
interface PlantaConfig {
  polygon?: PolygonConfig | null;
  labelPos?: { x: number; y: number; rotation?: number };
  infoPos?: { x: number; y: number; rotation?: number };
  mapZoom?: number;
}
interface PlantaSituacaoA4PDFProps {
  projectData?: Record<string, any>;
}

// ─── UTM → WGS84 (mesma lógica da pré-visualização) ────────────────────────
function utmToLatLng(easting: number, northing: number, zone: number): { lat: number; lng: number } | null {
  try {
    const k0 = 0.9996, a = 6378137.0, e2 = 0.00669437999014;
    const x = easting - 500000.0;
    const y = northing - 10000000.0;
    const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
    const ei = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const mu = (y / k0) / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
    const phi1 = mu
      + ((3 * ei) / 2 - (27 * Math.pow(ei, 3)) / 32) * Math.sin(2 * mu)
      + ((21 * ei * ei) / 16 - (55 * Math.pow(ei, 4)) / 32) * Math.sin(4 * mu)
      + ((151 * Math.pow(ei, 3)) / 96) * Math.sin(6 * mu)
      + ((1097 * Math.pow(ei, 4)) / 512) * Math.sin(8 * mu);
    const sinP = Math.sin(phi1), tanP = Math.tan(phi1), cosP = Math.cos(phi1);
    const N1 = a / Math.sqrt(1 - e2 * sinP * sinP);
    const T1 = tanP * tanP, C1 = (e2 / (1 - e2)) * cosP * cosP;
    const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinP * sinP, 1.5);
    const D = x / (N1 * k0);
    const lat = phi1 - (N1 * tanP / R1) * (
      D * D / 2
      - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * Math.pow(D, 4)) / 24
      + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * Math.pow(D, 6)) / 720);
    const lon = lon0 + (D - ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * Math.pow(D, 5)) / 120) / cosP;
    return { lat: lat * (180 / Math.PI), lng: lon * (180 / Math.PI) };
  } catch { return null; }
}

function lngToUtmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

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

const PT_PER_MM = 72 / 25.4;
const mm = (v: number) => v * PT_PER_MM;
const SC = '#161513';
// Folha A3 paisagem — mesma moldura/selo já usados no Padrão de Entrada e no
// Diagrama Unifilar A2/A1 (selo na metade direita da folha, 192,5x35,7mm).
const FRAME = { x: 25, y: 10, w: 385, h: 277 };
const SELO = { x: 217.5, y: 251.3, w: 192.5, h: 35.7 };
// Área do mapa — quadrada (165x165mm), centralizada na área de conteúdo do
// quadro, mesma posição já ajustada na pré-visualização.
const MAP = { x: 135, y: 48.15, w: 165, h: 165 };

export function PlantaSituacaoA4PDF({ projectData }: PlantaSituacaoA4PDFProps) {
  const pd = projectData || {};

  // ── Config salva (polígono/tarjas/zoom) — mesmos padrões da pré-visualização ──
  let polygon: PolygonConfig | null = null;
  let labelPos = { x: 50, y: 80, rotation: 0 };
  let infoPos = { x: 32, y: 50, rotation: 0 };
  let mapZoom = 19;
  try {
    if (pd.planta_situacao_config) {
      const cfg: PlantaConfig = JSON.parse(String(pd.planta_situacao_config));
      if (cfg.polygon) polygon = cfg.polygon;
      if (cfg.labelPos) labelPos = { x: cfg.labelPos.x, y: cfg.labelPos.y, rotation: cfg.labelPos.rotation || 0 };
      if (cfg.infoPos) infoPos = { x: cfg.infoPos.x, y: cfg.infoPos.y, rotation: cfg.infoPos.rotation || 0 };
      if (cfg.mapZoom) mapZoom = cfg.mapZoom;
    }
  } catch { /* config inválida — usa os padrões */ }

  // ── Dados do projeto (mesma lógica da pré-visualização) ──
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const utmX = parseFloat(String(pd.coord_utm_x || '').replace(',', '.')) || null;
  const utmY = parseFloat(String(pd.coord_utm_y || '').replace(',', '.')) || null;
  const utmFusoRaw = String(pd.coord_utm_fuso || '');
  const utmZone = parseInt(utmFusoRaw) || 22;

  const latDecimal = parseFloat(String(pd.latitude || '').replace(',', '.')) || null;
  const lngDecimal = parseFloat(String(pd.longitude || '').replace(',', '.')) || null;

  const hasUtm = !!(utmX && utmY);
  const usingLatLng = !hasUtm && !!(latDecimal && lngDecimal);
  const latLngUtmZone = usingLatLng ? lngToUtmZone(lngDecimal as number) : null;
  const coords = hasUtm
    ? utmToLatLng(utmX, utmY, utmZone)
    : (usingLatLng ? { lat: latDecimal, lng: lngDecimal } : null);
  const mapImageUrl = mapboxToken && coords
    ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${coords.lng.toFixed(6)},${coords.lat.toFixed(6)},${mapZoom},0/800x520@2x?access_token=${mapboxToken}`
    : null;

  const clientName = String(pd.nomeClienteFinal || '');
  const address    = String(pd.endereco_local || '');
  const uc         = String(pd.conta_contrato || pd.numero_uc || '');
  const respNome   = String(pd.responsavel_nome || '');
  const respCft    = String(pd.responsavel_registro || '');
  const cidade     = String(pd.client_city || '');
  const estado     = String(pd.client_state || '');
  const cep        = String(pd.cliente_cep || '');
  const potencia   = String(pd.potencia || '');
  const logoUrl    = String(pd.logo_empresa_url || '');
  const dataDoc    = pd.data_documento
    ? formatDataBR(String(pd.data_documento))
    : (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })();
  const hasCoords = !!((utmX && utmY) || (latDecimal && lngDecimal));

  const polyCX = polygon ? polygon.points.reduce((s, p) => s + p.x, 0) / polygon.points.length : 50;
  const polyCY = polygon ? polygon.points.reduce((s, p) => s + p.y, 0) / polygon.points.length : 50;
  const polyRotation = polygon?.rotation || 0;

  return (
    <Document>
      <Page size="A3" orientation="landscape" style={{ backgroundColor: '#FFFFFF' }}>
        <View style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* borda de corte */}
          <View style={{ position: 'absolute', left: mm(0.5), top: mm(0.5), width: mm(419), height: mm(296), borderWidth: 0.75, borderColor: SC }} />
          {/* quadro NBR 10068 (margem esq. 25mm p/ encadernação) */}
          <View style={{ position: 'absolute', left: mm(FRAME.x), top: mm(FRAME.y), width: mm(FRAME.w), height: mm(FRAME.h), borderWidth: 0.75, borderColor: SC }} />
          {/* marcas de centragem */}
          <View style={{ position: 'absolute', left: mm(217.5), top: mm(0.5), width: 0.75, height: mm(9.5), backgroundColor: SC }} />
          <View style={{ position: 'absolute', left: mm(217.5), top: mm(287), width: 0.75, height: mm(9.5), backgroundColor: SC }} />
          <View style={{ position: 'absolute', left: mm(0.5), top: mm(148.5), width: mm(24.5), height: 0.75, backgroundColor: SC }} />
          <View style={{ position: 'absolute', left: mm(410), top: mm(148.5), width: mm(9.5), height: 0.75, backgroundColor: SC }} />

          {/* ═══ Área do mapa ═══ */}
          <View style={{ position: 'absolute', left: mm(MAP.x), top: mm(MAP.y), width: mm(MAP.w), height: mm(MAP.h), borderWidth: 0.75, borderColor: '#333333', overflow: 'hidden', backgroundColor: '#c8d8c8' }}>
            {mapImageUrl && (
              <Image src={mapImageUrl} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            )}

            {/* Seta Norte — canto superior direito */}
            <View style={{ position: 'absolute', top: mm(2.5), right: mm(2.5), backgroundColor: 'rgba(255,255,255,0.93)', borderWidth: 0.5, borderColor: '#333333', borderRadius: 2, paddingHorizontal: mm(1.8), paddingVertical: mm(1.2), alignItems: 'center' }}>
              <Svg width={mm(3.3)} height={mm(4.2)} viewBox="0 0 14 18">
                <Polygon points="7,0 2,9 5,7 5,18 9,18 9,7 12,9" fill="#cc0000" />
              </Svg>
              <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', marginTop: 1 }}>N</Text>
            </View>

            {/* PIN estilo Google Maps — centralizado no mapa, ponta apontando pro ponto */}
            <View style={{ position: 'absolute', top: '50%', left: '50%', width: mm(5.5), height: mm(7.3), marginLeft: -mm(2.75), marginTop: -mm(7.3) }}>
              <Svg width={mm(5.5)} height={mm(7.3)} viewBox="0 0 24 32">
                <Path d="M12 1C6.5 1 2 5.5 2 11c0 7 10 20 10 20s10-13 10-20C22 5.5 17.5 1 12 1z" fill="#e53e3e" stroke="#ffffff" strokeWidth={1.2} />
                <Circle cx={12} cy={11} r={4.5} fill="#ffffff" />
              </Svg>
            </View>

            {/* Tag identificação (cliente/UC/coords) */}
            {(hasCoords || clientName || uc) && (
              <View style={{ position: 'absolute', left: `${infoPos.x}%`, top: `${infoPos.y}%`, transform: `translate(-50%, -50%) rotate(${infoPos.rotation}deg)`, backgroundColor: 'rgba(255,255,255,0.93)', borderWidth: 0.5, borderColor: '#333333', borderRadius: 1.2, paddingHorizontal: mm(2), paddingVertical: mm(1.2) }}>
                {clientName && <Text style={{ fontSize: 6.5 }}>Cliente: {clientName}</Text>}
                {uc && <Text style={{ fontSize: 6.5, marginTop: 0.6 }}>UC: {uc}</Text>}
                {hasCoords && (usingLatLng ? (
                  <>
                    <Text style={{ fontSize: 6.5, marginTop: 0.6 }}>Lat: {latDecimal?.toFixed(6)}</Text>
                    <Text style={{ fontSize: 6.5, marginTop: 0.6 }}>Long: {lngDecimal?.toFixed(6)}</Text>
                    <Text style={{ fontSize: 6.5, marginTop: 0.6 }}>Fuso: {latLngUtmZone}</Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 6.5, marginTop: 0.6 }}>X: {utmX?.toFixed(0)} | Y: {utmY?.toFixed(0)}</Text>
                    <Text style={{ fontSize: 6.5, marginTop: 0.6 }}>Fuso: {utmFusoRaw || utmZone}</Text>
                  </>
                ))}
              </View>
            )}

            {/* Polígono da propriedade */}
            {polygon && (
              <Svg style={{ position: 'absolute', top: 0, left: 0 }} width={mm(MAP.w)} height={mm(MAP.h)} viewBox="0 0 100 100" preserveAspectRatio="none">
                <G transform={`rotate(${polyRotation}, ${polyCX}, ${polyCY})`}>
                  <Polygon
                    points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={polygon.color + '15'}
                    stroke={polygon.color}
                    strokeWidth={polygon.thickness}
                  />
                </G>
              </Svg>
            )}

            {/* Tarja de endereço */}
            {address && (
              <View style={{ position: 'absolute', left: `${labelPos.x}%`, top: `${labelPos.y}%`, transform: `translate(-50%, -50%) rotate(${labelPos.rotation}deg)`, backgroundColor: 'rgba(255,255,255,0.93)', borderWidth: 0.5, borderColor: '#333333', borderRadius: 1, paddingHorizontal: mm(2.5), paddingVertical: mm(1.2) }}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>{address}</Text>
              </View>
            )}
          </View>

          {/* ═══ SELO — mesma convenção do Padrão de Entrada/Diagrama Unifilar
              em paisagem (selo na metade direita da folha, 192,5x35,7mm),
              desenhado como vetor nativo (sem o hack de 2x + scale(0.5) usado
              na versão html2canvas — react-pdf não tem o bug de fonte mínima
              que motivou essa técnica). ═══ */}
          <View style={{ position: 'absolute', left: mm(SELO.x), top: mm(SELO.y), width: mm(SELO.w), height: mm(SELO.h), borderWidth: 0.75, borderColor: SC, flexDirection: 'row' }}>
            {/* Coluna 1: Produto / Data / Escala / Tamanho / Folha / Revisão */}
            <View style={{ width: mm(SELO.w * 36 / 175), borderRightWidth: 0.5, borderRightColor: SC }}>
              <View style={{ height: mm(8), borderBottomWidth: 0.5, borderBottomColor: SC, justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>PRODUTO</Text>
                <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 1 }}>GFV {potencia ? `${potencia} kWp` : '___'}</Text>
              </View>
              {([['DATA', dataDoc], ['ESCALA', 'S/ ESCALA'], ['TAMANHO', 'A3'], ['FOLHA', '1/1'], ['REVISÃO', 'R0']] as const).map(([lbl, val], i, arr) => (
                <View key={lbl} style={{ height: mm(5.54), borderBottomWidth: i < arr.length - 1 ? 0.35 : 0, borderBottomColor: SC, justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ fontSize: 5.6, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>{lbl}</Text>
                  <Text style={{ fontSize: 6.2, textAlign: 'center' }}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Coluna 2: Título + Proprietário e Obra + Responsável Técnico */}
            <View style={{ width: mm(SELO.w * 100 / 175), borderRightWidth: 0.5, borderRightColor: SC }}>
              <View style={{ height: mm(8), borderBottomWidth: 0.5, borderBottomColor: SC, justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a', textAlign: 'center' }}>TÍTULO</Text>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>PLANTA DE SITUAÇÃO</Text>
              </View>
              <View style={{ height: mm(14.7), borderBottomWidth: 0.35, borderBottomColor: SC, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>Proprietário e Obra:</Text>
                <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 2 }}>Nome: {clientName || '___'}</Text>
                <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 1.6 }}>Endereço: {address || '___'}</Text>
                <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 1.6 }}>Cidade: {estado ? `${cidade} - ${estado}` : (cidade || '___')}</Text>
                <Text style={{ fontSize: 6.8, textAlign: 'center', marginTop: 1.6 }}>CEP: {cep || '___'}</Text>
              </View>
              <View style={{ height: mm(13), justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: '#5a5a5a' }}>Responsável Técnico:</Text>
                <Text style={{ fontSize: 7.3, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginTop: 2 }}>{respNome || '___'}</Text>
                <Text style={{ fontSize: 6.2, textAlign: 'center', marginTop: 1.6 }}>TÉCNICO EM ELETROTÉCNICA</Text>
                <Text style={{ fontSize: 6.2, textAlign: 'center', marginTop: 1.6 }}>CFT: {respCft || '___'}</Text>
              </View>
            </View>

            {/* Coluna 3: Logo da empresa */}
            <View style={{ width: mm(SELO.w * 39 / 175), alignItems: 'center', justifyContent: 'center', padding: 3 }}>
              {logoUrl
                ? <Image src={logoUrl} style={{ width: '100%', maxHeight: mm(27), objectFit: 'contain' }} />
                : null}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
