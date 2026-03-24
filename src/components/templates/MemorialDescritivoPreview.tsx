'use client';

import { Badge } from '@/components/ui/badge';

interface MemorialDescritivoPreviewProps {
  distribuidora: string;
}

export function MemorialDescritivoPreview({ distribuidora }: MemorialDescritivoPreviewProps) {
  const V = ({ children }: { children: string }) => (
    <Badge variant="outline" className="text-xs">{children}</Badge>
  );

  return (
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm" style={{ lineHeight: '1.8' }}>
      {/* CAPA */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="font-bold text-xl tracking-widest mb-4">MEMORIAL TÉCNICO DESCRITIVO</h2>
        <p className="text-sm mb-4">
          <V>{`{{tipo_fornecimento}}`}</V> UTILIZANDO UM SISTEMA FOTOVOLTAICO DE <V>{`{{potencia}}`}</V> kWp
          CONECTADO À REDE DE ENERGIA ELÉTRICA DE BAIXA TENSÃO EM <V>{`{{tensao_atendimento}}`}</V> V
          CARACTERIZADO COMO <V>{`{{modalidade_compensacao}}`}</V>
        </p>
        <p className="font-bold"><V>{`{{cliente_nome}}`}</V></p>
        <p>CPF: <V>{`{{cliente_cpf}}`}</V></p>
        <p className="font-bold mt-2"><V>{`{{responsavel_nome}}`}</V></p>
        <p><V>{`{{responsavel_profissao}}`}</V></p>
        <p>REGISTRO: <V>{`{{responsavel_registro}}`}</V></p>
        <p className="mt-2"><V>{`{{cidade}}`}</V> – <V>{`{{estado}}`}</V></p>
        <p><V>{`{{data}}`}</V></p>
      </div>

      {/* LISTA DE SIGLAS */}
      <div style={{ marginBottom: '30px' }}>
        <h3 className="font-bold text-base mb-2">LISTA DE SIGLAS E ABREVIATURAS</h3>
        <div className="text-xs space-y-0.5">
          <p>ABNT: Associação Brasileira de Normas Técnicas</p>
          <p>ANEEL: Agência Nacional de Energia Elétrica</p>
          <p>BT: Baixa tensão (220/127 V, 380/220 V)</p>
          <p>C.A: Corrente Alternada · C.C: Corrente Contínua</p>
          <p>FV: Fotovoltaico · GD: Geração distribuída</p>
          <p>kWp: kilo-watt pico · kWh: kilo-watt-hora</p>
          <p>PRODIST: Procedimentos de Distribuição</p>
          <p>SFV: Sistema Fotovoltaico · UC: Unidade Consumidora</p>
          <p>UTM: Universal Transversa de Mercator</p>
        </div>
      </div>

      {/* 1. OBJETIVO */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">1. OBJETIVO</h3>
        <p style={{ textAlign: 'justify' }}>
          O presente memorial técnico descritivo tem como objetivo apresentar a metodologia utilizada para
          elaboração e apresentação à <V>{`{{distribuidora}}`}</V> - <V>{`{{estado}}`}</V>, dos documentos mínimos
          necessários, em conformidade com a REN 482, com o PRODIST Módulo 3 secção 3.7, e com as normas
          técnicas nacionais (ABNT) ou internacionais (europeia e americana), para <strong>SOLICITAÇÃO DO PARECER DE ACESSO</strong> de
          uma <V>{`{{tipo_fornecimento}}`}</V> conectada à rede de distribuição de energia elétrica através
          sistema fotovoltaico de <V>{`{{potencia}}`}</V> kWp, composto
          por <V>{`{{modulos_quantidade}}`}</V> módulos de <V>{`{{modulos_potencia_wp}}`}</V> Wp
          e <V>{`{{inversores_quantidade}}`}</V> inversor(es) de <V>{`{{inversores_potencia}}`}</V> kW,
          caracterizado como <V>{`{{modalidade_compensacao}}`}</V>.
        </p>
      </div>

      {/* 2. REFERÊNCIAS NORMATIVAS */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">2. REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</h3>
        <p className="mb-2" style={{ textAlign: 'justify' }}>
          Para elaboração deste memorial técnico descritivo, no âmbito da área de concessão do estado
          do <V>{`{{estado}}`}</V> foram utilizadas as normas e resoluções, nas respectivas revisões vigentes:
        </p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>ABNT NBR 5410: Instalações Elétricas de Baixa Tensão.</li>
          <li>ABNT NBR 10899: Energia Solar Fotovoltaica – Terminologia.</li>
          <li>ABNT NBR 11704: Sistemas Fotovoltaicos – Classificação.</li>
          <li>ABNT NBR 16149: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição.</li>
          <li>ABNT NBR 16150: Sistemas fotovoltaicos (FV) – Procedimentos de ensaio de conformidade.</li>
          <li>ABNT NBR IEC 62116: Procedimento de Ensaio de Anti-ilhamento para Inversores de SFV Conectados à Rede.</li>
          <li>Normas técnicas da <V>{`{{distribuidora}}`}</V> – Conexão de Microgeração Distribuída ao Sistema de Baixa Tensão.</li>
          <li>ANEEL PRODIST: Módulo 3 – Acesso ao Sistema de Distribuição. Seção 3.7.</li>
          <li>ANEEL Resolução Normativa nº 1000, de 07/12/2021.</li>
          <li>ANEEL Resolução Normativa nº 482, de 17/04/2012.</li>
          <li>IEC 61727 Photovoltaic (PV) Systems - Characteristics of the Utility Interface.</li>
          <li>IEC 62116:2014 Utility-interconnected photovoltaic inverters.</li>
        </ol>
      </div>

      {/* 4. DADOS DA UNIDADE CONSUMIDORA */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">3. DADOS DA UNIDADE CONSUMIDORA</h3>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs">
          <tbody>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800 w-1/3">Número da Conta Contrato</td>
              <td className="p-2"><V>{`{{conta_contrato}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Classe</td>
              <td className="p-2"><V>{`{{classe_uc}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Nome do Titular</td>
              <td className="p-2"><V>{`{{cliente_nome}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Endereço Completo</td>
              <td className="p-2"><V>{`{{endereco}}`}</V>, <V>{`{{cidade}}`}</V> - <V>{`{{estado}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Nº Poste / Transformador</td>
              <td className="p-2"><V>{`{{numero_poste_transformador}}`}</V></td>
            </tr>
            <tr>
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Coordenadas UTM</td>
              <td className="p-2">X: <V>{`{{coord_utm_x}}`}</V>, Y: <V>{`{{coord_utm_y}}`}</V>, Fuso: <V>{`{{coord_utm_fuso}}`}</V></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. PADRÃO DE ENTRADA */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">4. PADRÃO DE ENTRADA</h3>
        <h4 className="font-semibold text-sm mb-1">4.1. Tipo de Ligação e Tensão de Atendimento</h4>
        <p className="mb-3" style={{ textAlign: 'justify' }}>
          A unidade consumidora está ligada em ramal de ligação em baixa tensão, através de um
          circuito <V>{`{{tipo_conexao}}`}</V>, com tensão de atendimento
          em <V>{`{{tensao_atendimento}}`}</V> V, derivado de uma rede <V>{`{{tipo_ramal}}`}</V> de
          distribuição secundária da <V>{`{{distribuidora}}`}</V> no estado do <V>{`{{estado}}`}</V>.
        </p>

        <h4 className="font-semibold text-sm mb-1">4.2. Disjuntor de Entrada</h4>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs mb-3">
          <tbody>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800 w-1/2">Número de Polos</td>
              <td className="p-2"><V>{`{{disjuntor_polos}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Tensão Nominal</td>
              <td className="p-2"><V>{`{{disjuntor_tensao_v}}`}</V> V</td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Corrente Nominal</td>
              <td className="p-2"><V>{`{{disjuntor_corrente_a}}`}</V> A</td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Frequência Nominal</td>
              <td className="p-2">60 Hz</td>
            </tr>
            <tr>
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Elemento de Proteção</td>
              <td className="p-2">Termomagnético</td>
            </tr>
          </tbody>
        </table>

        <h4 className="font-semibold text-sm mb-1">4.3. Ramal de Entrada</h4>
        <p style={{ textAlign: 'justify' }}>
          Tipo de ramal: <V>{`{{tipo_ramal}}`}</V>. Seção dos condutores
          fase: <V>{`{{secao_fase_mm2}}`}</V> mm² · Seção do condutor
          neutro: <V>{`{{secao_neutro_mm2}}`}</V> mm².
        </p>
      </div>

      {/* 6. DIMENSIONAMENTO DO GERADOR */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">5. DIMENSIONAMENTO DO GERADOR</h3>
        <p className="mb-2">Características técnicas dos módulos fotovoltaicos:</p>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs">
          <tbody>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800 w-1/2">Fabricante</td>
              <td className="p-2"><V>{`{{modulos_fabricante}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Modelo</td>
              <td className="p-2"><V>{`{{modulos_modelo}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Potência nominal (Wp)</td>
              <td className="p-2"><V>{`{{modulos_potencia_wp}}`}</V></td>
            </tr>
            <tr>
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Quantidade</td>
              <td className="p-2"><V>{`{{modulos_quantidade}}`}</V></td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2" style={{ textAlign: 'justify' }}>
          Potência total instalada: <V>{`{{modulos_quantidade}}`}</V> × <V>{`{{modulos_potencia_wp}}`}</V> Wp = <V>{`{{potencia}}`}</V> kWp.
        </p>
      </div>

      {/* 7. DIMENSIONAMENTO DO INVERSOR */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">6. DIMENSIONAMENTO DO INVERSOR</h3>
        <p className="mb-2">Características técnicas do inversor:</p>
        <table className="w-full border-collapse border border-gray-300 dark:border-gray-600 text-xs">
          <tbody>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800 w-1/2">Fabricante</td>
              <td className="p-2"><V>{`{{inversores_fabricante}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Modelo</td>
              <td className="p-2"><V>{`{{inversores_modelo}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Quantidade</td>
              <td className="p-2"><V>{`{{inversores_quantidade}}`}</V></td>
            </tr>
            <tr className="border-b border-gray-300 dark:border-gray-600">
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Potência</td>
              <td className="p-2"><V>{`{{inversores_potencia}}`}</V> kW</td>
            </tr>
            <tr>
              <td className="p-2 font-medium bg-gray-50 dark:bg-gray-800">Tensão Nominal</td>
              <td className="p-2"><V>{`{{inversores_tensao}}`}</V></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SEÇÕES FIXAS */}
      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">7. DIMENSIONAMENTO DA PROTEÇÃO</h3>
        <p className="text-gray-500 italic text-xs">(Seção a ser preenchida com dados de proteção CC/CA, DPS e aterramento)</p>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">8. DIMENSIONAMENTO DOS CABOS</h3>
        <p className="text-gray-500 italic text-xs">(Seção a ser preenchida com dados de cabos CC e CA)</p>
      </div>

      <div style={{ marginBottom: '25px' }}>
        <h3 className="font-bold text-base mb-2">9. PLACA DE ADVERTÊNCIA</h3>
        <p className="text-xs" style={{ textAlign: 'justify' }}>
          Espessura: 2 mm · Material: Policarbonato com aditivos anti-raios UV ·
          Gravação: Arial Black · Cor amarela com opacidade adequada.
        </p>
      </div>

      <div>
        <h3 className="font-bold text-base mb-2">10. ANEXOS</h3>
        <ul className="list-disc list-inside text-xs space-y-0.5">
          <li>Anexo I - Solicitação de Acesso</li>
          <li>Anexo II - Responsabilidade Técnica</li>
          <li>Anexo III - Datasheet Módulo</li>
          <li>Anexo IV - Registro Inmetro Módulo</li>
          <li>Anexo V - Datasheet Inversor</li>
          <li>Anexo VI - Registro Inmetro Inversor</li>
          <li>Anexo VII - Diagrama Unifilar</li>
          <li>Anexo VIII - Quadros de Proteção</li>
          <li>Anexo IX - Instalação do Sistema</li>
          <li>Anexo X - Diagrama de Blocos</li>
          <li>Anexo XI - Planta de Situação</li>
        </ul>
      </div>
    </div>
  );
}
