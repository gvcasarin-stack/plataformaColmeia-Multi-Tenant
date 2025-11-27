-- ============================================
-- MIGRATION: Criar tabela de preferências do usuário
-- Data: 2025-11-04
-- Objetivo: Persistir configurações de filtros e preferências
--           de cada usuário por tenant (multi-tenant seguro)
-- ============================================

-- Criar tabela user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ✅ CONSTRAINT: Garantir que cada usuário tenha apenas uma preferência por chave por tenant
  CONSTRAINT unique_user_tenant_preference UNIQUE (user_id, tenant_id, preference_key),

  -- ✅ FOREIGN KEY: Referenciar usuários (opcional, depende da sua estrutura)
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- ✅ FOREIGN KEY: Referenciar organizações (opcional, depende da sua estrutura)
  CONSTRAINT fk_user_preferences_tenant FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Comentários para documentação
COMMENT ON TABLE user_preferences IS 'Armazena preferências personalizadas de cada usuário por tenant';
COMMENT ON COLUMN user_preferences.user_id IS 'ID do usuário dono da preferência';
COMMENT ON COLUMN user_preferences.tenant_id IS 'ID do tenant (organização) - isolamento multi-tenant';
COMMENT ON COLUMN user_preferences.preference_key IS 'Chave da preferência (ex: projetos_filtro, projetos_ordenacao)';
COMMENT ON COLUMN user_preferences.preference_value IS 'Valor da preferência em formato JSON';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_tenant
  ON user_preferences(user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_key
  ON user_preferences(preference_key);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Garantir isolamento multi-tenant
-- ============================================

-- Habilitar RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ler apenas suas próprias preferências do tenant atual
CREATE POLICY "Usuários podem ler suas preferências"
  ON user_preferences
  FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Política: Usuários podem inserir apenas suas próprias preferências
CREATE POLICY "Usuários podem criar suas preferências"
  ON user_preferences
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
  );

-- Política: Usuários podem atualizar apenas suas próprias preferências
CREATE POLICY "Usuários podem atualizar suas preferências"
  ON user_preferences
  FOR UPDATE
  USING (
    auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Política: Usuários podem deletar apenas suas próprias preferências
CREATE POLICY "Usuários podem deletar suas preferências"
  ON user_preferences
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- ============================================
-- FUNCTION: Atualizar updated_at automaticamente
-- ============================================

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Verificar se a tabela foi criada
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_preferences';
