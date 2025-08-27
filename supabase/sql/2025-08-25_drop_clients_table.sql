-- Migration: Drop legacy table public.clients
-- Purpose: Remove unused table `clients` and its dependent objects
-- Date: 2025-08-25

-- Notes:
-- - This script is idempotent: it checks for table existence before dropping.
-- - CASCADE ensures indexes, constraints, policies and dependent views are removed.
-- - No emojis or non-ASCII characters are used to avoid SQL parsing issues.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'clients'
  ) THEN
    RAISE NOTICE 'Dropping table public.clients and dependent objects...';
    DROP TABLE public.clients CASCADE;
    RAISE NOTICE 'Table public.clients dropped.';
  ELSE
    RAISE NOTICE 'Table public.clients does not exist. Skipping.';
  END IF;
END
$$;


