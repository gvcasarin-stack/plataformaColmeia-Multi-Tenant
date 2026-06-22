'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, MapPin, AlertCircle, Square, Trash2, Save, Check } from 'lucide-react';

interface PlantaConfig {
  rect?: { x1: number; y1: number; x2: number; y2: number } | null;
  labelPos?: { x: number; y: number };
}

interface PlantaSituacaoPreviewProps {
  projectData?: Record<string, any>;
  onSaveConfig?: (config: PlantaConfig) => Promise<void>;
}

// Converte UTM (SIRGAS 2000 / WGS84) para lat/lng — hemisfério sul
function utmToLatLng(easting: number, northing: number, zone: number): { lat: number; lng: number } | null {
  try {
    const k0 = 0.9996;
    const a = 6378137.0;
    const e2 = 0.00669437999014;
    const x = easting - 500000.0;
    const y = northing - 10000000.0;
    const lon0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
    const M = y / k0;
    const ei = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
    const phi1 =
      mu +
      ((3 * ei) / 2 - (27 * Math.pow(ei, 3)) / 32) * Math.sin(2 * mu) +
      ((21 * ei * ei) / 16 - (55 * Math.pow(ei, 4)) / 32) * Math.sin(4 * mu) +
      ((151 * Math.pow(ei, 3)) / 96) * Math.sin(6 * mu) +
      ((1097 * Math.pow(ei, 4)) / 512) * Math.sin(8 * mu);
    const sinP = Math.sin(phi1);
    const tanP = Math.tan(phi1);
    const cosP = Math.cos(phi1);
    const N1 = a / Math.sqrt(1 - e2 * sinP * sinP);
    const T1 = tanP * tanP;
    const C1 = (e2 / (1 - e2)) * cosP * cosP;
    const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinP * sinP, 1.5);
    const D = x / (N1 * k0);
    const lat =
      phi1 -
      (N1 * tanP / R1) *
        (D * D / 2 -
          ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) * Math.pow(D, 4)) / 24 +
          ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * (e2 / (1 - e2)) - 3 * C1 * C1) * Math.pow(D, 6)) / 720);
    const lon =
      lon0 +
      (D -
        ((1 + 2 * T1 + C1) * Math.pow(D, 3)) / 6 +
        ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * (e2 / (1 - e2)) + 24 * T1 * T1) * Math.pow(D, 5)) / 120) /
        cosP;
    return { lat: lat * (180 / Math.PI), lng: lon * (180 / Math.PI) };
  } catch {
    return null;
  }
}

export function PlantaSituacaoPreview({ projectData, onSaveConfig }: PlantaSituacaoPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'view' | 'draw'>('view');
  const [rect, setRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [labelPos, setLabelPos] = useState({ x: 50, y: 82 });
  const [labelDrag, setLabelDrag] = useState({ isDragging: false, offsetX: 0, offsetY: 0 });

  const previewRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const pd = projectData || {};

  // Carrega config salva
  useEffect(() => {
    if (!pd.planta_situacao_config) return;
    try {
      const cfg: PlantaConfig = JSON.parse(String(pd.planta_situacao_config));
      if (cfg.rect) setRect(cfg.rect);
      if (cfg.labelPos) setLabelPos(cfg.labelPos);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pd.planta_situacao_config]);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const utmX = parseFloat(String(pd.coord_utm_x || '').replace(',', '.')) || null;
  const utmY = parseFloat(String(pd.coord_utm_y || '').replace(',', '.')) || null;
  const utmFusoRaw = String(pd.coord_utm_fuso || '');
  const utmZone = parseInt(utmFusoRaw) || 22;
  const coords = utmX && utmY ? utmToLatLng(utmX, utmY, utmZone) : null;
  const mapImageUrl =
    mapboxToken && coords
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${coords.lng.toFixed(6)},${coords.lat.toFixed(6)},17,0/800x520@2x?access_token=${mapboxToken}`
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
  const dataDoc    = String(
    pd.data_documento ||
      new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  );

  const hasCoords = !!(utmX && utmY);
  const hasToken  = !!mapboxToken;

  // ── Desenho do retângulo ────────────────────────────────────────────────────
  const getPct = useCallback((e: React.MouseEvent) => {
    if (!mapRef.current) return { x: 0, y: 0 };
    const b = mapRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - b.left) / b.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - b.top) / b.height) * 100)),
    };
  }, []);

  const handleMapMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode !== 'draw') return;
    e.preventDefault();
    const p = getPct(e);
    setDrawStart(p);
    setRect({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  }, [mode, getPct]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent) => {
    if (mode !== 'draw' || !drawStart) return;
    const p = getPct(e);
    setRect({ x1: drawStart.x, y1: drawStart.y, x2: p.x, y2: p.y });
  }, [mode, drawStart, getPct]);

  const handleMapMouseUp = useCallback(() => {
    if (mode === 'draw' && drawStart) {
      setDrawStart(null);
      setMode('view');
    }
  }, [mode, drawStart]);

  // ── Arrastar tarja de endereço ──────────────────────────────────────────────
  const handleLabelMouseDown = useCallback((e: React.MouseEvent) => {
    if (mode === 'draw') return;
    e.stopPropagation();
    e.preventDefault();
    if (!mapRef.current) return;
    const b = mapRef.current.getBoundingClientRect();
    const curX = (labelPos.x / 100) * b.width + b.left;
    const curY = (labelPos.y / 100) * b.height + b.top;
    setLabelDrag({ isDragging: true, offsetX: e.clientX - curX, offsetY: e.clientY - curY });
  }, [mode, labelPos]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!labelDrag.isDragging || !mapRef.current) return;
      const b = mapRef.current.getBoundingClientRect();
      const x = Math.max(5, Math.min(95, ((e.clientX - labelDrag.offsetX - b.left) / b.width) * 100));
      const y = Math.max(5, Math.min(95, ((e.clientY - labelDrag.offsetY - b.top) / b.height) * 100));
      setLabelPos({ x, y });
    };
    const onUp = () => {
      if (labelDrag.isDragging) setLabelDrag(prev => ({ ...prev, isDragging: false }));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [labelDrag]);

  // ── Salvar config ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!onSaveConfig) return;
    setSaving(true);
    try {
      await onSaveConfig({ rect, labelPos });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Erro ao salvar config planta:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── PDF ─────────────────────────────────────────────────────────────────────
  const handleGeneratePdf = async () => {
    if (!previewRef.current) return;
    setGenerating(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `Planta de Situacao - ${clientName || 'projeto'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(previewRef.current)
        .save();
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* ── Avisos (fora da área impressa) ── */}
      {!hasToken && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Token Mapbox não configurado. Adicione{' '}
            <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> nas variáveis de
            ambiente para exibir a imagem de satélite.
          </span>
        </div>
      )}
      {!hasCoords && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-sm text-blue-800">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Preencha os campos <strong>Coordenadas UTM X, Y e Fuso</strong> nas informações do projeto para
            posicionar o mapa automaticamente.
          </span>
        </div>
      )}

      {/* ── Controles interativos (fora da área impressa) ── */}
      {onSaveConfig && (
        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <Button
            size="sm"
            variant={mode === 'draw' ? 'default' : 'outline'}
            onClick={() => setMode(mode === 'draw' ? 'view' : 'draw')}
            className={mode === 'draw' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            <Square className="h-3.5 w-3.5 mr-1.5" />
            {mode === 'draw' ? 'Clique e arraste no mapa...' : 'Marcar Propriedade'}
          </Button>
          {rect && (
            <Button size="sm" variant="outline" onClick={() => setRect(null)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar Marcação
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
            {saving
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : saved
              ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              : <Save className="h-3.5 w-3.5 mr-1.5" />}
            {saved ? 'Salvo!' : 'Salvar posições'}
          </Button>
          <span className="text-xs text-gray-400">
            Arraste a tarja de endereço para reposicioná-la
          </span>
        </div>
      )}

      {/* ══ Prancha A4 ══ */}
      <div
        ref={previewRef}
        style={{
          width: '210mm',
          minHeight: '297mm',
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10pt',
          color: '#000000',
          margin: '0 auto',
          padding: '8mm 10mm 0 10mm',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Área do mapa */}
        <div
          ref={mapRef}
          style={{
            border: '1px solid #333',
            width: '100%',
            height: '155mm',
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
            <img
              src={mapImageUrl}
              alt="Imagem de satélite do local"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              crossOrigin="anonymous"
              draggable={false}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#555', gap: '10px' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: '10pt', textAlign: 'center', maxWidth: '280px' }}>
                {!hasToken
                  ? 'Configure NEXT_PUBLIC_MAPBOX_TOKEN para exibir a imagem de satélite'
                  : !hasCoords
                  ? 'Preencha as coordenadas UTM para posicionar o mapa'
                  : 'Carregando mapa de satélite...'}
              </span>
            </div>
          )}

          {/* Seta Norte — canto superior direito com espaçamento adequado */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(255,255,255,0.93)',
            border: '1.5px solid #333',
            borderRadius: '4px',
            padding: '5px 8px 4px',
            textAlign: 'center',
            minWidth: '34px',
          }}>
            <div style={{ fontWeight: 'bold', fontSize: '14pt', lineHeight: '1.3', color: '#c00' }}>↑</div>
            <div style={{ fontWeight: 'bold', fontSize: '8pt', lineHeight: '1', marginTop: '1px' }}>N</div>
          </div>

          {/* PIN central */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -100%)',
            fontSize: '24pt',
            lineHeight: '1',
            color: '#e53e3e',
            textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            pointerEvents: 'none',
          }}>▼</div>

          {/* Caixinha de identificação — à esquerda do PIN */}
          {(hasCoords || clientName || uc) && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(calc(-100% - 16px), -50%)',
              backgroundColor: 'rgba(255,255,255,0.93)',
              border: '1.5px solid #333',
              borderRadius: '4px',
              padding: '5px 8px',
              fontSize: '7pt',
              lineHeight: '1.65',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              {clientName && <div><strong>Cliente:</strong> {clientName}</div>}
              {uc         && <div><strong>UC:</strong> {uc}</div>}
              {hasCoords  && (
                <>
                  <div><strong>X:</strong> {utmX?.toFixed(0)} | <strong>Y:</strong> {utmY?.toFixed(0)}</div>
                  <div><strong>Fuso:</strong> {utmFusoRaw || utmZone}</div>
                </>
              )}
            </div>
          )}

          {/* Retângulo vermelho (desenhado pelo usuário) */}
          {rect && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <rect
                x={`${Math.min(rect.x1, rect.x2)}%`}
                y={`${Math.min(rect.y1, rect.y2)}%`}
                width={`${Math.abs(rect.x2 - rect.x1)}%`}
                height={`${Math.abs(rect.y2 - rect.y1)}%`}
                fill="rgba(229,62,62,0.08)"
                stroke="#e53e3e"
                strokeWidth="2.5"
              />
            </svg>
          )}

          {/* Tarja de endereço — arrastável */}
          {address && (
            <div
              style={{
                position: 'absolute',
                left: `${labelPos.x}%`,
                top: `${labelPos.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255,255,255,0.93)',
                border: '1.5px solid #333',
                borderRadius: '3px',
                padding: '3px 10px',
                fontSize: '7pt',
                fontWeight: 'bold',
                cursor: labelDrag.isDragging ? 'grabbing' : (mode === 'draw' ? 'crosshair' : 'grab'),
                userSelect: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
              onMouseDown={handleLabelMouseDown}
            >
              {address}
            </div>
          )}
        </div>

        {/* Espaço flexível que empurra o selo para o final da folha */}
        <div style={{ flex: 1 }} />

        {/* ═══ SELO ═══ */}
        <div style={{ border: '1.2px solid #000', display: 'flex', flexDirection: 'row', width: '100%', fontFamily: 'Arial, sans-serif', height: '120px', boxSizing: 'border-box', overflow: 'hidden' }}>

          {/* LEFT — produto / data / escala */}
          <div style={{ width: '28%', borderRight: '0.8px solid #000', display: 'flex', flexDirection: 'column', height: '120px' }}>
            <div style={{ height: '30px', borderBottom: '0.7px solid #000', padding: '2px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold' }}>PRODUTO</div>
              <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center' }}>GFV {potencia ? `${potencia} kWp` : '___'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', height: '90px' }}>
              <div style={{ flex: 1, borderRight: '0.6px solid #000', display: 'flex', flexDirection: 'column' }}>
                {(['DATA', 'ESCALA', 'TAMANHO', 'FOLHA', 'REVISÃO'] as const).map((label, i) => {
                  const values = [dataDoc, 'S/ ESCALA', 'A4', '1/1', 'R0'];
                  const h = i < 4 ? '16px' : '26px';
                  return (
                    <div key={label} style={{ height: h, borderBottom: i < 4 ? '0.5px solid #000' : undefined, padding: '1px 3px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: i < 4 ? 'space-between' : 'center', overflow: 'hidden' }}>
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

          {/* MIDDLE — título / proprietário / responsável */}
          <div style={{ flex: 1, borderRight: '0.8px solid #000', display: 'flex', flexDirection: 'column', height: '120px' }}>
            <div style={{ height: '30px', borderBottom: '0.7px solid #000', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', alignSelf: 'flex-start' }}>TÍTULO</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.1 }}>PLANTA DE SITUAÇÃO</div>
            </div>
            <div style={{ height: '48px', borderBottom: '0.5px solid #000', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', overflow: 'hidden' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1 }}>Proprietário e Obra:</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>Nome: {clientName || '___'}</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>Endereço: {address || '___'}</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>Cidade: {estado ? `${cidade} - ${estado}` : cidade || '___'}</div>
              <div style={{ fontSize: '6px', lineHeight: 1 }}>CEP: {cep || '___'}</div>
            </div>
            <div style={{ height: '42px', padding: '2px 6px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', overflow: 'hidden' }}>
              <div style={{ fontSize: '5.5px', fontWeight: 'bold', lineHeight: 1 }}>Responsável Técnico:</div>
              <div style={{ fontSize: '6px', fontWeight: 'bold', lineHeight: 1 }}>{respNome || '___'}</div>
              <div style={{ fontSize: '5.5px', lineHeight: 1 }}>TÉCNICO EM ELETROTÉCNICA</div>
              <div style={{ fontSize: '5.5px', lineHeight: 1 }}>CFT: {respCft || '___'}</div>
            </div>
          </div>

          {/* RIGHT — Logo */}
          <div style={{ width: '20%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', height: '120px', boxSizing: 'border-box' }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              : null}
          </div>
        </div>
      </div>

      {/* ── Botão PDF (fora da área impressa) ── */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleGeneratePdf}
          disabled={generating}
          size="lg"
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
        >
          {generating
            ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PDF...</>
            : <><FileDown className="mr-2 h-5 w-5" />Gerar PDF Planta de Situação</>}
        </Button>
      </div>
    </>
  );
}
