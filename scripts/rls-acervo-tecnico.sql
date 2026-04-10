-- =====================================================
-- RLS: Segurança das tabelas de Acervo Técnico
-- Execute este script no Supabase SQL Editor
--
-- Contexto:
--   - Todas as leituras/escritas passam pelas rotas API
--     usando a chave service_role, que IGNORA o RLS.
--   - Portanto, habilitar RLS sem políticas para anon/authenticated
--     bloqueia qualquer acesso direto ao banco, sem afetar a aplicação.
-- =====================================================


-- ── acervo_tecnico ────────────────────────────────────
ALTER TABLE acervo_tecnico ENABLE ROW LEVEL SECURITY;

-- Remove políticas existentes (idempotente)
DROP POLICY IF EXISTS "acervo_tecnico_select" ON acervo_tecnico;
DROP POLICY IF EXISTS "acervo_tecnico_insert" ON acervo_tecnico;
DROP POLICY IF EXISTS "acervo_tecnico_update" ON acervo_tecnico;
DROP POLICY IF EXISTS "acervo_tecnico_delete" ON acervo_tecnico;

-- Nenhuma política = acesso negado para anon e authenticated.
-- Apenas service_role (backend) consegue acessar.


-- ── acervo_equipamentos ───────────────────────────────
ALTER TABLE acervo_equipamentos ENABLE ROW LEVEL SECURITY;

-- Remove políticas existentes (idempotente)
DROP POLICY IF EXISTS "acervo_equipamentos_select" ON acervo_equipamentos;
DROP POLICY IF EXISTS "acervo_equipamentos_insert" ON acervo_equipamentos;
DROP POLICY IF EXISTS "acervo_equipamentos_update" ON acervo_equipamentos;
DROP POLICY IF EXISTS "acervo_equipamentos_delete" ON acervo_equipamentos;

-- Nenhuma política = acesso negado para anon e authenticated.
-- Apenas service_role (backend) consegue acessar.
