-- ✅ CORREÇÃO: Remover escape duplo da mensagem de checklist
-- Script para corrigir o problema de formatação da mensagem

-- ===========================================
-- PASSO 1: Corrigir mensagens existentes
-- ===========================================

-- Atualizar a mensagem da tenant atual removendo o escape triplo/duplo
-- Estratégia: extrair como texto puro, remover TODOS os escapes, salvar limpo
WITH cleaned_text AS (
  SELECT
    id,
    -- Extrair o valor como string JSON, remover aspas externas e processar escapes
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        TRIM(BOTH '"' FROM (value->>0)::text),  -- Remove aspas externas do JSON
        '\\n', E'\n', 'g'                        -- Substitui \n (qualquer quantidade) por quebra real
      ),
      '\\(.)', '\1', 'g'                         -- Remove todas as barras invertidas de escape
    ) as clean_value
  FROM configs
  WHERE key = 'checklist_message'
)
UPDATE configs
SET value = to_jsonb(cleaned_text.clean_value)
FROM cleaned_text
WHERE configs.id = cleaned_text.id
  AND configs.key = 'checklist_message';

-- ===========================================
-- PASSO 2: Verificar resultado
-- ===========================================

SELECT
  tenant_id,
  key,
  LEFT(value::text, 100) as preview,
  LENGTH(value::text) as tamanho,
  updated_at
FROM configs
WHERE key = 'checklist_message'
ORDER BY updated_at DESC;

-- ===========================================
-- NOTAS IMPORTANTES
-- ===========================================

/*
📋 O QUE ESTE SCRIPT FAZ:

1. Remove o escape duplo (\\n vira \n real)
2. Remove aspas extras escapadas
3. Mantém a formatação correta para JSONB

⚠️ ATENÇÃO:
- Execute primeiro em uma tenant de teste
- Verifique o resultado com a query SELECT acima
- Se algo der errado, você pode restaurar do backup

🔍 COMO VERIFICAR SE FUNCIONOU:
Após executar, a prévia deve mostrar quebras de linha reais
ao invés de \\n no texto.
*/
