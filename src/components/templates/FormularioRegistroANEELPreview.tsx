'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface FormularioRegistroANEELPreviewProps {
  projectData?: Record<string, any>;
}

export function FormularioRegistroANEELPreview({ projectData = {} }: FormularioRegistroANEELPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const get = (key: string) => projectData[key] || '';

  const T: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '9pt',
    fontFamily: 'Arial, sans-serif',
  };

  const ROW: React.CSSProperties = {
    padding: '4px 8px',
    border: '1px solid #bbb',
    verticalAlign: 'middle',
    fontSize: '9pt',
    backgroundColor: '#fff',
  };

  const ROWBOLD: React.CSSProperties = {
    ...ROW,
    fontWeight: 'bold',
  };

  const HEADER: React.CSSProperties = {
    padding: '5px 8px',
    border: '1px solid #bbb',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '9pt',
    backgroundColor: '#d9d9d9',
  };

  const SUBHEADER: React.CSSProperties = {
    padding: '5px 8px',
    border: '1px solid #bbb',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '9pt',
    backgroundColor: '#f2f2f2',
    fontStyle: 'italic',
  };

  const municipio = [get('client_city'), get('client_state')].filter(Boolean).join(' - ');
  const endereco = get('endereco_local');
  const potenciaModulos = get('potencia') ? `${get('potencia')} kWp` : '';
  const potenciaInversores = get('inversores_potencia') ? `${get('inversores_potencia')} kW` : '';
  const areaArranjos = get('modulos_area_m2') ? `${get('modulos_area_m2')} m²` : '';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#000', maxWidth: '800px', margin: '0 auto', padding: '8px' }}>

      {/* ── Cabeçalho com logo ANEEL ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px', gap: '16px' }}>
        <div style={{
          border: '2px solid #1a5276',
          padding: '6px 12px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#1a5276', letterSpacing: '1px' }}>
            <span style={{ color: '#27ae60' }}>E</span>
            <span style={{ color: '#27ae60' }}>➜</span>
            <span style={{ color: '#1a5276' }}> ANEEL</span>
          </div>
          <div style={{ fontSize: '6pt', color: '#555', lineHeight: '1.2' }}>
            AGÊNCIA NACIONAL<br />DE ENERGIA ELÉTRICA
          </div>
        </div>
      </div>

      {/* ── Texto introdutório ── */}
      <table style={T}>
        <tbody>
          <tr>
            <td style={{ ...ROW, textAlign: 'center', fontSize: '8.5pt' }}>
              Dados que deverão ser encaminhados à Distribuidora para registro da unidade consumidora no sistema de compensação de
              energia regido pela REN 482, de 17 de abril de 2012
            </td>
          </tr>
          <tr>
            <td style={HEADER}>CENTRAL GERADORA SOLAR FOTOVOLTAICA:</td>
          </tr>
        </tbody>
      </table>

      {/* ── Dados da UC ── */}
      <table style={{ ...T, marginTop: '0' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={ROW}>Modalidade:</td>
            <td style={ROW}>Geração na própria UC</td>
          </tr>
          <tr>
            <td style={ROW}>Quantidade de UCs que recebem os créditos:</td>
            <td style={ROW}>1</td>
          </tr>
          <tr>
            <td style={ROW}>Classe:</td>
            <td style={ROW}>
              {get('classe_tarifaria') || 'Residencial'}
              &nbsp;&nbsp;&nbsp;&nbsp;Subgrupo:&nbsp;&nbsp;{get('subgrupo') || 'B1'}
            </td>
          </tr>
          <tr>
            <td style={ROW}>Município/UF da UC com GD:</td>
            <td style={ROW}>{municipio}</td>
          </tr>
          <tr>
            <td style={ROW}>Endereço da UC com GD:</td>
            <td style={ROW}>{endereco}</td>
          </tr>
          <tr>
            <td style={ROW}>CEP da UC com GD:</td>
            <td style={ROW}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td colSpan={2} style={ROW}>
              Coordenadas Geodésicas (SIRGAS2000) da localização da usina em Grau, Minuto e Segundo:
            </td>
          </tr>
          <tr>
            <td style={ROW}>Latitude:</td>
            <td style={ROW}>{get('latitude')}</td>
          </tr>
          <tr>
            <td style={ROW}>Longitude:</td>
            <td style={ROW}>{get('longitude')}</td>
          </tr>
        </tbody>
      </table>

      {/* ── TITULAR ── */}
      <table style={{ ...T, marginTop: '0' }}>
        <tbody>
          <tr><td colSpan={2} style={HEADER}>TITULAR:</td></tr>
        </tbody>
      </table>
      <table style={{ ...T, marginTop: '0' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={ROW}>CPF/CNPJ do Titular:</td>
            <td style={ROW}>{get('cpf_cnpj_cliente_final')}</td>
          </tr>
          <tr>
            <td style={ROW}>Nome do Titular da UC com GD:</td>
            <td style={ROW}>{get('nomeClienteFinal')}</td>
          </tr>
          <tr>
            <td style={ROW}>Telefone do Titular (DDD + número):</td>
            <td style={ROW}>{get('cliente_celular') || get('cliente_telefone_fixo')}</td>
          </tr>
          <tr>
            <td style={ROW}>E-mail do Titular:</td>
            <td style={ROW}>{get('cliente_email')}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Dados do titular para correspondência ── */}
      <table style={{ ...T, marginTop: '0' }}>
        <tbody>
          <tr><td colSpan={2} style={SUBHEADER}>Dados do titular para correspondência:</td></tr>
        </tbody>
      </table>
      <table style={{ ...T, marginTop: '0' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={ROW}>Município:</td>
            <td style={ROW}>{municipio}</td>
          </tr>
          <tr>
            <td style={ROW}>Endereço:</td>
            <td style={ROW}>{endereco}</td>
          </tr>
          <tr>
            <td style={ROW}>CEP:</td>
            <td style={ROW}>{get('cliente_cep')}</td>
          </tr>
        </tbody>
      </table>

      {/* ── DADOS DA CENTRAL GERADORA ── */}
      <table style={{ ...T, marginTop: '0' }}>
        <tbody>
          <tr><td colSpan={2} style={HEADER}>DADOS DA CENTRAL GERADORA:</td></tr>
        </tbody>
      </table>
      <table style={{ ...T, marginTop: '0' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={ROW}>Potência Total dos Módulos (kW):</td>
            <td style={ROW}>{potenciaModulos}</td>
          </tr>
          <tr>
            <td style={ROW}>Quantidade de Módulos:</td>
            <td style={ROW}>{get('modulos_quantidade')}</td>
          </tr>
          <tr>
            <td style={ROW}>Fabricante(s) dos Módulos:</td>
            <td style={ROW}>{get('modulos_fabricante')}</td>
          </tr>
          <tr>
            <td style={ROW}>Modelo(s) dos Módulos:</td>
            <td style={ROW}>{get('modulos_modelo')}</td>
          </tr>
          <tr>
            <td style={ROW}>Potência Total dos Inversores (kW):</td>
            <td style={ROW}>{potenciaInversores}</td>
          </tr>
          <tr>
            <td style={ROW}>Fabricante(s) dos Inversores:</td>
            <td style={ROW}>{get('inversores_fabricante')}</td>
          </tr>
          <tr>
            <td style={ROW}>Modelo(s) dos Inversores:</td>
            <td style={ROW}>{get('inversores_modelo')}</td>
          </tr>
          <tr>
            <td style={ROW}>Área Total dos Arranjos (m²):</td>
            <td style={ROW}>{areaArranjos}</td>
          </tr>
          <tr>
            <td style={ROW}>Data da implantação da unidade geradora:</td>
            <td style={ROW}>{get('data_inicio_operacao')}</td>
          </tr>
          <tr>
            <td style={ROW}>Data da conexão da unidade geradora na Distribuidora:</td>
            <td style={ROW}>{get('data_inicio_operacao')}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Outorga / Registro ── */}
      <table style={{ ...T, marginTop: '0' }}>
        <tbody>
          <tr>
            <td style={{ ...SUBHEADER, fontWeight: 'bold' }}>
              Preencha os próximos dados somente se a usina possuiu Outorga ou Registro.
            </td>
          </tr>
          <tr>
            <td style={{ ...SUBHEADER, fontWeight: 'bold' }}>
              Se não aplicável, mantenha os campos vazios:
            </td>
          </tr>
        </tbody>
      </table>
      <table style={{ ...T, marginTop: '0' }}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={2} style={ROW}>CEG do empreendimento - GGG.FF.UF.999999-9.VV:</td>
          </tr>
          <tr>
            <td colSpan={2} style={ROW}>Nome da Usina:</td>
          </tr>
          <tr>
            <td colSpan={2} style={ROW}>Tipo do Ato de Outorga ou Registro:</td>
          </tr>
          <tr>
            <td colSpan={2} style={ROW}>Número do Ato de Outorga ou Registro:</td>
          </tr>
          <tr>
            <td colSpan={2} style={ROW}>Ano do Ato de Outorga ou Registro:</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ ...ROW, height: '20px' }}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* ── Botão PDF ── */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={() => {}}
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
    </div>
  );
}
