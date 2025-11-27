-- ================================================
-- FIX: Corrigir constraint de status dos projetos
-- ================================================
-- A constraint atual valida nomes legíveis ('Não Iniciado')
-- Mas o sistema agora usa slugs ('nao-iniciado')
-- ================================================

-- 1️⃣ REMOVER a constraint antiga
ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_status_valid;

-- 2️⃣ CRIAR nova constraint com SLUGS válidos
ALTER TABLE projects
ADD CONSTRAINT projects_status_valid
CHECK (
  status IN (
    'nao-iniciado',
    'em-desenvolvimento',
    'aguardando-assinaturas',
    'em-homologacao',
    'projeto-aprovado',
    'aguardando-solicitar-vistoria',
    'projeto-pausado',
    'em-vistoria',
    'finalizado',
    'cancelado'
  )
);

-- 3️⃣ ATUALIZAR projetos existentes com status antigo
UPDATE projects
SET status = 'nao-iniciado'
WHERE status = 'Não Iniciado';

UPDATE projects
SET status = 'em-desenvolvimento'
WHERE status = 'Em Desenvolvimento';

UPDATE projects
SET status = 'aguardando-assinaturas'
WHERE status = 'Aguardando Assinaturas';

UPDATE projects
SET status = 'em-homologacao'
WHERE status = 'Em Homologação';

UPDATE projects
SET status = 'projeto-aprovado'
WHERE status = 'Projeto Aprovado';

UPDATE projects
SET status = 'aguardando-solicitar-vistoria'
WHERE status = 'Aguardando Solicitar Vistoria';

UPDATE projects
SET status = 'projeto-pausado'
WHERE status = 'Projeto Pausado';

UPDATE projects
SET status = 'em-vistoria'
WHERE status = 'Em Vistoria';

UPDATE projects
SET status = 'finalizado'
WHERE status = 'Finalizado';

UPDATE projects
SET status = 'cancelado'
WHERE status = 'Cancelado';

-- ✅ VERIFICAR resultado
SELECT
  status,
  COUNT(*) as total
FROM projects
GROUP BY status
ORDER BY status;
