// ✅ SUPABASE - Serviço de configurações administrativas
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import logger from '@/lib/utils/logger';

/**
 * SERVIÇO DE CONFIGURAÇÕES SUPABASE
 * 
 * ⚠️ IMPORTANTE: Este serviço usa a tabela `configs` existente
 * Usa apenas Browser Client para segurança no frontend
 */

// Interface para faixas de potência e preço
export interface FaixaPotenciaPreco {
  potenciaMin: number;
  potenciaMax: number;
  valorBase: number;
}

// Interface para dados bancários
export interface DadosBancarios {
  banco: string;
  agencia: string;
  conta: string;
  favorecido: string;
  documento: string;
  chavePix: string;
}

// Interface para dados do responsável técnico
export interface ResponsavelTecnico {
  nomeCompleto: string;
  cpf: string;
  rg: string;
  orgaoExpeditor: string;
  profissao: string;
  numeroRegistro: string;
  instituicao: string;
  estadoRegistro: string;
  email?: string;
  uf?: string;
  telefone?: string;
}

// Interface para configuração completa
export interface ConfiguracaoSistema {
  id?: string;
  mensagemChecklist?: string;
  tabelaPrecos?: { tipo: string; valorBase: string }[];
  faixasPotencia?: FaixaPotenciaPreco[];
  dadosBancarios?: DadosBancarios;
  responsavelTecnico?: ResponsavelTecnico;
  textoProcuracao?: string;
  precificacaoManual?: boolean;
  logoEmpresaUrl?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca configurações gerais do sistema da tabela configs
 */
export async function getConfiguracaoGeral(): Promise<ConfiguracaoSistema | null> {
  try {
    logger.info('[ConfigService] Buscando configurações na tabela configs');

    // ✅ PRODUÇÃO: usar API interna que já aplica x-tenant-id e Service Role
    const response = await fetch('/api/admin/config', { method: 'GET' });
    if (!response.ok) {
      logger.error('[ConfigService] Erro HTTP ao buscar /api/admin/config:', response.status);
      return await criarConfiguracaoPadrao();
    }

    const json = await response.json();
    if (!json?.success || !json?.data) {
      logger.warn('[ConfigService] Resposta sem dados de configuração, usando padrão');
      return await criarConfiguracaoPadrao();
    }

    const apiData = json.data as Record<string, any>;
    const config: ConfiguracaoSistema = { id: 'geral' };
    if (apiData.checklist_message !== undefined) config.mensagemChecklist = apiData.checklist_message;
    if (apiData.tabela_precos !== undefined) config.tabelaPrecos = apiData.tabela_precos;
    if (apiData.faixas_potencia !== undefined) config.faixasPotencia = apiData.faixas_potencia;
    if (apiData.dados_bancarios !== undefined) config.dadosBancarios = apiData.dados_bancarios;
    if (apiData.responsavel_tecnico !== undefined) config.responsavelTecnico = apiData.responsavel_tecnico;
    if (apiData.texto_procuracao !== undefined) config.textoProcuracao = apiData.texto_procuracao;
    if (apiData.precificacao_manual !== undefined) config.precificacaoManual = apiData.precificacao_manual;
    if (apiData.logo_empresa_url !== undefined) config.logoEmpresaUrl = apiData.logo_empresa_url;

    logger.info('[ConfigService] Configurações obtidas via API com sucesso');
    return config;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao buscar configurações:', error);
    // ✅ PRODUÇÃO - Fallback para configuração padrão
    logger.warn('[ConfigService] [FALLBACK] Retornando configuração padrão devido a erro');
    return await criarConfiguracaoPadrao();
  }
}

/**
 * Salva configuração geral do sistema
 * ✅ Agora usa API route segura para operações complexas
 */
export async function salvarConfiguracaoGeral(config: ConfiguracaoSistema): Promise<boolean> {
  try {
    logger.info('[ConfigService] Salvando configuração geral via API');

    // Salvar cada configuração individualmente
    const promises = [];

    if (config.mensagemChecklist) {
      promises.push(atualizarMensagemChecklist(config.mensagemChecklist));
    }

    if (config.faixasPotencia) {
      promises.push(atualizarFaixasPotencia(config.faixasPotencia));
    }

    if (config.dadosBancarios) {
      promises.push(atualizarDadosBancarios(config.dadosBancarios));
    }

    if (config.responsavelTecnico) {
      promises.push(atualizarResponsavelTecnico(config.responsavelTecnico));
    }

    if (config.textoProcuracao) {
      promises.push(atualizarTextoProcuracao(config.textoProcuracao));
    }

    if (config.tabelaPrecos) {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: 'tabela_precos',
          value: config.tabelaPrecos,
          description: 'Valores base por tipo de instalação (Residencial, Comercial, Industrial)'
        })
      });

      const result = await response.json();
      promises.push(Promise.resolve(result.success));
    }

    const results = await Promise.all(promises);
    const allSuccess = results.every(success => success);

    if (allSuccess) {
      logger.info('[ConfigService] Configuração geral salva com sucesso');
    } else {
      logger.warn('[ConfigService] Algumas configurações falharam ao salvar');
    }

    return allSuccess;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao salvar configuração geral:', error);
    return false;
  }
}

/**
 * Atualiza apenas a mensagem do checklist
 * ✅ Agora usa API route segura
 */
export async function atualizarMensagemChecklist(mensagem: string): Promise<boolean> {
  try {
    logger.info('[ConfigService] Atualizando mensagem do checklist via API');

    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'checklist_message',
        value: mensagem,
        description: 'Mensagem padrão do checklist de documentos para projetos'
      })
    });

    const result = await response.json();

    if (!result.success) {
      logger.error('[ConfigService] Erro na API ao atualizar checklist:', result.error);
      return false;
    }

    logger.info('[ConfigService] Mensagem do checklist atualizada com sucesso');
    return true;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao atualizar mensagem do checklist:', error);
    return false;
  }
}

/**
 * Atualiza faixas de potência
 * ✅ Agora usa API route segura
 */
export async function atualizarFaixasPotencia(faixas: FaixaPotenciaPreco[]): Promise<boolean> {
  try {
    logger.info('[ConfigService] Atualizando faixas de potência via API');

    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'faixas_potencia',
        value: faixas,
        description: 'Faixas de potência (kWp) e valores base para cálculo automático de preços'
      })
    });

    const result = await response.json();

    if (!result.success) {
      logger.error('[ConfigService] Erro na API ao atualizar faixas de potência:', result.error);
      return false;
    }

    logger.info('[ConfigService] Faixas de potência atualizadas com sucesso');
    return true;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao atualizar faixas de potência:', error);
    return false;
  }
}

/**
 * Atualiza dados bancários
 * ✅ Agora usa API route segura
 */
export async function atualizarDadosBancarios(dados: DadosBancarios): Promise<boolean> {
  try {
    logger.info('[ConfigService] Atualizando dados bancários via API');

    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'dados_bancarios',
        value: dados,
        description: 'Dados bancários da empresa para pagamentos e PIX'
      })
    });

    const result = await response.json();

    if (!result.success) {
      logger.error('[ConfigService] Erro na API ao atualizar dados bancários:', result.error);
      return false;
    }

    logger.info('[ConfigService] Dados bancários atualizados com sucesso');
    return true;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao atualizar dados bancários:', error);
    return false;
  }
}

/**
 * Atualiza dados do responsável técnico
 * ✅ Agora usa API route segura
 */
export async function atualizarResponsavelTecnico(dados: ResponsavelTecnico): Promise<boolean> {
  try {
    logger.info('[ConfigService] Atualizando dados do responsável técnico via API');

    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'responsavel_tecnico',
        value: dados,
        description: 'Dados do responsável técnico para geração de procurações'
      })
    });

    const result = await response.json();

    if (!result.success) {
      logger.error('[ConfigService] Erro na API ao atualizar responsável técnico:', result.error);
      return false;
    }

    logger.info('[ConfigService] Dados do responsável técnico atualizados com sucesso');
    return true;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao atualizar responsável técnico:', error);
    return false;
  }
}

/**
 * Atualiza texto da procuração
 * ✅ Agora usa API route segura
 */
export async function atualizarTextoProcuracao(texto: string): Promise<boolean> {
  try {
    logger.info('[ConfigService] Atualizando texto da procuração via API');

    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'texto_procuracao',
        value: texto,
        description: 'Texto padrão da procuração com variáveis para substituição'
      })
    });

    const result = await response.json();

    if (!result.success) {
      logger.error('[ConfigService] Erro na API ao atualizar texto da procuração:', result.error);
      return false;
    }

    logger.info('[ConfigService] Texto da procuração atualizado com sucesso');
    return true;

  } catch (error) {
    logger.error('[ConfigService] Exceção ao atualizar texto da procuração:', error);
    return false;
  }
}

/**
 * Atualiza modo de precificação manual
 * ✅ Usa API route segura
 */
export async function atualizarPrecificacaoManual(ativado: boolean, userId: string): Promise<boolean> {
  try {
    logger.info('[ConfigService] Atualizando modo de precificação manual via API');

    // 🔍 DEBUG: Log detalhado da requisição
    logger.info('[ConfigService] Fazendo fetch para /api/admin/config');
    logger.info('[ConfigService] Body:', {
      key: 'precificacao_manual',
      value: ativado,
      user_id: userId
    });

    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: 'precificacao_manual',
        value: ativado,
        description: 'Controle manual de preços - quando ativado, novos projetos avulsos são criados com R$ 0,00',
        user_id: userId  // ✅ CRÍTICO: Enviar user_id para preencher created_by/updated_by
      })
    });

    // 🔍 DEBUG: Log da resposta HTTP
    logger.info('[ConfigService] Response status:', response.status);
    logger.info('[ConfigService] Response ok:', response.ok);
    logger.info('[ConfigService] Response headers:', Object.fromEntries(response.headers.entries()));

    // Tentar ler o body mesmo se houver erro
    let result;
    try {
      const text = await response.text();
      logger.info('[ConfigService] Response text:', text);
      result = JSON.parse(text);
    } catch (parseError) {
      logger.error('[ConfigService] Erro ao fazer parse do JSON da resposta:', parseError);
      return false;
    }

    if (!result.success) {
      logger.error('[ConfigService] Erro na API ao atualizar precificação manual:', result.error);
      logger.error('[ConfigService] Detalhes completos do erro:', result);
      return false;
    }

    logger.info('[ConfigService] Modo de precificação manual atualizado com sucesso:', ativado);
    return true;

  } catch (error) {
    // 🔍 DEBUG: Log detalhado do erro
    logger.error('[ConfigService] Exceção ao atualizar precificação manual:', error);
    logger.error('[ConfigService] Tipo do erro:', typeof error);
    logger.error('[ConfigService] Nome do erro:', (error as any)?.name);
    logger.error('[ConfigService] Mensagem do erro:', (error as any)?.message);
    logger.error('[ConfigService] Stack:', (error as any)?.stack);
    if (error instanceof TypeError) {
      logger.error('[ConfigService] TypeError detectado - provavelmente erro de rede ou CORS');
    }
    return false;
  }
}

/**
 * Cria configuração padrão do sistema
 */
export async function criarConfiguracaoPadrao(): Promise<ConfiguracaoSistema> {
  const defaultChecklist = `Checklist de Documentos Necessários para o Projeto

Seu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:

Fatura de energia com dados legíveis.
Lista de materiais contendo: marca, modelo e quantidade de módulos, inversores e demais componentes, como por exemplo Stringbox (se houver).
Foto do documento completo (frente e verso) do responsável legal (CNH ou documento de identidade). Se a titularidade estiver em nome de pessoa jurídica (PJ), encaminhar também o cartão CNPJ e contrato social, além do documento de identidade do responsável legal pela unidade consumidora.
Foto do padrão de entrada.
Foto ou informação de qual é o DJ (disjuntor) do padrão de entrada.
Coordenada geográfica exata do local de instalação.
Instalação em telhado ou solo?
Se for seu primeiro projeto conosco, encaminhe a logo de sua empresa para a elaboração dos documentos.
Fotos complementares de onde será feita a instalação. Caso possuir, encaminhar imagens que auxiliam a avaliação do local, bem como possíveis fontes de sombreamento (caso houver)
Para os projetos na distribuidora ENEL ou EQUATORIAL, encaminhar foto que contenha o número do poste que alimenta a unidade consumidora, ou o poste mais próximo do local de atendimento.

Uma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido.`;

  const defaultFaixasPotencia: FaixaPotenciaPreco[] = [
    { potenciaMin: 0, potenciaMax: 5, valorBase: 600 },
    { potenciaMin: 5, potenciaMax: 10, valorBase: 700 },
    { potenciaMin: 10, potenciaMax: 20, valorBase: 800 },
    { potenciaMin: 20, potenciaMax: 30, valorBase: 1000 },
    { potenciaMin: 30, potenciaMax: 40, valorBase: 1200 },
    { potenciaMin: 40, potenciaMax: 50, valorBase: 1750 },
    { potenciaMin: 50, potenciaMax: 75, valorBase: 2500 },
    { potenciaMin: 75, potenciaMax: 150, valorBase: 3000 },
    { potenciaMin: 150, potenciaMax: 300, valorBase: 4000 },
    { potenciaMin: 300, potenciaMax: 999999, valorBase: 4000 },
  ];

  const defaultProcuracao = `<div style="text-align: center; margin-bottom: 40px;">
<h2 style="font-weight: bold; font-size: 20px; letter-spacing: 2px;">PROCURAÇÃO</h2>
</div>

<div style="text-align: justify; line-height: 1.8; margin-bottom: 20px;">
<p style="margin-bottom: 15px;">
<strong>OUTORGANTE:</strong> Por este instrumento de procuração, <strong>{{cliente_nome}}</strong>, inscrito no CPF sob o nº <strong>{{cliente_cpf}}</strong>.
</p>

<p style="margin-bottom: 15px;">
<strong>OUTORGADO:</strong> Nomeia e constitui o seu bastante procurador <strong>{{responsavel_nome}}</strong>, portador do RG nº <strong>{{responsavel_rg}} {{responsavel_orgao_expeditor}}</strong> e inscrito no CPF sob o nº <strong>{{responsavel_cpf}}</strong>, <strong>{{responsavel_profissao}}</strong> inscrito no <strong>{{responsavel_instituicao}} {{responsavel_estado}}</strong> sob o nº <strong>{{responsavel_registro}}</strong>.
</p>

<p style="margin-bottom: 15px;">
<strong>PODERES:</strong> Para o fim especial de representar o <strong>OUTORGANTE</strong> perante à <strong style="text-transform: uppercase;">{{distribuidora}}</strong> no tocante as solicitações de parecer de acesso para micro geração ou mini geração, pedidos de vistoria de micro geração ou mini geração, pedidos de alteração de carga alteração de demanda, assim tendo ainda o <strong>OUTORGADO</strong>, na qualidade de procurador do <strong>OUTORGANTE</strong>, os poderes suficientes e necessários de representação para dar entrada em processos administrativos, protocolar requerimentos, apresentar documentação em cumprimento às exigências técnicas e administrativas e, ainda, assinatura dos seguintes documentos: formulário de solicitação de acesso, formulário de registro, formulário de compensação, ART/TRT, identificação do consumidor, termo de responsabilidade, cadastro de geração distribuída, solicitação de vistoria, formulário de troca do padrão/aumento de carga e formulário de ligação nova.
</p>

<br>
<p style="margin-bottom: 30px;">
{{cidade}}-{{estado}}, {{data}}.
</p>
</div>

<br>
<br>
<div style="text-align: center; margin-top: 60px;">
<div style="display: inline-block; border-top: 2px solid #000; width: 350px; padding-top: 8px; margin-bottom: 15px;">
<strong>Assinatura</strong>
</div>
<div style="margin-top: 12px; font-size: 14px;">
<strong>Nome completo:</strong> {{cliente_nome}}
</div>
<div style="margin-top: 8px; font-size: 14px;">
<strong>CPF:</strong> {{cliente_cpf}}
</div>
</div>`;

  const defaultConfig: ConfiguracaoSistema = {
    id: 'geral',
    mensagemChecklist: defaultChecklist,
    tabelaPrecos: [
      { tipo: 'Residencial', valorBase: '0' },
      { tipo: 'Comercial', valorBase: '0' },
      { tipo: 'Industrial', valorBase: '0' }
    ],
    faixasPotencia: defaultFaixasPotencia,
    dadosBancarios: {
      banco: '',
      agencia: '',
      conta: '',
      favorecido: '',
      documento: '',
      chavePix: ''
    },
    responsavelTecnico: {
      nomeCompleto: '',
      cpf: '',
      rg: '',
      orgaoExpeditor: '',
      profissao: '',
      numeroRegistro: '',
      instituicao: 'CREA',
      estadoRegistro: ''
    },
    textoProcuracao: defaultProcuracao
  };

  // ✅ PRODUÇÃO - Não tentar salvar no frontend
  // Para salvar, use APIs ou a interface administrativa
  logger.info('[ConfigService] [FALLBACK] Retornando configuração padrão (tabela configs)');

  return defaultConfig;
} 