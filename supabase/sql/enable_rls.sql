-- Habilitar Row Level Security (RLS) para todas as tabelas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- POLÍTICAS PARA TABELA public.users
-- ==============================================

-- Permitir que usuários leiam seus próprios dados
CREATE POLICY "Allow individual user read access"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios dados
CREATE POLICY "Allow individual user update access"
ON public.users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Permitir que admins/superadmins leiam todos os usuários
CREATE POLICY "Allow admin/superadmin read access to all users"
ON public.users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'superadmin')
  )
);

-- Permitir que admins/superadmins atualizem outros usuários
CREATE POLICY "Allow admin/superadmin update access to all users"
ON public.users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'superadmin')
  )
);

-- ==============================================
-- POLÍTICAS PARA TABELA public.clients
-- ==============================================

-- Permitir que usuários autenticados criem clientes
CREATE POLICY "Allow authenticated users to create clients"
ON public.clients FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Permitir que usuários leiam clientes que criaram
CREATE POLICY "Allow users to read their own clients"
ON public.clients FOR SELECT
USING (auth.uid() = created_by);

-- Permitir que usuários atualizem clientes que criaram
CREATE POLICY "Allow users to update their own clients"
ON public.clients FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Permitir que usuários deletem clientes que criaram
CREATE POLICY "Allow users to delete their own clients"
ON public.clients FOR DELETE
USING (auth.uid() = created_by);

-- Permitir que admins/superadmins tenham acesso total aos clientes
CREATE POLICY "Allow admin/superadmin full access to clients"
ON public.clients FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'superadmin')
  )
);

-- ==============================================
-- POLÍTICAS PARA TABELA public.projects
-- ==============================================

-- Permitir que usuários autenticados criem projetos
CREATE POLICY "Allow authenticated users to create projects"
ON public.projects FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Permitir que usuários leiam projetos que criaram
CREATE POLICY "Allow users to read their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = created_by);

-- Permitir que usuários atualizem projetos que criaram
CREATE POLICY "Allow users to update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Permitir que usuários deletem projetos que criaram
CREATE POLICY "Allow users to delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = created_by);

-- Permitir que admins/superadmins tenham acesso total aos projetos
CREATE POLICY "Allow admin/superadmin full access to projects"
ON public.projects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'superadmin')
  )
);

-- ==============================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ==============================================

COMMENT ON TABLE public.users IS 'Tabela de usuários com RLS habilitado - usuários podem ver apenas seus próprios dados, admins veem todos';
COMMENT ON TABLE public.clients IS 'Tabela de clientes com RLS habilitado - usuários veem apenas clientes que criaram, admins veem todos';
COMMENT ON TABLE public.projects IS 'Tabela de projetos com RLS habilitado - usuários veem apenas projetos que criaram, admins veem todos'; 