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

// Interface para configuração completa
export interface ConfiguracaoSistema {
  id?: string;
  mensagemChecklist?: string;
  tabelaPrecos?: { tipo: string; valorBase: string }[];
  faixasPotencia?: FaixaPotenciaPreco[];
  dadosBancarios?: DadosBancarios;
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca configurações gerais do sistema da tabela configs
 */
export async function getConfiguracaoGeral(): Promise<ConfiguracaoSistema | null> {
  try {
    logger.info('[ConfigService] Buscando configurações na tabela configs');

    const supabase = createSupabaseBrowserClient();
    
    // Buscar configurações específicas
    const { data, error } = await supabase
      .from('configs')
      .select('key, value')
      .in('key', [
        'checklist_message',
        'tabela_precos', 
        'faixas_potencia',
        'dados_bancarios'
      ])
      .eq('is_active', true);

    if (error) {
      // ✅ PRODUÇÃO - Tratar caso tabela não existe
      if (error.code === '42P01') {
        logger.warn('[ConfigService] [SUPABASE] Tabela configs não existe, retornando configuração padrão');
        return await criarConfiguracaoPadrao();
      }
      
      logger.error('[ConfigService] Erro ao buscar configurações:', error);
      // ✅ PRODUÇÃO - Retornar configuração padrão em caso de erro
      return await criarConfiguracaoPadrao();
    }

    // Converter dados para formato esperado
    const config: ConfiguracaoSistema = { id: 'geral' };
    
    data?.forEach(item => {
      switch (item.key) {
        case 'checklist_message':
          config.mensagemChecklist = item.value;
          break;
        case 'tabela_precos':
          config.tabelaPrecos = item.value;
          break;
        case 'faixas_potencia':
          config.faixasPotencia = item.value;
          break;
        case 'dados_bancarios':
          config.dadosBancarios = item.value;
          break;
      }
    });

    // Se não encontrou nenhuma configuração, retornar padrão
    if (!data || data.length === 0) {
      logger.info('[ConfigService] Nenhuma configuração encontrada, retornando padrão');
      return await criarConfiguracaoPadrao();
    }

    logger.info('[ConfigService] Configurações encontradas na tabela configs');
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
    }
  };

  // ✅ PRODUÇÃO - Não tentar salvar no frontend
  // Para salvar, use APIs ou a interface administrativa
  logger.info('[ConfigService] [FALLBACK] Retornando configuração padrão (tabela configs)');

  return defaultConfig;
}
