'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';

interface AnexoFCPFLPreviewProps {
  projectData?: Record<string, any>;
}

export function AnexoFCPFLPreview({ projectData = {} }: AnexoFCPFLPreviewProps) {
  const [downloading, setDownloading] = useState(false);

  const get = (key: string) => projectData[key] || '';

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
            <td style={V}>{get('endereco_local')}</td>
          </tr>
          <tr>
            <td style={L}>1.5) CEP do titular</td>
            <td style={V}>{get('cliente_cep')}</td>
          </tr>
          <tr>
            <td style={L}>1.6) Município do titular</td>
            <td style={V}>{municipio}</td>
          </tr>
          <tr>
            <td style={L}>1.7) Latitude (SIRGAS 2000)</td>
            <td style={V}>{get('latitude')}</td>
          </tr>
          <tr>
            <td style={L}>1.8) Longitude (SIRGAS 2000)</td>
            <td style={V}>{get('longitude')}</td>
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
            <td style={VC}>{get('padrao_entrada')}</td>
          </tr>
          <tr>
            <td style={L}>2.2) Tipo de Atendimento (aéreo/subterrâneo):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('tipo_ramal')}</td>
          </tr>
          <tr>
            <td style={L}>2.3) Número de Fases da Instalação (Monofásico/Bifásico/Trifásico):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('fases_instalacao')}</td>
          </tr>
          <tr>
            <td style={L}>2.4) Cabos (seção transversal):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('cabos_secao')}</td>
          </tr>
          <tr>
            <td style={L}>2.5) Caixa de Medição ou Tipo de Poste Padrão (Caixa tipo / segundo GED 14945):</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('caixa_medicao_tipo')}</td>
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
            ['2.7) Nome do responsável técnico: *', get('responsavel_nome'), '', ''],
            ['2.8) Número do registro (CREA) do responsável técnico: *', get('responsavel_registro'), '', ''],
            ['2.9) Número do telefone do responsável técnico:', '', '', ''],
            ['2.10) Data pretendida para entrada em operação (dd/mm/aaaa):', get('data_inicio_operacao'), '', ''],
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
            <td style={VC}>{get('modulos_quantidade')}</td>
          </tr>
          <tr>
            <td style={L}>3.2) Listar fabricantes dos módulos:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('modulos_fabricante')}</td>
          </tr>
          <tr>
            <td style={L}>3.3) Listar modelos dos módulos:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('modulos_modelo')}</td>
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
            <td style={VC}>{get('inversores_quantidade') || (get('inversores_modelo') ? '1' : '')}</td>
          </tr>
          <tr>
            <td style={L}>3.6) Listar fabricantes dos inversores:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('inversores_fabricante')}</td>
          </tr>
          <tr>
            <td style={L}>3.7) Listar modelos dos inversores:</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('inversores_modelo')}</td>
          </tr>
          <tr>
            <td style={L}>3.8) Potência de pico dos módulos (soma das potências dos módulos, kWp): *</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('potencia')}</td>
          </tr>
          <tr>
            <td style={L}>3.9) Potência Nominal dos inversores (soma das potências nominais dos inversores, kW): *</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>&nbsp;</td>
            <td style={VC}>{get('inversores_potencia')}</td>
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
            '4.1) Quantidade total de aerogeradores: *',
            '4.2) Listar fabricantes dos aerogeradores:',
            '4.3) Listar modelos dos aerogeradores:',
            '4.4) Potência nominal dos aerogeradores (kW): *',
            '4.5) Potência Nominal dos inversores (kW): *',
            '4.6) Data pretendida para entrada em operação (dd/mm/aaaa):',
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
            '5.1) Quantidade total de turbinas: *',
            '5.2) Listar fabricantes das turbinas:',
            '5.3) Listar modelos das turbinas:',
            '5.4) Potência nominal das turbinas (kW): *',
            '5.5) Potência Nominal dos geradores (kVA): *',
            '5.6) Data pretendida para entrada em operação (dd/mm/aaaa):',
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
            '6.1) Quantidade total de grupos geradores: *',
            '6.2) Listar fabricantes dos grupos geradores:',
            '6.3) Listar modelos dos grupos geradores:',
            '6.4) Potência nominal dos grupos geradores (kVA): *',
            '6.5) Potência exportada de geração (kW): *',
            '6.6) Data pretendida para entrada em operação (dd/mm/aaaa):',
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
          <tr><td colSpan={2} style={SH}>7) Fontes Primárias de Energia (marque as que se aplicam):</td></tr>
          <tr>
            <td colSpan={2} style={V}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <span>☐ Solar fotovoltaica</span>
                <span>☐ Solar térmica</span>
                <span>☐ Eólica</span>
                <span>☐ Hidráulica</span>
                <span>☐ Biomassa sólida</span>
                <span>☐ Biogás</span>
                <span>☐ Biogás de aterro sanitário</span>
                <span>☐ Cogeração a gás natural</span>
                <span>☐ Cogeração a óleo diesel</span>
                <span>☐ Cogeração a GLP</span>
                <span>☐ Outras fontes</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

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
              Gerar PDF do Anexo F
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
