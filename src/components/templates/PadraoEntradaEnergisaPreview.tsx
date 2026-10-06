'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface PadraoEntradaEnergisaPreviewProps {
  projectData?: Record<string, any>;
}

// "6" -> "6,0" (mesma notação com uma casa decimal usada no desenho original);
// valores que já vêm com vírgula (ex.: "2,5") ficam como estão.
function fmtMm2(raw: string): string {
  const v = String(raw || '').trim();
  if (!v) return '';
  return v.includes(',') ? v : `${v},0`;
}

function fv(val: any, fb = '___'): string {
  if (val === undefined || val === null || val === '') return fb;
  return String(val);
}

const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function formatDataBR(raw: string): string {
  const str = raw.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
  const match = str.toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zçã]+)\s+de\s+(\d{4})$/i);
  if (match) {
    const monthIndex = MESES_PT.indexOf(match[2]);
    if (monthIndex !== -1) return `${match[1].padStart(2, '0')}/${String(monthIndex + 1).padStart(2, '0')}/${match[3]}`;
  }
  return str;
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

  // ✅ Selo no mesmo padrão do Diagrama Unifilar / Diagrama de Blocos (mesmos
  // campos e mesmas chaves de projeto), em vez de um selo próprio.
  const potKwp = (() => {
    const n = parseFloat(String(projectData?.potencia || '0').replace(',', '.'));
    return n > 0 ? n.toFixed(2).replace('.', ',') : '0,00';
  })();
  const owner = fv(projectData?.nomeClienteFinal, 'NOME DO PROPRIETÁRIO');
  const endereco = fv(projectData?.endereco_local, 'ENDEREÇO DA OBRA');
  const cidade = fv(projectData?.client_city, 'Cidade');
  const uf = fv(projectData?.client_state, '');
  const cep = fv(projectData?.cliente_cep, '00.000-000');
  const respNome = fv(projectData?.responsavel_nome, 'RESPONSÁVEL TÉCNICO');
  const respCft = fv(projectData?.responsavel_registro, '00000000000');
  const dataDoc = formatDataBR(fv(projectData?.data_documento, new Date().toLocaleDateString('pt-BR')));
  const logoUrl = projectData?.logo_empresa_url;

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
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <div style={{ marginBottom: '18px' }}>{Botao}</div>

      {/* ===================================================================
          Prancha A3 paisagem (420x297mm) — mesma formatação de folha usada
          no protótipo (quadro NBR 10068, margem de 25mm p/ encadernação,
          marcas de centragem), com o selo no padrão do Diagrama Unifilar /
          Diagrama de Blocos (mesmos campos: Produto, Data/Escala/Tamanho/
          Folha/Revisão, Título, Proprietário e Obra, Responsável Técnico,
          logo da empresa).
          ================================================================= */}
      <div style={{ overflow: 'auto' }}>
        <svg
          viewBox="0 0 420 297"
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: '700px' }}
          role="img"
          aria-label={`Prancha A3 com o detalhe construtivo do padrão de entrada ${isTrifasico ? 'trifásico' : 'monofásico'}, com os campos do projeto preenchidos e selo igual ao dos demais desenhos técnicos.`}
        >
          {/* ===== fundo da folha + borda de corte ===== */}
          <rect x="0" y="0" width="420" height="297" fill="#ffffff" />
          <rect x="0.5" y="0.5" width="419" height="296" fill="none" stroke="#161513" strokeWidth="0.6" />

          {/* ===== quadro de desenho (NBR 10068: margem esq. 25mm p/ encadernação) ===== */}
          <rect x="25" y="10" width="385" height="277" fill="none" stroke="#161513" strokeWidth="0.6" />

          {/* marcas de centragem */}
          <g stroke="#161513" strokeWidth="0.7">
            <line x1="217.5" y1="0.5" x2="217.5" y2="10" />
            <line x1="217.5" y1="287" x2="217.5" y2="296.5" />
            <line x1="0.5" y1="148.5" x2="25" y2="148.5" />
            <line x1="410" y1="148.5" x2="419.5" y2="148.5" />
          </g>

          {/* ===================================================================
              DETALHE CONSTRUTIVO — imagem original (mono ou trifásico) +
              campos variáveis sobrepostos, nas mesmas posições testadas no
              protótipo. Campo de desenho útil: x 25–410, y 10–253.
              ================================================================= */}
          {isTrifasico ? (
            <svg x="61.2" y="21.5" width="312.6" height="220" viewBox="0 0 312.6 220">
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
            <svg x="106.25" y="22" width="222.5" height="219" viewBox="0 0 222.5 219">
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

          {/* ===================================================================
              SELO — mesmo padrão do Diagrama Unifilar / Diagrama de Blocos
              (Produto | Data/Escala/Tamanho/Folha/Revisão | Título +
              Proprietário e Obra + Responsável Técnico | Logo da empresa).
              x 25–410, y 253–287 (altura 34mm).
              ================================================================= */}
          <g stroke="#161513" fill="none" strokeWidth="0.5">
            <line x1="90" y1="253" x2="90" y2="287" />
            <line x1="281" y1="253" x2="281" y2="287" />
            <line x1="25" y1="261.5" x2="281" y2="261.5" />
            <line x1="90" y1="275" x2="281" y2="275" strokeWidth="0.35" />
            <g strokeWidth="0.35">
              <line x1="25" y1="266.6" x2="90" y2="266.6" />
              <line x1="25" y1="271.7" x2="90" y2="271.7" />
              <line x1="25" y1="276.8" x2="90" y2="276.8" />
              <line x1="25" y1="281.9" x2="90" y2="281.9" />
            </g>
          </g>

          <g fontFamily="Arial, Helvetica, sans-serif" fill="#161513">
            {/* PRODUTO */}
            <text x="27" y="257.5" fontSize="2.3" fontWeight="bold">PRODUTO</text>
            <text x="57.5" y="260.3" fontSize="3.6" fontWeight="bold" textAnchor="middle">GFV {potKwp} kWp</text>

            {/* DATA / ESCALA / TAMANHO / FOLHA / REVISÃO */}
            <text x="27" y="264.0" fontSize="2.0" fontWeight="bold">DATA</text>
            <text x="57.5" y="266.1" fontSize="2.5" textAnchor="middle">{dataDoc}</text>

            <text x="27" y="269.1" fontSize="2.0" fontWeight="bold">ESCALA</text>
            <text x="57.5" y="271.2" fontSize="2.5" textAnchor="middle">S/ ESCALA</text>

            <text x="27" y="274.2" fontSize="2.0" fontWeight="bold">TAMANHO</text>
            <text x="57.5" y="276.3" fontSize="2.5" textAnchor="middle">A3</text>

            <text x="27" y="279.3" fontSize="2.0" fontWeight="bold">FOLHA</text>
            <text x="57.5" y="281.4" fontSize="2.5" textAnchor="middle">1/1</text>

            <text x="27" y="284.4" fontSize="2.0" fontWeight="bold">REVISÃO</text>
            <text x="57.5" y="286.5" fontSize="2.5" textAnchor="middle">R0</text>

            {/* TÍTULO */}
            <text x="93" y="257.5" fontSize="2.3" fontWeight="bold">TÍTULO</text>
            <text x="185.5" y="260.3" fontSize="4" fontWeight="bold" textAnchor="middle">DETALHE CONSTRUTIVO DO PADRÃO DE ENTRADA</text>

            {/* Proprietário e Obra */}
            <text x="185.5" y="264.3" fontSize="2.3" fontWeight="bold" textAnchor="middle">Proprietário e Obra:</text>
            <text x="185.5" y="267.0" fontSize="2.4" textAnchor="middle">Nome: {owner}</text>
            <text x="185.5" y="269.7" fontSize="2.4" textAnchor="middle">Endereço: {endereco}</text>
            <text x="185.5" y="272.4" fontSize="2.4" textAnchor="middle">Cidade: {uf ? `${cidade} - ${uf}` : cidade}</text>
            <text x="185.5" y="275.1" fontSize="2.4" textAnchor="middle">CEP: {cep}</text>

            {/* Responsável Técnico */}
            <text x="185.5" y="278.3" fontSize="2.3" fontWeight="bold" textAnchor="middle">Responsável Técnico:</text>
            <text x="185.5" y="281.2" fontSize="2.6" fontWeight="bold" textAnchor="middle">{respNome}</text>
            <text x="185.5" y="283.8" fontSize="2.2" textAnchor="middle">TÉCNICO EM ELETROTÉCNICA</text>
            <text x="185.5" y="286.4" fontSize="2.2" textAnchor="middle">CFT: {respCft}</text>
          </g>

          {logoUrl && (
            <image href={logoUrl} x="291" y="258" width="109" height="24" preserveAspectRatio="xMidYMid meet" />
          )}
        </svg>
      </div>

      <div style={{ marginTop: '18px' }}>{Botao}</div>
    </div>
  );
}
