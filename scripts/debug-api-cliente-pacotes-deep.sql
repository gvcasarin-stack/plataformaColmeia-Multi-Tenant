-- =====================================================
-- VERIFICAÇÃO PROFUNDA: Por que API retorna projetos vazio?
-- =====================================================

-- PARTE 1: Confirmar IDs e dados básicos
-- =====================================================
SELECT
  '1. DADOS DO PACOTE' as secao,
  id,
  user_id,
  tenant_id,
  projetos_usados,
  projetos_inclusos,
  status,
  data_ativacao
FROM cliente_pacotes
WHERE user_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

-- PARTE 2: Ver TODOS os projetos deste cliente com TODAS as colunas relevantes
-- =====================================================
SELECT
  '2. PROJETOS DO CLIENTE' as secao,
  p.id,
  p.number,
  p.cliente_pacote_id,
  p.tenant_id,
  p.billing_mode,
  p.deleted_at,
  p.empresa_integradora,
  p.nome_cliente_final,
  p.potencia_kwp,
  p.status,
  p.payment_status,
  p.created_at,
  -- Verificar se as colunas existem
  CASE WHEN p.empresa_integradora IS NULL THEN '⚠️ NULL' ELSE '✅ OK' END as empresa_check,
  CASE WHEN p.nome_cliente_final IS NULL THEN '⚠️ NULL' ELSE '✅ OK' END as cliente_check,
  CASE WHEN p.potencia_kwp IS NULL THEN '⚠️ NULL' ELSE '✅ OK' END as potencia_check
FROM projects p
WHERE p.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND p.user_id = (SELECT id FROM users WHERE email = 'gvcasarin@gmail.com')
ORDER BY p.created_at DESC;

-- PARTE 3: Simular EXATAMENTE a query da API
-- =====================================================
DO $$
DECLARE
  v_pacote_id UUID;
  v_tenant_id UUID := '061ff77b-8b3a-4732-9158-a574c1f1690a';
  projeto_record RECORD;
  total_encontrado INTEGER := 0;
BEGIN
  -- Buscar o pacote_id
  SELECT id INTO v_pacote_id
  FROM cliente_pacotes
  WHERE user_id = (SELECT id FROM users WHERE email = 'gvcasarin@gmail.com')
    AND tenant_id = v_tenant_id
  LIMIT 1;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIMULAÇÃO EXATA DA API';
  RAISE NOTICE 'Pacote ID: %', v_pacote_id;
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE '========================================';

  -- Query EXATA que a API faz (linha 65-70)
  FOR projeto_record IN
    SELECT
      id,
      number,
      empresa_integradora,
      nome_cliente_final,
      potencia_kwp,
      status,
      payment_status,
      created_at
    FROM projects
    WHERE cliente_pacote_id = v_pacote_id
      AND tenant_id = v_tenant_id
    ORDER BY created_at DESC
  LOOP
    total_encontrado := total_encontrado + 1;
    RAISE NOTICE 'Projeto %: % (ID: %)', total_encontrado, projeto_record.number, projeto_record.id;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TOTAL: % projetos encontrados', total_encontrado;
  RAISE NOTICE '========================================';

  IF total_encontrado = 0 THEN
    RAISE NOTICE '🚨 PROBLEMA: FK cliente_pacote_id pode estar NULL ou incorreto!';
  ELSIF total_encontrado = 2 THEN
    RAISE NOTICE '✅ SQL funciona! Problema está no código Node.js/Supabase';
  END IF;
END $$;

-- PARTE 4: Verificar FKs dos projetos
-- =====================================================
SELECT
  '4. VERIFICAR FKs' as secao,
  p.id as project_id,
  p.number,
  p.cliente_pacote_id,
  CASE
    WHEN p.cliente_pacote_id IS NULL THEN '❌ NULL'
    WHEN EXISTS (SELECT 1 FROM cliente_pacotes WHERE id = p.cliente_pacote_id) THEN '✅ FK válida'
    ELSE '⚠️ FK órfã'
  END as fk_status,
  cp.id as pacote_existe,
  cp.user_id as pacote_user_id,
  u.email as cliente_email
FROM projects p
LEFT JOIN cliente_pacotes cp ON cp.id = p.cliente_pacote_id
LEFT JOIN users u ON u.id = cp.user_id
WHERE p.tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND p.user_id = (SELECT id FROM users WHERE email = 'gvcasarin@gmail.com')
ORDER BY p.created_at DESC;

-- PARTE 5: Verificar se há algum problema com deleted_at ou billing_mode
-- =====================================================
SELECT
  '5. FILTROS QUE PODEM BLOQUEAR' as secao,
  COUNT(*) as total_projetos,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as nao_deletados,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deletados,
  COUNT(*) FILTER (WHERE billing_mode = 'pacote') as com_billing_pacote,
  COUNT(*) FILTER (WHERE billing_mode IS NULL) as billing_null,
  COUNT(*) FILTER (WHERE cliente_pacote_id IS NULL) as fk_null,
  COUNT(*) FILTER (WHERE cliente_pacote_id IS NOT NULL) as fk_preenchida
FROM projects
WHERE tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND user_id = (SELECT id FROM users WHERE email = 'gvcasarin@gmail.com');

-- PARTE 6: Ver estrutura da coluna cliente_pacote_id
-- =====================================================
SELECT
  '6. ESTRUTURA DA FK' as secao,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name = 'cliente_pacote_id';

-- PARTE 7: Ver se há constraint que pode estar bloqueando
-- =====================================================
SELECT
  '7. CONSTRAINTS DA TABELA' as secao,
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'projects'::regclass
  AND conname LIKE '%cliente_pacote%';

-- PARTE 8: Teste com user_id vs cliente_pacote_id
-- =====================================================
SELECT
  '8. COMPARAR QUERIES' as secao,
  'Por user_id' as tipo,
  COUNT(*) as total
FROM projects
WHERE user_id = (SELECT id FROM users WHERE email = 'gvcasarin@gmail.com')
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'

UNION ALL

SELECT
  '8. COMPARAR QUERIES' as secao,
  'Por cliente_pacote_id' as tipo,
  COUNT(*) as total
FROM projects
WHERE cliente_pacote_id = (
  SELECT id FROM cliente_pacotes
  WHERE user_id = (SELECT id FROM users WHERE email = 'gvcasarin@gmail.com')
    AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  LIMIT 1
)
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';
