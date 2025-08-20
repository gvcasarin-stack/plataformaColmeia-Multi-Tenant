-- 🧹 LIMPEZA DE CONFIGURAÇÕES NÃO UTILIZADAS
-- ⚠️ PRODUÇÃO: Execute apenas após confirmação

-- ============================================================================
-- ANÁLISE: CONFIGURAÇÕES NÃO UTILIZADAS NO CÓDIGO
-- ============================================================================
-- Estas configurações existem na tabela configs mas NÃO são usadas no código:
-- - margem_lucro_padrao (nunca referenciada)
-- - desconto_maximo_permitido (nunca referenciada)
-- - orcamento_validade (nunca referenciada)
-- - projeto_prazo_padrao (nunca referenciada)
-- - potencia_minima_projeto (nunca referenciada)
-- - potencia_maxima_projeto (nunca referenciada)

-- ============================================================================
-- 1. BACKUP DAS CONFIGURAÇÕES A SEREM REMOVIDAS
-- ============================================================================
SELECT 
    '=== BACKUP DAS CONFIGURAÇÕES A SEREM REMOVIDAS ===' as info,
    key,
    value,
    description,
    category
FROM configs 
WHERE key IN (
    'margem_lucro_padrao',
    'desconto_maximo_permitido', 
    'orcamento_validade',
    'projeto_prazo_padrao',
    'potencia_minima_projeto',
    'potencia_maxima_projeto'
)
ORDER BY key;

-- ============================================================================
-- 2. VERIFICAR CONFIGURAÇÕES REALMENTE UTILIZADAS
-- ============================================================================
SELECT 
    '=== CONFIGURAÇÕES QUE SERÃO MANTIDAS ===' as info,
    key,
    description,
    'USADO NO CÓDIGO' as status
FROM configs 
WHERE key IN (
    'faixas_potencia',        -- Usado em projectUtils.ts
    'dados_bancarios',        -- Usado em faturas
    'checklist_message',      -- Usado em comunicações
    'email_assinatura',       -- Usado em emails
    'email_copia_admin',      -- Usado em emails
    'notificacao_prazo_projeto' -- Usado em notificações
)
ORDER BY key;

-- ============================================================================
-- 3. VERIFICAR CONFIGURAÇÃO SUSPEITA
-- ============================================================================
SELECT 
    '=== CONFIGURAÇÃO SUSPEITA (VERIFICAR USO) ===' as info,
    key,
    description,
    'VERIFICAR SE É USADA' as status
FROM configs 
WHERE key = 'tabela_precos';
-- Esta configuração existe mas não encontrei uso direto no código

-- ============================================================================
-- 4. REMOVER CONFIGURAÇÕES NÃO UTILIZADAS
-- ============================================================================
-- ATENÇÃO: Descomente apenas se tiver certeza de que não são utilizadas

-- DELETE FROM configs 
-- WHERE key IN (
--     'margem_lucro_padrao',
--     'desconto_maximo_permitido', 
--     'orcamento_validade',
--     'projeto_prazo_padrao',
--     'potencia_minima_projeto',
--     'potencia_maxima_projeto'
-- );

-- ============================================================================
-- 5. VERIFICAÇÃO PÓS-LIMPEZA (descomente após executar DELETE)
-- ============================================================================
-- SELECT 
--     '=== CONFIGURAÇÕES RESTANTES ===' as info,
--     COUNT(*) as total_configuracoes,
--     STRING_AGG(key, ', ' ORDER BY key) as chaves_restantes
-- FROM configs
-- WHERE is_active = true;

-- ============================================================================
-- 6. ECONOMIA ESTIMADA
-- ============================================================================
SELECT 
    '=== ECONOMIA COM A LIMPEZA ===' as info,
    6 as configuracoes_removidas,
    '~6KB de dados + overhead' as economia_estimada,
    'Tabela mais limpa e focada' as beneficio;

-- ============================================================================
-- RELATÓRIO FINAL
-- ============================================================================
SELECT 
    '🎯 CONFIGURAÇÕES ANALISADAS' as resultado,
    '6 configurações não utilizadas identificadas' as configs_inuteis,
    '7 configurações essenciais mantidas' as configs_uteis,
    'Remova apenas se tiver 100% de certeza' as recomendacao; 