-- ==============================================
-- CRIAÇÃO COMPLETA DA TABELA PROJECTS
-- ==============================================
-- Este arquivo define a estrutura completa da tabela projects
-- mapeando todos os campos do tipo Project do TypeScript

-- Primeiro, vamos dropar a tabela se ela existir (cuidado em produção!)
-- DROP TABLE IF EXISTS public.projects CASCADE;

-- Criar a tabela projects com todos os campos necessários
CREATE TABLE IF NOT EXISTS public.projects (
    -- Campos básicos
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    number TEXT UNIQUE NOT NULL, -- Número único do projeto (ex: FV-2024-001)
    description TEXT,
    
    -- Relacionamentos
    created_by UUID REFERENCES public.users(id) NOT NULL, -- Quem criou o projeto
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, -- Cliente associado (opcional)
    
    -- Campos específicos do projeto
    empresa_integradora TEXT NOT NULL DEFAULT '',
    nome_cliente_final TEXT NOT NULL DEFAULT '',
    distribuidora TEXT NOT NULL DEFAULT '',
    potencia NUMERIC NOT NULL DEFAULT 0, -- Potência em kW
    data_entrega DATE,
    
    -- Status e prioridade
    status TEXT NOT NULL DEFAULT 'Não Iniciado', 
    -- Valores possíveis: 'Não Iniciado', 'Em Desenvolvimento', 'Aguardando', 'Homologação', 
    -- 'Projeto Aprovado', 'Aguardando Vistoria', 'Projeto Pausado', 'Em Vistoria', 'Finalizado', 'Cancelado'
    prioridade TEXT NOT NULL DEFAULT 'Baixa', -- 'Baixa', 'Média', 'Alta', 'Urgente'
    
    -- Campos financeiros
    valor_projeto NUMERIC DEFAULT 0,
    pagamento TEXT,
    price NUMERIC,
    
    -- Responsável admin
    admin_responsible_id UUID REFERENCES public.users(id),
    admin_responsible_name TEXT,
    admin_responsible_email TEXT,
    admin_responsible_phone TEXT,
    
    -- Campos JSON para dados complexos
    timeline_events JSONB DEFAULT '[]'::jsonb, -- Array de eventos da timeline
    documents JSONB DEFAULT '[]'::jsonb, -- Array de documentos
    files JSONB DEFAULT '[]'::jsonb, -- Array de arquivos
    comments JSONB DEFAULT '[]'::jsonb, -- Array de comentários
    history JSONB DEFAULT '[]'::jsonb, -- Histórico de mudanças
    
    -- Metadados de última atualização
    last_update_by JSONB, -- Objeto com uid, email, role, timestamp
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================

-- Índice para busca por criador
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);

-- Índice para busca por cliente
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);

-- Índice para busca por número do projeto
CREATE INDEX IF NOT EXISTS idx_projects_number ON public.projects(number);

-- Índice para busca por data de criação
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);

-- Índice para busca por data de entrega
CREATE INDEX IF NOT EXISTS idx_projects_data_entrega ON public.projects(data_entrega);

-- ==============================================
-- CONSTRAINTS E VALIDAÇÕES
-- ==============================================

-- Constraint para validar status
ALTER TABLE public.projects 
ADD CONSTRAINT check_project_status 
CHECK (status IN (
    'Não Iniciado', 
    'Em Desenvolvimento', 
    'Aguardando', 
    'Homologação', 
    'Projeto Aprovado', 
    'Aguardando Vistoria', 
    'Projeto Pausado', 
    'Em Vistoria', 
    'Finalizado', 
    'Cancelado'
));

-- Constraint para validar prioridade
ALTER TABLE public.projects 
ADD CONSTRAINT check_project_prioridade 
CHECK (prioridade IN ('Baixa', 'Média', 'Alta', 'Urgente'));

-- Constraint para validar potência (deve ser positiva)
ALTER TABLE public.projects 
ADD CONSTRAINT check_project_potencia 
CHECK (potencia >= 0);

-- ==============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ==============================================

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar automaticamente o updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE public.projects IS 'Tabela principal de projetos com RLS habilitado';
COMMENT ON COLUMN public.projects.id IS 'ID único do projeto (UUID)';
COMMENT ON COLUMN public.projects.name IS 'Nome do projeto';
COMMENT ON COLUMN public.projects.number IS 'Número único do projeto (ex: FV-2024-001)';
COMMENT ON COLUMN public.projects.created_by IS 'ID do usuário que criou o projeto';
COMMENT ON COLUMN public.projects.client_id IS 'ID do cliente associado (opcional)';
COMMENT ON COLUMN public.projects.empresa_integradora IS 'Nome da empresa integradora';
COMMENT ON COLUMN public.projects.nome_cliente_final IS 'Nome do cliente final';
COMMENT ON COLUMN public.projects.distribuidora IS 'Nome da distribuidora de energia';
COMMENT ON COLUMN public.projects.potencia IS 'Potência do projeto em kW';
COMMENT ON COLUMN public.projects.data_entrega IS 'Data prevista de entrega';
COMMENT ON COLUMN public.projects.status IS 'Status atual do projeto';
COMMENT ON COLUMN public.projects.prioridade IS 'Prioridade do projeto';
COMMENT ON COLUMN public.projects.valor_projeto IS 'Valor total do projeto';
COMMENT ON COLUMN public.projects.timeline_events IS 'Array JSON de eventos da timeline';
COMMENT ON COLUMN public.projects.documents IS 'Array JSON de documentos';
COMMENT ON COLUMN public.projects.files IS 'Array JSON de arquivos';
COMMENT ON COLUMN public.projects.comments IS 'Array JSON de comentários';
COMMENT ON COLUMN public.projects.history IS 'Array JSON do histórico de mudanças';
COMMENT ON COLUMN public.projects.last_update_by IS 'Objeto JSON com dados do último usuário que atualizou';

-- ==============================================
-- VERIFICAÇÃO FINAL
-- ==============================================

-- Verificar se a tabela foi criada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position; 