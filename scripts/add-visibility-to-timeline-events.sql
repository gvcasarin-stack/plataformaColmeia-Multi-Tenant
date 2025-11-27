-- =====================================================
-- Script: Adicionar campo visibility aos eventos de timeline
-- Descrição: Adiciona campo visibility nos eventos JSONB da tabela projects
--            'all' = visível a todos (padrão)
--            'internal' = visível apenas para equipe interna (admin/colaborador)
-- Data: 2025-10-22
-- =====================================================

-- IMPORTANTE: Os eventos de timeline são armazenados como JSONB na coluna
-- 'timeline_events' da tabela 'projects'.
-- Não é necessário alterar a estrutura da tabela, apenas garantir que
-- novos eventos incluam o campo 'visibility' (já implementado no código).

-- ✅ NENHUMA MIGRAÇÃO SQL NECESSÁRIA
-- ✅ O campo 'visibility' é adicionado automaticamente pelo código TypeScript
-- ✅ Compatibilidade garantida: eventos sem 'visibility' são tratados como 'all'

-- Este script serve apenas como documentação da mudança estrutural.

-- Caso queira adicionar 'visibility': 'all' a TODOS os eventos existentes
-- manualmente (opcional, não é necessário), descomente o bloco abaixo:
-- ATENÇÃO: Pode ser lento em bancos de dados grandes!

/*
DO $$
DECLARE
  projeto RECORD;
  novos_eventos JSONB;
BEGIN
  FOR projeto IN SELECT id, timeline_events FROM public.projects WHERE timeline_events IS NOT NULL
  LOOP
    -- Adicionar 'visibility': 'all' a eventos que não têm esse campo
    SELECT jsonb_agg(
      CASE
        WHEN event->>'visibility' IS NULL
        THEN event || '{"visibility": "all"}'::jsonb
        ELSE event
      END
    ) INTO novos_eventos
    FROM jsonb_array_elements(projeto.timeline_events) AS event;

    -- Atualizar o projeto com os eventos modificados
    UPDATE public.projects
    SET timeline_events = novos_eventos
    WHERE id = projeto.id;
  END LOOP;

  RAISE NOTICE '✅ Campo visibility adicionado a todos os eventos existentes';
END $$;
*/

SELECT '✅ Script de documentação carregado. Nenhuma alteração necessária no banco.' AS status;
