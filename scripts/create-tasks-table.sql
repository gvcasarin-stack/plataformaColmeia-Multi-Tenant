-- =====================================================
-- MIGRATION: Criar tabela de tarefas (tasks)
-- Objetivo: Gerenciar tarefas do funil de vendas
--           Sistema multi-tenant com isolamento completo
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informações da tarefa
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),

  -- Status
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Relacionamentos
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Multi-tenant
  tenant_id UUID NOT NULL,

  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity_id ON tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Política RLS: Usuários podem ver apenas tarefas do seu tenant
CREATE POLICY "Users can view tasks from their tenant"
  ON tasks FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Política RLS: Usuários podem criar tarefas no seu tenant
CREATE POLICY "Users can create tasks in their tenant"
  ON tasks FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Política RLS: Usuários podem atualizar tarefas do seu tenant
CREATE POLICY "Users can update tasks from their tenant"
  ON tasks FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Política RLS: Usuários podem deletar tarefas do seu tenant
CREATE POLICY "Users can delete tasks from their tenant"
  ON tasks FOR DELETE
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Comentários para documentação
COMMENT ON TABLE tasks IS 'Tabela de tarefas do funil de vendas';
COMMENT ON COLUMN tasks.id IS 'ID único da tarefa';
COMMENT ON COLUMN tasks.tenant_id IS 'ID do tenant que possui a tarefa';
COMMENT ON COLUMN tasks.title IS 'Título da tarefa';
COMMENT ON COLUMN tasks.description IS 'Descrição detalhada da tarefa';
COMMENT ON COLUMN tasks.due_date IS 'Data de vencimento da tarefa';
COMMENT ON COLUMN tasks.priority IS 'Prioridade da tarefa (low, medium, high)';
COMMENT ON COLUMN tasks.completed IS 'Indica se a tarefa foi concluída';
COMMENT ON COLUMN tasks.completed_at IS 'Data e hora em que a tarefa foi concluída';
COMMENT ON COLUMN tasks.opportunity_id IS 'ID da oportunidade relacionada (opcional)';
COMMENT ON COLUMN tasks.assigned_to IS 'ID do usuário responsável pela tarefa (opcional)';
COMMENT ON COLUMN tasks.created_by IS 'ID do usuário que criou a tarefa';
COMMENT ON COLUMN tasks.created_at IS 'Data de criação da tarefa';
COMMENT ON COLUMN tasks.updated_at IS 'Data da última atualização da tarefa';
