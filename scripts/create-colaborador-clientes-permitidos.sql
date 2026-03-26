-- ========================================
-- MIGRATION: Campo clientes_permitidos na tabela users
-- ========================================
-- Descrição: Adiciona campo JSON para controlar quais clientes cada colaborador pode acessar
-- Solução: Campo JSONB (mais simples, performático e sem dependências)
-- Autor: Sistema SGF
-- Data: 2025-12-01

-- 🆕 ADICIONAR COLUNA clientes_permitidos
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS clientes_permitidos JSONB DEFAULT '[]'::jsonb;

-- 🆕 ADICIONAR COLUNA tem_restricao_clientes (para diferenciar "sem restrição" de "sem acesso")
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tem_restricao_clientes BOOLEAN DEFAULT false;

-- 📝 COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON COLUMN users.clientes_permitidos IS 
  'Array de UUIDs dos clientes que o colaborador pode acessar';

COMMENT ON COLUMN users.tem_restricao_clientes IS 
  'false = sem restrição (acesso total), true = tem restrição (usa array clientes_permitidos). Se true e array vazio = sem acesso a nenhum cliente';

-- 🔍 CRIAR ÍNDICE GIN PARA PERFORMANCE
-- GIN (Generalized Inverted Index) é otimizado para busca em arrays JSONB
CREATE INDEX IF NOT EXISTS idx_users_clientes_permitidos 
  ON users USING GIN (clientes_permitidos);

-- 🔍 CRIAR ÍNDICE PARA tem_restricao_clientes
CREATE INDEX IF NOT EXISTS idx_users_tem_restricao_clientes 
  ON users(tem_restricao_clientes) 
  WHERE role = 'colaborador';

-- ✅ CONCLUÍDO
SELECT 'Campo clientes_permitidos adicionado com sucesso!' AS status;

-- 📊 VERIFICAR ESTRUTURA
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name IN ('clientes_permitidos', 'tem_restricao_clientes')
ORDER BY column_name;
