-- ============================================================================
-- CONFIGURAÇÕES ESPECÍFICAS DO NEGÓCIO - ENERGIA SOLAR
-- ============================================================================
-- Este script adiciona as configurações específicas para o negócio de 
-- energia solar na tabela configs existente.

-- ============================================================================
-- 1. MENSAGEM DO CHECKLIST DE DOCUMENTOS
-- ============================================================================
INSERT INTO configs (key, value, description, category) VALUES
('checklist_message', 
'"Checklist de Documentos Necessários para o Projeto\n\nSeu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:\n\n📋 Documentos do Cliente:\n• Conta de energia dos últimos 12 meses\n• Documento de identidade (CPF/CNPJ)\n• Comprovante de residência atualizado\n\n🏠 Informações do Local:\n• Fotos do quadro de energia\n• Fotos do telhado/área de instalação\n• Medições da área disponível\n\n⚡ Dados Técnicos:\n• Consumo médio mensal (kWh)\n• Tipo de ligação (monofásica/bifásica/trifásica)\n• Padrão de entrada atualizado\n\n📄 Documentação Adicional:\n• Projeto arquitetônico (se necessário)\n• Autorização do condomínio (se aplicável)\n• Licenças especiais (se necessário)\n\nUma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido."',
'Mensagem padrão do checklist de documentos para projetos', 
'business'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 2. FAIXAS DE POTÊNCIA E PREÇOS
-- ============================================================================
INSERT INTO configs (key, value, description, category) VALUES
('faixas_potencia', 
'[
  {"potenciaMin": 0, "potenciaMax": 5, "valorBase": 600},
  {"potenciaMin": 5, "potenciaMax": 10, "valorBase": 700},
  {"potenciaMin": 10, "potenciaMax": 20, "valorBase": 800},
  {"potenciaMin": 20, "potenciaMax": 30, "valorBase": 1000},
  {"potenciaMin": 30, "potenciaMax": 40, "valorBase": 1200},
  {"potenciaMin": 40, "potenciaMax": 50, "valorBase": 1750},
  {"potenciaMin": 50, "potenciaMax": 75, "valorBase": 2500},
  {"potenciaMin": 75, "potenciaMax": 150, "valorBase": 3000},
  {"potenciaMin": 150, "potenciaMax": 300, "valorBase": 4000},
  {"potenciaMin": 300, "potenciaMax": 999999, "valorBase": 4000}
]',
'Faixas de potência (kWp) e valores base para cálculo automático de preços', 
'pricing'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 3. TABELA DE PREÇOS POR TIPO DE INSTALAÇÃO
-- ============================================================================
INSERT INTO configs (key, value, description, category) VALUES
('tabela_precos', 
'[
  {"tipo": "Residencial", "valorBase": "1500"},
  {"tipo": "Comercial", "valorBase": "2500"},
  {"tipo": "Industrial", "valorBase": "5000"}
]',
'Valores base por tipo de instalação (Residencial, Comercial, Industrial)', 
'pricing'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 4. DADOS BANCÁRIOS DA EMPRESA
-- ============================================================================
INSERT INTO configs (key, value, description, category) VALUES
('dados_bancarios', 
'{
  "banco": "",
  "agencia": "",
  "conta": "",
  "favorecido": "",
  "documento": "",
  "chavePix": ""
}',
'Dados bancários da empresa para pagamentos e PIX', 
'business'
)
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 5. CONFIGURAÇÕES ADICIONAIS DO NEGÓCIO
-- ============================================================================
INSERT INTO configs (key, value, description, category) VALUES
('projeto_prazo_padrao', '30', 'Prazo padrão para entrega de projetos (dias)', 'business'),
('orcamento_validade', '15', 'Validade padrão dos orçamentos (dias)', 'business'),
('margem_lucro_padrao', '0.25', 'Margem de lucro padrão (25%)', 'pricing'),
('desconto_maximo_permitido', '0.15', 'Desconto máximo permitido (15%)', 'pricing'),
('potencia_minima_projeto', '2', 'Potência mínima para projetos (kWp)', 'business'),
('potencia_maxima_projeto', '1000', 'Potência máxima para projetos (kWp)', 'business')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 6. CONFIGURAÇÕES DE EMAIL E NOTIFICAÇÕES
-- ============================================================================
INSERT INTO configs (key, value, description, category) VALUES
('email_assinatura', 
'"<br><br>---<br><strong>Equipe Colmeia Solar</strong><br>Energia sustentável para o futuro<br>📞 Contato: (XX) XXXX-XXXX<br>📧 contato@colmeiasolar.com"',
'Assinatura padrão para emails da empresa', 
'email'
),
('notificacao_prazo_projeto', '7', 'Dias antes do prazo para notificar sobre projetos', 'notifications'),
('email_copia_admin', 'admin@colmeiasolar.com', 'Email para cópia em comunicações importantes', 'email')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON TABLE configs IS 'Configurações gerais e específicas do negócio';

-- ============================================================================
-- 8. VERIFICAÇÃO E RELATÓRIO
-- ============================================================================
DO $$
DECLARE
  config_count INTEGER;
  business_count INTEGER;
  pricing_count INTEGER;
BEGIN
  -- Contar total de configurações
  SELECT COUNT(*) INTO config_count FROM configs WHERE is_active = true;
  
  -- Contar configurações de negócio
  SELECT COUNT(*) INTO business_count FROM configs 
  WHERE category = 'business' AND is_active = true;
  
  -- Contar configurações de preços
  SELECT COUNT(*) INTO pricing_count FROM configs 
  WHERE category = 'pricing' AND is_active = true;
  
  RAISE NOTICE '✅ Configurações específicas do negócio adicionadas!';
  RAISE NOTICE '📊 Total de configurações ativas: %', config_count;
  RAISE NOTICE '🏢 Configurações de negócio: %', business_count;
  RAISE NOTICE '💰 Configurações de preços: %', pricing_count;
  RAISE NOTICE '🎉 Tabela configs está completa para o SaaS de energia solar!';
END $$; 