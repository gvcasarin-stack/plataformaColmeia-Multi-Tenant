-- Migração: Tabela para acervo de equipamentos (Inversores e Módulos)
-- Execute este script no Supabase SQL Editor antes de usar as abas Inversores e Módulos

CREATE TABLE IF NOT EXISTS acervo_equipamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('inversor', 'modulo')),
  fabricante TEXT NOT NULL,
  modelo TEXT NOT NULL,
  tipo_documento TEXT NOT NULL DEFAULT 'datasheet' CHECK (tipo_documento IN ('datasheet', 'inmetro', 'manual', 'outro')),
  nome TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  imagem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acervo_equipamentos_tipo ON acervo_equipamentos(tipo);
CREATE INDEX IF NOT EXISTS idx_acervo_equipamentos_fabricante ON acervo_equipamentos(fabricante);
CREATE INDEX IF NOT EXISTS idx_acervo_equipamentos_tipo_documento ON acervo_equipamentos(tipo_documento);
