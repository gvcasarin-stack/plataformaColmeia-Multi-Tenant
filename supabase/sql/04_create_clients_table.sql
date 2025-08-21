-- ==============================================
-- 04. CRIAÇÃO DA TABELA CLIENTS (MULTI-TENANT)
-- ==============================================
-- Tabela de clientes com isolamento por tenant e funcionalidades avançadas

CREATE TABLE IF NOT EXISTS public.clients (
    -- Identificação
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: OBRIGATÓRIO
    tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Informações básicas
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Informações de contato
    contact_person TEXT, -- Pessoa de contato principal
    secondary_phone TEXT,
    website TEXT,
    
    -- Endereço
    address JSONB DEFAULT '{
        "street": "",
        "number": "",
        "complement": "",
        "neighborhood": "",
        "city": "",
        "state": "",
        "zip_code": "",
        "country": "Brasil"
    }'::jsonb,
    
    -- Informações comerciais
    company_type TEXT, -- pessoa_fisica, pessoa_juridica, MEI, etc
    document_number TEXT, -- CPF ou CNPJ
    state_registration TEXT, -- Inscrição Estadual
    municipal_registration TEXT, -- Inscrição Municipal
    
    -- Configurações do cliente
    settings JSONB DEFAULT '{
        "notifications": {
            "project_updates": true,
            "payment_reminders": true,
            "system_alerts": false
        },
        "preferences": {
            "communication_method": "email",
            "invoice_format": "pdf"
        }
    }'::jsonb,
    
    -- Informações financeiras
    credit_limit NUMERIC DEFAULT 0,
    payment_terms INTEGER DEFAULT 30, -- Prazo de pagamento em dias
    preferred_payment_method TEXT,
    
    -- Status e classificação
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, blocked
    category TEXT DEFAULT 'standard', -- standard, premium, vip
    source TEXT, -- Como o cliente chegou até nós (indicacao, marketing, etc)
    
    -- Informações adicionais
    notes TEXT, -- Observações internas
    tags JSONB DEFAULT '[]'::jsonb, -- Tags para categorização
    
    -- Relacionamentos
    created_by UUID NOT NULL REFERENCES public.users(id),
    assigned_to UUID REFERENCES public.users(id), -- Responsável pelo cliente
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_contact TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT clients_status_valid CHECK (status IN ('active', 'inactive', 'blocked')),
    CONSTRAINT clients_category_valid CHECK (category IN ('standard', 'premium', 'vip')),
    CONSTRAINT clients_company_type_valid CHECK (company_type IN ('pessoa_fisica', 'pessoa_juridica', 'MEI', 'cooperativa', 'associacao')),
    CONSTRAINT clients_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT clients_credit_limit_positive CHECK (credit_limit >= 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_to ON public.clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_category ON public.clients(category);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_document_number ON public.clients(document_number);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON public.clients(tenant_id, status);

-- Índice único para email por tenant (permite email duplicado entre tenants)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_email_tenant ON public.clients(email, tenant_id) WHERE email IS NOT NULL;

-- Índice único para documento por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_document_tenant ON public.clients(document_number, tenant_id) WHERE document_number IS NOT NULL;

-- Trigger para atualizar updated_at
CREATE OR REPLACE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar limite de clientes
CREATE OR REPLACE FUNCTION check_client_limit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_clients INTEGER;
BEGIN
    -- Contar clientes ativos da organização
    SELECT COUNT(*) INTO current_count
    FROM public.clients
    WHERE tenant_id = NEW.tenant_id AND status = 'active';
    
    -- Obter limite máximo
    SELECT (plan_limits->>'max_clients')::INTEGER INTO max_clients
    FROM public.organizations
    WHERE id = NEW.tenant_id;
    
    IF current_count >= max_clients THEN
        RAISE EXCEPTION 'Limite de clientes excedido para esta organização (máximo: %)', max_clients;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER enforce_client_limit
    BEFORE INSERT ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION check_client_limit_trigger();

-- Função para obter clientes da organização
CREATE OR REPLACE FUNCTION get_org_clients(
    org_id UUID, 
    client_status TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    category TEXT,
    created_at TIMESTAMPTZ,
    project_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.status,
        c.category,
        c.created_at,
        COUNT(p.id) as project_count
    FROM public.clients c
    LEFT JOIN public.projects p ON p.client_id = c.id AND p.tenant_id = c.tenant_id
    WHERE c.tenant_id = org_id
    AND (client_status IS NULL OR c.status = client_status)
    GROUP BY c.id, c.name, c.email, c.phone, c.status, c.category, c.created_at
    ORDER BY c.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar clientes por texto
CREATE OR REPLACE FUNCTION search_clients(
    org_id UUID,
    search_term TEXT
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    document_number TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.email,
        c.phone,
        c.document_number,
        c.status
    FROM public.clients c
    WHERE c.tenant_id = org_id
    AND (
        c.name ILIKE '%' || search_term || '%'
        OR c.email ILIKE '%' || search_term || '%'
        OR c.phone ILIKE '%' || search_term || '%'
        OR c.document_number ILIKE '%' || search_term || '%'
    )
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar último contato
CREATE OR REPLACE FUNCTION update_client_last_contact(client_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.clients
    SET 
        last_contact = NOW(),
        updated_at = NOW()
    WHERE id = client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para adicionar tag ao cliente
CREATE OR REPLACE FUNCTION add_client_tag(client_id UUID, tag_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.clients
    SET 
        tags = tags || jsonb_build_array(tag_name),
        updated_at = NOW()
    WHERE id = client_id
    AND NOT (tags ? tag_name); -- Só adiciona se não existir
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para remover tag do cliente
CREATE OR REPLACE FUNCTION remove_client_tag(client_id UUID, tag_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.clients
    SET 
        tags = tags - tag_name,
        updated_at = NOW()
    WHERE id = client_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas de clientes da organização
CREATE OR REPLACE FUNCTION get_client_stats(org_id UUID)
RETURNS TABLE (
    total_clients BIGINT,
    active_clients BIGINT,
    premium_clients BIGINT,
    clients_with_projects BIGINT,
    avg_projects_per_client NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE status = 'active') as active_clients,
        COUNT(*) FILTER (WHERE category = 'premium') as premium_clients,
        COUNT(DISTINCT p.client_id) as clients_with_projects,
        ROUND(AVG(project_counts.project_count), 2) as avg_projects_per_client
    FROM public.clients c
    LEFT JOIN public.projects p ON p.client_id = c.id AND p.tenant_id = c.tenant_id
    LEFT JOIN (
        SELECT client_id, COUNT(*) as project_count
        FROM public.projects
        WHERE tenant_id = org_id AND client_id IS NOT NULL
        GROUP BY client_id
    ) project_counts ON project_counts.client_id = c.id
    WHERE c.tenant_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários para documentação
COMMENT ON TABLE public.clients IS 'Clientes com isolamento multi-tenant e funcionalidades avançadas';
COMMENT ON COLUMN public.clients.tenant_id IS 'ID da organização - OBRIGATÓRIO para isolamento';
COMMENT ON COLUMN public.clients.address IS 'Endereço completo em formato JSONB';
COMMENT ON COLUMN public.clients.settings IS 'Configurações e preferências do cliente';
COMMENT ON COLUMN public.clients.tags IS 'Array de tags para categorização';
COMMENT ON FUNCTION get_org_clients(UUID, TEXT, INTEGER) IS 'Retorna clientes da organização com contagem de projetos';
COMMENT ON FUNCTION search_clients(UUID, TEXT) IS 'Busca clientes por nome, email, telefone ou documento';
