-- Tabela para armazenar o Acervo Técnico por distribuidora
-- Cada item possui: distribuidora, categoria, nome, descrição, URL da imagem e condições de seleção

CREATE TABLE IF NOT EXISTS acervo_tecnico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  distribuidora TEXT NOT NULL,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  condicoes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acervo_tecnico_tenant ON acervo_tecnico(tenant_id);
CREATE INDEX IF NOT EXISTS idx_acervo_tecnico_distribuidora ON acervo_tecnico(distribuidora);
CREATE INDEX IF NOT EXISTS idx_acervo_tecnico_categoria ON acervo_tecnico(categoria);

ALTER TABLE acervo_tecnico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acervo_tecnico_tenant_isolation" ON acervo_tecnico
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);
