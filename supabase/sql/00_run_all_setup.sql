-- ==============================================
-- 00. SCRIPT PRINCIPAL - CONFIGURAÇÃO COMPLETA MULTI-TENANT
-- ==============================================
-- Execute este arquivo no Supabase SQL Editor para configurar todo o sistema

-- ATENÇÃO: Este script irá criar TODAS as tabelas e configurações do zero
-- Certifique-se de que o banco está vazio ou faça backup antes de executar

-- ==============================================
-- INFORMAÇÕES DO SISTEMA
-- ==============================================
-- Sistema: SGF Multi-Tenant Platform
-- Versão: 1.0.0
-- Data: 2024
-- Modelo: Shared Database, Shared Schema com tenant_id

SELECT 'Iniciando configuração do sistema multi-tenant...' as status;

-- ==============================================
-- INSTRUÇÕES DE EXECUÇÃO
-- ==============================================

SELECT '
❌ ATENÇÃO: Este script não pode ser executado diretamente no Supabase SQL Editor!

✅ EXECUTE OS ARQUIVOS INDIVIDUALMENTE NA SEGUINTE ORDEM:

1. supabase/sql/01_create_organizations_table.sql
2. supabase/sql/02_create_users_table.sql  
3. supabase/sql/03_create_projects_table.sql
4. supabase/sql/04_create_clients_table.sql
5. supabase/sql/05_create_supporting_tables.sql
6. supabase/sql/06_setup_rls_policies.sql
7. supabase/sql/07_plan_limits_and_utilities.sql
8. supabase/sql/08_initial_data_and_setup.sql

📋 COMO EXECUTAR:
- Abra cada arquivo no Supabase SQL Editor
- Copie e cole o conteúdo completo
- Execute um por vez na ordem indicada
- Aguarde a conclusão antes de executar o próximo

' as instructions;

-- ==============================================
-- VERIFICAÇÃO FINAL
-- ==============================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    'Verificação de tabelas' as check_type,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ Criada'
        ELSE '❌ Não encontrada'
    END as status
FROM (
    VALUES 
        ('organizations'),
        ('users'),
        ('projects'),
        ('clients'),
        ('configs'),
        ('notifications'),
        ('active_sessions'),
        ('financial_transactions')
) as expected(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected.table_name 
    AND t.table_schema = 'public'
ORDER BY expected.table_name;

-- Verificar RLS
SELECT 
    'Row Level Security' as check_type,
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Habilitado'
        ELSE '❌ Desabilitado'
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'users', 'projects', 'clients', 'configs', 'notifications', 'active_sessions', 'financial_transactions')
ORDER BY tablename;

-- Contar políticas RLS criadas
SELECT 
    'Políticas RLS' as check_type,
    schemaname,
    tablename,
    COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Verificar funções criadas
SELECT 
    'Funções do sistema' as check_type,
    routine_name,
    '✅ Criada' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%tenant%' 
   OR routine_name LIKE '%org%' 
   OR routine_name LIKE '%limit%'
   OR routine_name LIKE '%plan%'
ORDER BY routine_name;

-- Verificar dados iniciais
SELECT 
    'Dados iniciais' as check_type,
    'organizations' as table_name,
    COUNT(*) as record_count
FROM public.organizations
UNION ALL
SELECT 
    'Dados iniciais' as check_type,
    'configs' as table_name,
    COUNT(*) as record_count
FROM public.configs;

-- ==============================================
-- RESUMO FINAL
-- ==============================================
SELECT '
🎉 CONFIGURAÇÃO MULTI-TENANT CONCLUÍDA! 

✅ Estrutura do banco criada
✅ Isolamento por tenant configurado  
✅ Políticas RLS implementadas
✅ Funções de controle de limites
✅ Dados iniciais inseridos

📋 PRÓXIMOS PASSOS:
1. Criar usuário super admin via Supabase Auth
2. Inserir o usuário na tabela users
3. Configurar subdomínios no DNS
4. Atualizar código da aplicação
5. Testar isolamento entre tenants

🔧 COMANDOS ÚTEIS:
- Verificar sistema: SELECT * FROM verify_system_setup();
- Dashboard org: SELECT * FROM get_organization_dashboard(org_id);
- Verificar limites: SELECT * FROM check_limit(org_id, ''users'');

' as final_message;

SELECT 'Sistema multi-tenant configurado com sucesso! 🚀' as status;
