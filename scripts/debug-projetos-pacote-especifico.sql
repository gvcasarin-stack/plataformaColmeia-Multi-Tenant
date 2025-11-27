-- =====================================================
-- DEBUG ESPECÍFICO: Pacote 20b17000-01ee-467d-a0d5-b8260da6ece6
-- Por que a API retorna projetos: [] vazio?
-- =====================================================

-- IDs conhecidos da API:
-- pacote_id: 20b17000-01ee-467d-a0d5-b8260da6ece6
-- user_id: b772107b-bfa8-48e7-81ac-995331e66623
-- tenant_id: 061ff77b-8b3a-4732-9158-a574c1f1690a

-- TESTE 1: Query EXATA da API (linhas 65-70)
-- =====================================================
SELECT
  '1. QUERY EXATA DA API' as teste,
  id,
  number,
  empresa_integradora,
  nome_cliente_final,
  potencia_kwp,
  status,
  payment_status,
  created_at
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY created_at DESC;

-- TESTE 2: Verificar se os projetos existem mas com FK diferente
-- =====================================================
SELECT
  '2. TODOS PROJETOS DO USUÁRIO' as teste,
  id,
  number,
  cliente_pacote_id,
  CASE
    WHEN cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6' THEN '✅ FK correta'
    WHEN cliente_pacote_id IS NULL THEN '❌ FK NULL'
    ELSE '⚠️ FK diferente: ' || cliente_pacote_id::text
  END as fk_status,
  deleted_at,
  billing_mode
FROM projects
WHERE user_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
ORDER BY created_at DESC;

-- TESTE 3: Contar projetos com diferentes filtros
-- =====================================================
SELECT
  '3. CONTADORES' as teste,
  COUNT(*) as total_projetos_usuario,
  COUNT(*) FILTER (WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6') as com_fk_correta,
  COUNT(*) FILTER (WHERE cliente_pacote_id IS NULL) as fk_null,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as nao_deletados,
  COUNT(*) FILTER (WHERE billing_mode = 'pacote') as billing_pacote
FROM projects
WHERE user_id = 'b772107b-bfa8-48e7-81ac-995331e66623'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

-- TESTE 4: Ver se cliente_pacote_id existe na tabela
-- =====================================================
SELECT
  '4. VERIFICAR SE COLUNA EXISTE' as teste,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name IN ('id', 'cliente_pacote_id', 'deleted_at', 'billing_mode');

-- TESTE 5: Verificar o pacote
-- =====================================================
SELECT
  '5. DADOS DO PACOTE' as teste,
  id,
  user_id,
  tenant_id,
  projetos_usados,
  projetos_inclusos,
  status
FROM cliente_pacotes
WHERE id = '20b17000-01ee-467d-a0d5-b8260da6ece6';

-- TESTE 6: Testar se há algum erro nas colunas selecionadas
-- =====================================================
DO $$
DECLARE
  rec RECORD;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTE 6: Simulação EXATA da API';
  RAISE NOTICE '========================================';

  BEGIN
    FOR rec IN
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
      WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
        AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
      ORDER BY created_at DESC
    LOOP
      v_count := v_count + 1;
      RAISE NOTICE 'Projeto %: % (ID: %)', v_count, rec.number, rec.id;
      RAISE NOTICE '  - Empresa: %', rec.empresa_integradora;
      RAISE NOTICE '  - Cliente: %', rec.nome_cliente_final;
      RAISE NOTICE '  - Potência: %', rec.potencia_kwp;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'TOTAL ENCONTRADO: % projetos', v_count;
    RAISE NOTICE '========================================';

    IF v_count = 0 THEN
      RAISE NOTICE '🚨 PROBLEMA: Nenhum projeto encontrado!';
      RAISE NOTICE '   CAUSA: FK cliente_pacote_id provavelmente NULL ou incorreta';
    ELSIF v_count = 2 THEN
      RAISE NOTICE '✅ SQL FUNCIONA PERFEITAMENTE!';
      RAISE NOTICE '   PROBLEMA: Está no código Node.js ou Supabase Service Role';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO NA QUERY: %', SQLERRM;
    RAISE NOTICE '   Isso indica que alguma coluna não existe ou tem tipo errado';
  END;
END $$;

-- TESTE 7: Verificar RLS (importante!)
-- =====================================================
SELECT
  '7. RLS STATUS' as teste,
  schemaname,
  tablename,
  rowsecurity as rls_habilitado
FROM pg_tables
WHERE tablename = 'projects';

-- Se RLS estiver habilitado, verificar políticas
SELECT
  '7. POLÍTICAS RLS' as teste,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY policyname;
