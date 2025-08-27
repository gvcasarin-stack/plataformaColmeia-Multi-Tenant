-- Migration: Create email_cooldowns table
-- Purpose: Table to manage email sending cooldown per user/project
-- Date: 2025-08-27

-- Notes:
-- - This script is idempotent: it checks for table existence before creating.
-- - Includes proper constraints, indexes and RLS policies.
-- - No emojis or non-ASCII characters are used to avoid SQL parsing issues.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'email_cooldowns'
  ) THEN
    RAISE NOTICE 'Creating table public.email_cooldowns...';
    
    -- Create the table
    CREATE TABLE public.email_cooldowns (
      user_id UUID NOT NULL,
      project_id UUID NOT NULL,
      last_email_sent_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      
      -- Primary key composite (user_id, project_id)
      CONSTRAINT email_cooldowns_pkey PRIMARY KEY (user_id, project_id),
      
      -- Foreign key constraints (assuming standard table names)
      CONSTRAINT fk_email_cooldowns_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
      CONSTRAINT fk_email_cooldowns_project_id 
        FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE
    );

    -- Create indexes for better performance
    CREATE INDEX idx_email_cooldowns_user_id ON public.email_cooldowns(user_id);
    CREATE INDEX idx_email_cooldowns_project_id ON public.email_cooldowns(project_id);
    CREATE INDEX idx_email_cooldowns_last_email_sent_at ON public.email_cooldowns(last_email_sent_at);

    -- Enable RLS (Row Level Security)
    ALTER TABLE public.email_cooldowns ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy: users can only access their own email cooldowns
    CREATE POLICY email_cooldowns_user_access ON public.email_cooldowns
      FOR ALL 
      USING (auth.uid() = user_id);

    -- Create RLS policy for admin users (if they need access)
    CREATE POLICY email_cooldowns_admin_access ON public.email_cooldowns
      FOR ALL 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'superadmin')
        )
      );

    RAISE NOTICE 'Table public.email_cooldowns created successfully.';
  ELSE
    RAISE NOTICE 'Table public.email_cooldowns already exists. Skipping.';
  END IF;
END
$$;