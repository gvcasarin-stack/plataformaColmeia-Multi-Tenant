'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, MapPin, AlertCircle, Square, Trash2, Save, Check } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface RectConfig {
  x1: number; y1: number; x2: number; y2: number;
  color: string; thickness: number;
}
interface PlantaConfig {
  rect?: RectConfig | null;
  labelPos?: { x: number; y: number; rotation?: number };
  infoPos?: { x: number; y: number; rotation?: number };
  mapZoom?: number;
}
interface PlantaSituacaoPreviewProps {
  projectData?: Record<string, any>;
  onSaveConfig?: (config: PlantaConfig) => Promise<void>;
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

// ─── Cores e espessuras disponíveis ─────────────────────────────────────────
const COLORS = ['#e53e3e', '#3182ce', '#38a169', '#1a1a1a', '#dd6b20'];
const THICKNESS_OPTIONS = [1.5, 2.5, 3.5, 5];

export function PlantaSituacaoPreview({ projectData, onSaveConfig }: PlantaSituacaoPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'view' | 'draw'>('view');

  // Retângulo
  const [rect, setRect] = useState<RectConfig | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [rectColor, setRectColor] = useState('#e53e3e');
  const [rectThickness, setRectThickness] = useState(2.5);

  // Tarja de endereço (arrastável + rotacionável)
  const [labelPos, setLabelPos] = useState({ x: 50, y: 80 });
  const [labelRotation, setLabelRotation] = useState(0);
  const [labelDrag, setLabelDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Tag de identificação (cliente/UC) — arrastável + rotacionável
  const [infoPos, setInfoPos] = useState({ x: 32, y: 50 });
  const [infoRotation, setInfoRotation] = useState(0);
  const [infoDrag, setInfoDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  // Zoom do mapa
  const [mapZoom, setMapZoom] = useState(19);

  const previewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pd = projectData || {};

  // ── Carregar config salva ──
  useEffect(() => {
    if (!pd.planta_situacao_config) return;
    try {
      const cfg: PlantaConfig = JSON.parse(String(pd.planta_situacao_config));
      if (cfg.rect) { setRect(cfg.rect); setRectColor(cfg.rect.color || '#e53e3e'); setRectThickness(cfg.rect.thickness || 2.5); }
      if (cfg.labelPos) { setLabelPos({ x: cfg.labelPos.x, y: cfg.labelPos.y }); if (cfg.labelPos.rotation !== undefined) setLabelRotation(cfg.labelPos.rotation); }
      if (cfg.infoPos) { setInfoPos({ x: cfg.infoPos.x, y: cfg.infoPos.y }); if (cfg.infoPos.rotation !== undefined) setInfoRotation(cfg.infoPos.rotation); }
      if (cfg.mapZoom) setMapZoom(cfg.mapZoom);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pd.planta_situacao_config]);

  // ── Dados do projeto ──
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const utmX = parseFloat(String(pd.coord_utm_x || '').replace(',', '.')) || null;
  const utmY = parseFloat(String(pd.coord_utm_y || '').replace(',', '.')) || null;
  const utmFusoRaw = String(pd.coord_utm_fuso || '');
  const utmZone = parseInt(utmFusoRaw) || 22;
  const coords = utmX && utmY ? utmToLatLng(utmX, utmY, utmZone) : null;
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
  const dataDoc    = String(pd.data_documento || new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
  const hasCoords  = !!(utmX && utmY);
  const hasToken   = !!mapboxToken;

  // ── Helpers de posição ──
  const getPct = useCallback((e: React.MouseEvent) => {
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

  // ── Desenhar retângulo ──
  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const p = getPct(e);
    setDrawStart(p);
    setRect({ x1: p.x, y1: p.y, x2: p.x, y2: p.y, color: rectColor, thickness: rectThickness });
  }, [mode, getPct, rectColor, rectThickness]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode !== 'draw' || !drawStart) return;
    const p = getPct(e);
    setRect(prev => prev ? { ...prev, x2: p.x, y2: p.y } : null);
  }, [mode, drawStart, getPct]);

  const handleMapMouseUp = useCallback(() => {
    if (mode === 'draw' && drawStart) { setDrawStart(null); setMode('view'); }
  }, [mode, drawStart]);

  // ── Arrastar tarja de endereço ──
  const handleLabelMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw') return;
    e.stopPropagation(); e.preventDefault();
    setLabelDrag({ isDragging: true, ...getDragOffset(e, labelPos) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, labelPos]);

  // ── Arrastar tag de identificação ──
  const handleInfoMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw') return;
    e.stopPropagation(); e.preventDefault();
    setInfoDrag({ isDragging: true, ...getDragOffset(e, infoPos) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, infoPos]);

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
    };
    const onUp = () => {
      if (labelDrag.isDragging) setLabelDrag(p => ({ ...p, isDragging: false }));
      if (infoDrag.isDragging) setInfoDrag(p => ({ ...p, isDragging: false }));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [labelDrag, infoDrag]);

  // ── Salvar config ──
  const handleSave = async () => {
    if (!onSaveConfig) return;
    setSaving(true);
    try {
      await onSaveConfig({ rect, labelPos: { ...labelPos, rotation: labelRotation }, infoPos: { ...infoPos, rotation: infoRotation }, mapZoom });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) { console.error('Erro ao salvar config planta:', err); }
    finally { setSaving(false); }
  };

  // ── Gerar PDF ──
  const handleGeneratePdf = async () => {
    if (!previewRef.current) return;
    setGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 0,
        filename: `Planta de Situacao - ${clientName || 'projeto'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, allowTaint: true, width: previewRef.current.offsetWidth, height: previewRef.current.offsetHeight },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(previewRef.current).save();
    } catch (err) { console.error('Erro ao gerar PDF:', err); }
    finally { setGenerating(false); }
  };

  // ── Atualizar cor/espessura do retângulo existente ──
  const applyRectColor = (c: string) => { setRectColor(c); setRect(prev => prev ? { ...prev, color: c } : prev); };
  const applyRectThickness = (t: number) => { setRectThickness(t); setRect(prev => prev ? { ...prev, thickness: t } : prev); };

  return (
    <>
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
          <span>Preencha <strong>Coordenadas UTM X, Y e Fuso</strong> nas informações do projeto.</span>
        </div>
      )}

      {/* Barra de controles */}
      {onSaveConfig && (
        <div className="flex flex-wrap gap-2 mb-4 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Marcar propriedade */}
          <Button size="sm" variant={mode === 'draw' ? 'default' : 'outline'}
            onClick={() => setMode(mode === 'draw' ? 'view' : 'draw')}
            className={mode === 'draw' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}>
            <Square className="h-3.5 w-3.5 mr-1.5" />
            {mode === 'draw' ? 'Desenhando... clique e arraste' : 'Marcar Propriedade'}
          </Button>
          {rect && (
            <Button size="sm" variant="outline" onClick={() => setRect(null)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Limpar
            </Button>
          )}

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Cor da linha */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Cor:</span>
            {COLORS.map(c => (
              <button key={c} onClick={() => applyRectColor(c)} title={c}
                style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: c, border: rectColor === c ? '2.5px solid #333' : '1.5px solid #ccc', cursor: 'pointer', flexShrink: 0 }} />
            ))}
          </div>

          {/* Espessura */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Esp:</span>
            {THICKNESS_OPTIONS.map(t => (
              <button key={t} onClick={() => applyRectThickness(t)}
                className={`text-xs px-1.5 py-0.5 rounded border ${rectThickness === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

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

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Rotação da tarja (rua) */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Rot. rua:</span>
            <button onClick={() => setLabelRotation(r => r - 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
            <span className="text-xs w-8 text-center font-mono">{labelRotation}°</span>
            <button onClick={() => setLabelRotation(r => r + 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Rotação da tag de propriedade */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Rot. prop.:</span>
            <button onClick={() => setInfoRotation(r => r - 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">−</button>
            <span className="text-xs w-8 text-center font-mono">{infoRotation}°</span>
            <button onClick={() => setInfoRotation(r => r + 5)} className="text-sm font-bold w-6 h-6 flex items-center justify-center rounded border bg-white border-gray-400 hover:bg-gray-100 leading-none">+</button>
          </div>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Salvar */}
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : saved ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              : <Save className="h-3.5 w-3.5 mr-1.5" />}
            {saved ? 'Salvo!' : 'Salvar'}
          </Button>

          <span className="text-xs text-gray-400 ml-1">Arraste as tags para reposicionar</span>
        </div>
      )}

      {/* ══ Prancha A4 ══ */}
      <div
        ref={previewRef}
        style={{
          width: '210mm',
          height: '297mm',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          color: '#000',
          margin: '0 auto',
          padding: '8mm 10mm 8mm 10mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Área do mapa */}
        <div
          ref={mapRef}
          style={{
            border: '1px solid #333',
            width: '100%',
            height: '152mm',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#c8d8c8',
            cursor: mode === 'draw' ? 'crosshair' : 'default',
            flexShrink: 0,
          }}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
          onMouseUp={handleMapMouseUp}
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
          <div style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.93)', border: '1.5px solid #333', borderRadius: 4, padding: '5px 8px 4px', textAlign: 'center', pointerEvents: 'none', lineHeight: 1 }}>
            <svg width="14" height="18" viewBox="0 0 14 18" style={{ display: 'block', margin: '0 auto' }}>
              <polygon points="7,0 2,9 5,7 5,18 9,18 9,7 12,9" fill="#cc0000" />
            </svg>
            <div style={{ fontWeight: 'bold', fontSize: '8pt', lineHeight: 1, marginTop: 3 }}>N</div>
          </div>

          {/* PIN estilo Google Maps */}
          <svg width="24" height="32" viewBox="0 0 24 32" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', pointerEvents: 'none', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))' }}>
            <path d="M12 1C6.5 1 2 5.5 2 11c0 7 10 20 10 20s10-13 10-20C22 5.5 17.5 1 12 1z" fill="#e53e3e" stroke="white" strokeWidth="1.2" />
            <circle cx="12" cy="11" r="4.5" fill="white" />
          </svg>

          {/* Tag identificação (cliente/UC/coords) — arrastável */}
          {(hasCoords || clientName || uc) && (
            <div
              style={{ position: 'absolute', left: `${infoPos.x}%`, top: `${infoPos.y}%`, transform: `translate(-50%, -50%) rotate(${infoRotation}deg)`, backgroundColor: 'rgba(255,255,255,0.93)', border: '1.5px solid #333', borderRadius: 4, padding: '4px 8px', fontSize: '7pt', lineHeight: 1.6, whiteSpace: 'nowrap', zIndex: 10, cursor: infoDrag.isDragging ? 'grabbing' : (mode === 'draw' ? 'crosshair' : 'grab'), userSelect: 'none' }}
              onMouseDown={handleInfoMouseDown}
            >
              {clientName && <div><strong>Cliente:</strong> {clientName}</div>}
              {uc         && <div><strong>UC:</strong> {uc}</div>}
              {hasCoords  && <>
                <div><strong>X:</strong> {utmX?.toFixed(0)} | <strong>Y:</strong> {utmY?.toFixed(0)}</div>
                <div><strong>Fuso:</strong> {utmFusoRaw || utmZone}</div>
              </>}
            </div>
          )}

          {/* Retângulo desenhado */}
          {rect && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <rect
                x={`${Math.min(rect.x1, rect.x2)}%`} y={`${Math.min(rect.y1, rect.y2)}%`}
                width={`${Math.abs(rect.x2 - rect.x1)}%`} height={`${Math.abs(rect.y2 - rect.y1)}%`}
                fill={rect.color + '15'} stroke={rect.color} strokeWidth={rect.thickness}
              />
            </svg>
          )}

          {/* Tarja de endereço — arrastável + rotacionável */}
          {address && (
            <div
              style={{ position: 'absolute', left: `${labelPos.x}%`, top: `${labelPos.y}%`, transform: `translate(-50%, -50%) rotate(${labelRotation}deg)`, backgroundColor: 'rgba(255,255,255,0.93)', border: '1.5px solid #333', borderRadius: 3, padding: '2px 8px', fontSize: '7pt', fontWeight: 'bold', lineHeight: 1.2, cursor: labelDrag.isDragging ? 'grabbing' : (mode === 'draw' ? 'crosshair' : 'grab'), userSelect: 'none', whiteSpace: 'nowrap', zIndex: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseDown={handleLabelMouseDown}
            >
              {address}
            </div>
          )}
        </div>

        {/* Espaço que empurra o selo para o final da folha */}
        <div style={{ flex: 1 }} />

        {/* ═══ SELO ═══ — scale(0.5) para contornar fonte mínima do browser em html2canvas */}
        <div style={{ position: 'relative', width: '100%', height: '120px', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: 'scale(0.5)', width: '200%', height: '240px', border: '2.4px solid #000', display: 'flex', flexDirection: 'row', boxSizing: 'border-box', overflow: 'hidden', backgroundColor: '#fff' }}>

            {/* LEFT COLUMN */}
            <div style={{ width: '28%', borderRight: '1.6px solid #000', display: 'flex', flexDirection: 'column', height: '240px', boxSizing: 'border-box' }}>
              <div style={{ height: '60px', borderBottom: '1.4px solid #000', padding: '4px 8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>PRODUTO</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>GFV {potencia ? `${potencia} kWp` : '___'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', height: '180px' }}>
                <div style={{ flex: 1, borderRight: '1.2px solid #000', display: 'flex', flexDirection: 'column' }}>
                  {(['DATA', 'ESCALA', 'TAMANHO', 'FOLHA', 'REVISÃO'] as const).map((lbl, i) => {
                    const vals = [dataDoc, 'S/ ESCALA', 'A4', '1/1', 'R0'];
                    return (
                      <div key={lbl} style={{ height: i < 4 ? '32px' : '52px', borderBottom: i < 4 ? '1px solid #000' : undefined, padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: i < 4 ? 'space-between' : 'center', overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', fontWeight: 'bold', lineHeight: 1 }}>{lbl}</span>
                        <span style={{ fontSize: '11px', textAlign: 'center', lineHeight: 1 }}>{vals[i]}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ width: '28%', display: 'flex', flexDirection: 'column' }}>
                  {['R1:', 'R2:', 'R3:', 'R4:', 'R5:'].map((r, i) => (
                    <div key={r} style={{ height: i < 4 ? '32px' : '52px', borderBottom: i < 4 ? '1px solid #000' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', boxSizing: 'border-box' }}>{r}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* MIDDLE COLUMN */}
            <div style={{ flex: 1, borderRight: '1.6px solid #000', display: 'flex', flexDirection: 'column', height: '240px', boxSizing: 'border-box' }}>
              <div style={{ height: '60px', borderBottom: '1.4px solid #000', padding: '4px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', alignSelf: 'flex-start' }}>TÍTULO</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1 }}>PLANTA DE SITUAÇÃO</div>
              </div>
              <div style={{ height: '96px', borderBottom: '1px solid #000', padding: '4px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', overflow: 'hidden' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>Proprietário e Obra:</div>
                <div style={{ fontSize: '12px', lineHeight: 1 }}>Nome: {clientName || '___'}</div>
                <div style={{ fontSize: '12px', lineHeight: 1 }}>Endereço: {address || '___'}</div>
                <div style={{ fontSize: '12px', lineHeight: 1 }}>Cidade: {estado ? `${cidade} - ${estado}` : cidade || '___'}</div>
                <div style={{ fontSize: '12px', lineHeight: 1 }}>CEP: {cep || '___'}</div>
              </div>
              <div style={{ height: '84px', padding: '4px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', overflow: 'hidden' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: 1 }}>Responsável Técnico:</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: 1 }}>{respNome || '___'}</div>
                <div style={{ fontSize: '11px', lineHeight: 1 }}>TÉCNICO EM ELETROTÉCNICA</div>
                <div style={{ fontSize: '11px', lineHeight: 1 }}>CFT: {respCft || '___'}</div>
              </div>
            </div>

            {/* RIGHT COLUMN — Logo */}
            <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', height: '240px', boxSizing: 'border-box' }}>
              {logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                : null}
            </div>
          </div>
        </div>
      </div>

      {/* Botão PDF — fora da área impressa */}
      <div className="mt-6 flex justify-center">
        <Button onClick={handleGeneratePdf} disabled={generating} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-base font-semibold shadow-lg">
          {generating
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
            : <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Planta de Situação</>}
        </Button>
      </div>
    </>
  );
}
