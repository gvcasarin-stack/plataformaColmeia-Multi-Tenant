-- Migration: Create fixed_costs table
-- Purpose: Table to manage fixed costs with validity periods
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
      AND table_name   = 'fixed_costs'
  ) THEN
    RAISE NOTICE 'Creating table public.fixed_costs...';
    
    -- Create the table
    CREATE TABLE public.fixed_costs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      vigencia_inicio DATE NOT NULL,
      vigencia_fim DATE NULL,
      
      -- Foreign key constraints
      CONSTRAINT fk_fixed_costs_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
        
      -- Business logic constraints
      CONSTRAINT fixed_costs_amount_positive CHECK (amount >= 0),
      CONSTRAINT fixed_costs_vigencia_valid CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
    );

    -- Create indexes for better performance
    CREATE INDEX idx_fixed_costs_user_id ON public.fixed_costs(user_id);
    CREATE INDEX idx_fixed_costs_category ON public.fixed_costs(category);
    CREATE INDEX idx_fixed_costs_is_active ON public.fixed_costs(is_active);
    CREATE INDEX idx_fixed_costs_vigencia_inicio ON public.fixed_costs(vigencia_inicio);
    CREATE INDEX idx_fixed_costs_vigencia_fim ON public.fixed_costs(vigencia_fim);

    -- Composite index for active costs by user
    CREATE INDEX idx_fixed_costs_user_active ON public.fixed_costs(user_id, is_active)
      WHERE is_active = true;

    -- Enable RLS (Row Level Security)
    ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy: users can only access their own fixed costs
    CREATE POLICY fixed_costs_user_access ON public.fixed_costs
      FOR ALL 
      USING (auth.uid() = user_id);

    -- Create RLS policy for admin users (if they need access)
    CREATE POLICY fixed_costs_admin_access ON public.fixed_costs
      FOR ALL 
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() 
          AND role IN ('admin', 'superadmin')
        )
      );

    RAISE NOTICE 'Table public.fixed_costs created successfully.';
  ELSE
    RAISE NOTICE 'Table public.fixed_costs already exists. Skipping.';
  END IF;
END
$$;