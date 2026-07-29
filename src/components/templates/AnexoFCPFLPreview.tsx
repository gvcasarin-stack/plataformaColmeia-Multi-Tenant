'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { getAllModulos, getAllInversores, getTotalModulosQtd, getTotalInversoresQtd, getTotalKwpFromModulos, getTotalInversorKw, fmtBR } from '@/lib/utils/equipmentParser';

interface AnexoFCPFLPreviewProps {
  projectData?: Record<string, any>;
}

export function AnexoFCPFLPreview({ projectData = {} }: AnexoFCPFLPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const handleGeneratePdf = async () => {
    setDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { AnexoFCPFLPDF } = await import('./AnexoFCPFLPDF');
      const React = await import('react');
      const clientName = projectData?.nomeClienteFinal || 'projeto';
      const filename = `Anexo F - Formulário de Registro - ${clientName}.pdf`;
      const blob = await pdf(
        React.createElement(AnexoFCPFLPDF, { projectData })
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
      console.error('Erro ao gerar PDF do Anexo F:', err);
    } finally {
      setDownloading(false);
    }
  };

  const get = (key: string) => projectData[key] || '';

  // ✅ Seção 3 (UFV): calculado a partir das listas reais de módulos/inversores
  // cadastrados (podem ter mais de um modelo), em vez dos campos legados únicos —
  // que só refletiam o primeiro modelo cadastrado, mesmo havendo vários.
  const modulosListF = getAllModulos(projectData);
  const inversoresListF = getAllInversores(projectData);
  const modulosFabricantesF = Array.from(new Set(modulosListF.map(m => m.fabricante).filter(Boolean))).join(', ');
  const modulosModelosF = Array.from(new Set(modulosListF.map(m => m.modelo).filter(Boolean))).join(', ');
  const modulosQtdTotalF = getTotalModulosQtd(projectData);
  const inversoresFabricantesF = Array.from(new Set(inversoresListF.map(i => i.fabricante).filter(Boolean))).join(', ');
  const inversoresModelosF = Array.from(new Set(inversoresListF.map(i => i.modelo).filter(Boolean))).join(', ');
  const inversoresQtdTotalF = getTotalInversoresQtd(projectData);
  const modulosKwpTotalF = getTotalKwpFromModulos(projectData);
  const inversoresKwTotalF = getTotalInversorKw(projectData);

  const PADRAO_CABOS: Record<string, string> = {
    A1: '6 mm²',  A2: '16 mm²', A3: '6 mm²',  A4: '16 mm²',
    B1: '16 mm²', B2: '25 mm²', B3: '16 mm²',
    C1: '16 mm²', C2: '25 mm²', C3: '35 mm²',
    C4: '50 mm²', C5: '70 mm²', C6: '95 mm²',
    C7: '10 mm²', C8: '16 mm²', C9: '25 mm²',
    C10: '35 mm²', C11: '50 mm²',
  };

  // ✅ Mesmos rótulos usados no seletor "Categoria do Padrão de Entrada" do modal
  // Conferir Informações (ConferirInformacoesModal.tsx, CPFL_PADRAO_127_220/220_380)
  const PADRAO_ENTRADA_LABELS: Record<string, string> = {
    A1: 'A1 - GED 13',
    A2: 'A2 - GED 13',
    B1: 'B1 - GED 13',
    B2: 'B2 - GED 13',
    C1: 'C1 - GED 13',
    C2: 'C2 - GED 13',
    C3: 'C3 - GED 13',
    C4: 'C4 - GED 13',
    C5: 'C5 - GED 13',
    C6: 'C6 - GED 13',
    A3: 'A3 - GED 13',
    A4: 'A4 - GED 13',
    B3: 'B3 - GED 13',
    C7: 'C7 - GED 13',
    C8: 'C8 - GED 13',
    C9: 'C9 - GED 13',
    C10: 'C10 - GED 13',
    C11: 'C11 - GED 13',
  };

  const cabosSecao = PADRAO_CABOS[get('padrao_entrada')] || get('cabos_secao') || '';
  const caixaTipo  = get('cpfl_tipo_poste_padrao') || get('caixa_medicao_tipo') || '';
  const padraoEntradaLabel = PADRAO_ENTRADA_LABELS[get('padrao_entrada')] || get('padrao_entrada');
  // ✅ Seção 2b (Dados Técnicos — se Minigeração) só deve ser preenchida quando o
  // projeto for classificado como Minigeração; em Microgeração, os campos ficam em branco.
  const isMinigeracao = get('tipo_fornecimento') === 'Minigeração Distribuída';

  function decimalToDMS(decimal: string, type: 'lat' | 'lng'): string {
    const num = parseFloat(decimal);
    if (isNaN(num)) return decimal;
    const abs = Math.abs(num);
    const deg = Math.floor(abs);
    const minFull = (abs - deg) * 60;
    const min = Math.floor(minFull);
    const sec = ((minFull - min) * 60).toFixed(1);
    const dir = type === 'lat' ? (num >= 0 ? 'N' : 'S') : (num >= 0 ? 'E' : 'W');
    return `${deg}°${String(min).padStart(2, '0')}'${String(sec).padStart(4, '0')}"${dir}`;
  }

  const T: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '8.5pt',
    fontFamily: 'Arial, sans-serif',
    marginBottom: '0',
  };

  const SH: React.CSSProperties = {
    backgroundColor: '#4a4a4a',
    color: '#ffffff',
    fontWeight: 'bold',
    padding: '4px 6px',
    border: '1px solid #888',
    fontSize: '8.5pt',
  };

  const L: React.CSSProperties = {
    padding: '4px 6px',
    border: '1px solid #aaa',
    verticalAlign: 'top',
    fontSize: '8.5pt',
    backgroundColor: '#fff',
  };

  const V: React.CSSProperties = {
    padding: '4px 6px',
    border: '1px solid #aaa',
    verticalAlign: 'top',
    fontSize: '8.5pt',
    backgroundColor: '#fff',
  };

  const SHC: React.CSSProperties = { ...SH, textAlign: 'center' };
  const VC: React.CSSProperties = { ...V, textAlign: 'center' };
  const SP: React.CSSProperties = { height: '12px' };

  const municipio = [get('client_city'), get('client_state')].filter(Boolean).join(' - ');

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#000', maxWidth: '800px', margin: '0 auto', padding: '8px' }}>

      {/* Título */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <strong style={{ fontSize: '9.5pt' }}>
          ANEXO F – Dados para Registro de Micro e Minigeradores Distribuídos Participantes do
          <br />Sistema de Compensação de Energia Elétrica
        </strong>
      </div>

      {/* Parágrafos introdutórios */}
      <p style={{ textAlign: 'justify', marginBottom: '10px', lineHeight: '1.5' }}>
        Na ocasião da Solicitação de Acesso, as informações pedidas para este <strong>Anexo F</strong> são
        mandatórias e serão remetidas pela CPFL à ANEEL, conforme por esta própria determinado, após
        a liberação da conexão. O acessante deverá estar ciente de que a citada liberação também depende
        do correto preenchimento do que aqui se solicita. Este refere-se a cada unidade consumidora que
        tiver aprovada central de micro ou minigeração distribuída aderente ao sistema de compensação de
        energia elétrica e deverá ser preenchida pelo acessante (deixar em branco o que não se aplicar).
      </p>
      <p style={{ textAlign: 'justify', marginBottom: '14px', lineHeight: '1.5' }}>
        Na ocasião da Consulta de Acesso é incentivado que o acessante envie este anexo preenchido,
        em especial os itens marcados com asterisco. Somente com as informações destes itens será
        possível avaliar a viabilidade e estimar as obras em virtude da conexão de minigeradores.
        Sem eles, a Informação de Acesso da CPFL conterá apenas os dados elétricos da região em
        que pretende-se conexão.
      </p>

      {/* ── Seção 1: Dados da UC ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr><td colSpan={2} style={SH}>1) Dados da Unidade Consumidora (UC):</td></tr>
          <tr>
            <td style={L}>1.1) Nome do titular: *</td>
            <td style={V}>{get('nomeClienteFinal')}</td>
          </tr>
          <tr>
            <td style={L}>1.2) CNPJ ou CPF (titular): *</td>
            <td style={V}>{get('cpf_cnpj_cliente_final')}</td>
          </tr>
          <tr>
            <td style={L}>1.3) Número da UC (se existente) *</td>
            <td style={V}>{get('conta_contrato')}</td>
          </tr>
          <tr>
            <td style={L}>1.4) Endereço do titular</td>
            <td style={V}>{get('endereco_local').toUpperCase()}</td>
          </tr>
          <tr>
            <td style={L}>1.5) CEP do titular</td>
            <td style={V}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td style={L}>1.6) Município do titular</td>
            <td style={V}>{municipio.toUpperCase()}</td>
          </tr>
          <tr>
            <td style={L}>1.7) Latitude (SIRGAS 2000)</td>
            <td style={V}>{get('latitude') ? decimalToDMS(get('latitude'), 'lat') : ''}</td>
          </tr>
          <tr>
            <td style={L}>1.8) Longitude (SIRGAS 2000)</td>
            <td style={V}>{get('longitude') ? decimalToDMS(get('longitude'), 'lng') : ''}</td>
          </tr>
          <tr>
            <td style={L}>1.9) Telefone do titular:</td>
            <td style={V}>{get('cliente_celular') || get('cliente_telefone_fixo')}</td>
          </tr>
          <tr>
            <td style={L}>1.10) E-mail do titular:</td>
            <td style={V}>{get('cliente_email')}</td>
          </tr>
          <tr>
            <td style={L}>1.11) Usina foi objeto de Outorga ou Registro?</td>
            <td style={V}>☐ Sim &nbsp;&nbsp;&nbsp; ☒ Não &nbsp;&nbsp;&nbsp; Se sim, preencher os campos abaixo</td>
          </tr>
          <tr>
            <td style={L}>1.12) CEG</td>
            <td style={V}>&nbsp;</td>
          </tr>
          <tr>
            <td style={L}>1.13) Número do Ato de Outorga ou Registro</td>
            <td style={V}>&nbsp;</td>
          </tr>
          <tr>
            <td style={L}>1.14) Ano do Ato de Outorga ou Registro</td>
            <td style={V}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 2a: Microgeração ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '29%' }} />
          <col style={{ width: '29%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>2a) Dados Técnicos da Unidade Consumidora (se Microgeração)</td>
            <td style={SHC}>Existente</td>
            <td style={SHC}>Novo</td>
          </tr>
          <tr>
            <td style={L}>2.1) Padrão de Entrada (categoria - GED 13/RIC BT):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{padraoEntradaLabel}</td>
          </tr>
          <tr>
            <td style={L}>2.2) Tipo de Atendimento (aéreo/subterrâneo):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('tipo_ramal').toUpperCase()}</td>
          </tr>
          <tr>
            <td style={L}>2.3) Número de Fases da Instalação (Monofásico/Bifásico/Trifásico):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('fases_instalacao') ? String(get('fases_instalacao')).toUpperCase() : ''}</td>
          </tr>
          <tr>
            <td style={L}>2.4) Cabos (seção transversal):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{cabosSecao}</td>
          </tr>
          <tr>
            <td style={L}>2.5) Caixa de Medição ou Tipo de Poste Padrão (Caixa tipo / segundo GED 14945):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{caixaTipo}</td>
          </tr>
          <tr>
            <td style={L}>2.6) Demanda Disponibilizada (se MT) ou Carga Instalada (se BT):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('carga_declarada_kw')}</td>
          </tr>
          <tr>
            <td style={L}>2.7) Disjuntor (A):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('disjuntor_corrente_a')}</td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 2b: Minigeração ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>2b) Dados Técnicos da Unidade Consumidora (se Minigeração)</td>
            <td style={SHC}>Existente</td>
            <td style={SHC}>Acréscimo</td>
            <td style={SHC}>Total</td>
          </tr>
          {([
            ['2.1) Carga instalada (kW): *', '', '', ''],
            ['2.2) Demanda contratada (kW): *', '', '', ''],
            ['2.3) Quantidade de motores com potência acima de 75 CV: *', '', '', ''],
            ['2.4) Quantidade de motores com potência menor ou igual a 75 CV: *', '', '', ''],
            ['2.5) Potência instalada de geração (kVA): *', '', '', ''],
            ['2.6) Potência exportada de geração (kW): *', '', '', ''],
            ['2.7) Nome do responsável técnico: *', isMinigeracao ? get('responsavel_nome') : '', '', ''],
            ['2.8) Número do registro (CREA) do responsável técnico: *', isMinigeracao ? get('responsavel_registro') : '', '', ''],
            ['2.9) Número do telefone do responsável técnico:', '', '', ''],
            ['2.10) Data pretendida para entrada em operação (dd/mm/aaaa):', isMinigeracao ? get('data_inicio_operacao') : '', '', ''],
          ] as [string, string, string, string][]).map(([label, ex, ac, tot], i) => (
            <tr key={i}>
              <td style={L}>{label}</td>
              <td style={VC}>{ex || <>&nbsp;</>}</td>
              <td style={VC}>{ac || <>&nbsp;</>}</td>
              <td style={VC}>{tot || <>&nbsp;</>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 2c: Transformadores ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '14.5%' }} />
          <col style={{ width: '14.5%' }} />
          <col style={{ width: '14.5%' }} />
          <col style={{ width: '14.5%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>2c) Dados dos transformadores de acoplamento (se Minigeração)</td>
            <td style={SHC}>T1</td>
            <td style={SHC}>T2</td>
            <td style={SHC}>T3</td>
            <td style={SHC}>T4</td>
          </tr>
          {([
            '2.1) Potência Nominal (kVA): *',
            '2.2) Tensão Primária (kV): *',
            '2.3) Tensão Secundária (V): *',
            '2.4) Impedância de curto-circuito (Z%): *',
            '2.5) Configuração de ligação: *',
            '2.6) Tensão de geração/Saída do inversor (Vca): *',
          ]).map((label, i) => (
            <tr key={i}>
              <td style={L}>{label}</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 3: UFV ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>3) Dados Unidades Geradoras Fotovoltaicas Solares (UFV):</td>
            <td style={SHC}>Existente</td>
            <td style={SHC}>Acréscimo</td>
            <td style={SHC}>Total</td>
          </tr>
          <tr>
            <td style={L}>3.1) Quantidade total de módulos:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{modulosQtdTotalF > 0 ? modulosQtdTotalF : ''}</td>
          </tr>
          <tr>
            <td style={L}>3.2) Listar fabricantes dos módulos:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{modulosFabricantesF}</td>
          </tr>
          <tr>
            <td style={L}>3.3) Listar modelos dos módulos:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{modulosModelosF}</td>
          </tr>
          <tr>
            <td style={L}>3.4) Área total ocupada pelos arranjos (m²):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('modulos_area_m2')}</td>
          </tr>
          <tr>
            <td style={L}>3.5) Quantidade total de inversores:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{inversoresQtdTotalF > 0 ? inversoresQtdTotalF : ''}</td>
          </tr>
          <tr>
            <td style={L}>3.6) Listar fabricantes dos inversores:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{inversoresFabricantesF}</td>
          </tr>
          <tr>
            <td style={L}>3.7) Listar modelos dos inversores:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{inversoresModelosF}</td>
          </tr>
          <tr>
            <td style={L}>3.8) Potência de pico dos módulos (soma das potências dos módulos, kWp): *</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{modulosKwpTotalF > 0 ? `${fmtBR(modulosKwpTotalF)} kWp` : ''}</td>
          </tr>
          <tr>
            <td style={L}>3.9) Potência Nominal dos inversores (soma das potências nominais dos inversores, kW): *</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{inversoresKwTotalF > 0 ? `${fmtBR(inversoresKwTotalF)} kW` : ''}</td>
          </tr>
          <tr>
            <td style={L}>3.10) Data pretendida para entrada em operação (dd/mm/aaaa):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('data_inicio_operacao')}</td>
          </tr>
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 4: EOL ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>4) Dados das Unidades Geradoras Eólicas (EOL):</td>
            <td style={SHC}>Existente</td>
            <td style={SHC}>Acréscimo</td>
            <td style={SHC}>Total</td>
          </tr>
          {([
            '4.1) Fabricante do aerogerador:',
            '4.2) Modelo do aerogerador:',
            '4.3) Eixo rotor (horizontal ou vertical):',
            '4.4) Altura máxima da pá ou atingida pela estrutura (m):',
            '4.5) Potência dos inversores (soma das potências dos inversores, kW): *',
            '4.6) Potência dos aerogeradores (soma potências dos aerogeradores, kW): *',
            '4.7) Data pretendida para entrada em operação (dd/mm/aaaa):',
            '4.8) Fabricante, modelo e tipo de conexão dos inversores:',
            '4.9) Quantidade de inversores: *',
            '4.10) Potência (soma das potências nominais dos inversores, kW): *',
          ]).map((label, i) => (
            <tr key={i}>
              <td style={L}>{label}</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 5: Hidráulica ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>5) Dados das Unidades Geradoras Hidráulicas (CGH/PCH):</td>
            <td style={SHC}>Existente</td>
            <td style={SHC}>Acréscimo</td>
            <td style={SHC}>Total</td>
          </tr>
          {([
            '5.1) Rio onde se localiza a central geradora:',
            '5.2) Bacia onde se localiza o rio:',
            '5.3) Sub-bacia onde se localiza o rio:',
            '5.4) Tipo de turbina: *',
            '5.5) Potência turbina (soma potências nominais das turbinas, kVA): *',
            '5.6) Potência gerador (soma potências nominais dos geradores, kVA): *',
            '5.7) Fator de potência do gerador (entre 0 e 1): *',
            '5.8) Potência ativa do gerador (kW): *',
            '5.9) Potência aparente do gerador (kVA): *',
            '5.10) Tensão (kV):',
            '5.11) Nível Operacional Normal de Montante (m)',
            '5.12) Nível Operacional Normal de Jusante (m)',
            '5.13) Data pretendida para entrada em operação (dd/mm/aaaa):',
            '5.14) Fabricante, modelo e tipo de conexão dos inversores:',
            '5.15) Quantidade de inversores: *',
            '5.16) Potência (soma das potências nominais dos inversores, kW): *',
          ]).map((label, i) => (
            <tr key={i}>
              <td style={L}>{label}</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 6: Biomassa / Solar Térmica / Cogeração ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
          <col style={{ width: '19.33%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={SH}>6) Dados das Unidades Geradoras de Biomassa / Solar Térmica / Cogeração:</td>
            <td style={SHC}>Existente</td>
            <td style={SHC}>Acréscimo</td>
            <td style={SHC}>Total</td>
          </tr>
          {([
            '6.1) Fabricante e modelo:',
            '6.2) Potência (soma das potências nominais dos geradores, kVA): *',
            '6.3) Fator de potência (entre 0 e 1): *',
            '6.4) Potência ativa (kW): *',
            '6.5) Fonte (indicar segundo lista do Item 7 a seguir, conforme aplicável): *',
            '6.6) Data pretendida para entrada em operação (dd/mm/aaaa):',
            '6.7) Ciclo (aberto/fechado): *',
            '6.8) Máquina Motriz: *',
            '6.9) Número do Despacho de qualificação como cogeradora: *',
            '6.10) Data do Despacho: *',
            '6.11) Tensão Terminal Nominal (Vn kV)',
            '6.12) Reatância síncrona de eixo direto (Xd, em pu)',
            '6.13) Reatância transitória de eixo direto (Xd\', em pu)',
            '6.14) Reatância sub-transitória de eixo direto (Xd\'\', em pu)',
            '6.15) Reatância de sequência negativa (X2, em pu)',
            '6.16) Reatância de sequência zero (X0, em pu)',
            '6.17) Reatância síncrona de eixo em quadratura (Xq, em pu)',
            '6.18) Resistência do enrolamento de armadura (Ra, em pu)',
            '6.19) Constante de inércia, em segundos (H)',
            '6.20) Constante de amortecimento, em pu/pu. (D)',
            '6.21) Fabricante, modelo e tipo de conexão dos inversores:',
            '6.22) Quantidade de inversores: *',
            '6.23) Potência (soma das potências nominais dos inversores, kW): *',
          ]).map((label, i) => (
            <tr key={i}>
              <td style={L}>{label}</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
              <td style={VC}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={SP} />

      {/* ── Seção 7: Fontes Primárias ── */}
      <table style={T}>
        <colgroup>
          <col style={{ width: '42%' }} />
          <col style={{ width: '58%' }} />
        </colgroup>
        <tbody>
          <tr><td colSpan={2} style={SH}>7) Fontes Primárias de Energia da Central Geradora Elétrica (para preenchimento do item 6.5)</td></tr>
          <tr>
            <td colSpan={2} style={{ ...V, lineHeight: '1.6' }}>
              <div><strong>7.1) Origem em biomassa (floresta, resíduos sólidos, resíduos animais, biocombustíveis líquidos, agroindustriais):</strong></div>
              <div style={{ paddingLeft: '14px' }}>
                {[
                  'Biogás (floresta)',
                  'Biogás (resíduo sólido urbano, RU)',
                  'Biogás (resíduo animal, RA)',
                  'Biogás (agroindustrial)',
                  'Carvão vegetal',
                  'Gás de alto-forno (de biomassa)',
                  'Lenha',
                  'Licor negro',
                  'Resíduos de madeira',
                  'Etanol',
                  'Óleos vegetais',
                  'Bagaço de cana-de-açúcar',
                  'Capim elefante',
                  'Casca de arroz',
                ].map(item => <div key={item}>- {item}</div>)}
              </div>
              <div style={{ marginTop: '6px' }}><strong>7.2) Eólica (cinética do vento):</strong></div>
              <div style={{ marginTop: '6px' }}><strong>7.3) Fóssil (petróleo, carvão mineral, gás natural, outros):</strong></div>
              <div style={{ paddingLeft: '14px' }}>
                {[
                  'Gás de alto-forno (de petróleo)',
                  'Gás de refinaria (de petróleo)',
                  'Óleo combustível',
                  'Óleo diesel',
                  'Outros energéticos de petróleo',
                  'Carvão mineral',
                  'Calor de processo (de carvão mineral)',
                  'Gás de alto-forno (de carvão mineral)',
                  'Gás natural',
                  'Calor de processo (de gás natural)',
                  'Calor de processo (de outras fontes fósseis)',
                  'Turfa',
                  'Xisto',
                ].map(item => <div key={item}>- {item}</div>)}
              </div>
              <div style={{ marginTop: '6px' }}>7.4) Hídrica (potencial hidráulico)</div>
              <div>7.5) Nuclear (urânio)</div>
              <div>7.6) Solar (radiação solar)</div>
              <div>7.7) Undi-elétrica (cinética da água)</div>
            </td>
          </tr>
        </tbody>
      </table>

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
              Gerar PDF do Anexo F
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
