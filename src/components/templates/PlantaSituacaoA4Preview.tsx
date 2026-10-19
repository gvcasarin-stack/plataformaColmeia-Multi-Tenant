'use client';

import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, MapPin, AlertCircle, Square, Trash2, Save, Check, ChevronRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface PolygonConfig {
  points: Array<{ x: number; y: number }>;
  color: string;
  thickness: number;
  rotation?: number;
  fillStyle?: 'none' | 'solid' | 'hatched';
  hatchColor?: string;
  hatchType?: 'diagonal' | 'cross' | 'horizontal';
}

// Gera linhas de hachura cobrindo a caixa delimitadora dos pontos do
// polígono (espaço local 0-100, antes da rotação), no ângulo pedido —
// mesma lógica usada no PDF, pra pré-visualização e PDF final baterem.
function buildHatchLines(points: Array<{ x: number; y: number }>, angleDeg: number, spacing: number): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const half = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2) / 2 + spacing;
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const px = -dy, py = dx;
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let o = -half; o <= half; o += spacing) {
    const bx = cx + px * o, by = cy + py * o;
    lines.push({ x1: bx - dx * half, y1: by - dy * half, x2: bx + dx * half, y2: by + dy * half });
  }
  return lines;
}

function hatchLinesFor(polygon: PolygonConfig): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const spacing = 3;
  if (polygon.hatchType === 'cross') {
    return [...buildHatchLines(polygon.points, 45, spacing), ...buildHatchLines(polygon.points, -45, spacing)];
  }
  if (polygon.hatchType === 'horizontal') return buildHatchLines(polygon.points, 0, spacing);
  return buildHatchLines(polygon.points, 45, spacing);
}
interface EquipMarkerConfig {
  x: number;
  y: number;
  color: string;
  size: 'P' | 'M' | 'G';
  tagX: number;
  tagY: number;
  tagRotation?: number;
}
interface PlantaConfig {
  polygon?: PolygonConfig | null;
  labelPos?: { x: number; y: number; rotation?: number };
  infoPos?: { x: number; y: number; rotation?: number };
  mapZoom?: number;
  equipMarker?: EquipMarkerConfig | null;
  entradaMarker?: EquipMarkerConfig | null;
}
interface PlantaSituacaoA4PreviewProps {
  projectData?: Record<string, any>;
  onSaveConfig?: (config: PlantaConfig) => Promise<void>;
  // Elemento DOM (fora da área com rolagem da prancha) onde a barra de
  // ferramentas deve ser renderizada via portal, pra não "roubar" altura da
  // pré-visualização. Se não for passado, a barra renderiza no lugar de
  // sempre (acima da prancha), sem quebrar nada.
  toolbarPortalTarget?: HTMLElement | null;
}

// ─── UTM → WGS84 ────────────────────────────────────────────────────────────
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

// ─── Longitude → Fuso UTM (para exibição quando as coordenadas vêm em Lat/Long, ex: CPFL) ──
function lngToUtmZone(lng: number): number {
  return Math.floor((lng + 180) / 6) + 1;
}

// ─── Cores e espessuras disponíveis ─────────────────────────────────────────
const COLORS = ['#e53e3e', '#3182ce', '#38a169', '#1a1a1a', '#dd6b20'];
const THICKNESS_OPTIONS = [1.5, 2.5, 3.5, 5];

// Tamanhos da bolinha de equipamento — px pra pré-visualização (HTML), mm
// pro PDF (mesma proporção já usada no pin do mapa: ~4.35px por mm).
const EQUIP_SIZES: Record<'P' | 'M' | 'G', { px: number; mm: number; label: string }> = {
  P: { px: 10, mm: 2.3, label: 'P' },
  M: { px: 16, mm: 3.7, label: 'M' },
  G: { px: 24, mm: 5.5, label: 'G' },
};

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Normaliza a data (já em DD/MM/AAAA, ou por extenso "DD de mês de AAAA", como
// data_documento é salvo) para DD/MM/AAAA — formato exigido no selo da prancha.
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

export function PlantaSituacaoA4Preview({ projectData, onSaveConfig, toolbarPortalTarget }: PlantaSituacaoA4PreviewProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'view' | 'draw'>('view');
  const [configOpen, setConfigOpen] = useState(true);

  // Polígono — pontos clicados, arrastável + rotacionável
  const [polygon, setPolygon] = useState<PolygonConfig | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [polyColor, setPolyColor] = useState('#e53e3e');
  const [polyThickness, setPolyThickness] = useState(2.5);
  const [polyFillStyle, setPolyFillStyle] = useState<'none' | 'solid' | 'hatched'>('none');
  const [polyHatchColor, setPolyHatchColor] = useState('#e53e3e');
  const [polyHatchType, setPolyHatchType] = useState<'diagonal' | 'cross' | 'horizontal'>('diagonal');
  const [polyDrag, setPolyDrag] = useState<{ isDragging: boolean; startX: number; startY: number; origPoints: Array<{ x: number; y: number }> | null }>({ isDragging: false, startX: 0, startY: 0, origPoints: null });

  // Tarja de endereço (arrastável + rotacionável)
  const [labelPos, setLabelPos] = useState({ x: 50, y: 80 });
  const [labelRotation, setLabelRotation] = useState(0);
  const [labelDrag, setLabelDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Tag de identificação (cliente/UC) — arrastável + rotacionável
  const [infoPos, setInfoPos] = useState({ x: 32, y: 50 });
  const [infoRotation, setInfoRotation] = useState(0);
  const [infoDrag, setInfoDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Marcador de equipamento (bolinha + tag "Inversor e Quadro de Proteção") —
  // arrastáveis independentemente, bolinha com cor/tamanho configuráveis e
  // tag rotacionável, igual ao padrão da tarja de endereço/tag de UC.
  const [equipMarker, setEquipMarker] = useState<EquipMarkerConfig | null>(null);
  const [equipColor, setEquipColor] = useState('#3182ce');
  const [equipSize, setEquipSize] = useState<'P' | 'M' | 'G'>('M');
  const [placingEquip, setPlacingEquip] = useState(false);
  const [equipDrag, setEquipDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });
  const [equipTagDrag, setEquipTagDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Marcador do Padrão de Entrada (bolinha + tag "Padrão de Entrada") —
  // mesmo formato/opções do marcador de equipamento acima.
  const [entradaMarker, setEntradaMarker] = useState<EquipMarkerConfig | null>(null);
  const [entradaColor, setEntradaColor] = useState('#dd6b20');
  const [entradaSize, setEntradaSize] = useState<'P' | 'M' | 'G'>('M');
  const [placingEntrada, setPlacingEntrada] = useState(false);
  const [entradaDrag, setEntradaDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });
  const [entradaTagDrag, setEntradaTagDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Zoom do mapa
  const [mapZoom, setMapZoom] = useState(19);

  const mapRef = useRef<HTMLDivElement>(null);
  const pd = projectData || {};

  // ── Carregar config salva ──
  useEffect(() => {
    if (!pd.planta_situacao_config) return;
    try {
      const cfg: PlantaConfig = JSON.parse(String(pd.planta_situacao_config));
      if (cfg.polygon) {
        setPolygon(cfg.polygon);
        setPolyColor(cfg.polygon.color || '#e53e3e');
        setPolyThickness(cfg.polygon.thickness || 2.5);
        setPolyFillStyle(cfg.polygon.fillStyle || 'none');
        setPolyHatchColor(cfg.polygon.hatchColor || cfg.polygon.color || '#e53e3e');
        setPolyHatchType(cfg.polygon.hatchType || 'diagonal');
      }
      if (cfg.labelPos) { setLabelPos({ x: cfg.labelPos.x, y: cfg.labelPos.y }); if (cfg.labelPos.rotation !== undefined) setLabelRotation(cfg.labelPos.rotation); }
      if (cfg.infoPos) { setInfoPos({ x: cfg.infoPos.x, y: cfg.infoPos.y }); if (cfg.infoPos.rotation !== undefined) setInfoRotation(cfg.infoPos.rotation); }
      if (cfg.mapZoom) setMapZoom(cfg.mapZoom);
      if (cfg.equipMarker) {
        setEquipMarker(cfg.equipMarker);
        setEquipColor(cfg.equipMarker.color || '#3182ce');
        setEquipSize(cfg.equipMarker.size || 'M');
      }
      if (cfg.entradaMarker) {
        setEntradaMarker(cfg.entradaMarker);
        setEntradaColor(cfg.entradaMarker.color || '#dd6b20');
        setEntradaSize(cfg.entradaMarker.size || 'M');
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pd.planta_situacao_config]);

  // ── Dados do projeto ──
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const utmX = parseFloat(String(pd.coord_utm_x || '').replace(',', '.')) || null;
  const utmY = parseFloat(String(pd.coord_utm_y || '').replace(',', '.')) || null;
  const utmFusoRaw = String(pd.coord_utm_fuso || '');
  const utmZone = parseInt(utmFusoRaw) || 22;

  // CPFL não usa UTM — o "Conferir Informações" coleta Latitude/Longitude em
  // graus decimais diretamente (ver ConferirInformacoesModal.tsx), então
  // aqui usamos esses valores sem conversão quando não houver UTM informado.
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
  const hasCoords  = !!((utmX && utmY) || (latDecimal && lngDecimal));
  const hasToken   = !!mapboxToken;

  // ── Helpers de posição ──
  const getPct = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const b = mapRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - b.left) / b.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - b.top) / b.height) * 100)),
    };
  }, []);

  const getDragOffset = (e: React.MouseEvent, pos: { x: number; y: number }) => {
    if (!mapRef.current) return { offsetX: 0, offsetY: 0 };
    const b = mapRef.current.getBoundingClientRect();
    return { offsetX: e.clientX - ((pos.x / 100) * b.width + b.left), offsetY: e.clientY - ((pos.y / 100) * b.height + b.top) };
  };

  // ── Polígono: centroide para rotação ──
  const polyCX = polygon ? polygon.points.reduce((s, p) => s + p.x, 0) / polygon.points.length : 50;
  const polyCY = polygon ? polygon.points.reduce((s, p) => s + p.y, 0) / polygon.points.length : 50;
  const polyRotation = polygon?.rotation || 0;

  // ── Clique no mapa: adicionar ponto do polígono (ou posicionar o
  //     marcador de equipamento/padrão de entrada, quando nesses modos) ──
  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (placingEquip) {
      e.preventDefault();
      const p = getPct(e);
      setEquipMarker({
        x: p.x, y: p.y,
        color: equipColor, size: equipSize,
        tagX: Math.min(97, p.x + 8), tagY: Math.max(3, p.y - 8),
        tagRotation: 0,
      });
      setPlacingEquip(false);
      return;
    }
    if (placingEntrada) {
      e.preventDefault();
      const p = getPct(e);
      setEntradaMarker({
        x: p.x, y: p.y,
        color: entradaColor, size: entradaSize,
        tagX: Math.min(97, p.x + 8), tagY: Math.max(3, p.y - 8),
        tagRotation: 0,
      });
      setPlacingEntrada(false);
      return;
    }
    if (mode !== 'draw') return;
    e.preventDefault();
    const p = getPct(e);

    setDrawingPoints(prev => {
      // Se já há >= 3 pontos e clicou perto do primeiro, fecha o polígono
      if (prev.length >= 3) {
        const first = prev[0];
        const dist = Math.sqrt((p.x - first.x) ** 2 + (p.y - first.y) ** 2);
        if (dist < 5) {
          setPolygon({ points: prev, color: polyColor, thickness: polyThickness, rotation: 0, fillStyle: polyFillStyle, hatchColor: polyHatchColor, hatchType: polyHatchType });
          setMousePos(null);
          setMode('view');
          return [];
        }
      }
      return [...prev, p];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, getPct, polyColor, polyThickness, polyFillStyle, polyHatchColor, polyHatchType, placingEquip, equipColor, equipSize, placingEntrada, entradaColor, entradaSize]);

  // ── Mouse move: linha fantasma enquanto desenha ──
  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode !== 'draw') return;
    setMousePos(getPct(e));
  }, [mode, getPct]);

  // ── Finalizar polígono via botão ──
  const finalizePolygon = useCallback(() => {
    if (drawingPoints.length < 3) return;
    setPolygon({ points: drawingPoints, color: polyColor, thickness: polyThickness, rotation: 0, fillStyle: polyFillStyle, hatchColor: polyHatchColor, hatchType: polyHatchType });
    setDrawingPoints([]);
    setMousePos(null);
    setMode('view');
  }, [drawingPoints, polyColor, polyThickness, polyFillStyle, polyHatchColor, polyHatchType]);

  // ── Cancelar desenho ──
  const cancelDraw = useCallback(() => {
    setMode('view');
    setDrawingPoints([]);
    setMousePos(null);
  }, []);

  // ── Arrastar polígono ──
  const handlePolyMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada || !polygon || !mapRef.current) return;
    e.stopPropagation(); e.preventDefault();
    const b = mapRef.current.getBoundingClientRect();
    const startX = ((e.clientX - b.left) / b.width) * 100;
    const startY = ((e.clientY - b.top) / b.height) * 100;
    setPolyDrag({ isDragging: true, startX, startY, origPoints: polygon.points.map(p => ({ ...p })) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, polygon]);

  // ── Arrastar tarja de endereço ──
  const handleLabelMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada) return;
    e.stopPropagation(); e.preventDefault();
    setLabelDrag({ isDragging: true, ...getDragOffset(e, labelPos) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, labelPos]);

  // ── Arrastar tag de identificação ──
  const handleInfoMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada) return;
    e.stopPropagation(); e.preventDefault();
    setInfoDrag({ isDragging: true, ...getDragOffset(e, infoPos) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, infoPos]);

  // ── Arrastar bolinha de equipamento ──
  const handleEquipMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada || !equipMarker) return;
    e.stopPropagation(); e.preventDefault();
    setEquipDrag({ isDragging: true, ...getDragOffset(e, { x: equipMarker.x, y: equipMarker.y }) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, equipMarker]);

  // ── Arrastar tag do equipamento ──
  const handleEquipTagMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada || !equipMarker) return;
    e.stopPropagation(); e.preventDefault();
    setEquipTagDrag({ isDragging: true, ...getDragOffset(e, { x: equipMarker.tagX, y: equipMarker.tagY }) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, equipMarker]);

  // ── Arrastar bolinha do Padrão de Entrada ──
  const handleEntradaMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada || !entradaMarker) return;
    e.stopPropagation(); e.preventDefault();
    setEntradaDrag({ isDragging: true, ...getDragOffset(e, { x: entradaMarker.x, y: entradaMarker.y }) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, entradaMarker]);

  // ── Arrastar tag do Padrão de Entrada ──
  const handleEntradaTagMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw' || placingEquip || placingEntrada || !entradaMarker) return;
    e.stopPropagation(); e.preventDefault();
    setEntradaTagDrag({ isDragging: true, ...getDragOffset(e, { x: entradaMarker.tagX, y: entradaMarker.tagY }) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, placingEquip, placingEntrada, entradaMarker]);

  // ── Eventos globais de mouse para drag ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!mapRef.current) return;
      const b = mapRef.current.getBoundingClientRect();
      const clamp = (v: number) => Math.max(3, Math.min(97, v));
      if (labelDrag.isDragging) {
        setLabelPos({ x: clamp(((e.clientX - labelDrag.offsetX - b.left) / b.width) * 100), y: clamp(((e.clientY - labelDrag.offsetY - b.top) / b.height) * 100) });
      }
      if (infoDrag.isDragging) {
        setInfoPos({ x: clamp(((e.clientX - infoDrag.offsetX - b.left) / b.width) * 100), y: clamp(((e.clientY - infoDrag.offsetY - b.top) / b.height) * 100) });
      }
      if (polyDrag.isDragging && polyDrag.origPoints) {
        const mouseX = ((e.clientX - b.left) / b.width) * 100;
        const mouseY = ((e.clientY - b.top) / b.height) * 100;
        const dx = mouseX - polyDrag.startX;
        const dy = mouseY - polyDrag.startY;
        setPolygon(prev => prev ? {
          ...prev,
          points: polyDrag.origPoints!.map(p => ({
            x: Math.max(0, Math.min(100, p.x + dx)),
            y: Math.max(0, Math.min(100, p.y + dy)),
          })),
        } : prev);
      }
      if (equipDrag.isDragging) {
        const x = clamp(((e.clientX - equipDrag.offsetX - b.left) / b.width) * 100);
        const y = clamp(((e.clientY - equipDrag.offsetY - b.top) / b.height) * 100);
        setEquipMarker(prev => prev ? { ...prev, x, y } : prev);
      }
      if (equipTagDrag.isDragging) {
        const tagX = clamp(((e.clientX - equipTagDrag.offsetX - b.left) / b.width) * 100);
        const tagY = clamp(((e.clientY - equipTagDrag.offsetY - b.top) / b.height) * 100);
        setEquipMarker(prev => prev ? { ...prev, tagX, tagY } : prev);
      }
      if (entradaDrag.isDragging) {
        const x = clamp(((e.clientX - entradaDrag.offsetX - b.left) / b.width) * 100);
        const y = clamp(((e.clientY - entradaDrag.offsetY - b.top) / b.height) * 100);
        setEntradaMarker(prev => prev ? { ...prev, x, y } : prev);
      }
      if (entradaTagDrag.isDragging) {
        const tagX = clamp(((e.clientX - entradaTagDrag.offsetX - b.left) / b.width) * 100);
        const tagY = clamp(((e.clientY - entradaTagDrag.offsetY - b.top) / b.height) * 100);
        setEntradaMarker(prev => prev ? { ...prev, tagX, tagY } : prev);
      }
    };
    const onUp = () => {
      if (labelDrag.isDragging) setLabelDrag(p => ({ ...p, isDragging: false }));
      if (infoDrag.isDragging) setInfoDrag(p => ({ ...p, isDragging: false }));
      if (polyDrag.isDragging) setPolyDrag(p => ({ ...p, isDragging: false }));
      if (equipDrag.isDragging) setEquipDrag(p => ({ ...p, isDragging: false }));
      if (equipTagDrag.isDragging) setEquipTagDrag(p => ({ ...p, isDragging: false }));
      if (entradaDrag.isDragging) setEntradaDrag(p => ({ ...p, isDragging: false }));
      if (entradaTagDrag.isDragging) setEntradaTagDrag(p => ({ ...p, isDragging: false }));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [labelDrag, infoDrag, polyDrag, equipDrag, equipTagDrag, entradaDrag, entradaTagDrag]);

  // ── Salvar config ──
  const handleSave = async () => {
    if (!onSaveConfig) return;
    setSaving(true);
    try {
      await onSaveConfig({ polygon, labelPos: { ...labelPos, rotation: labelRotation }, infoPos: { ...infoPos, rotation: infoRotation }, mapZoom, equipMarker, entradaMarker });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error('Erro ao salvar config planta:', err); }
    finally { setSaving(false); }
  };

  // Escala-para-caber da pré-visualização — a folha A3 paisagem (420x297mm)
  // não cabia na tela. A primeira versão só considerava a LARGURA
  // disponível, então a folha ainda podia ficar mais alta que a área visível
  // do cartão (que tem altura máxima própria, com rolagem vertical) — ainda
  // exigindo rolagem. Agora mede largura E altura realmente disponíveis (a
  // altura é calculada a partir do cartão com rolagem própria — o ancestral
  // mais próximo com overflow-y auto/scroll — descontando o que já foi
  // ocupado acima da folha dentro dele: botão "Gerar PDF", avisos, barra de
  // controles) e usa a MENOR das duas escalas, garantindo que a folha sempre
  // caiba inteira, sem nenhuma rolagem. Como o desenho/arraste do mapa usa
  // getBoundingClientRect() (que já reflete o tamanho visual após o
  // transform), a interatividade (marcar propriedade, arrastar tarjas)
  // continua funcionando normalmente com a folha encolhida.
  const SHEET_W_MM = 420;
  const SHEET_H_MM = 297;
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const MM_TO_PX = 96 / 25.4;
    const sheetWidthPx = SHEET_W_MM * MM_TO_PX;
    const sheetHeightPx = SHEET_H_MM * MM_TO_PX;

    const findScrollAncestor = (node: HTMLElement | null): HTMLElement | null => {
      let cur = node?.parentElement ?? null;
      while (cur) {
        const oy = getComputedStyle(cur).overflowY;
        if (oy === 'auto' || oy === 'scroll') return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const updateScale = () => {
      const availableWidth = el.clientWidth;
      const scrollAncestor = findScrollAncestor(el);
      // Reserva o espaço do botão "Gerar PDF" que fica ABAIXO da folha
      // (altura + margem própria, invariável independente da escala atual)
      // e o padding inferior do próprio cartão com rolagem, para que a
      // escala calculada já deixe espaço pra eles e não sobre scroll.
      const bottomBar = bottomBarRef.current;
      const bottomBarHeight = bottomBar
        ? bottomBar.getBoundingClientRect().height + parseFloat(getComputedStyle(bottomBar).marginTop || '0')
        : 0;
      // Soma o padding inferior do próprio cartão com rolagem E de qualquer
      // wrapper intermediário entre a folha e esse cartão (ex.: a div
      // "bg-white rounded-lg p-4" que envolve o preview), já que o padding
      // deles também ocupa espaço dentro da área com rolagem.
      let wrapperPaddingBottom = 0;
      let wrapperNode = el.parentElement;
      while (wrapperNode && wrapperNode !== scrollAncestor) {
        wrapperPaddingBottom += parseFloat(getComputedStyle(wrapperNode).paddingBottom || '0');
        wrapperNode = wrapperNode.parentElement;
      }
      const scrollAncestorPaddingBottom = scrollAncestor
        ? parseFloat(getComputedStyle(scrollAncestor).paddingBottom || '0')
        : 0;
      const availableHeight = scrollAncestor
        ? scrollAncestor.getBoundingClientRect().bottom - el.getBoundingClientRect().top - scrollAncestorPaddingBottom - wrapperPaddingBottom - bottomBarHeight
        : window.innerHeight * 0.8;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      const scale = Math.min(1, availableWidth / sheetWidthPx, availableHeight / sheetHeightPx);
      setPreviewScale(Math.max(0.1, scale));
    };

    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    window.addEventListener('resize', updateScale);
    return () => { ro.disconnect(); window.removeEventListener('resize', updateScale); };
  }, []);

  // ── Gerar PDF — agora via @react-pdf/renderer (PDF vetorial nativo), mesma
  // tecnologia já usada no Diagrama Unifilar/Diagrama de Blocos/Padrão de
  // Entrada, em vez de html2canvas/jsPDF (que tinha as bordas do selo
  // sumindo no PDF final — limitação conhecida do html2canvas com
  // `transform: scale()` + bordas aninhadas). A pré-visualização interativa
  // abaixo continua exatamente igual; só a geração do PDF final muda. ──
  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PlantaSituacaoA4PDF } = await import('./PlantaSituacaoA4PDF');
      const React = await import('react');
      // Usa a config ao vivo do editor (polígono/hachura/marcador de
      // equipamento/tarjas), em vez do que está salvo no banco — garante que
      // o PDF saia igual ao que está sendo exibido na pré-visualização,
      // mesmo que o usuário gere o PDF antes de clicar em "Salvar".
      const liveConfig = {
        polygon,
        labelPos: { ...labelPos, rotation: labelRotation },
        infoPos: { ...infoPos, rotation: infoRotation },
        mapZoom,
        equipMarker,
        entradaMarker,
      };
      const pdfProjectData = { ...projectData, planta_situacao_config: JSON.stringify(liveConfig) };
      const blob = await pdf(React.createElement(PlantaSituacaoA4PDF, { projectData: pdfProjectData })).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planta de Situacao - ${clientName || 'projeto'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Erro ao gerar PDF:', err); }
    finally { setGenerating(false); }
  };

  // ── Atualizar atributos do polígono existente ──
  const applyPolyColor = (c: string) => { setPolyColor(c); setPolygon(prev => prev ? { ...prev, color: c } : prev); };
  const applyPolyThickness = (t: number) => { setPolyThickness(t); setPolygon(prev => prev ? { ...prev, thickness: t } : prev); };
  const applyPolyRotation = (delta: number) => { setPolygon(prev => prev ? { ...prev, rotation: ((prev.rotation || 0) + delta + 360) % 360 } : prev); };
  const applyPolyFillStyle = (s: 'none' | 'solid' | 'hatched') => { setPolyFillStyle(s); setPolygon(prev => prev ? { ...prev, fillStyle: s } : prev); };
  const applyPolyHatchColor = (c: string) => { setPolyHatchColor(c); setPolygon(prev => prev ? { ...prev, hatchColor: c } : prev); };
  const applyPolyHatchType = (t: 'diagonal' | 'cross' | 'horizontal') => { setPolyHatchType(t); setPolygon(prev => prev ? { ...prev, hatchType: t } : prev); };

  // ── Atualizar atributos do marcador de equipamento existente ──
  const applyEquipColor = (c: string) => { setEquipColor(c); setEquipMarker(prev => prev ? { ...prev, color: c } : prev); };
  const applyEquipSize = (s: 'P' | 'M' | 'G') => { setEquipSize(s); setEquipMarker(prev => prev ? { ...prev, size: s } : prev); };
  const applyEquipTagRotation = (delta: number) => { setEquipMarker(prev => prev ? { ...prev, tagRotation: ((prev.tagRotation || 0) + delta + 360) % 360 } : prev); };

  // ── Atualizar atributos do marcador do Padrão de Entrada existente ──
  const applyEntradaColor = (c: string) => { setEntradaColor(c); setEntradaMarker(prev => prev ? { ...prev, color: c } : prev); };
  const applyEntradaSize = (s: 'P' | 'M' | 'G') => { setEntradaSize(s); setEntradaMarker(prev => prev ? { ...prev, size: s } : prev); };
  const applyEntradaTagRotation = (delta: number) => { setEntradaMarker(prev => prev ? { ...prev, tagRotation: ((prev.tagRotation || 0) + delta + 360) % 360 } : prev); };

  // ── Passo a passo discreto — só indica progresso, não bloqueia nada ──
  const steps = [
    { key: 'prop', label: 'Marque a propriedade', done: !!polygon },
    { key: 'entrada', label: 'Marque o Padrão de Entrada', done: !!entradaMarker },
    { key: 'equip', label: 'Marque o equipamento', done: !!equipMarker },
    { key: 'save', label: 'Salve', done: saved },
  ];

  // ── Barra de controles — extraída numa variável pra poder ser renderizada
  // via portal (fora da área com rolagem da prancha) quando um destino é
  // fornecido, ou inline (comportamento de sempre) quando não é. ──
  const toolbarNode = onSaveConfig ? (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">

          {/* Cabeçalho recolhível */}
          <button
            type="button"
            onClick={() => setConfigOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2.5 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${configOpen ? 'rotate-90' : ''}`} />
            Configuração da Planta de Situação
          </button>

          {/* Passo a passo — discreto, só indica progresso, não bloqueia nada */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500 mb-2.5 pb-2.5 border-b border-gray-200 dark:border-gray-700">
            {steps.map((step, i) => (
              <Fragment key={step.key}>
                <span className={`flex items-center gap-1 ${step.done ? 'text-green-600 dark:text-green-500' : ''}`}>
                  <span className={`flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold leading-none ${step.done ? 'bg-green-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-white'}`}>
                    {step.done ? '✓' : i + 1}
                  </span>
                  {step.label}
                </span>
                {i < steps.length - 1 && <span className="text-gray-300 dark:text-gray-600">›</span>}
              </Fragment>
            ))}
          </div>

          {configOpen && (
          <div className="flex flex-wrap items-stretch gap-2.5">

            {/* Grupo: Propriedade */}
            <div className="flex flex-col gap-1.5 px-2.5 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Propriedade</span>

              <div className="flex flex-wrap items-center gap-2">
                {/* Marcar propriedade / Cancelar */}
                {mode === 'view' ? (
                  <Button size="sm" variant="outline"
                    onClick={() => setMode('draw')}>
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                    Marcar Propriedade
                  </Button>
                ) : (
                  <>
                    <span className="text-xs text-red-600 font-medium">
                      {drawingPoints.length === 0
                        ? 'Clique no mapa para adicionar pontos'
                        : `${drawingPoints.length} ponto${drawingPoints.length > 1 ? 's' : ''} — clique perto do 1º para fechar`}
                    </span>
                    {drawingPoints.length >= 3 && (
                      <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white" onClick={finalizePolygon}>
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Finalizar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={cancelDraw}>
                      Cancelar
                    </Button>
                  </>
                )}

                {polygon && mode === 'view' && (
                  <Button size="sm" variant="outline" onClick={() => setPolygon(null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Limpar
                  </Button>
                )}
              </div>

              {polygon && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1.5 mt-0.5 border-t border-gray-100 dark:border-gray-800">
                  {/* Cor da linha */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Cor:</span>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => applyPolyColor(c)} title={c}
                        style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c, border: polyColor === c ? '2.5px solid #333' : '1.5px solid #ccc', cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                  </div>

                  {/* Espessura */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Esp:</span>
                    {THICKNESS_OPTIONS.map(t => (
                      <button key={t} onClick={() => applyPolyThickness(t)}
                        className={`text-xs px-1.5 py-0.5 rounded border ${polyThickness === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Preenchimento do polígono */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Preench.:</span>
                    {([
                      { value: 'none', label: 'Nenhum' },
                      { value: 'solid', label: 'Sólido' },
                      { value: 'hatched', label: 'Hachurado' },
                    ] as const).map(opt => (
                      <button key={opt.value} onClick={() => applyPolyFillStyle(opt.value)}
                        className={`text-xs px-1.5 py-0.5 rounded border ${polyFillStyle === opt.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {polyFillStyle === 'hatched' && (
                    <>
                      {/* Cor da hachura */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Cor hach.:</span>
                        {COLORS.map(c => (
                          <button key={c} onClick={() => applyPolyHatchColor(c)} title={c}
                            style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c, border: polyHatchColor === c ? '2.5px solid #333' : '1.5px solid #ccc', cursor: 'pointer', flexShrink: 0 }} />
                        ))}
                      </div>

                      {/* Tipo de hachura */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">Tipo:</span>
                        {([
                          { value: 'diagonal', label: 'Diagonal' },
                          { value: 'cross', label: 'Cruzada' },
                          { value: 'horizontal', label: 'Horizontal' },
                        ] as const).map(opt => (
                          <button key={opt.value} onClick={() => applyPolyHatchType(opt.value)}
                            className={`text-xs px-1.5 py-0.5 rounded border ${polyHatchType === opt.value ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Rotação da propriedade (polígono) */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Rot.:</span>
                    <button onClick={() => applyPolyRotation(-5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
                    <span className="text-xs w-8 text-center font-mono">{polyRotation}°</span>
                    <button onClick={() => applyPolyRotation(5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
                  </div>
                </div>
              )}
            </div>

            {/* Grupo: Padrão de Entrada */}
            <div className="flex flex-col gap-1.5 px-2.5 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Padrão de Entrada</span>

              <div className="flex flex-wrap items-center gap-2">
                {!placingEntrada ? (
                  <Button size="sm" variant="outline" onClick={() => { setPlacingEquip(false); setPlacingEntrada(true); }} disabled={mode === 'draw' || placingEquip}>
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    Marcar
                  </Button>
                ) : (
                  <>
                    <span className="text-xs text-blue-600 font-medium">Clique no mapa para posicionar</span>
                    <Button size="sm" variant="outline" onClick={() => setPlacingEntrada(false)}>Cancelar</Button>
                  </>
                )}

                {entradaMarker && mode === 'view' && !placingEntrada && (
                  <Button size="sm" variant="outline" onClick={() => setEntradaMarker(null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Limpar
                  </Button>
                )}
              </div>

              {entradaMarker && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1.5 mt-0.5 border-t border-gray-100 dark:border-gray-800">
                  {/* Cor da bolinha */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Cor:</span>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => applyEntradaColor(c)} title={c}
                        style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c, border: entradaColor === c ? '2.5px solid #333' : '1.5px solid #ccc', cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                  </div>

                  {/* Tamanho da bolinha */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Tam.:</span>
                    {(['P', 'M', 'G'] as const).map(s => (
                      <button key={s} onClick={() => applyEntradaSize(s)}
                        className={`text-xs px-1.5 py-0.5 rounded border ${entradaSize === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Rotação da tag do Padrão de Entrada */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Rot.:</span>
                    <button onClick={() => applyEntradaTagRotation(-5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
                    <span className="text-xs w-8 text-center font-mono">{entradaMarker.tagRotation || 0}°</span>
                    <button onClick={() => applyEntradaTagRotation(5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
                  </div>
                </div>
              )}
            </div>

            {/* Grupo: Equipamento */}
            <div className="flex flex-col gap-1.5 px-2.5 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Equipamento</span>

              <div className="flex flex-wrap items-center gap-2">
                {!placingEquip ? (
                  <Button size="sm" variant="outline" onClick={() => { setPlacingEntrada(false); setPlacingEquip(true); }} disabled={mode === 'draw' || placingEntrada}>
                    <MapPin className="h-3.5 w-3.5 mr-1.5" />
                    Marcar
                  </Button>
                ) : (
                  <>
                    <span className="text-xs text-blue-600 font-medium">Clique no mapa para posicionar</span>
                    <Button size="sm" variant="outline" onClick={() => setPlacingEquip(false)}>Cancelar</Button>
                  </>
                )}

                {equipMarker && mode === 'view' && !placingEquip && (
                  <Button size="sm" variant="outline" onClick={() => setEquipMarker(null)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />Limpar
                  </Button>
                )}
              </div>

              {equipMarker && (
                <div className="flex flex-wrap items-center gap-2.5 pt-1.5 mt-0.5 border-t border-gray-100 dark:border-gray-800">
                  {/* Cor da bolinha */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Cor:</span>
                    {COLORS.map(c => (
                      <button key={c} onClick={() => applyEquipColor(c)} title={c}
                        style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c, border: equipColor === c ? '2.5px solid #333' : '1.5px solid #ccc', cursor: 'pointer', flexShrink: 0 }} />
                    ))}
                  </div>

                  {/* Tamanho da bolinha */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Tam.:</span>
                    {(['P', 'M', 'G'] as const).map(s => (
                      <button key={s} onClick={() => applyEquipSize(s)}
                        className={`text-xs px-1.5 py-0.5 rounded border ${equipSize === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Rotação da tag do equipamento */}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Rot.:</span>
                    <button onClick={() => applyEquipTagRotation(-5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
                    <span className="text-xs w-8 text-center font-mono">{equipMarker.tagRotation || 0}°</span>
                    <button onClick={() => applyEquipTagRotation(5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
                  </div>
                </div>
              )}
            </div>

            {/* Grupo: Tarjas e mapa */}
            <div className="flex flex-col gap-1.5 px-2.5 py-2 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Tarjas e mapa</span>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Zoom do mapa */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Zoom:</span>
                  <select
                    value={mapZoom}
                    onChange={e => setMapZoom(Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded px-1.5 py-0.5 bg-white"
                  >
                    {[15, 16, 17, 18, 19, 20, 21].map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                {/* Rotação da tarja (rua) */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Rot. rua:</span>
                  <button onClick={() => setLabelRotation(r => r - 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
                  <span className="text-xs w-8 text-center font-mono">{labelRotation}°</span>
                  <button onClick={() => setLabelRotation(r => r + 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
                </div>

                {/* Rotação da tag de identificação */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Rot. tag:</span>
                  <button onClick={() => setInfoRotation(r => r - 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
                  <span className="text-xs w-8 text-center font-mono">{infoRotation}°</span>
                  <button onClick={() => setInfoRotation(r => r + 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
                </div>
              </div>
            </div>

            {/* Grupo: Ações */}
            <div className="flex flex-col gap-1.5 px-2.5 py-2 justify-center">
              <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : saved ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                  : <Save className="h-3.5 w-3.5 mr-1.5" />}
                {saved ? 'Salvo!' : 'Salvar'}
              </Button>
              <span className="text-[10px] text-gray-400 max-w-[140px]">Arraste as tags e o polígono para reposicionar</span>
            </div>

          </div>
          )}
        </div>
  ) : null;

  return (
    <>
      {/* Botão PDF — fora da área impressa */}
      <div className="mb-6 flex justify-center">
        <Button onClick={handleGeneratePdf} disabled={generating} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-base font-semibold shadow-lg">
          {generating
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
            : <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Planta de Situação</>}
        </Button>
      </div>

      {/* Avisos */}
      {!hasToken && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Token Mapbox não configurado. Adicione <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> nas variáveis de ambiente.</span>
        </div>
      )}
      {!hasCoords && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-sm text-blue-800">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>Preencha as <strong>Coordenadas</strong> (UTM X/Y/Fuso, ou Latitude/Longitude para CPFL) nas informações do projeto.</span>
        </div>
      )}

      {/* Barra de controles — renderizada via portal (fora da área com
          rolagem da prancha) quando um destino é fornecido pelo componente
          pai; senão, renderiza aqui mesmo, como sempre. */}
      {toolbarPortalTarget && toolbarNode ? createPortal(toolbarNode, toolbarPortalTarget) : toolbarNode}


      {/* ══ Prancha A3 (paisagem) — moldura NBR 10068 + selo padronizado, mesma
          convenção já usada no Padrão de Entrada em A3 paisagem (selo ocupando
          a metade direita da folha). Altura igual à da prancha A4 retrato
          anterior (297mm); só a largura dobra (210→420mm). O wrapper abaixo só
          encolhe a EXIBIÇÃO pra caber na tela (via CSS transform), sem alterar
          nada do conteúdo/tamanho real usado no PDF. ══ */}
      <div ref={previewWrapRef} style={{ width: '100%', height: `${297 * previewScale}mm`, overflow: 'hidden' }}>
      <div
        style={{
          position: 'relative',
          width: '420mm',
          height: '297mm',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#000',
          margin: '0 auto',
          boxSizing: 'border-box',
          transform: `scale(${previewScale})`,
          transformOrigin: 'top center',
        }}
      >
        {/* borda de corte */}
        <div style={{ position: 'absolute', left: '0.5mm', top: '0.5mm', width: '419mm', height: '296mm', border: '0.6mm solid #161513', boxSizing: 'border-box' }} />
        {/* quadro NBR 10068 (margem esq. 25mm p/ encadernação) */}
        <div style={{ position: 'absolute', left: '25mm', top: '10mm', width: '385mm', height: '277mm', border: '0.6mm solid #161513', boxSizing: 'border-box' }} />
        {/* marcas de centragem */}
        <div style={{ position: 'absolute', left: '217.5mm', top: '0.5mm', width: '0.7mm', height: '9.5mm', background: '#161513' }} />
        <div style={{ position: 'absolute', left: '217.5mm', top: '287mm', width: '0.7mm', height: '9.5mm', background: '#161513' }} />
        <div style={{ position: 'absolute', left: '0.5mm', top: '148.5mm', width: '24.5mm', height: '0.7mm', background: '#161513' }} />
        <div style={{ position: 'absolute', left: '410mm', top: '148.5mm', width: '9.5mm', height: '0.7mm', background: '#161513' }} />

        {/* Área do mapa — agora quadrada (165x165mm), bem mais próxima de 1:1 do
            que antes, a pedido do usuário (ainda achava esticada verticalmente) —
            centralizada horizontal e verticalmente na área de conteúdo do
            quadro (15–246,3mm de altura disponível), em vez de encostada no
            topo, "jogando-a mais para baixo". */}
        <div
          ref={mapRef}
          style={{
            position: 'absolute',
            left: '135mm',
            top: '48.15mm',
            width: '165mm',
            height: '165mm',
            border: '1px solid #333',
            overflow: 'hidden',
            backgroundColor: '#c8d8c8',
            cursor: mode === 'draw' || placingEquip || placingEntrada ? 'crosshair' : 'default',
            boxSizing: 'border-box',
          }}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
        >
          {mapImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mapImageUrl} alt="Satélite" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" draggable={false} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#555', gap: 10 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
              <span style={{ fontSize: '10pt', textAlign: 'center', maxWidth: 280 }}>
                {!hasToken ? 'Configure NEXT_PUBLIC_MAPBOX_TOKEN para exibir o mapa de satélite' : !hasCoords ? 'Preencha as coordenadas UTM para posicionar o mapa' : 'Carregando...'}
              </span>
            </div>
          )}

          {/* Seta Norte — canto superior direito */}
          <div style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.93)', border: '1.5px solid #333', borderRadius: 4, padding: '5px 8px 9px', textAlign: 'center', pointerEvents: 'none', lineHeight: 1 }}>
            <svg width="14" height="18" viewBox="0 0 14 18" style={{ display: 'block', margin: '0 auto' }}>
              <polygon points="7,0 2,9 5,7 5,18 9,18 9,7 12,9" fill="#cc0000" />
            </svg>
            <div style={{ fontWeight: 'bold', fontSize: '8pt', lineHeight: 1, marginTop: 5 }}>N</div>
          </div>

          {/* PIN estilo Google Maps — wrapper div recebe o transform (html2canvas não aplica transform em SVG direto) */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', pointerEvents: 'none', width: 24, height: 32 }}>
            <svg width="24" height="32" viewBox="0 0 24 32" style={{ display: 'block' }}>
              <path d="M12 1C6.5 1 2 5.5 2 11c0 7 10 20 10 20s10-13 10-20C22 5.5 17.5 1 12 1z" fill="#e53e3e" stroke="white" strokeWidth="1.2" />
              <circle cx="12" cy="11" r="4.5" fill="white" />
            </svg>
          </div>

          {/* Tag identificação (cliente/UC/coords) — arrastável + rotacionável */}
          {(hasCoords || clientName || uc) && (
            <div
              style={{ position: 'absolute', left: `${infoPos.x}%`, top: `${infoPos.y}%`, transform: `translate(-50%, -50%) rotate(${infoRotation}deg)`, backgroundColor: 'rgba(255,255,255,0.93)', border: '1.5px solid #333', borderRadius: 4, padding: '0px 7px 14px', fontSize: '11px', lineHeight: '14px', whiteSpace: 'nowrap', zIndex: 10, cursor: infoDrag.isDragging ? 'grabbing' : (mode === 'draw' ? 'crosshair' : 'grab'), userSelect: 'none' }}
              onMouseDown={handleInfoMouseDown}
            >
              {clientName && <div><strong>Cliente:</strong> {clientName}</div>}
              {uc         && <div><strong>UC:</strong> {uc}</div>}
              {hasCoords && (usingLatLng ? (
                <>
                  <div><strong>Lat:</strong> {latDecimal?.toFixed(6)}</div>
                  <div><strong>Long:</strong> {lngDecimal?.toFixed(6)}</div>
                  <div><strong>Fuso:</strong> {latLngUtmZone}</div>
                </>
              ) : (
                <>
                  <div><strong>X:</strong> {utmX?.toFixed(0)} | <strong>Y:</strong> {utmY?.toFixed(0)}</div>
                  <div><strong>Fuso:</strong> {utmFusoRaw || utmZone}</div>
                </>
              ))}
            </div>
          )}

          {/* Polígono finalizado — arrastável + rotacionável */}
          {polygon && (
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: mode === 'draw' ? 'none' : 'all', overflow: 'visible' }}
            >
              <defs>
                <clipPath id="polyClipPreview">
                  <polygon points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')} />
                </clipPath>
              </defs>
              <g transform={`rotate(${polyRotation}, ${polyCX}, ${polyCY})`}>
                {/* Camada invisível que recebe o clique/arraste em toda a área
                    do polígono, mesmo quando não há preenchimento visível. */}
                <polygon
                  points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="transparent"
                  stroke="none"
                  style={{ cursor: polyDrag.isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={handlePolyMouseDown}
                />
                {polygon.fillStyle === 'solid' && (
                  <polygon
                    points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={polygon.color}
                    fillOpacity={0.15}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {polygon.fillStyle === 'hatched' && (
                  <g clipPath="url(#polyClipPreview)" style={{ pointerEvents: 'none' }}>
                    {hatchLinesFor(polygon).map((ln, i) => (
                      <line key={i} x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={polygon.hatchColor || polygon.color} strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
                    ))}
                  </g>
                )}
                <polygon
                  points={polygon.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={polygon.color}
                  strokeWidth={polygon.thickness}
                  vectorEffect="non-scaling-stroke"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            </svg>
          )}

          {/* Marcador de equipamento — bolinha arrastável + tag "Inversor e
              Quadro de Proteção" arrastável/rotacionável independentemente */}
          {equipMarker && (
            <>
              <div
                onMouseDown={handleEquipMouseDown}
                style={{
                  position: 'absolute',
                  left: `${equipMarker.x}%`,
                  top: `${equipMarker.y}%`,
                  width: EQUIP_SIZES[equipMarker.size].px,
                  height: EQUIP_SIZES[equipMarker.size].px,
                  borderRadius: '50%',
                  backgroundColor: equipMarker.color,
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 11,
                  cursor: equipDrag.isDragging ? 'grabbing' : (mode === 'draw' || placingEquip || placingEntrada ? 'default' : 'grab'),
                }}
              />
              <div
                onMouseDown={handleEquipTagMouseDown}
                style={{
                  position: 'absolute',
                  left: `${equipMarker.tagX}%`,
                  top: `${equipMarker.tagY}%`,
                  transform: `translate(-50%, -50%) rotate(${equipMarker.tagRotation || 0}deg)`,
                  backgroundColor: 'rgba(255,255,255,0.93)',
                  border: '1.5px solid #333',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  cursor: equipTagDrag.isDragging ? 'grabbing' : (mode === 'draw' || placingEquip || placingEntrada ? 'default' : 'grab'),
                  userSelect: 'none',
                }}
              >
                Inversor e Quadro de Proteção
              </div>
            </>
          )}

          {/* Marcador do Padrão de Entrada — bolinha arrastável + tag "Padrão
              de Entrada" arrastável/rotacionável independentemente */}
          {entradaMarker && (
            <>
              <div
                onMouseDown={handleEntradaMouseDown}
                style={{
                  position: 'absolute',
                  left: `${entradaMarker.x}%`,
                  top: `${entradaMarker.y}%`,
                  width: EQUIP_SIZES[entradaMarker.size].px,
                  height: EQUIP_SIZES[entradaMarker.size].px,
                  borderRadius: '50%',
                  backgroundColor: entradaMarker.color,
                  border: '2px solid #ffffff',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 11,
                  cursor: entradaDrag.isDragging ? 'grabbing' : (mode === 'draw' || placingEquip || placingEntrada ? 'default' : 'grab'),
                }}
              />
              <div
                onMouseDown={handleEntradaTagMouseDown}
                style={{
                  position: 'absolute',
                  left: `${entradaMarker.tagX}%`,
                  top: `${entradaMarker.tagY}%`,
                  transform: `translate(-50%, -50%) rotate(${entradaMarker.tagRotation || 0}deg)`,
                  backgroundColor: 'rgba(255,255,255,0.93)',
                  border: '1.5px solid #333',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  cursor: entradaTagDrag.isDragging ? 'grabbing' : (mode === 'draw' || placingEquip || placingEntrada ? 'default' : 'grab'),
                  userSelect: 'none',
                }}
              >
                Padrão de Entrada
              </div>
            </>
          )}

          {/* Preview enquanto desenha — linhas, linha fantasma e pontos */}
          {mode === 'draw' && drawingPoints.length > 0 && (
            <>
              {/* Linhas já traçadas + linha fantasma até o cursor */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
              >
                {drawingPoints.length >= 2 && (
                  <polyline
                    points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={polyColor}
                    strokeWidth={polyThickness}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {mousePos && (
                  <line
                    x1={drawingPoints[drawingPoints.length - 1].x}
                    y1={drawingPoints[drawingPoints.length - 1].y}
                    x2={mousePos.x}
                    y2={mousePos.y}
                    stroke={polyColor}
                    strokeWidth={polyThickness}
                    strokeDasharray="3,2"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {/* Pontos sobrepostos via CSS (evita distorção do SVG non-scaling) */}
              {drawingPoints.map((p, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  width: i === 0 ? 12 : 8,
                  height: i === 0 ? 12 : 8,
                  borderRadius: '50%',
                  backgroundColor: i === 0 ? '#fff' : polyColor,
                  border: `2px solid ${polyColor}`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  boxSizing: 'border-box',
                }} />
              ))}
            </>
          )}

          {/* Tarja de endereço — arrastável + rotacionável */}
          {address && (
            <div
              style={{ position: 'absolute', left: `${labelPos.x}%`, top: `${labelPos.y}%`, transform: `translate(-50%, -50%) rotate(${labelRotation}deg)`, backgroundColor: 'rgba(255,255,255,0.93)', border: '1.5px solid #333', borderRadius: 3, padding: '0px 10px 11px', fontSize: '12px', fontWeight: 'bold', lineHeight: '16px', textAlign: 'center', cursor: labelDrag.isDragging ? 'grabbing' : (mode === 'draw' ? 'crosshair' : 'grab'), userSelect: 'none', whiteSpace: 'nowrap', zIndex: 9 }}
              onMouseDown={handleLabelMouseDown}
            >
              {address}
            </div>
          )}
        </div>

        {/* ═══ SELO — mesma convenção do Padrão de Entrada em A3 paisagem
            (selo ocupando a metade direita da folha, 192,5x35,7mm),
            renderizada em 2x + scale(0.5) para contornar fonte mínima do
            browser em html2canvas (técnica já usada no selo anterior desta
            prancha). ═══ */}
        <div style={{ position: 'absolute', left: '217.5mm', top: '251.3mm', width: '192.5mm', height: '35.7mm', overflow: 'hidden', boxSizing: 'border-box' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: 'scale(0.5)', width: '385mm', height: '71.4mm', border: '1.2mm solid #161513', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#fff', color: '#161513' }}>

            {/* Coluna 1: Produto / Data / Escala / Tamanho / Folha / Revisão */}
            <div style={{ width: '80mm', borderRight: '1mm solid #161513', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <div style={{ height: '16mm', borderBottom: '1mm solid #161513', padding: '0 2mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '4.6mm', fontWeight: 'bold', color: '#5a5a5a' }}>PRODUTO</span>
                <span style={{ fontSize: '7.2mm', fontWeight: 'bold', textAlign: 'center' }}>GFV {potencia ? `${potencia} kWp` : '___'}</span>
              </div>
              {([['DATA', dataDoc], ['ESCALA', 'S/ ESCALA'], ['TAMANHO', 'A3'], ['FOLHA', '1/1'], ['REVISÃO', 'R0']] as const).map(([label, value], i, arr) => (
                <div key={label} style={{ height: '11.08mm', borderBottom: i < arr.length - 1 ? '0.7mm solid #161513' : undefined, padding: '0 2mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '4mm', fontWeight: 'bold', color: '#5a5a5a' }}>{label}</span>
                  <span style={{ fontSize: '4.4mm', textAlign: 'center' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Coluna 2: Título + Proprietário e Obra + Responsável Técnico */}
            <div style={{ width: '220mm', borderRight: '1mm solid #161513', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
              <div style={{ height: '16mm', borderBottom: '1mm solid #161513', padding: '0 3mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '4.6mm', fontWeight: 'bold', color: '#5a5a5a', textAlign: 'center' }}>TÍTULO</span>
                <span style={{ fontSize: '6.4mm', fontWeight: 'bold', textAlign: 'center' }}>PLANTA DE SITUAÇÃO</span>
              </div>
              <div style={{ height: '29.4mm', borderBottom: '0.7mm solid #161513', padding: '0 3mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '4.6mm', fontWeight: 'bold', color: '#5a5a5a', lineHeight: 1.15 }}>Proprietário e Obra:</span>
                <span style={{ fontSize: '4.8mm', lineHeight: 1.15 }}>Nome: {clientName || '___'}</span>
                <span style={{ fontSize: '4.8mm', lineHeight: 1.15 }}>Endereço: {address || '___'}</span>
                <span style={{ fontSize: '4.8mm', lineHeight: 1.15 }}>Cidade: {estado ? `${cidade} - ${estado}` : (cidade || '___')}</span>
                <span style={{ fontSize: '4.8mm', lineHeight: 1.15 }}>CEP: {cep || '___'}</span>
              </div>
              <div style={{ height: '26mm', padding: '0 3mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '4.6mm', fontWeight: 'bold', color: '#5a5a5a', lineHeight: 1.15 }}>Responsável Técnico:</span>
                <span style={{ fontSize: '5.2mm', fontWeight: 'bold', lineHeight: 1.15 }}>{respNome || '___'}</span>
                <span style={{ fontSize: '4.4mm', lineHeight: 1.15 }}>TÉCNICO EM ELETROTÉCNICA</span>
                <span style={{ fontSize: '4.4mm', lineHeight: 1.15 }}>CFT: {respCft || '___'}</span>
              </div>
            </div>

            {/* Coluna 3: Logo da empresa */}
            <div style={{ width: '85mm', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2mm', boxSizing: 'border-box' }}>
              {logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : null}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Botão PDF — fora da área impressa */}
      <div ref={bottomBarRef} className="mt-6 flex justify-center">
        <Button onClick={handleGeneratePdf} disabled={generating} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-base font-semibold shadow-lg">
          {generating
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
            : <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Planta de Situação</>}
        </Button>
      </div>
    </>
  );
}
