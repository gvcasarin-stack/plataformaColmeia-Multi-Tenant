import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { getAllModulos, getAllInversores, getTotalKwpFromModulos, getTotalInversorKw, fmtBR } from '@/lib/utils/equipmentParser';

interface FormularioRegistroANEELPDFProps {
  projectData?: Record<string, any>;
}

function imgUrl(path: string) {
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

// Mesma conversão grau decimal -> Grau/Minuto/Segundo do Preview.
function toDMS(raw: string, kind: 'lat' | 'lon'): string {
  const n = parseFloat(String(raw || '').replace(',', '.'));
  if (!raw || isNaN(n)) return '';
  const abs = Math.abs(n);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  const dir = kind === 'lat' ? (n < 0 ? 'S' : 'N') : (n < 0 ? 'W' : 'L');
  return `${deg}°${String(min).padStart(2, '0')}'${sec}"${dir}`;
}

// UTM (hemisfério sul) -> WGS84, mesma fórmula já usada na Planta de Situação.
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

// Deriva lat/long a partir do UTM (Fuso/X/Y) já preenchido no Padrão de
// Entrada — evita pedir a coordenada duas vezes pro usuário. Mantém
// fallback para projetos antigos que já tinham latitude/longitude
// preenchidos manualmente.
function deriveLatLng(get: (key: string) => string): { lat: string; lng: string } {
  const zoneMatch = String(get('coord_utm_fuso')).match(/\d+/);
  const zone = zoneMatch ? parseInt(zoneMatch[0], 10) : NaN;
  const x = parseFloat(String(get('coord_utm_x')).replace(',', '.'));
  const y = parseFloat(String(get('coord_utm_y')).replace(',', '.'));
  if (zone && !isNaN(x) && !isNaN(y)) {
    const converted = utmToLatLng(x, y, zone);
    if (converted) return { lat: String(converted.lat), lng: String(converted.lng) };
  }
  // Sem UTM válido pra converter — deixa em branco. Não usa mais o
  // fallback antigo (campos latitude/longitude manuais), que podia conter
  // dado obsoleto/incorreto e ser formatado como GMS por engano.
  return { lat: '', lng: '' };
}

const MODALIDADE_LABEL: Record<string, string> = {
  'Autoconsumo Local': 'Geração na própria UC',
  'Autoconsumo Remoto': 'Autoconsumo remoto',
  'Geração Compartilhada': 'Geração compartilhada',
};

const B = 0.75;
const BC = '#000000';

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, backgroundColor: '#FFFFFF', padding: 24, color: '#000000' },
  header: { width: '100%', height: 'auto', marginBottom: 10 },
  frame: { borderWidth: B, borderColor: BC },
  row: { flexDirection: 'row' },
  lbl: { width: '40%', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: 5, borderRightWidth: B, borderBottomWidth: B, borderColor: BC },
  val: { width: '60%', fontSize: 9, padding: 5, borderRightWidth: 0, borderBottomWidth: B, borderColor: BC },
  valEmpty: { width: '60%', fontSize: 9, padding: 5, color: '#8a8a8a', borderRightWidth: 0, borderBottomWidth: B, borderColor: BC },
  title: { width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 9.5, padding: '10 24', borderBottomWidth: B, borderColor: BC },
  bar: { width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: 5, borderBottomWidth: B, borderColor: BC },
  subhead: { width: '100%', textAlign: 'center', fontFamily: 'Helvetica-Bold', fontSize: 9, padding: '7 24', borderBottomWidth: B, borderColor: BC },
  pair: { flexDirection: 'row', alignItems: 'baseline' },
  lbl2: { fontFamily: 'Helvetica-Bold', marginLeft: 16 },
});

function Row({ label, value, empty }: { label: string; value: string; empty?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.lbl}>{label}</Text>
      <Text style={empty ? s.valEmpty : s.val}>{value}</Text>
    </View>
  );
}

export function FormularioRegistroANEELPDF({ projectData = {} }: FormularioRegistroANEELPDFProps) {
  const get = (key: string) => projectData[key] || '';

  const modulosList = getAllModulos(projectData);
  const inversoresList = getAllInversores(projectData);
  const areaTotalArranjos = modulosList.reduce((acc, m) => {
    const areaUnit = parseFloat(String(m.area_unitaria_m2 || '0').replace(',', '.')) || 0;
    const qty = parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0;
    return acc + areaUnit * qty;
  }, 0);
  const qtdModulos = modulosList.reduce((a, m) => a + (parseFloat(String(m.quantidade || '0').replace(',', '.')) || 0), 0);

  const modalidade = MODALIDADE_LABEL[String(get('modalidade_compensacao'))] || 'Geração na própria UC';
  const beneficiarias = Array.isArray(projectData?.rateio_beneficiarias) ? projectData.rateio_beneficiarias : [];
  const qtdUcsCreditos = get('modalidade_compensacao') === 'Autoconsumo Local' || !get('modalidade_compensacao')
    ? 1
    : 1 + beneficiarias.length;

  const municipio = [get('client_city'), get('client_state')].filter(Boolean).join(' - ');
  const endereco = [get('endereco_local'), get('numero_endereco_cliente')].filter(Boolean).join(', ');
  const dataOperacao = get('data_inicio_operacao');
  const { lat: latDerivada, lng: lngDerivada } = deriveLatLng(get);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Image src={imgUrl('/images/cabecalho-aneel.png')} style={s.header} />

        <View style={s.frame}>
          <Text style={s.title}>Dados que deverão ser encaminhados à Distribuidora para registro da unidade consumidora no sistema de compensação de energia regido pela REN 482, de 17 de abril de 2012</Text>

          <Text style={s.bar}>CENTRAL GERADORA SOLAR FOTOVOLTAICA:</Text>
          <Row label="Modalidade:" value={modalidade} />
          <Row label="Quantidade de UCs que recebem os créditos:" value={String(qtdUcsCreditos)} />
          <View style={s.row}>
            <Text style={s.lbl}>Classe:</Text>
            <View style={[s.val, s.pair]}>
              <Text>{get('classe_uc')}</Text>
              <Text style={s.lbl2}>Subgrupo:</Text>
              <Text style={{ marginLeft: 6 }}>B1</Text>
            </View>
          </View>
          <Row label="Município/UF da UC com GD:" value={municipio} />
          <Row label="Endereço da UC com GD:" value={endereco} />
          <Row label="CEP da UC com GD:" value={get('cliente_cep')} />

          <Text style={s.subhead}>Coordenadas Geodésicas (SIRGAS2000) da localização da usina em Grau, Minuto e Segundo:</Text>
          <Row label="Latitude:" value={toDMS(latDerivada, 'lat')} />
          <Row label="Longitude:" value={toDMS(lngDerivada, 'lon')} />

          <Text style={s.bar}>TITULAR:</Text>
          <Row label="CPF/CNPJ do Titular:" value={get('cpf_cnpj_cliente_final')} />
          <Row label="Nome do Titular da UC com GD:" value={get('nomeClienteFinal')} />
          <Row label="Telefone do Titular (DDD + número):" value={get('cliente_celular') || get('cliente_telefone_fixo')} />
          <Row label="E-mail do Titular:" value={get('cliente_email')} />

          <Text style={s.subhead}>Dados do titular para correspondência:</Text>
          <Row label="Município:" value={municipio} />
          <Row label="Endereço:" value={endereco} />
          <Row label="CEP:" value={get('cliente_cep')} />

          <Text style={s.bar}>DADOS DA CENTRAL GERADORA:</Text>
          <Row label="Potência Total dos Módulos (kW):" value={`${fmtBR(getTotalKwpFromModulos(projectData))} kWp`} />
          <Row label="Quantidade de Módulos:" value={qtdModulos ? String(qtdModulos) : ''} />
          <Row label="Fabricante(s) dos Módulos:" value={modulosList[0]?.fabricante || ''} />
          <Row label="Modelo(s) dos Módulos:" value={modulosList[0]?.modelo || ''} />
          <Row label="Potência Total dos Inversores (kW):" value={`${fmtBR(getTotalInversorKw(projectData))} kW`} />
          <Row label="Fabricante(s) dos Inversores:" value={inversoresList[0]?.fabricante || ''} />
          <Row label="Modelo(s) dos Inversores:" value={inversoresList[0]?.modelo || ''} />
          <Row label="Área Total dos Arranjos (m²):" value={areaTotalArranjos ? `${fmtBR(areaTotalArranjos)} m²` : ''} />
          <Row label="Data da implantação da unidade geradora:" value={dataOperacao} />
          <Row label="Data da conexão da unidade geradora na Distribuidora:" value={dataOperacao} />

          <Text style={s.subhead}>Preencha os próximos dados somente se a usina possuir Outorga ou Registro.{'\n'}Se não aplicável, mantenha os campos vazios:</Text>
          <Row label="CEG do empreendimento - GGG.FF.UF.999999-9.VV:" value="" empty />
          <Row label="Nome da Usina:" value="" empty />
          <Row label="Tipo do Ato de Outorga ou Registro:" value="" empty />
          <Row label="Número do Ato de Outorga ou Registro:" value="" empty />
          <Row label="Ano do Ato de Outorga ou Registro:" value="" empty />
        </View>
      </Page>
    </Document>
  );
}
