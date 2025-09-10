-- ✅ POPULAR TABELA reserved_slugs COM SLUGS RESTRITOS
-- Execute este script APÓS criar a tabela reserved_slugs
-- Data: Janeiro 2025

-- ========================================
-- INSERIR SLUGS RESERVADOS
-- ========================================

INSERT INTO reserved_slugs (slug, reason, category, is_active) VALUES

-- ========================================
-- CATEGORIA: MARCA/EMPRESA (brand)
-- ========================================
('app', 'Reservado para aplicação principal', 'brand', true),
('colmeia', 'Nome da empresa proprietária', 'brand', true),
('colmeia-solar', 'Nome completo da empresa proprietária', 'brand', true),
('colmeiasolar', 'Variação do nome da empresa', 'brand', true),
('solar', 'Palavra-chave do negócio da empresa', 'brand', true),

-- Variações da marca
('gerenciamento', 'Nome da plataforma', 'brand', true),
('fotovoltaico', 'Segmento da plataforma', 'brand', true),
('gerenciamentofotovoltaico', 'Nome completo da plataforma', 'brand', true),

-- ========================================
-- CATEGORIA: SISTEMA TÉCNICO (technical)
-- ========================================
('api', 'Endpoint de API', 'technical', true),
('www', 'Subdomínio padrão web', 'technical', true),
('admin', 'Painel administrativo', 'technical', true),
('dashboard', 'Painel principal', 'technical', true),
('login', 'Página de autenticação', 'technical', true),
('auth', 'Sistema de autenticação', 'technical', true),
('registro', 'Sistema de registro', 'technical', true),

-- Infraestrutura
('mail', 'Servidor de email', 'technical', true),
('email', 'Sistema de email', 'technical', true),
('ftp', 'Servidor FTP', 'technical', true),
('cdn', 'Content Delivery Network', 'technical', true),
('static', 'Arquivos estáticos', 'technical', true),
('assets', 'Recursos estáticos', 'technical', true),

-- ========================================
-- CATEGORIA: AMBIENTES (system)
-- ========================================
('dev', 'Ambiente de desenvolvimento', 'system', true),
('development', 'Ambiente de desenvolvimento', 'system', true),
('staging', 'Ambiente de homologação', 'system', true),
('test', 'Ambiente de testes', 'system', true),
('testing', 'Ambiente de testes', 'system', true),
('prod', 'Ambiente de produção', 'system', true),
('production', 'Ambiente de produção', 'system', true),
('demo', 'Ambiente de demonstração', 'system', true),
('sandbox', 'Ambiente isolado', 'system', true),

-- ========================================
-- CATEGORIA: FUNCIONALIDADES (technical)
-- ========================================
('blog', 'Blog da empresa', 'technical', true),
('docs', 'Documentação', 'technical', true),
('help', 'Central de ajuda', 'technical', true),
('support', 'Suporte técnico', 'technical', true),
('status', 'Página de status', 'technical', true),
('monitor', 'Monitoramento', 'technical', true),
('health', 'Health check', 'technical', true),

-- ========================================
-- CATEGORIA: SISTEMA CRÍTICO (system)
-- ========================================
('root', 'Usuário root do sistema', 'system', true),
('system', 'Sistema operacional', 'system', true),
('server', 'Servidor', 'system', true),
('database', 'Banco de dados', 'system', true),
('db', 'Database abreviado', 'system', true),
('backup', 'Sistema de backup', 'system', true),

-- ========================================
-- CATEGORIA: LEGAL/GENÉRICOS (legal)
-- ========================================
('legal', 'Questões legais', 'legal', true),
('terms', 'Termos de uso', 'legal', true),
('privacy', 'Política de privacidade', 'legal', true),
('about', 'Sobre a empresa', 'legal', true),
('contact', 'Contato', 'legal', true),

-- Genéricos problemáticos
('null', 'Valor nulo', 'legal', true),
('undefined', 'Valor indefinido', 'legal', true),
('default', 'Valor padrão', 'legal', true),
('example', 'Exemplo', 'legal', true),
('sample', 'Amostra', 'legal', true),

-- ========================================
-- CATEGORIA: POSSÍVEIS CONCORRENTES (competitor)
-- ========================================
('energia', 'Setor energético', 'competitor', true),
('eletrica', 'Setor elétrico', 'competitor', true),
('renovavel', 'Energia renovável', 'competitor', true),
('sustentavel', 'Sustentabilidade', 'competitor', true)

ON CONFLICT (slug) DO UPDATE SET
  reason = EXCLUDED.reason,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ========================================
-- VERIFICAR INSERÇÃO
-- ========================================

-- Contar slugs inseridos por categoria
SELECT 
  category,
  COUNT(*) as total_slugs,
  COUNT(CASE WHEN is_active THEN 1 END) as active_slugs
FROM reserved_slugs 
GROUP BY category 
ORDER BY category;

-- Listar todos os slugs inseridos
SELECT 
  slug,
  reason,
  category,
  is_active,
  created_at
FROM reserved_slugs 
ORDER BY category, slug;

-- Total geral
SELECT 
  COUNT(*) as total_reserved_slugs,
  COUNT(CASE WHEN is_active THEN 1 END) as active_reserved_slugs
FROM reserved_slugs;

SELECT '✅ Slugs reservados inseridos com sucesso!' as status;
