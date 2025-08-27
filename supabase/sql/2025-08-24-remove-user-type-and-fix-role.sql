-- Migration: Descontinuar uso de user_type e consolidar role como campo canônico
-- Safe ops: não remove a coluna; apenas elimina default/uso e limpa dados conflitantes

BEGIN;

DO $$
BEGIN
  -- Ajustes somente se a coluna user_type existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'user_type'
  ) THEN
    -- Remover DEFAULT, se houver
    BEGIN
      EXECUTE 'ALTER TABLE public.users ALTER COLUMN user_type DROP DEFAULT';
    EXCEPTION WHEN others THEN
      NULL;
    END;

    -- Permitir NULL (caso estivesse NOT NULL)
    BEGIN
      EXECUTE 'ALTER TABLE public.users ALTER COLUMN user_type DROP NOT NULL';
    EXCEPTION WHEN others THEN
      NULL;
    END;

    -- Limpar conflitos (user_type "client/cliente" para admins/superadmins)
    UPDATE public.users
      SET user_type = NULL
      WHERE (role IN ('admin','superadmin'))
        AND (user_type IS NOT NULL)
        AND (user_type ILIKE 'client' OR user_type ILIKE 'cliente');
  END IF;
END$$;

-- Constraint canônica de role (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND constraint_name = 'users_role_valid'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_valid CHECK (role IN ('cliente','admin','superadmin'));
  END IF;
END$$;

COMMIT;
