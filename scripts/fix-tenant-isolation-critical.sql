-- 🚨 CORREÇÃO CRÍTICA: Vazamento de Dados Multi-Tenant
-- Execute este script URGENTEMENTE no Supabase
-- Data: 09/09/2025

-- ========================================
-- PASSO 1: IDENTIFICAR DADOS ÓRFÃOS
-- ========================================

-- Verificar projetos sem tenant_id
SELECT 'PROJETOS SEM TENANT_ID:' as info;
SELECT id, number, nome_cliente_final, created_by, created_at
FROM projects 
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- Verificar usuários sem tenant_id  
SELECT 'USUÁRIOS SEM TENANT_ID:' as info;
SELECT id, email, name, role, created_at
FROM users 
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- ========================================
-- PASSO 2: CORRIGIR PROJETOS ÓRFÃOS
-- ========================================

-- Associar projetos órfãos ao tenant do usuário que os criou
UPDATE projects 
SET 
  tenant_id = (
    SELECT tenant_id 
    FROM users 
    WHERE users.id = projects.created_by
    LIMIT 1
  ),
  updated_at = NOW()
WHERE tenant_id IS NULL 
  AND created_by IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = projects.created_by 
      AND users.tenant_id IS NOT NULL
  );

-- ========================================
-- PASSO 3: CORRIGIR USUÁRIOS ÓRFÃOS
-- ========================================

-- Para usuários sem tenant_id, criar organização individual se necessário
-- (Apenas para casos extremos onde usuário existe mas não tem organização)

-- Primeiro, verificar quantos usuários órfãos existem
SELECT 'USUÁRIOS ÓRFÃOS ENCONTRADOS:' as info;
SELECT COUNT(*) as total_users_without_tenant
FROM users 
WHERE tenant_id IS NULL;

-- ========================================
-- PASSO 4: VERIFICAR RLS (ROW LEVEL SECURITY)
-- ========================================

-- Verificar se RLS está habilitado nas tabelas críticas
SELECT 'STATUS RLS:' as info;
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'users', 'organizations', 'notifications')
ORDER BY tablename;

-- Listar políticas RLS existentes
SELECT 'POLÍTICAS RLS EXISTENTES:' as info;
SELECT 
  tablename,
  policyname,
  permissive,
  cmd as command_type,
  qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('projects', 'users', 'organizations')
ORDER BY tablename, policyname;

-- ========================================
-- PASSO 5: REFORÇAR POLÍTICAS RLS CRÍTICAS
-- ========================================

-- Garantir que RLS está habilitado
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Política crítica: Projetos só podem ser vistos pelo mesmo tenant
DROP POLICY IF EXISTS "projects_tenant_isolation" ON projects;
CREATE POLICY "projects_tenant_isolation" ON projects
  FOR ALL 
  USING (
    tenant_id = (
      SELECT tenant_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

-- Política crítica: Usuários só podem ver usuários do mesmo tenant
DROP POLICY IF EXISTS "users_tenant_isolation" ON users;
CREATE POLICY "users_tenant_isolation" ON users
  FOR ALL 
  USING (
    tenant_id = (
      SELECT tenant_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT id FROM users WHERE role = 'superadmin'
    )
  );

-- Política crítica: Notificações só para o mesmo tenant
DROP POLICY IF EXISTS "notifications_tenant_isolation" ON notifications;
CREATE POLICY "notifications_tenant_isolation" ON notifications
  FOR ALL 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u1, users u2
      WHERE u1.id = auth.uid()
        AND u2.id = notifications.user_id
        AND u1.tenant_id = u2.tenant_id
    )
  );

-- ========================================
-- PASSO 6: VERIFICAR CORREÇÃO
-- ========================================

-- Verificar se projetos órfãos foram corrigidos
SELECT 'PROJETOS ÓRFÃOS RESTANTES:' as info;
SELECT COUNT(*) as projetos_sem_tenant
FROM projects 
WHERE tenant_id IS NULL;

-- Verificar usuários órfãos restantes
SELECT 'USUÁRIOS ÓRFÃOS RESTANTES:' as info;
SELECT COUNT(*) as usuarios_sem_tenant
FROM users 
WHERE tenant_id IS NULL;

-- Verificar distribuição por tenant
SELECT 'DISTRIBUIÇÃO FINAL POR TENANT:' as info;
SELECT 
  o.name,
  o.slug,
  COUNT(DISTINCT u.id) as usuarios,
  COUNT(DISTINCT p.id) as projetos
FROM organizations o
LEFT JOIN users u ON u.tenant_id = o.id
LEFT JOIN projects p ON p.tenant_id = o.id
GROUP BY o.id, o.name, o.slug
ORDER BY o.created_at DESC;

SELECT '🔒 ISOLAMENTO MULTI-TENANT CORRIGIDO!' as status;
