-- =====================================================
-- DEBUG: Verificar projetos do pacote Catarina Solar
-- =====================================================

-- Pacote ID: 20b17000-01ee-467d-a0d5-b8260da6ece6
-- Projetos: FV-2025-348, FV-2025-347

-- 1. Ver TODOS os campos relevantes dos 2 projetos
SELECT
  'PROJETOS CATARINA SOLAR - TODOS OS CAMPOS' as diagnostico,
  id,
  number,
  tenant_id,
  billing_mode,
  cliente_pacote_id,
  cliente_assinatura_id,
  deleted_at,
  created_at,
  CASE
    WHEN deleted_at IS NULL THEN '✅ Ativo (NULL)'
    ELSE '❌ Deletado: ' || deleted_at::text
  END as status_deleted,
  CASE
    WHEN billing_mode = 'pacote' THEN '✅ billing_mode OK'
    ELSE '❌ billing_mode: ' || COALESCE(billing_mode, 'NULL')
  END as status_billing_mode,
  CASE
    WHEN cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6' THEN '✅ FK OK'
    ELSE '❌ FK: ' || COALESCE(cliente_pacote_id::text, 'NULL')
  END as status_fk
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
ORDER BY created_at DESC;

-- 2. Simular EXATAMENTE a query da API (SEM os novos filtros)
SELECT
  'QUERY ORIGINAL (SEM FILTROS NOVOS)' as diagnostico,
  COUNT(*) as total_encontrado
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

-- 3. Simular query COM filtro billing_mode
SELECT
  'QUERY COM FILTRO billing_mode' as diagnostico,
  COUNT(*) as total_encontrado
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND billing_mode = 'pacote';

-- 4. Simular query COM filtro deleted_at
SELECT
  'QUERY COM FILTRO deleted_at' as diagnostico,
  COUNT(*) as total_encontrado
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND deleted_at IS NULL;

-- 5. Simular query COM AMBOS os filtros (como está agora)
SELECT
  'QUERY COM AMBOS OS FILTROS (ATUAL)' as diagnostico,
  COUNT(*) as total_encontrado
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
  AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
  AND billing_mode = 'pacote'
  AND deleted_at IS NULL;

-- 6. Verificar se há diferença de MAIÚSCULA/minúscula no billing_mode
SELECT
  'VERIFICAR CASE SENSITIVE' as diagnostico,
  id,
  number,
  billing_mode,
  length(billing_mode) as tamanho,
  ascii(substring(billing_mode from 1 for 1)) as primeiro_char_ascii
FROM projects
WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6';

-- 7. Relatório final
DO $$
DECLARE
  total_sem_filtro INTEGER;
  total_com_billing_mode INTEGER;
  total_com_deleted_at INTEGER;
  total_com_ambos INTEGER;
BEGIN
  -- Sem filtros novos
  SELECT COUNT(*) INTO total_sem_filtro
  FROM projects
  WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
    AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a';

  -- Com billing_mode
  SELECT COUNT(*) INTO total_com_billing_mode
  FROM projects
  WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
    AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND billing_mode = 'pacote';

  -- Com deleted_at
  SELECT COUNT(*) INTO total_com_deleted_at
  FROM projects
  WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
    AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND deleted_at IS NULL;

  -- Com ambos
  SELECT COUNT(*) INTO total_com_ambos
  FROM projects
  WHERE cliente_pacote_id = '20b17000-01ee-467d-a0d5-b8260da6ece6'
    AND tenant_id = '061ff77b-8b3a-4732-9158-a574c1f1690a'
    AND billing_mode = 'pacote'
    AND deleted_at IS NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'RELATÓRIO DE FILTROS - CATARINA SOLAR';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sem filtros novos (apenas FK + tenant): %', total_sem_filtro;
  RAISE NOTICE 'Com filtro billing_mode=pacote: %', total_com_billing_mode;
  RAISE NOTICE 'Com filtro deleted_at IS NULL: %', total_com_deleted_at;
  RAISE NOTICE 'Com AMBOS os filtros: %', total_com_ambos;
  RAISE NOTICE '========================================';

  IF total_sem_filtro = 2 AND total_com_ambos = 0 THEN
    RAISE NOTICE '🚨 PROBLEMA: Os filtros estão bloqueando os projetos!';

    IF total_com_billing_mode = 0 THEN
      RAISE NOTICE '   ❌ FILTRO billing_mode está BLOQUEANDO';
    END IF;

    IF total_com_deleted_at = 0 THEN
      RAISE NOTICE '   ❌ FILTRO deleted_at está BLOQUEANDO';
    END IF;
  ELSIF total_com_ambos = 2 THEN
    RAISE NOTICE '✅ Filtros OK - Problema deve ser no código da API';
  END IF;

  RAISE NOTICE '========================================';
END $$;
