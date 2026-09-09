'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getTotalKwpFromModulos, getTotalInversorKw } from '@/lib/utils/equipmentParser';

interface EnergisaGDPreviewProps {
  projectData?: Record<string, any>;
}

// Estilos reutilizados entre as folhas (mesma convenção de AnexoFCPFLPreview.tsx)
const T: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '8.5pt',
  fontFamily: 'Arial, sans-serif',
  marginTop: '10px',
};

const BAR: React.CSSProperties = {
  backgroundColor: '#29ade0',
  color: '#ffffff',
  fontWeight: 'bold',
  padding: '4px 6px',
  border: '1px solid #aaa',
  fontSize: '8.5pt',
  textAlign: 'center',
};

const LBL: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid #aaa',
  fontSize: '8.5pt',
  backgroundColor: '#fff',
  fontWeight: 'bold',
};

const VAL: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid #aaa',
  fontSize: '8.5pt',
  backgroundColor: '#fff',
};

const VALC: React.CSSProperties = { ...VAL, textAlign: 'center' };

function SheetLabel({ n }: { n: number }) {
  return (
    <div style={{ fontSize: '8pt', color: '#888', marginTop: '28px', marginBottom: '2px' }}>
      Folha {n} de 6
    </div>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div style={{ marginTop: '24px', textAlign: 'center' }}>
      <div style={{ width: '260px', margin: '0 auto', borderTop: '1px solid #111' }} />
      <span style={{ fontSize: '8.5pt', fontWeight: 'bold' }}>{label}</span>
    </div>
  );
}

export function EnergisaGDPreview({ projectData = {} }: EnergisaGDPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const get = (key: string) => projectData[key] || '';

  const potenciaGeracaoKwp = getTotalKwpFromModulos(projectData) || parseFloat(String(get('potencia')).replace(',', '.')) || 0;
  const potenciaInversoresKw = getTotalInversorKw(projectData);

  const handleGeneratePdf = async () => {
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { EnergisaGDPDF } = await import('./EnergisaGDPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Formulário GD Energisa - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(EnergisaGDPDF, { projectData })
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
      console.error('Erro ao gerar PDF do Formulário GD Energisa:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#000', maxWidth: '800px', margin: '0 auto', padding: '8px' }}>

      {/* ══════════════════ Folha 1: Formulário de Orçamento de Conexão ══════════════════ */}
      <SheetLabel n={1} />
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>FORMULÁRIO DE ORÇAMENTO DE CONEXÃO</div>
        <div style={{ fontSize: '10pt', fontWeight: 'bold', marginTop: '2px' }}>GERAÇÃO DISTRIBUÍDA</div>
      </div>

      <table style={T}>
        <colgroup>
          {Array.from({ length: 12 }).map((_, i) => <col key={i} style={{ width: `${100 / 12}%` }} />)}
        </colgroup>
        <tbody>
          <tr><td colSpan={12} style={BAR}>1. IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA - UC</td></tr>
          <tr>
            <td colSpan={3} style={LBL}>Código do cliente (UC):</td>
            <td colSpan={5} style={VALC}>{get('conta_contrato')}</td>
            <td colSpan={1} style={LBL}>Classe:</td>
            <td colSpan={3} style={VALC}>{get('classe_uc')}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Titular da UC:</td>
            <td colSpan={9} style={VALC}>{get('nomeClienteFinal').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Logradouro:</td>
            <td colSpan={9} style={VALC}>{get('endereco_local').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={1} style={LBL}>N°:</td>
            <td colSpan={1} style={VALC}>{get('numero_endereco_cliente')}</td>
            <td colSpan={2} style={LBL}>Bairro:</td>
            <td colSpan={2} style={VALC}>{get('bairro_cliente')}</td>
            <td colSpan={1} style={LBL}>UF:</td>
            <td colSpan={1} style={VALC}>{get('client_state')}</td>
            <td colSpan={1} style={LBL}>CEP:</td>
            <td colSpan={3} style={VALC}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={4} style={VAL}>{get('cliente_email')}</td>
            <td colSpan={2} style={LBL}>Cidade:</td>
            <td colSpan={4} style={VALC}>{get('client_city')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Telefone:</td>
            <td colSpan={4} style={VALC}>{get('cliente_telefone_fixo')}</td>
            <td colSpan={2} style={LBL}>Celular:</td>
            <td colSpan={4} style={VALC}>{get('cliente_celular')}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>CNPJ/CPF:</td>
            <td colSpan={9} style={VALC}>{get('cpf_cnpj_cliente_final')}</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>2. DADOS DA UNIDADE CONSUMIDORA NO ATO DA VISTORIA - UC</td></tr>
          <tr>
            <td colSpan={4} style={LBL}>Potência Instalada (kW):</td>
            <td colSpan={2} style={VALC}>{potenciaInversoresKw ? potenciaInversoresKw.toFixed(0) : ''}</td>
            <td colSpan={4} style={LBL}>Tensão de Atendimento (V):</td>
            <td colSpan={2} style={VALC}>{get('tensao_atendimento')}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Tipo de Conexão:</td>
            <td colSpan={9} style={VALC}>{get('tipo_conexao').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Tipo de Ramal:</td>
            <td colSpan={9} style={VALC}>{get('tipo_ramal').toUpperCase()}</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>3. DADOS DA GERAÇÃO</td></tr>
          <tr>
            <td colSpan={5} style={LBL}>Potência Instalada de Geração (kWp):</td>
            <td colSpan={7} style={VALC}>{potenciaGeracaoKwp ? potenciaGeracaoKwp.toFixed(2).replace('.', ',') : ''}</td>
          </tr>
          <tr>
            <td colSpan={3} style={LBL}>Tipo da Fonte de Geração:</td>
            <td colSpan={3} style={VALC}>SOLAR FOTOVOLTAICA</td>
            <td colSpan={2} style={LBL}>Tipo de Geração:</td>
            <td colSpan={4} style={VAL}>Empregando conversor eletrônico/inversor</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>5. CONTATOS NA DISTRIBUIDORA</td></tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, backgroundColor: '#d9d9d9' }}>Empresa</td>
            <td colSpan={10} style={VALC}>Energisa</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...LBL, backgroundColor: '#d9d9d9' }}>Telefone</td>
            <td colSpan={3} style={VALC}>0800 728 2891</td>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={5} style={VAL}>geracaodistribuida.eto@energisa.com.br</td>
          </tr>

          <tr><td colSpan={12} style={BAR}>6. DADOS DO RESPONSÁVEL TÉCNICO:</td></tr>
          <tr>
            <td colSpan={3} style={LBL}>Cliente/Procurador Legal:</td>
            <td colSpan={9} style={VALC}>{get('responsavel_legal_nome').toUpperCase()}</td>
          </tr>
          <tr>
            <td colSpan={2} style={LBL}>Telefone</td>
            <td colSpan={4} style={VALC}>{get('responsavel_legal_telefone')}</td>
            <td colSpan={2} style={LBL}>E-mail:</td>
            <td colSpan={4} style={VAL}>{get('responsavel_legal_email')}</td>
          </tr>
        </tbody>
      </table>

      <SignatureBlock label="Assinatura do Responsável" />

      {/* Demais folhas (2-6) são adicionadas nas próximas etapas */}

      <div className="mt-8 flex justify-center">
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
              Baixar PDF — Formulário GD Energisa
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
