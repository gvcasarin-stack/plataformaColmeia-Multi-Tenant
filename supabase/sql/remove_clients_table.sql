-- ==============================================
-- REMOÇÃO DA TABELA CLIENTS REDUNDANTE
-- ==============================================
-- A tabela clients é redundante pois os clientes estão na tabela users
-- com role = 'cliente'. Este script remove a tabela e ajusta referências.

-- ==============================================
-- PASSO 1: REMOVER REFERÊNCIA NA TABELA PROJECTS
-- ==============================================

-- Verificar se a coluna client_id existe antes de tentar removê-la
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'projects' 
        AND column_name = 'client_id'
    ) THEN
        -- Remover a constraint de foreign key primeiro
        ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;
        
        -- Remover a coluna client_id
        ALTER TABLE public.projects DROP COLUMN client_id;
        
        RAISE NOTICE 'Coluna client_id removida da tabela projects';
    ELSE
        RAISE NOTICE 'Coluna client_id não existe na tabela projects';
    END IF;
END $$;

-- ==============================================
-- PASSO 2: REMOVER POLÍTICAS RLS DA TABELA CLIENTS
-- ==============================================

-- Remover todas as políticas da tabela clients
DROP POLICY IF EXISTS "Allow authenticated users to create clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to read their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow users to delete their own clients" ON public.clients;
DROP POLICY IF EXISTS "Allow admin/superadmin full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Allow admin full access to clients" ON public.clients;

-- ==============================================
-- PASSO 3: REMOVER ÍNDICES DA TABELA CLIENTS
-- ==============================================

-- Remover índices se existirem
DROP INDEX IF EXISTS idx_clients_created_by;
DROP INDEX IF EXISTS idx_clients_email;
DROP INDEX IF EXISTS idx_clients_created_at;

-- ==============================================
-- PASSO 4: DELETAR A TABELA CLIENTS
-- ==============================================

-- Verificar se a tabela existe antes de tentar removê-la
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'clients'
    ) THEN
        DROP TABLE public.clients CASCADE;
        RAISE NOTICE 'Tabela clients removida com sucesso';
    ELSE
        RAISE NOTICE 'Tabela clients não existe';
    END IF;
END $$;

-- ==============================================
-- PASSO 5: ATUALIZAR COMENTÁRIOS DA TABELA PROJECTS
-- ==============================================

-- Atualizar comentário da tabela projects para refletir que não usa mais clients
COMMENT ON TABLE public.projects IS 'Tabela principal de projetos - clientes são referenciados através da tabela users com role=cliente';

-- ==============================================
-- PASSO 6: VERIFICAÇÃO FINAL
-- ==============================================

-- Verificar se a remoção foi bem-sucedida
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'clients'
        ) 
        THEN 'ERRO: Tabela clients ainda existe'
        ELSE 'SUCESSO: Tabela clients removida'
    END as status_clients,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'projects' 
            AND column_name = 'client_id'
        ) 
        THEN 'ERRO: Coluna client_id ainda existe em projects'
        ELSE 'SUCESSO: Coluna client_id removida de projects'
    END as status_projects;

-- Listar tabelas restantes para confirmação
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ==============================================
-- DOCUMENTAÇÃO
-- ==============================================

/*
RESUMO DAS ALTERAÇÕES:

1. ✅ Removida coluna client_id da tabela projects
2. ✅ Removidas todas as políticas RLS da tabela clients
3. ✅ Removidos índices da tabela clients
4. ✅ Deletada tabela clients
5. ✅ Atualizado comentário da tabela projects

RESULTADO:
- Tabela users: Contém todos os usuários (role: admin, superadmin, cliente)
- Tabela projects: Não referencia mais a tabela clients
- Estrutura simplificada e consistente

PRÓXIMOS PASSOS:
- Verificar se o código precisa ser atualizado para usar apenas a tabela users
- Confirmar que não há referências à tabela clients no código
*/
