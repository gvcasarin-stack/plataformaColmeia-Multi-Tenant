-- 🔧 CORREÇÃO: Adicionar checklist_message na timeline de projetos
-- Este script corrige projetos existentes que não têm a checklist inicial

-- ============================================================================
-- 1. VERIFICAR PROJETOS SEM CHECKLIST INICIAL
-- ============================================================================
SELECT 
    '=== PROJETOS SEM CHECKLIST INICIAL ===' as info,
    COUNT(*) as total_projetos_sem_checklist
FROM projects 
WHERE timeline_events = '[]'::jsonb 
   OR NOT EXISTS (
       SELECT 1 
       FROM jsonb_array_elements(timeline_events) AS event
       WHERE event->>'type' = 'checklist'
   );

-- Mostrar detalhes dos projetos sem checklist
SELECT 
    id,
    number,
    name,
    created_at,
    jsonb_array_length(COALESCE(timeline_events, '[]'::jsonb)) as eventos_timeline
FROM projects 
WHERE timeline_events = '[]'::jsonb 
   OR NOT EXISTS (
       SELECT 1 
       FROM jsonb_array_elements(timeline_events) AS event
       WHERE event->>'type' = 'checklist'
   )
ORDER BY created_at DESC;

-- ============================================================================
-- 2. BUSCAR A MENSAGEM DE CHECKLIST DAS CONFIGURAÇÕES
-- ============================================================================
SELECT 
    '=== MENSAGEM DE CHECKLIST ATUAL ===' as info,
    key,
    LEFT(value::text, 100) || '...' as mensagem_preview
FROM configs 
WHERE key = 'checklist_message';

-- ============================================================================
-- 3. ADICIONAR CHECKLIST EM PROJETOS EXISTENTES
-- ============================================================================
-- Criar evento de checklist usando a mensagem das configurações
WITH checklist_config AS (
    SELECT value::text as mensagem
    FROM configs 
    WHERE key = 'checklist_message'
    LIMIT 1
),
checklist_event AS (
    SELECT jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'checklist',
        'content', c.mensagem,
        'user', 'Sistema',
        'userId', 'system',
        'timestamp', NOW()::text,
        'isSystemGenerated', true,
        'title', 'Checklist de Documentos Necessários para o Projeto',
        'fullMessage', c.mensagem
    ) as evento
    FROM checklist_config c
)
UPDATE projects 
SET 
    timeline_events = jsonb_build_array((SELECT evento FROM checklist_event)) || COALESCE(timeline_events, '[]'::jsonb),
    updated_at = NOW()
WHERE timeline_events = '[]'::jsonb 
   OR NOT EXISTS (
       SELECT 1 
       FROM jsonb_array_elements(timeline_events) AS event
       WHERE event->>'type' = 'checklist'
   );

-- ============================================================================
-- 4. VERIFICAÇÃO PÓS-CORREÇÃO
-- ============================================================================
SELECT 
    '=== RESULTADO DA CORREÇÃO ===' as info,
    COUNT(*) as total_projetos,
    COUNT(*) FILTER (
        WHERE EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(timeline_events) AS event
            WHERE event->>'type' = 'checklist'
        )
    ) as projetos_com_checklist,
    COUNT(*) FILTER (
        WHERE timeline_events = '[]'::jsonb
    ) as projetos_timeline_vazia
FROM projects;

-- ============================================================================
-- 5. MOSTRAR PROJETOS CORRIGIDOS
-- ============================================================================
SELECT 
    '=== PROJETOS COM CHECKLIST ADICIONADA ===' as info,
    number,
    name,
    jsonb_array_length(timeline_events) as total_eventos,
    (timeline_events->0->>'type') as primeiro_evento_tipo,
    LEFT((timeline_events->0->>'content')::text, 50) || '...' as primeiro_evento_preview
FROM projects 
WHERE EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(timeline_events) AS event
    WHERE event->>'type' = 'checklist'
)
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- SUCESSO! ✅
-- ============================================================================
-- ✅ Projetos existentes corrigidos com checklist inicial
-- ✅ Próximo passo: Corrigir o código de criação de novos projetos
