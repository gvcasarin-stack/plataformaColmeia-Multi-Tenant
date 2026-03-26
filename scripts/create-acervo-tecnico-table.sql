-- Tabela para armazenar o Acervo Técnico por distribuidora
-- Dados globais compartilhados entre todas as tenants (imagens de referência)

CREATE TABLE IF NOT EXISTS acervo_tecnico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribuidora TEXT NOT NULL,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  condicoes JSONB DEFAULT '{}',
  comprimento_mm NUMERIC,
  altura_mm NUMERIC,
  largura_mm NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se a tabela já existe, adicionar as colunas de dimensões
ALTER TABLE acervo_tecnico ADD COLUMN IF NOT EXISTS comprimento_mm NUMERIC;
ALTER TABLE acervo_tecnico ADD COLUMN IF NOT EXISTS altura_mm NUMERIC;
ALTER TABLE acervo_tecnico ADD COLUMN IF NOT EXISTS largura_mm NUMERIC;

CREATE INDEX IF NOT EXISTS idx_acervo_tecnico_distribuidora ON acervo_tecnico(distribuidora);
CREATE INDEX IF NOT EXISTS idx_acervo_tecnico_categoria ON acervo_tecnico(categoria);
