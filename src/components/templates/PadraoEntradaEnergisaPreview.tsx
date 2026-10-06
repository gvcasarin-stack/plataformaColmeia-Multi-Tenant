'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface PadraoEntradaEnergisaPreviewProps {
  projectData?: Record<string, any>;
}

function DocHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo-grupo-energisa.png" alt="Grupo Energisa" style={{ width: '100px', height: 'auto', display: 'block' }} />
      </div>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: '12pt', fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: '10pt', fontWeight: 700, marginTop: '4px' }}>{subtitle}</div>
      </div>
      <div style={{ width: '100px' }} />
    </div>
  );
}

// "6" -> "6,0" (mesma notação com uma casa decimal usada no desenho original);
// valores que já vêm com vírgula (ex.: "2,5") ficam como estão.
function fmtMm2(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.includes(',') ? v : `${v},0`;
}

const POLOS_LABEL: Record<string, string> = { '1': 'Monopolar', '2': 'Bipolar', '3': 'Tripolar' };
const CONEXAO_ADJ: Record<string, string> = { 'Monofásico': 'monofásica', 'Bifásico': 'bifásica', 'Trifásico': 'trifásica' };

export function PadraoEntradaEnergisaPreview({ projectData = {} }: PadraoEntradaEnergisaPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const get = (key: string) => String(projectData[key] || '').trim();

  // ✅ Qual padrão exibir: Tipo de Conexão (Conferir Informações > Padrão de
  // Entrada). "Trifásico" mostra o desenho trifásico; qualquer outro valor
  // (inclusive vazio) mostra o monofásico — o bifásico ainda não tem desenho
  // próprio e será adicionado depois.
  const isTrifasico = get('tipo_conexao') === 'Trifásico';

  // Campos já existentes no projeto (grupo "Padrão de Entrada" do Conferir
  // Informações) — nenhum campo novo foi criado para este documento.
  const secaoFaseRL = get('secao_fase_rl_mm2');
  const secaoNeutroRL = get('secao_neutro_rl_mm2');
  const caboMultiplex = secaoFaseRL && secaoNeutroRL
    ? `${isTrifasico ? '3x1x' : '1x1x'}${secaoFaseRL}+${secaoNeutroRL}`
    : '';

  const secaoFase = fmtMm2(get('secao_fase_mm2'));
  const secaoNeutro = fmtMm2(get('secao_neutro_mm2'));
  const secaoAterramento = get('secao_aterramento_mm2');

  const disjuntorCorrente = get('disjuntor_corrente_a');
  const disjuntorPolosLabel = POLOS_LABEL[get('disjuntor_polos')] || '';
  // Monofásico: a imagem não traz "Monopolar", então o rótulo completo (polos + corrente)
  // é sobreposto. Trifásico: a imagem já traz "Disjuntor Tripolar" impresso, falta só a corrente.
  const disjuntorLabel = [disjuntorPolosLabel, disjuntorCorrente ? `${disjuntorCorrente} A` : ''].filter(Boolean).join(' ');
  const disjuntorCorrenteLabel = disjuntorCorrente ? `${disjuntorCorrente} A` : '';

  const conexaoAdj = CONEXAO_ADJ[get('tipo_conexao')] || '';
  const caixaMedicaoCorrente = disjuntorCorrente ? `${disjuntorCorrente} A` : '';

  const handleGeneratePdf = async () => {
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PadraoEntradaEnergisaPDF } = await import('./PadraoEntradaEnergisaPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Detalhe Padrão de Entrada - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(PadraoEntradaEnergisaPDF, { projectData })
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF do Detalhe Padrão de Entrada:', err);
    } finally {
      setDownloading(false);
    }
  };

  const Botao = (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <Button
        onClick={handleGeneratePdf}
        disabled={downloading}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base font-semibold shadow-lg"
      >
        {downloading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Gerando PDF...
          </>
        ) : (
          <>
            <FileDown className="mr-2 h-5 w-5" />
            Gerar PDF do Detalhe Padrão de Entrada
          </>
        )}
      </Button>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#000', maxWidth: '700px', margin: '0 auto', padding: '8px' }}>
      <div style={{ marginBottom: '18px' }}>{Botao}</div>

      <DocHeader title="DETALHE CONSTRUTIVO DO PADRÃO DE ENTRADA" subtitle="GERAÇÃO DISTRIBUÍDA" />

      {/* ===================================================================
          Imagem original (mono ou trifásico, conforme Tipo de Conexão) +
          campos variáveis sobrepostos nos pontos/posições testados no
          protótipo — só os valores passam a vir do projeto em vez de texto
          de teste.
          ================================================================= */}
      {isTrifasico ? (
        <svg viewBox="0 0 312.6 220" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Detalhe construtivo do padrão de entrada trifásico, com os campos de bitola de cabo, disjuntor e caixa de medição preenchidos conforme o projeto.">
          <image href="/images/energisa-pde-tri.png" x="0" y="0" width="312.6" height="220" preserveAspectRatio="xMidYMid meet" />

          <g fontFamily="Arial, Helvetica, sans-serif" fill="#1c3f73" fontWeight={700}>
            <text x="60.8" y="10.2" fontSize="4.0">aço galvanizado</text>

            {caboMultiplex && <text x="43.8" y="41.3" fontSize="4.0">{caboMultiplex}</text>}

            <text x="82.8" y="64.9" fontSize="4.0">{'Ø1"'}</text>

            {caixaMedicaoCorrente && <text x="70.1" y="81.3" fontSize="3.6">{caixaMedicaoCorrente}</text>}
            {disjuntorCorrenteLabel && <text x="69.4" y="94.0" fontSize="4.0">{disjuntorCorrenteLabel}</text>}

            {secaoAterramento && <text x="63.8" y="119.4" fontSize="4.0">{`${fmtMm2(secaoAterramento)} mm²`}</text>}

            <text x="173.8" y="110.9" fontSize="3.5">PVC 70° - 1,0 kV</text>
            {secaoFase && <text x="149.8" y="115.9" fontSize="3.3">{`3#${secaoFase} mm² (Fases)`}</text>}
            {secaoNeutro && <text x="149.8" y="121.0" fontSize="3.3">{`1#${secaoNeutro} mm² (Neutro)`}</text>}
            {secaoAterramento && <text x="149.8" y="126.0" fontSize="3.3">{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</text>}
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 222.5 219" style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Detalhe construtivo do padrão de entrada monofásico, com os campos de bitola de cabo, disjuntor e caixa de medição preenchidos conforme o projeto.">
          <image href="/images/energisa-pde-mono-2.png" x="0" y="0" width="222.5" height="219" preserveAspectRatio="xMidYMid meet" />

          <g fontFamily="Arial, Helvetica, sans-serif" fill="#1c3f73" fontWeight={700}>
            {caboMultiplex && <text x="54.45" y="38.6" fontSize="4.0">{caboMultiplex}</text>}

            {secaoFase && <text x="158.75" y="42.9" fontSize="3.5">{`1#${secaoFase} mm² (Fases)`}</text>}
            {secaoNeutro && <text x="158.75" y="47.1" fontSize="3.5">{`1#${secaoNeutro} mm² (Neutro)`}</text>}
            {secaoAterramento && <text x="158.75" y="51.2" fontSize="3.5">{`1#${fmtMm2(secaoAterramento)} mm² (Terra)`}</text>}

            <text x="77.45" y="62.4" fontSize="4.0">{'Ø3/4"'}</text>
            <text x="138.95" y="60.6" fontSize="4.0">{'Ø3/4"'}</text>

            {disjuntorLabel && <text x="54.35" y="94.7" fontSize="4.0">{disjuntorLabel}</text>}

            {conexaoAdj && <text x="162.85" y="77.7" fontSize="3.6">{conexaoAdj}</text>}
            {caixaMedicaoCorrente && <text x="157.35" y="82.5" fontSize="3.6">{caixaMedicaoCorrente}</text>}

            {secaoAterramento && <text x="76.45" y="117.4" fontSize="4.0">{`${fmtMm2(secaoAterramento)} mm²`}</text>}
          </g>
        </svg>
      )}

      <div style={{ marginTop: '18px' }}>{Botao}</div>
    </div>
  );
}
