// ✅ SERVIÇO PARA AUTO-POPULAÇÃO DE CONFIGS PARA NOVOS TENANTS
import { createSupabaseServiceRoleClient } from '@/lib/supabase/service';
import logger from '@/lib/utils/logger';

interface TenantConfigTemplate {
  key: string;
  value: any;
  description: string;
  category: string;
}

/**
 * Template de configurações padrão que todo tenant deve ter
 * Personalizado com dados da organização
 */
function getDefaultConfigsTemplate(orgName: string): TenantConfigTemplate[] {
  return [
    // CONFIGURAÇÃO GERAL - Checklist Message
    {
      key: 'checklist_message',
      value: `"Checklist de Documentos Necessários para o Projeto\\n\\nSeu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:\\n\\n📋 Documentos do Cliente:\\n• Fatura de Energia com dados legíveis;\\n• Documento de identidade completo (frente e verso) do responsável legal (CNH ou Documento de Identidade). Se a titularidade estiver em nome de Pessoa Jurídica (CNPJ), encaminhar também o cartão CNPJ e Contrato Social, além do documento de identidade do responsável legal pela unidade consumidora;\\n\\n🏠 Informações do Local:\\n• Foto do Padrão de Entrada (Mostrando Poste e Caixa de Medição);\\n• Foto ou informação de qual é o Disjuntor do Padrão de Entrada;\\n• Coordenadas Geográficas exatas do telhado do cliente ou local de instalação;\\n\\n⚡ Dados Técnicos:\\n• Lista de Materiais contendo: Marca, Modelo e Quantidade de Módulos, Inversores e demais componentes (Ex: Stringbox, se houver);\\n\\n📄 Documentação Adicional:\\n• Se for seu Primeiro Projeto conosco, encaminhe a Logo da sua empresa para colocarmos nas pranchas do projeto;\\n• A Instalação será em solo ou em telhado?\\n• Fotos do telhado/área de instalação (não obrigatório);\\n• Para os projetos nas distribuidoras ENEL ou EQUATORIAL, encaminhar foto que contenha o número do poste que alimenta a unidade consumidora, ou o poste mais próximo do local de atendimento.\\n\\nUma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido."`,
      description: 'Mensagem padrão do checklist de documentos para projetos',
      category: 'geral'
    },
    
    // CONFIGURAÇÃO GERAL - Nome da App
    {
      key: 'app_name',
      value: `"Plataforma ${orgName}"`,
      description: 'Nome da aplicação para este tenant',
      category: 'geral'
    },
    
    // CONFIGURAÇÃO FINANCEIRA - Faixas de Potência
    {
      key: 'faixas_potencia',
      value: [
        {"valorBase": 600, "potenciaMax": 5, "potenciaMin": 0},
        {"valorBase": 600, "potenciaMax": 10, "potenciaMin": 5},
        {"valorBase": 700, "potenciaMax": 20, "potenciaMin": 10},
        {"valorBase": 800, "potenciaMax": 30, "potenciaMin": 20},
        {"valorBase": 1000, "potenciaMax": 40, "potenciaMin": 30},
        {"valorBase": 1500, "potenciaMax": 50, "potenciaMin": 40},
        {"valorBase": 2000, "potenciaMax": 75, "potenciaMin": 50},
        {"valorBase": 2500, "potenciaMax": 150, "potenciaMin": 75},
        {"valorBase": 3000, "potenciaMax": 300, "potenciaMin": 150},
        {"valorBase": 4000, "potenciaMax": 999999, "potenciaMin": 300}
      ],
      description: 'Faixas de potência (kWp) e valores base para cálculo automático de preços',
      category: 'financial'
    },
    
    // CONFIGURAÇÃO FINANCEIRA - Dados Bancários
    {
      key: 'dados_bancarios',
      value: {
        banco: "Dock Instituição de Pagamentos S. A.",
        conta: "1557547-5",
        agencia: "0001",
        chavePix: "(XX) 9 XXXX-XXXX",
        documento: "XX.XXX.XXX/0001-XX",
        favorecido: `${orgName} LTDA`
      },
      description: 'Dados bancários da empresa para pagamentos e PIX',
      category: 'financial'
    },
    
    // CONFIGURAÇÃO EMAIL - Assinatura
    {
      key: 'email_assinatura',
      value: `"<br><br>---<br><strong>Equipe ${orgName}</strong><br>Energia sustentável para o futuro<br>📞 Contato: (XX) XXXX-XXXX<br>📧 contato@${orgName.toLowerCase().replace(/\\s+/g, '')}.com"`,
      description: 'Assinatura padrão para emails da empresa',
      category: 'email'
    }
  ];
}

/**
 * Configura automaticamente um novo tenant com configurações padrão
 */
export async function setupNewTenantConfigs(
  tenantId: string,
  orgName: string,
  createdBy: string
): Promise<{ success: boolean; error?: string; configsCreated?: number }> {
  try {
    logger.info('[TenantConfigSetup] Iniciando setup de configs para novo tenant:', {
      tenantId,
      orgName,
      createdBy
    });

    const supabase = createSupabaseServiceRoleClient();
    
    // Verificar se tenant já tem configurações
    const { data: existingConfigs, error: checkError } = await supabase
      .from('configs')
      .select('key')
      .eq('tenant_id', tenantId);

    if (checkError) {
      logger.error('[TenantConfigSetup] Erro ao verificar configs existentes:', checkError);
      return { success: false, error: checkError.message };
    }

    if (existingConfigs && existingConfigs.length > 0) {
      logger.info('[TenantConfigSetup] Tenant já possui configurações, pulando setup:', {
        tenantId,
        existingConfigsCount: existingConfigs.length
      });
      return { success: true, configsCreated: 0 };
    }

    // Preparar dados para inserção
    const configsTemplate = getDefaultConfigsTemplate(orgName);
    const timestamp = new Date().toISOString();
    
    const configsToInsert = configsTemplate.map(config => ({
      tenant_id: tenantId,
      category: config.category,
      key: config.key,
      value: typeof config.value === 'string' ? config.value : JSON.stringify(config.value),
      description: config.description,
      is_system: false,
      is_encrypted: false,
      created_by: createdBy,
      created_at: timestamp,
      updated_at: timestamp
    }));

    logger.info('[TenantConfigSetup] Inserindo configurações padrão:', {
      tenantId,
      configCount: configsToInsert.length
    });

    // Inserir todas as configurações de uma vez
    const { data: insertedConfigs, error: insertError } = await supabase
      .from('configs')
      .insert(configsToInsert)
      .select('key, category');

    if (insertError) {
      logger.error('[TenantConfigSetup] Erro ao inserir configurações:', insertError);
      return { success: false, error: insertError.message };
    }

    const configsCreated = insertedConfigs?.length || 0;

    logger.info('[TenantConfigSetup] Setup concluído com sucesso:', {
      tenantId,
      orgName,
      configsCreated,
      configs: insertedConfigs?.map(c => `${c.category}/${c.key}`)
    });

    return { 
      success: true, 
      configsCreated 
    };

  } catch (error) {
    logger.error('[TenantConfigSetup] Exceção durante setup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Verifica se um tenant tem todas as configurações essenciais
 */
export async function validateTenantConfigs(tenantId: string): Promise<{
  isValid: boolean;
  missingConfigs: string[];
  existingConfigs: string[];
}> {
  try {
    logger.info('[TenantConfigSetup] Validando configs do tenant:', tenantId);
    
    const supabase = createSupabaseServiceRoleClient();
    
    const { data: existingConfigs, error } = await supabase
      .from('configs')
      .select('key')
      .eq('tenant_id', tenantId);

    if (error) {
      logger.error('[TenantConfigSetup] Erro ao validar configs:', error);
      return { isValid: false, missingConfigs: [], existingConfigs: [] };
    }

    const existingKeys = existingConfigs?.map(c => c.key) || [];
    const requiredKeys = ['checklist_message', 'app_name', 'faixas_potencia', 'dados_bancarios', 'email_assinatura'];
    const missingKeys = requiredKeys.filter(key => !existingKeys.includes(key));

    const isValid = missingKeys.length === 0;

    logger.info('[TenantConfigSetup] Validação concluída:', {
      tenantId,
      isValid,
      existingCount: existingKeys.length,
      missingCount: missingKeys.length,
      missingKeys
    });

    return {
      isValid,
      missingConfigs: missingKeys,
      existingConfigs: existingKeys
    };

  } catch (error) {
    logger.error('[TenantConfigSetup] Exceção durante validação:', error);
    return { isValid: false, missingConfigs: [], existingConfigs: [] };
  }
}