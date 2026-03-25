'use client';

import { Badge } from '@/components/ui/badge';

interface MemorialDescritivoPreviewProps {
  distribuidora: string;
}

export function MemorialDescritivoPreview({ distribuidora }: MemorialDescritivoPreviewProps) {
  const V = ({ children }: { children: string }) => (
    <Badge variant="outline" className="text-xs mx-0.5">{children}</Badge>
  );

  const tableClass = "w-full border-collapse border border-gray-400 dark:border-gray-500 text-sm mb-6";
  const thClass = "border border-gray-400 dark:border-gray-500 p-2 bg-gray-100 dark:bg-gray-800 font-bold text-left";
  const tdClass = "border border-gray-400 dark:border-gray-500 p-2";
  const tdLabelClass = "border border-gray-400 dark:border-gray-500 p-2 bg-gray-50 dark:bg-gray-800 font-medium";
  const sectionClass = "mb-10";
  const h2Class = "font-bold text-lg mb-4 uppercase tracking-wide";
  const h3Class = "font-bold text-base mb-3";
  const pClass = "mb-4 text-justify leading-relaxed";

  return (
    <div className="text-gray-700 dark:text-gray-300 text-sm" style={{ lineHeight: '1.9' }}>

      {/* ==================== CAPA ==================== */}
      <div className="text-center mb-16 py-8">
        <h1 className="font-bold text-2xl tracking-widest mb-8">MEMORIAL TÉCNICO DESCRITIVO</h1>
        <p className="text-base mb-8 px-4 leading-relaxed">
          <V>{`{{tipo_fornecimento}}`}</V> UTILIZANDO UM SISTEMA FOTOVOLTAICO DE <V>{`{{potencia}}`}</V> kWp
          CONECTADO À REDE DE ENERGIA ELÉTRICA DE BAIXA TENSÃO EM <V>{`{{tensao_atendimento}}`}</V> V
          CARACTERIZADO COMO <V>{`{{modalidade_compensacao}}`}</V>
        </p>
        <p className="font-bold text-lg mb-1"><V>{`{{cliente_nome}}`}</V></p>
        <p className="mb-6">CPF: <V>{`{{cliente_cpf}}`}</V></p>
        <p className="font-bold text-lg mb-1"><V>{`{{responsavel_nome}}`}</V></p>
        <p className="mb-1"><V>{`{{responsavel_profissao}}`}</V></p>
        <p className="mb-6">REGISTRO: <V>{`{{responsavel_registro}}`}</V></p>
        <p className="font-bold mb-1"><V>{`{{cidade}}`}</V> – <V>{`{{estado}}`}</V></p>
        <p><V>{`{{data}}`}</V></p>
      </div>

      <hr className="my-8 border-gray-300 dark:border-gray-600" />

      {/* ==================== LISTA DE SIGLAS ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>LISTA DE SIGLAS E ABREVIATURAS</h2>
        <div className="space-y-1">
          <p>ABNT: Associação Brasileira de Normas Técnicas</p>
          <p>ANEEL: Agência Nacional de Energia Elétrica</p>
          <p>BT: Baixa tensão (220/127 V, 380/220 V)</p>
          <p>C.A: Corrente Alternada</p>
          <p>C.C: Corrente Contínua</p>
          <p>CD: Custo de disponibilidade (30 kWh, 50kWh ou 100 kWh em sistemas de baixa tensão monofásicos, bifásicos ou trifásicos, respectivamente)</p>
          <p>CI: Carga Instalada</p>
          <p>DSP: Dispositivo Supressor de Surto</p>
          <p>DSV: Dispositivo de seccionamento visível</p>
          <p>FP: Fator de potência</p>
          <p>FV: Fotovoltaico</p>
          <p>GD: Geração distribuída</p>
          <p>HSP: Horas de sol pleno</p>
          <p>IEC: <em>International Electrotechnical Commission</em></p>
          <p>IN: Corrente Nominal</p>
          <p>IDG: Corrente nominal do disjuntor de entrada da unidade consumidora em ampères (A)</p>
          <p>Ist: Corrente de curto-circuito de módulo fotovoltaico em ampères (A)</p>
          <p>kW: kilo-watt</p>
          <p>kWp: kilo-watt pico</p>
          <p>kWh: kilo-watt-hora</p>
          <p>MicroGD: Microgeração distribuída</p>
          <p>MT: Média tensão (13.8 kV, 34.5 kV)</p>
          <p>NF: Fator referente ao número de fases, igual a 1 para sistemas monofásicos e bifásicos ou √3 para sistemas trifásicos</p>
          <p>PRODIST: Procedimentos de Distribuição</p>
          <p>PD: Potência disponibilizada para a unidade consumidora onde será instalada a geração distribuída</p>
          <p>PR: Pára-raio</p>
          <p>QGD: Quadro Geral de Distribuição</p>
          <p>QGBT: Quadro Geral de Baixa Tensão</p>
          <p>REN: Resolução Normativa</p>
          <p>SPDA: Sistema de Proteção contra Descargas Atmosféricas</p>
          <p>SFV: Sistema Fotovoltaico</p>
          <p>SFVCR: Sistema Fotovoltaico Conectado à Rede</p>
          <p>TC: Transformador de corrente</p>
          <p>TP: Transformador de potencial</p>
          <p>UC: Unidade Consumidora</p>
          <p>UTM: Universal Transversa de Mercator</p>
          <p>VN: Tensão nominal de atendimento em volts (V)</p>
          <p>Voc: Tensão de circuito aberto de módulo fotovoltaico em volts (V)</p>
        </div>
      </div>

      <hr className="my-8 border-gray-300 dark:border-gray-600" />

      {/* ==================== SUMÁRIO ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>SUMÁRIO</h2>
        <div className="space-y-1">
          <p><strong>1.</strong> OBJETIVO</p>
          <p><strong>2.</strong> REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</p>
          <p><strong>3.</strong> DOCUMENTOS OBRIGATÓRIOS</p>
          <p><strong>4.</strong> DADOS DA UNIDADE CONSUMIDORA</p>
          <p><strong>5.</strong> LEVANTAMENTO DE CARGA E CONSUMO</p>
          <p className="pl-6"><strong>5.1.</strong> Levantamento de Carga</p>
          <p><strong>6.</strong> PADRÃO DE ENTRADA</p>
          <p className="pl-6"><strong>6.1.</strong> Tipo de Ligação e Tensão de Atendimento</p>
          <p className="pl-6"><strong>6.2.</strong> Disjuntor de Entrada</p>
          <p className="pl-6"><strong>6.3.</strong> Potência Disponibilizada</p>
          <p className="pl-6"><strong>6.4.</strong> Caixa de Medição</p>
          <p className="pl-6"><strong>6.5.</strong> Ramal de Entrada</p>
          <p><strong>7.</strong> DIMENSIONAMENTO DO GERADOR</p>
          <p><strong>8.</strong> DIMENSIONAMENTO DO INVERSOR</p>
          <p><strong>9.</strong> DIMENSIONAMENTO DA PROTEÇÃO</p>
          <p className="pl-6"><strong>9.1.</strong> Chaves Seccionadoras e Disjuntores</p>
          <p className="pl-6"><strong>9.2.</strong> DPS</p>
          <p className="pl-6"><strong>9.3.</strong> Aterramento</p>
          <p className="pl-6"><strong>9.4.</strong> Requisitos de Proteção</p>
          <p><strong>10.</strong> DIMENSIONAMENTO DOS CABOS</p>
          <p><strong>11.</strong> PLACA DE ADVERTÊNCIA</p>
          <p><strong>12.</strong> ANEXOS</p>
        </div>
      </div>

      <hr className="my-8 border-gray-300 dark:border-gray-600" />

      {/* ==================== 1. OBJETIVO ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>1. OBJETIVO</h2>
        <p className={pClass}>
          O presente memorial técnico descritivo tem como objetivo apresentar a metodologia utilizada para
          elaboração e apresentação à <V>{`{{distribuidora}}`}</V> - <V>{`{{estado}}`}</V>, dos documentos mínimos
          necessários, em conformidade com a REN 482, com o PRODIST Módulo 3 secção 3.7, e com as normas
          técnicas nacionais (ABNT) ou internacionais (europeia e americana), para <strong>SOLICITAÇÃO DO PARECER DE ACESSO</strong> de
          uma <V>{`{{tipo_fornecimento}}`}</V> conectada à rede de distribuição de energia elétrica através
          sistema fotovoltaico de <strong><V>{`{{potencia}}`}</V></strong> kWp, composto
          por <V>{`{{modulos_quantidade}}`}</V> módulos de <V>{`{{modulos_potencia_wp}}`}</V> Wp
          e <V>{`{{inversores_quantidade}}`}</V> inversor(es) de <V>{`{{inversores_potencia}}`}</V> kW,
          caracterizado como <strong><V>{`{{modalidade_compensacao}}`}</V></strong>.
        </p>
      </div>

      {/* ==================== 2. REFERÊNCIAS NORMATIVAS ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>2. REFERÊNCIAS NORMATIVAS E REGULATÓRIAS</h2>
        <p className={pClass}>
          Para elaboração deste memorial técnico descritivo, no âmbito da área de concessão do estado
          do <strong><V>{`{{estado}}`}</V></strong> foram utilizadas as normas e resoluções, nas respectivas revisões vigentes, conforme descritas abaixo:
        </p>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>ABNT NBR 5410: Instalações Elétricas de Baixa Tensão.</li>
          <li>ABNT NBR 10899: Energia Solar Fotovoltaica – Terminologia.</li>
          <li>ABNT NBR 11704: Sistemas Fotovoltaicos – Classificação.</li>
          <li>ABNT NBR 16149: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição.</li>
          <li>ABNT NBR 16150: Sistemas fotovoltaicos (FV) – Características da interface de conexão com a rede elétrica de distribuição – Procedimentos de ensaio de conformidade.</li>
          <li>ABNT NBR IEC 62116: Procedimento de Ensaio de Anti-ilhamento para Inversores de Sistemas Fotovoltaicos Conectados à Rede Elétrica.</li>
          <li><V>{`{{distribuidora}}`}</V> – Normas e Padrões – Conexão de Microgeração Distribuída ao Sistema de Baixa Tensão.</li>
          <li><V>{`{{distribuidora}}`}</V> – Normas e Padrões – Fornecimento de Energia Elétrica em Baixa Tensão.</li>
          <li><V>{`{{distribuidora}}`}</V> – Normas e Padrões – Padrões Construtivos de Caixas de Medição e Proteção.</li>
          <li>ANEEL Procedimentos de Distribuição de Energia Elétrica no Sistema Elétrico Nacional – PRODIST: Módulo 3 – Acesso ao Sistema de Distribuição. Revisão 6. 2016, Seção 3.7.</li>
          <li>ANEEL Resolução Normativa nº 1000, de 07 de dezembro de 2021, que estabelece as condições gerais de fornecimento de energia elétrica.</li>
          <li>ANEEL Resolução Normativa ANEEL nº 482, de 17 de abril de 2012, que estabelece as condições gerais para o acesso de micro geração e mini geração distribuída aos sistemas de distribuição de energia elétrica e o sistema de compensação de energia elétrica.</li>
          <li>IEC 61727 Photovoltaic (PV) Systems - Characteristics of the Utility Interface.</li>
          <li>IEC 62116:2014 Utility-interconnected photovoltaic inverters - Test procedure of islanding prevention measures.</li>
        </ol>
      </div>

      {/* ==================== 3. DOCUMENTOS OBRIGATÓRIOS ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>3. DOCUMENTOS OBRIGATÓRIOS</h2>
        <p className="mb-3 italic">Tabela 1 – Documentos obrigatórios para a solicitação de acesso de microgeração distribuída</p>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Documentos Obrigatórios</th>
              <th className={thClass + " text-center w-20"}>Até 10 kW</th>
              <th className={thClass + " text-center w-24"}>Acima de 10 kW</th>
              <th className={thClass}>Observações</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={tdClass}>1. Formulário de Solicitação de Acesso</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>2. ART do Responsável Técnico</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>3. Diagrama unifilar do sistema de geração, carga, proteção e medição</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>4. Diagrama de blocos do sistema de geração, carga e proteção</td><td className={tdClass + " text-center"}>NÃO</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}>Até 10kW apenas o diagrama unifilar</td></tr>
            <tr><td className={tdClass}>5. Memorial Técnico Descritivo</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>6. Projeto Elétrico (Planta de Situação, Diagrama Funcional, Arranjos Físicos, Datasheet)</td><td className={tdClass + " text-center"}>NÃO</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}>Itens integrantes do Projeto Elétrico</td></tr>
            <tr><td className={tdClass}>7. Certificados de Conformidade dos Inversores ou registro INMETRO</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}>Inversor acima de 10 kW: apenas certificados de conformidade</td></tr>
            <tr><td className={tdClass}>8. Dados para registro da central geradora (ANEEL)</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass + " text-center"}>SIM</td><td className={tdClass}></td></tr>
            <tr><td className={tdClass}>9. Lista de UCs participantes do sistema de compensação</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Apenas para autoconsumo remoto, geração compartilhada e EMUC</td></tr>
            <tr><td className={tdClass}>10. Instrumento jurídico de solidariedade entre integrantes</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Apenas para EMUC e geração compartilhada</td></tr>
            <tr><td className={tdClass}>11. Documento de reconhecimento ANEEL (cogeração qualificada)</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Apenas para cogeração qualificada</td></tr>
            <tr><td className={tdClass}>12. Contrato de aluguel ou arrendamento da UC</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Quando a UC geradora for alugada ou arrendada</td></tr>
            <tr><td className={tdClass}>13. Procuração</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Quando a solicitação for feita por terceiros</td></tr>
            <tr><td className={tdClass}>14. Autorização de uso de área comum em condomínio</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass + " text-center"}>SIM*</td><td className={tdClass}>*Quando utilizar área comum do condomínio</td></tr>
          </tbody>
        </table>
        <p className="text-xs italic">NOTA 1: Para inversores até 10 kW é obrigatório o registro de concessão do INMETRO.</p>
      </div>

      {/* ==================== 4. DADOS DA UC ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>4. DADOS DA UNIDADE CONSUMIDORA</h2>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>Número da Conta Contrato</td><td className={tdClass}><V>{`{{conta_contrato}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Classe</td><td className={tdClass}><V>{`{{classe_uc}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Nome do Titular da CC</td><td className={tdClass}><V>{`{{cliente_nome}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Endereço Completo</td><td className={tdClass}><V>{`{{endereco}}`}</V>, <V>{`{{cidade}}`}</V> - <V>{`{{estado}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Número de identificação do poste e/ou transformador mais próximo</td><td className={tdClass}><V>{`{{numero_poste_transformador}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Coordenadas georreferenciadas</td><td className={tdClass}>X: <V>{`{{coord_utm_x}}`}</V>, Y: <V>{`{{coord_utm_y}}`}</V>, Fuso UTM: <V>{`{{coord_utm_fuso}}`}</V></td></tr>
          </tbody>
        </table>
        <div className="my-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-800/50">
          <V>{`{{planta_situacao_imagem}}`}</V>
          <p className="text-xs text-gray-400 mt-2">Imagem da planta de situação (se disponível)</p>
        </div>
        <p className="text-xs italic text-center mb-4">Figura 1: Localização da unidade consumidora.</p>
      </div>

      {/* ==================== 5. LEVANTAMENTO DE CARGA ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>5. LEVANTAMENTO DE CARGA E CONSUMO</h2>

        <h3 className={h3Class}>5.1. Levantamento de Carga</h3>
        <p className="mb-3 italic">Tabela 2 – Levantamento de carga</p>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>ITEM</th>
              <th className={thClass}>DESCRIÇÃO</th>
              <th className={thClass}>P (W)</th>
              <th className={thClass}>QUANT.</th>
              <th className={thClass}>CI (kW)</th>
              <th className={thClass}>FP</th>
              <th className={thClass}>CI (kVA)</th>
              <th className={thClass}>FD</th>
              <th className={thClass}>D(kW)</th>
              <th className={thClass}>D(kVA)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td className={tdClass} colSpan={10}>
                <span className="text-gray-400 italic">Dados do levantamento de carga a serem preenchidos</span>
              </td>
            </tr>
          </tbody>
        </table>

      </div>

      {/* ==================== 6. PADRÃO DE ENTRADA ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>6. PADRÃO DE ENTRADA</h2>

        <h3 className={h3Class}>6.1. Tipo de Ligação e Tensão de Atendimento</h3>
        <p className={pClass}>
          A unidade consumidora está ligada em ramal de ligação em baixa tensão, através de um
          circuito <strong><V>{`{{tipo_conexao}}`}</V></strong>, com tensão de atendimento
          em <strong><V>{`{{tensao_atendimento}}`}</V></strong> V, derivado de uma
          rede <strong><V>{`{{tipo_ramal}}`}</V></strong> de distribuição secundária
          da <V>{`{{distribuidora}}`}</V> no estado do <V>{`{{estado}}`}</V>.
        </p>

        <h3 className={h3Class}>6.2. Disjuntor de Entrada</h3>
        <p className={pClass}>
          No ponto de entrega/conexão é instalado um disjuntor termomagnético, em conformidade com
          as normas e padrões da <V>{`{{distribuidora}}`}</V>, com as seguintes características:
        </p>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>NÚMERO DE POLOS</td><td className={tdClass}><V>{`{{disjuntor_polos}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>TENSÃO NOMINAL</td><td className={tdClass}><V>{`{{disjuntor_tensao_v}}`}</V> V</td></tr>
            <tr><td className={tdLabelClass}>CORRENTE NOMINAL</td><td className={tdClass}><V>{`{{disjuntor_corrente_a}}`}</V> A</td></tr>
            <tr><td className={tdLabelClass}>FREQUÊNCIA NOMINAL</td><td className={tdClass}>60 Hz</td></tr>
            <tr><td className={tdLabelClass}>ELEMENTO DE PROTEÇÃO</td><td className={tdClass}>TERMOMAGNÉTICO</td></tr>
            <tr><td className={tdLabelClass}>CAPACIDADE MÁXIMA DE INTERRUPÇÃO</td><td className={tdClass}>3,0 kA</td></tr>
            <tr><td className={tdLabelClass}>ACIONAMENTO</td><td className={tdClass}>MANUAL</td></tr>
            <tr><td className={tdLabelClass}>CURVA DE ATUAÇÃO (DISPARO)</td><td className={tdClass}>C</td></tr>
          </tbody>
        </table>

        <h3 className={h3Class}>6.3. Potência Disponibilizada</h3>
        <p className={pClass}>
          A potência disponibilizada para a unidade consumidora onde será instalada
          a <V>{`{{tipo_fornecimento}}`}</V> é igual à:
        </p>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4 font-mono text-xs space-y-1">
          <p>PD [kVA] = (VN [V] × IDG [A] × NF) / 1000</p>
          <p>PD [kW] = PD [kVA] × FP</p>
          <p className="mt-2">VN = <V>{`{{tensao_atendimento}}`}</V> V</p>
          <p>IDG = <V>{`{{disjuntor_corrente_a}}`}</V> A</p>
          <p>NF = (conforme tipo de ligação)</p>
          <p>FP = 0,92</p>
        </div>
        <p className="text-xs italic mb-4">NOTA 2: A potência de geração deve ser menor ou igual à potência disponibilizada PD em kW.</p>

        <h3 className={h3Class}>6.4. Caixa de Medição</h3>
        <p className={pClass}>
          A caixa de medição é polifásica em material polimérico, está instalada em fachada, no ponto de entrega
          caracterizado como o limite da via pública com a propriedade, atendendo aos requisitos de localização,
          facilidade de acesso e layout, em conformidade com as normas da concessionária.
        </p>
        <p className={pClass}>
          O aterramento da caixa de medição é com haste(s) de aço cobreado de comprimento 1500 mm e diâmetro
          16 mm (5/8&quot;), condutor de 10 mm² com conector tipo cunha para haste de material protegido contra
          corrosão, sob pressão de parafusos, sem o emprego de solda e acessível à inspeção.
        </p>

        <h3 className={h3Class}>6.5. Ramal de Entrada</h3>
        <p className={pClass}>
          O ramal de entrada da unidade consumidora é através de um
          circuito <V>{`{{tipo_conexao}}`}</V>, sendo condutor(es) FASE de seção transversal
          de <V>{`{{secao_fase_mm2}}`}</V> mm² e condutor NEUTRO de seção transversal
          de <V>{`{{secao_neutro_mm2}}`}</V> mm² com isolação em HEPR/XLPE 90ºC e tensão de atendimento
          de <V>{`{{tensao_atendimento}}`}</V> V.
        </p>
      </div>

      {/* ==================== 7. DIMENSIONAMENTO DO GERADOR ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>7. DIMENSIONAMENTO DO GERADOR</h2>
        <p className="mb-3">Características técnicas dos módulos fotovoltaicos:</p>
        <p className="mb-3 italic">Tabela 4 – Características técnicas dos módulos fotovoltaicos</p>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>Fabricante</td><td className={tdClass}><V>{`{{modulos_fabricante}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Modelo</td><td className={tdClass}><V>{`{{modulos_modelo}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Potência nominal – Pn [W]</td><td className={tdClass}><V>{`{{modulos_potencia_wp}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tensão de circuito aberto – Voc [V]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Corrente de curto-circuito – Isc [A]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Tensão de máxima potência – Vpmp [V]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Corrente de máxima potência – Ipmp [A]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Eficiência [%]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Comprimento [m]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Largura [m]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Área [m²]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Peso [kg]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Quantidade</td><td className={tdClass}><V>{`{{modulos_quantidade}}`}</V></td></tr>
          </tbody>
        </table>
        <p className={pClass}>
          Potência total instalada: <V>{`{{modulos_quantidade}}`}</V> × <V>{`{{modulos_potencia_wp}}`}</V> Wp
          = <strong><V>{`{{potencia}}`}</V> kWp</strong>.
        </p>
      </div>

      {/* ==================== 8. DIMENSIONAMENTO DO INVERSOR ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>8. DIMENSIONAMENTO DO INVERSOR</h2>
        <p className="mb-3">Características técnicas do inversor:</p>
        <p className="mb-3 italic">Tabela 5 – Características técnicas do inversor</p>
        <table className={tableClass}>
          <tbody>
            <tr><td className={tdLabelClass + " w-2/5"}>Fabricante</td><td className={tdClass}><V>{`{{inversores_fabricante}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Modelo</td><td className={tdClass}><V>{`{{inversores_modelo}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Quantidade</td><td className={tdClass}><V>{`{{inversores_quantidade}}`}</V></td></tr>
            <tr><td className={tdLabelClass} colSpan={2}><strong>Entrada</strong></td></tr>
            <tr><td className={tdLabelClass}>Máxima tensão CC – Vcc-máx [V]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Máxima corrente CC – Icc-máx [A]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Máxima tensão MPPT – Vpmp-máx [V]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Mínima tensão MPPT – Vpmp-min [V]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Tensão CC de partida – Vcc-part [V]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass} colSpan={2}><strong>Saída</strong></td></tr>
            <tr><td className={tdLabelClass}>Potência nominal – Pn [kW]</td><td className={tdClass}><V>{`{{inversores_potencia}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Tensão nominal CA [V]</td><td className={tdClass}><V>{`{{inversores_tensao}}`}</V></td></tr>
            <tr><td className={tdLabelClass}>Corrente máxima CA [A]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Frequência [Hz]</td><td className={tdClass}>60</td></tr>
            <tr><td className={tdLabelClass}>Fator de potência</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
            <tr><td className={tdLabelClass}>Eficiência máxima [%]</td><td className={tdClass}><span className="text-gray-400 italic">A preencher</span></td></tr>
          </tbody>
        </table>
      </div>

      {/* ==================== 9. DIMENSIONAMENTO DA PROTEÇÃO ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>9. DIMENSIONAMENTO DA PROTEÇÃO</h2>

        <h3 className={h3Class}>9.1. Chaves Seccionadoras e Disjuntores</h3>
        <p className="mb-2"><strong>Chave Seccionadora CC:</strong></p>
        <ul className="list-disc list-inside mb-4"><li>Acoplado ao Inversor Fotovoltaico.</li></ul>
        <p className="mb-2"><strong>Disjuntor CA:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Número de polos: <V>{`{{disjuntor_polos}}`}</V></li>
          <li>Tensão nominal CA [V]: <V>{`{{tensao_atendimento}}`}</V></li>
          <li>Corrente Nominal [A]: <span className="text-gray-400 italic">A preencher</span></li>
          <li>Frequência [Hz]: 60</li>
          <li>Capacidade máxima de interrupção [kA]: 3,0</li>
          <li>Curva de atuação: C</li>
        </ul>

        <h3 className={h3Class}>9.2. DPS</h3>
        <p className="mb-2"><strong>Tipo CC:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Classe: II</li>
          <li>Tensão CC [V]: 1000</li>
          <li>Corrente nominal [kA]: 20</li>
          <li>Corrente máxima [kA]: 40</li>
        </ul>
        <p className="mb-2"><strong>Tipo CA:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Classe: II</li>
          <li>Tensão CA [V]: 275</li>
          <li>Corrente nominal [kA]: 20</li>
          <li>Corrente máxima [kA]: 40</li>
        </ul>

        <h3 className={h3Class}>9.3. Aterramento</h3>
        <p className={pClass}>
          O aterramento do sistema fotovoltaico será realizado conforme ABNT NBR 5410, utilizando
          haste(s) de aterramento de aço cobreado, condutor de proteção (PE) e conexões adequadas.
        </p>

        <h3 className={h3Class}>9.4. Requisitos de Proteção</h3>
        <p className={pClass}>
          O sistema de proteção atende aos requisitos estabelecidos pela ABNT NBR 16149 e pelas normas
          da <V>{`{{distribuidora}}`}</V>, incluindo proteção anti-ilhamento, proteção contra
          sobretensão/subtensão e proteção contra sobrefrequência/subfrequência.
        </p>
      </div>

      {/* ==================== 10. DIMENSIONAMENTO DOS CABOS ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>10. DIMENSIONAMENTO DOS CABOS</h2>

        <p className="mb-2"><strong>Cabos CC:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Isolação: XLPE/XLPO</li>
          <li>Isolamento: 1,8 kV</li>
          <li>Seção Transversal [mm²]: <span className="text-gray-400 italic">A preencher</span></li>
          <li>Método de Instalação: B1 (Cabos instalados ao ar livre), em temperatura ambiente de 40º C</li>
        </ul>

        <p className="mb-2"><strong>Cabos CA:</strong></p>
        <ul className="list-disc list-inside mb-4">
          <li>Isolação: PVC</li>
          <li>Isolamento: 1,0 kV</li>
          <li>Seção Transversal [mm²]: <span className="text-gray-400 italic">A preencher</span></li>
          <li>Método de Instalação: B1 (cabos unipolares em eletrodutos aparentes)</li>
        </ul>
      </div>

      {/* ==================== 11. PLACA DE ADVERTÊNCIA ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>11. PLACA DE ADVERTÊNCIA</h2>
        <p className="mb-2">Características da Placa:</p>
        <ul className="list-disc list-inside mb-4">
          <li>Espessura: 2 mm</li>
          <li>Material: Policarbonato com aditivos anti-raios UV (ultravioleta)</li>
          <li>Gravação: As letras devem ser em Arial Black</li>
          <li>Acabamento: Deve possuir cor amarela, obtida por processo de masterização com 2%, assegurando opacidade que permita adequada visualização das marcações pintadas na superfície da placa</li>
        </ul>
        <p className="text-xs italic text-center">Figura 4: Placa de advertência.</p>
      </div>

      {/* ==================== 12. ANEXOS ==================== */}
      <div className={sectionClass}>
        <h2 className={h2Class}>12. ANEXOS</h2>
        <ul className="list-disc list-inside space-y-1">
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
