-- ==============================================
-- 03. CRIAÇÃO DA TABELA PROJECTS (MULTI-TENANT)
-- ==============================================
-- Tabela de projetos com isolamento completo por tenant e funcionalidades avançadas

CREATE TABLE IF NOT EXISTS public.projects (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Campos básicos
    name TEXT NOT NULL,
    number TEXT NOT NULL, -- Número único do projeto (ex: FV-2024-001)
    description TEXT,
    
    -- Relacionamentos
    created_by UUID NOT NULL REFERENCES public.users(id),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    
    -- Campos específicos do projeto de energia solar
    empresa_integradora TEXT NOT NULL DEFAULT '',
    nome_cliente_final TEXT NOT NULL DEFAULT '',
    distribuidora TEXT NOT NULL DEFAULT '',
    potencia NUMERIC NOT NULL DEFAULT 0, -- Potência em kW
    data_entrega DATE,
    
    -- Status e prioridade
    status TEXT NOT NULL DEFAULT 'Não Iniciado',
    -- Valores: 'Não Iniciado', 'Em Desenvolvimento', 'Aguardando', 'Homologação',
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
    
    -- Campos JSONB para dados complexos
    timeline_events JSONB DEFAULT '[]'::jsonb, -- Array de eventos da timeline
    documents JSONB DEFAULT '[]'::jsonb, -- Array de documentos
    files JSONB DEFAULT '[]'::jsonb, -- Array de arquivos
    comments JSONB DEFAULT '[]'::jsonb, -- Array de comentários
    history JSONB DEFAULT '[]'::jsonb, -- Histórico de alterações
    last_update_by JSONB, -- Último usuário que atualizou
    
    -- Dados técnicos específicos (campos do formulário do cliente)
    lista_materiais JSONB DEFAULT '[]'::jsonb,
    disjuntor_padrao_entrada TEXT,
    tipo_ligacao TEXT, -- monofasico, bifasico, trifasico
    tensao_nominal TEXT,
    coordenadas JSONB, -- {lat: number, lng: number}
    endereco_instalacao JSONB, -- endereço completo
    
    -- Configurações e metadados
    settings JSONB DEFAULT '{
        "notifications_enabled": true,
        "auto_timeline": true,
        "require_approval": false
    }'::jsonb,
    
    -- Campos de controle
    is_archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMPTZ,
    archived_by UUID REFERENCES public.users(id),
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT projects_status_valid CHECK (status IN (
        'Não Iniciado', 'Em Desenvolvimento', 'Aguardando', 'Homologação',
        'Projeto Aprovado', 'Aguardando Vistoria', 'Projeto Pausado', 
        'Em Vistoria', 'Finalizado', 'Cancelado'
    )),
    CONSTRAINT projects_prioridade_valid CHECK (prioridade IN ('Baixa', 'Média', 'Alta', 'Urgente')),
    CONSTRAINT projects_tipo_ligacao_valid CHECK (tipo_ligacao IN ('monofasico', 'bifasico', 'trifasico')),
    CONSTRAINT projects_potencia_positive CHECK (potencia >= 0),
    CONSTRAINT projects_valor_positive CHECK (valor_projeto >= 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_prioridade ON public.projects(prioridade);
CREATE INDEX IF NOT EXISTS idx_projects_data_entrega ON public.projects(data_entrega);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON public.projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_number ON public.projects(number);

-- Índice único para número do projeto por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_number_tenant ON public.projects(tenant_id, number);

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar número único do projeto por tenant
CREATE OR REPLACE FUNCTION generate_project_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
    current_year INTEGER;
    project_count INTEGER;
    org_slug TEXT;
    new_number TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Obter slug da organização
    SELECT slug INTO org_slug
    FROM public.organizations
    WHERE id = org_id;
    
    -- Contar projetos do ano atual para esta organização
    SELECT COUNT(*) + 1 INTO project_count
    FROM public.projects
    WHERE tenant_id = org_id
    AND EXTRACT(YEAR FROM created_at) = current_year;
    
    -- Formato: SLUG-YYYY-NNN (ex: EMPRESA-2024-001)
    new_number := UPPER(org_slug) || '-' || current_year || '-' || LPAD(project_count::TEXT, 3, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auto-gerar número do projeto
CREATE OR REPLACE FUNCTION set_project_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.number IS NULL OR NEW.number = '' THEN
        NEW.number := generate_project_number(NEW.tenant_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER auto_generate_project_number
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION set_project_number();

-- Trigger para verificar limite de projetos
CREATE OR REPLACE FUNCTION check_project_limit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_project_limit(NEW.tenant_id) THEN
        RAISE EXCEPTION 'Limite de projetos excedido para esta organização';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_project_limit
    BEFORE INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION check_project_limit_trigger();

-- Função para obter projetos da organização
CREATE OR REPLACE FUNCTION get_org_projects(org_id UUID, include_archived BOOLEAN DEFAULT false)
RETURNS TABLE (
    id UUID,
    name TEXT,
    number TEXT,
    status TEXT,
    prioridade TEXT,
    valor_projeto NUMERIC,
    created_at TIMESTAMPTZ,
    created_by_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.number,
        p.status,
        p.prioridade,
        p.valor_projeto,
        p.created_at,
        u.name as created_by_name
    FROM public.projects p
    JOIN public.users u ON p.created_by = u.id
    WHERE p.tenant_id = org_id
    AND (include_archived OR NOT p.is_archived)
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para arquivar projeto
CREATE OR REPLACE FUNCTION archive_project(project_id UUID, archived_by_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.projects
    SET 
        is_archived = true,
        archived_at = NOW(),
        archived_by = archived_by_id,
        updated_at = NOW()
    WHERE id = project_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para restaurar projeto arquivado
CREATE OR REPLACE FUNCTION restore_project(project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.projects
    SET 
        is_archived = false,
        archived_at = NULL,
        archived_by = NULL,
        updated_at = NOW()
    WHERE id = project_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para adicionar evento na timeline
CREATE OR REPLACE FUNCTION add_timeline_event(
    project_id UUID,
    event_type TEXT,
    event_description TEXT,
    created_by_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    new_event JSONB;
BEGIN
    new_event := jsonb_build_object(
        'id', gen_random_uuid(),
        'type', event_type,
        'description', event_description,
        'created_by', created_by_id,
        'created_at', NOW()
    );
    
    UPDATE public.projects
    SET 
        timeline_events = timeline_events || new_event,
        updated_at = NOW()
    WHERE id = project_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE public.projects IS 'Projetos de energia solar com isolamento multi-tenant completo';
COMMENT ON COLUMN public.projects.tenant_id IS 'ID da organização - OBRIGATÓRIO para isolamento';
COMMENT ON COLUMN public.projects.number IS 'Número único do projeto por organização (auto-gerado)';
COMMENT ON COLUMN public.projects.timeline_events IS 'Array JSONB com eventos da timeline do projeto';
COMMENT ON FUNCTION generate_project_number(UUID) IS 'Gera número único do projeto no formato SLUG-YYYY-NNN';
COMMENT ON FUNCTION add_timeline_event(UUID, TEXT, TEXT, UUID) IS 'Adiciona evento na timeline do projeto';
