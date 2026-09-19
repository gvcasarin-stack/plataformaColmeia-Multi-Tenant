'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getAllModulos, getAllInversores, getTotalKwpFromModulos, getTotalInversorKw, fmtBR } from '@/lib/utils/equipmentParser';

interface FormularioRegistroANEELPreviewProps {
  projectData?: Record<string, any>;
}

// Converte grau decimal (ex: -8.050944) para Grau/Minuto/Segundo, formato
// exigido por este formulário (ex: 8°03'03.4"S). Direção: N/S pela latitude,
// L/W pela longitude, conforme o sinal do valor decimal.
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

const MODALIDADE_LABEL: Record<string, string> = {
  'Autoconsumo Local': 'Geração na própria UC',
  'Autoconsumo Remoto': 'Autoconsumo remoto',
  'Geração Compartilhada': 'Geração compartilhada',
};

const T: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '11px', fontFamily: 'Arial, sans-serif', lineHeight: 1.35 };
const B = '1px solid #000000';
const LBL: React.CSSProperties = { border: B, padding: '5px 8px', fontWeight: 'bold' };
const VAL: React.CSSProperties = { border: B, padding: '5px 8px', fontWeight: 'normal' };
const VAL_EMPTY: React.CSSProperties = { ...VAL, color: '#8a8a8a' };
const TITLE: React.CSSProperties = { border: B, padding: '10px 24px', textAlign: 'center', fontWeight: 'bold', fontSize: '11.5px' };
const BAR: React.CSSProperties = { border: B, padding: '5px 8px', textAlign: 'center', fontWeight: 'bold' };
const SUBHEAD: React.CSSProperties = { border: B, padding: '7px 24px', textAlign: 'center', fontWeight: 'bold' };
const PAIR: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' };
const LBL2: React.CSSProperties = { fontWeight: 'bold', marginLeft: '32px' };

export function FormularioRegistroANEELPreview({ projectData = {} }: FormularioRegistroANEELPreviewProps) {
  const [downloading, setDownloading] = useState(false);
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

  const handleGeneratePdf = async () => {
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { FormularioRegistroANEELPDF } = await import('./FormularioRegistroANEELPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Formulário de Registro ANEEL - ${clientName}.pdf`;
      const blob = await pdf(React.createElement(FormularioRegistroANEELPDF, { projectData })).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao gerar PDF do Formulário de Registro ANEEL:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div style={{ background: '#6b6f76', padding: '28px 16px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '794px', background: '#FFFFFF', boxShadow: '0 8px 28px rgba(0,0,0,.35)', boxSizing: 'border-box', color: '#000000', paddingBottom: '48px' }}>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/cabecalho-aneel.png" alt="ANEEL - Agência Nacional de Energia Elétrica" style={{ width: '100%', display: 'block', padding: '18px 24px 10px', boxSizing: 'border-box' }} />

          <div style={{ margin: '0 24px', border: B }}>
            <table style={T}>
              <colgroup><col style={{ width: '40%' }} /><col style={{ width: '60%' }} /></colgroup>
              <tbody>
                <tr><td style={TITLE} colSpan={2}>Dados que deverão ser encaminhados à Distribuidora para registro da unidade consumidora no sistema de compensação de energia regido pela REN 482, de 17 de abril de 2012</td></tr>

                <tr><td style={BAR} colSpan={2}>CENTRAL GERADORA SOLAR FOTOVOLTAICA:</td></tr>
                <tr><td style={LBL}>Modalidade:</td><td style={VAL}>{modalidade}</td></tr>
                <tr><td style={LBL}>Quantidade de UCs que recebem os créditos:</td><td style={VAL}>{qtdUcsCreditos}</td></tr>
                <tr>
                  <td style={LBL}>Classe:</td>
                  <td style={VAL}>
                    <div style={PAIR}>
                      <span>{get('classe_uc')}</span>
                      <span style={LBL2}>Subgrupo:</span>
                      <span>B1</span>
                    </div>
                  </td>
                </tr>
                <tr><td style={LBL}>Município/UF da UC com GD:</td><td style={VAL}>{municipio}</td></tr>
                <tr><td style={LBL}>Endereço da UC com GD:</td><td style={VAL}>{endereco}</td></tr>
                <tr><td style={LBL}>CEP da UC com GD:</td><td style={VAL}>{get('cliente_cep')}</td></tr>

                <tr><td style={SUBHEAD} colSpan={2}>Coordenadas Geodésicas (SIRGAS2000) da localização da usina em Grau, Minuto e Segundo:</td></tr>
                <tr><td style={LBL}>Latitude:</td><td style={VAL}>{toDMS(get('latitude'), 'lat')}</td></tr>
                <tr><td style={LBL}>Longitude:</td><td style={VAL}>{toDMS(get('longitude'), 'lon')}</td></tr>

                <tr><td style={BAR} colSpan={2}>TITULAR:</td></tr>
                <tr><td style={LBL}>CPF/CNPJ do Titular:</td><td style={VAL}>{get('cpf_cnpj_cliente_final')}</td></tr>
                <tr><td style={LBL}>Nome do Titular da UC com GD:</td><td style={VAL}>{get('nomeClienteFinal')}</td></tr>
                <tr><td style={LBL}>Telefone do Titular (DDD + número):</td><td style={VAL}>{get('cliente_celular') || get('cliente_telefone_fixo')}</td></tr>
                <tr><td style={LBL}>E-mail do Titular:</td><td style={VAL}>{get('cliente_email') ? <a href={`mailto:${get('cliente_email')}`} style={{ color: '#1155cc' }}>{get('cliente_email')}</a> : ''}</td></tr>

                <tr><td style={SUBHEAD} colSpan={2}>Dados do titular para correspondência:</td></tr>
                <tr><td style={LBL}>Município:</td><td style={VAL}>{municipio}</td></tr>
                <tr><td style={LBL}>Endereço:</td><td style={VAL}>{endereco}</td></tr>
                <tr><td style={LBL}>CEP:</td><td style={VAL}>{get('cliente_cep')}</td></tr>

                <tr><td style={BAR} colSpan={2}>DADOS DA CENTRAL GERADORA:</td></tr>
                <tr><td style={LBL}>Potência Total dos Módulos (kW):</td><td style={VAL}>{fmtBR(getTotalKwpFromModulos(projectData))} kWp</td></tr>
                <tr><td style={LBL}>Quantidade de Módulos:</td><td style={VAL}>{qtdModulos || ''}</td></tr>
                <tr><td style={LBL}>Fabricante(s) dos Módulos:</td><td style={VAL}>{modulosList[0]?.fabricante || ''}</td></tr>
                <tr><td style={LBL}>Modelo(s) dos Módulos:</td><td style={VAL}>{modulosList[0]?.modelo || ''}</td></tr>
                <tr><td style={LBL}>Potência Total dos Inversores (kW):</td><td style={VAL}>{fmtBR(getTotalInversorKw(projectData))} kW</td></tr>
                <tr><td style={LBL}>Fabricante(s) dos Inversores:</td><td style={VAL}>{inversoresList[0]?.fabricante || ''}</td></tr>
                <tr><td style={LBL}>Modelo(s) dos Inversores:</td><td style={VAL}>{inversoresList[0]?.modelo || ''}</td></tr>
                <tr><td style={LBL}>Área Total dos Arranjos (m²):</td><td style={VAL}>{areaTotalArranjos ? `${fmtBR(areaTotalArranjos)} m²` : ''}</td></tr>
                <tr><td style={LBL}>Data da implantação da unidade geradora:</td><td style={VAL}>{dataOperacao}</td></tr>
                <tr><td style={LBL}>Data da conexão da unidade geradora na Distribuidora:</td><td style={VAL}>{dataOperacao}</td></tr>

                <tr><td style={SUBHEAD} colSpan={2}>Preencha os próximos dados somente se a usina possuir Outorga ou Registro.<br />Se não aplicável, mantenha os campos vazios:</td></tr>
                <tr><td style={LBL}>CEG do empreendimento - GGG.FF.UF.999999-9.VV:</td><td style={VAL_EMPTY}>&nbsp;</td></tr>
                <tr><td style={LBL}>Nome da Usina:</td><td style={VAL_EMPTY}>&nbsp;</td></tr>
                <tr><td style={LBL}>Tipo do Ato de Outorga ou Registro:</td><td style={VAL_EMPTY}>&nbsp;</td></tr>
                <tr><td style={LBL}>Número do Ato de Outorga ou Registro:</td><td style={VAL_EMPTY}>&nbsp;</td></tr>
                <tr><td style={LBL}>Ano do Ato de Outorga ou Registro:</td><td style={VAL_EMPTY}>&nbsp;</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
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
              Gerar PDF do Formulário de Registro
            </>
          )}
        </Button>
      </div>
    </>
  );
}
