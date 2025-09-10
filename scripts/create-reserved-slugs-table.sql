-- ✅ TABELA DE SLUGS RESERVADOS - PROTEÇÃO DE MARCA E SISTEMA
-- Execute este script no SQL Editor do Supabase
-- Data: Janeiro 2025

-- ========================================
-- 1. CRIAR TABELA reserved_slugs
-- ========================================

CREATE TABLE IF NOT EXISTS reserved_slugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  reason VARCHAR(100) NOT NULL, -- Motivo da restrição
  category VARCHAR(50) NOT NULL, -- Categoria da restrição
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ========================================
-- 2. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ========================================

COMMENT ON TABLE reserved_slugs IS 'Slugs/subdomínios reservados que não podem ser usados por clientes';
COMMENT ON COLUMN reserved_slugs.slug IS 'Slug reservado (ex: app, admin, colmeia)';
COMMENT ON COLUMN reserved_slugs.reason IS 'Motivo da restrição (ex: Proteção de marca, Sistema técnico)';
COMMENT ON COLUMN reserved_slugs.category IS 'Categoria (brand, technical, legal, competitor, system)';
COMMENT ON COLUMN reserved_slugs.is_active IS 'Se a restrição está ativa (permite desabilitar temporariamente)';

-- ========================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índice principal para busca rápida durante validação
CREATE INDEX IF NOT EXISTS idx_reserved_slugs_slug ON reserved_slugs(slug);
CREATE INDEX IF NOT EXISTS idx_reserved_slugs_active ON reserved_slugs(is_active);
CREATE INDEX IF NOT EXISTS idx_reserved_slugs_category ON reserved_slugs(category);

-- ========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS na tabela
ALTER TABLE reserved_slugs ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler (necessário para validação)
DROP POLICY IF EXISTS "reserved_slugs_read_all" ON reserved_slugs;
CREATE POLICY "reserved_slugs_read_all" ON reserved_slugs 
  FOR SELECT 
  USING (true);

-- Política: Apenas superadmins podem modificar
DROP POLICY IF EXISTS "reserved_slugs_write_superadmin_only" ON reserved_slugs;
CREATE POLICY "reserved_slugs_write_superadmin_only" ON reserved_slugs 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'superadmin'
    )
  );

-- ========================================
-- 5. TRIGGER PARA UPDATED_AT
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_reserved_slugs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a função
DROP TRIGGER IF EXISTS trigger_update_reserved_slugs_updated_at ON reserved_slugs;
CREATE TRIGGER trigger_update_reserved_slugs_updated_at
  BEFORE UPDATE ON reserved_slugs
  FOR EACH ROW
  EXECUTE FUNCTION update_reserved_slugs_updated_at();

-- ========================================
-- 6. VERIFICAR CRIAÇÃO DA TABELA
-- ========================================

-- Verificar se a tabela foi criada com sucesso
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'reserved_slugs'
ORDER BY ordinal_position;

-- Verificar índices criados
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'reserved_slugs' 
  AND schemaname = 'public';

SELECT '✅ Tabela reserved_slugs criada com sucesso!' as status;
