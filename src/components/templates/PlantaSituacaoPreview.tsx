'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, MapPin, AlertCircle } from 'lucide-react';

interface PlantaSituacaoPreviewProps {
  projectData?: Record<string, any>;
}

// Converte UTM (SIRGAS 2000 / WGS84) para lat/lng — hemisfério sul
function utmToLatLng(easting: number, northing: number, zone: number): { lat: number; lng: number } | null {
  try {
    const k0 = 0.9996;
    const a = 6378137.0;
    const e2 = 0.00669437999014;

    const x = easting - 500000.0;
    const y = northing - 10000000.0; // hemisfério sul

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

export function PlantaSituacaoPreview({ projectData }: PlantaSituacaoPreviewProps) {
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const pd = projectData || {};

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const utmX = parseFloat(String(pd.coord_utm_x || '').replace(',', '.')) || null;
  const utmY = parseFloat(String(pd.coord_utm_y || '').replace(',', '.')) || null;
  const utmZone = parseInt(String(pd.coord_utm_fuso || '22')) || 22;

  const coords = utmX && utmY ? utmToLatLng(utmX, utmY, utmZone) : null;

  const mapImageUrl =
    mapboxToken && coords
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${coords.lng.toFixed(6)},${coords.lat.toFixed(6)},18,0/800x520@2x?access_token=${mapboxToken}`
      : null;

  const clientName = String(pd.nomeClienteFinal || '');
  const address = String(pd.endereco_local || '');
  const uc = String(pd.conta_contrato || pd.numero_uc || '');
  const respNome = String(pd.responsavel_nome || '');
  const respCrea = String(pd.responsavel_registro || '');
  const cidade = String(pd.client_city || '');
  const estado = String(pd.client_state || '');
  const potencia = String(pd.potencia || '');
  const dataDoc = String(
    pd.data_documento ||
      new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  );

  const hasCoords = !!(utmX && utmY);
  const hasToken = !!mapboxToken;

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
      {!hasToken && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Token Mapbox não configurado. Adicione{' '}
            <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> no{' '}
            <code className="bg-amber-100 px-1 rounded">.env.local</code> para exibir a imagem de satélite.
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

      <div className="flex justify-end mb-4">
        <Button onClick={handleGeneratePdf} disabled={generating} size="sm" variant="outline">
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          {generating ? 'Gerando PDF...' : 'Baixar PDF'}
        </Button>
      </div>

      {/* A4 page preview */}
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
          padding: '10mm 12mm',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            borderBottom: '2px solid #000',
            paddingBottom: '8px',
            marginBottom: '10px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '14pt',
              letterSpacing: '3px',
              marginBottom: '8px',
            }}
          >
            PLANTA DE SITUAÇÃO
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <strong>Cliente:</strong> {clientName || '______________________________'}
            </div>
            <div>
              <strong>N° UC / Contrato:</strong> {uc || '______________________'}
            </div>
          </div>
          <div style={{ fontSize: '9pt', marginTop: '4px' }}>
            <strong>Endereço:</strong>{' '}
            {[address, cidade, estado].filter(Boolean).join(', ') || '______________________________'}
          </div>
        </div>

        {/* Área do mapa */}
        <div
          style={{
            border: '1px solid #333',
            width: '100%',
            height: '170mm',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#c8d8c8',
            marginBottom: '6px',
          }}
        >
          {mapImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mapImageUrl}
              alt="Imagem de satélite do local"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                color: '#555',
                gap: '10px',
              }}
            >
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
              {hasCoords && coords && (
                <span style={{ fontSize: '8pt', color: '#777' }}>
                  Lat: {coords.lat.toFixed(6)}° | Lon: {coords.lng.toFixed(6)}°
                </span>
              )}
            </div>
          )}

          {/* Seta Norte */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: 'rgba(255,255,255,0.90)',
              border: '1.5px solid #333',
              borderRadius: '4px',
              padding: '4px 7px',
              textAlign: 'center',
              minWidth: '32px',
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '16pt', lineHeight: '1', color: '#c00' }}>↑</div>
            <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>N</div>
          </div>

          {/* Marcador central (visível apenas quando há imagem) */}
          {mapImageUrl && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
                fontSize: '24pt',
                lineHeight: '1',
                color: '#e53e3e',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
                pointerEvents: 'none',
              }}
            >
              ▼
            </div>
          )}

          {/* Barra de escala */}
          {mapImageUrl && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                left: '10px',
                backgroundColor: 'rgba(255,255,255,0.85)',
                border: '1px solid #444',
                borderRadius: '3px',
                padding: '3px 8px',
                fontSize: '7.5pt',
              }}
            >
              Escala aproximada 1:500 | Zoom 18
            </div>
          )}
        </div>

        {/* Coordenadas */}
        {hasCoords && (
          <div style={{ fontSize: '8pt', color: '#333', marginBottom: '8px' }}>
            <strong>Coordenadas UTM (SIRGAS 2000):</strong> E {utmX?.toFixed(2)} | N {utmY?.toFixed(2)} | Fuso{' '}
            {utmZone}S
            {coords && (
              <span>
                {' '}
                &nbsp;|&nbsp; <strong>WGS84:</strong> {coords.lat.toFixed(6)}°, {coords.lng.toFixed(6)}°
              </span>
            )}
          </div>
        )}

        {/* Rodapé — bloco de assinatura */}
        <div
          style={{
            borderTop: '1px solid #000',
            paddingTop: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '8px',
          }}
        >
          <div style={{ fontSize: '8.5pt' }}>
            <div>
              <strong>Sistema Fotovoltaico{potencia ? ` — ${potencia} kWp` : ''}</strong>
            </div>
            <div style={{ marginTop: '2px' }}>Geração Distribuída — Microgeração Solar Fotovoltaica</div>
            <div style={{ marginTop: '2px', color: '#555' }}>{dataDoc}</div>
          </div>

          <div style={{ textAlign: 'center', fontSize: '8.5pt' }}>
            <div
              style={{
                borderTop: '1px solid #000',
                width: '200px',
                paddingTop: '5px',
                textAlign: 'center',
              }}
            >
              <div>{respNome || 'Responsável Técnico'}</div>
              {respCrea && <div>CREA/CFT Nº {respCrea}</div>}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
