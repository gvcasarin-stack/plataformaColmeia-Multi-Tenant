-- Credenciais de acesso a portais de distribuidoras e outros órgãos, com contatos e forma de envio
-- (tela /admin/credenciais).
--
-- A senha do portal é gravada criptografada pela aplicação (AES-256-GCM) em portal_senha_enc;
-- nunca em texto puro. A tabela fica com RLS ligado e sem policies: só o service role
-- (as rotas /api/admin/credenciais) lê e grava.
CREATE TABLE IF NOT EXISTS credenciais_acesso (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL,
  nome              TEXT NOT NULL,
  estado            TEXT,
  envio             TEXT NOT NULL DEFAULT 'plataforma' CHECK (envio IN ('plataforma', 'email')),
  portal_url        TEXT,
  portal_login      TEXT,
  portal_senha_enc  TEXT,
  email_envio       TEXT,
  contatos          JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes       TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credenciais_acesso_tenant ON credenciais_acesso(tenant_id);

ALTER TABLE credenciais_acesso ENABLE ROW LEVEL SECURITY;
