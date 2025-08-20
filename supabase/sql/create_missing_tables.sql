-- ============================================================================
-- MIGRAÇÃO FIREBASE → SUPABASE: TABELAS ESSENCIAIS
-- ============================================================================
-- Este script recria as tabelas que existiam no Firebase e são necessárias
-- para manter todas as funcionalidades da aplicação.

-- ============================================================================
-- 1. TABELA CONFIGS
-- ============================================================================
-- Armazena configurações gerais do sistema
CREATE TABLE IF NOT EXISTS configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_configs_key ON configs(key);
CREATE INDEX IF NOT EXISTS idx_configs_category ON configs(category);
CREATE INDEX IF NOT EXISTS idx_configs_is_active ON configs(is_active);

-- RLS (Row Level Security)
ALTER TABLE configs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para configs
CREATE POLICY "Admins podem ver todas as configurações" ON configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins podem inserir configurações" ON configs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Admins podem atualizar configurações" ON configs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- 2. TABELA NOTIFICATIONS (se não existir)
-- ============================================================================
-- Sistema de notificações da aplicação
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  project_number TEXT,
  read BOOLEAN DEFAULT false,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para notifications
CREATE POLICY "Usuários podem ver suas próprias notificações" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as notificações" ON notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Sistema pode inserir notificações" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas notificações" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins podem atualizar todas as notificações" ON notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- 3. TRIGGER PARA UPDATED_AT
-- ============================================================================
-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_configs_updated_at 
  BEFORE UPDATE ON configs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. CONFIGURAÇÕES INICIAIS DO SISTEMA
-- ============================================================================
-- Inserir configurações básicas do sistema
INSERT INTO configs (key, value, description, category) VALUES
  ('app_name', '"Plataforma Colmeia"', 'Nome da aplicação', 'general'),
  ('app_version', '"1.0.0"', 'Versão da aplicação', 'general'),
  ('max_projects_per_client', '10', 'Máximo de projetos por cliente', 'limits'),
  ('session_timeout_minutes', '20', 'Timeout de sessão em minutos', 'security'),
  ('max_session_hours', '8', 'Máximo de horas por sessão', 'security'),
  ('enable_notifications', 'true', 'Habilitar sistema de notificações', 'features'),
  ('enable_email_notifications', 'true', 'Habilitar notificações por email', 'features'),
  ('default_project_status', '"planejamento"', 'Status padrão para novos projetos', 'projects'),
  ('kanban_columns', '["backlog", "planejamento", "em_andamento", "revisao", "concluido"]', 'Colunas do quadro Kanban', 'kanban')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 5. COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================
COMMENT ON TABLE configs IS 'Configurações gerais do sistema';
COMMENT ON COLUMN configs.key IS 'Chave única da configuração';
COMMENT ON COLUMN configs.value IS 'Valor da configuração em formato JSON';
COMMENT ON COLUMN configs.category IS 'Categoria da configuração (general, security, features, etc.)';

COMMENT ON TABLE notifications IS 'Sistema de notificações da aplicação';
COMMENT ON COLUMN notifications.type IS 'Tipo da notificação (info, warning, error, success)';
COMMENT ON COLUMN notifications.project_number IS 'Número do projeto relacionado (se aplicável)';
COMMENT ON COLUMN notifications.data IS 'Dados adicionais da notificação em formato JSON';

-- ============================================================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================================================
-- Verificar se as tabelas foram criadas corretamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configs') THEN
    RAISE NOTICE '✅ Tabela configs criada com sucesso';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE NOTICE '✅ Tabela notifications criada com sucesso';
  END IF;
  
  RAISE NOTICE '🎉 Migração das tabelas essenciais concluída!';
END $$; 