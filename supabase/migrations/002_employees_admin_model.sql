-- Migration: 002_employees_admin_model
-- Created: 2026-03-09
-- Description: Reshape employees table to admin data model

BEGIN;

-- Add target columns when missing.
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS hours_per_day numeric(4,2),
  ADD COLUMN IF NOT EXISTS gross_salary numeric(12,2),
  ADD COLUMN IF NOT EXISTS net_salary numeric(12,2),
  ADD COLUMN IF NOT EXISTS bonus numeric(12,2),
  ADD COLUMN IF NOT EXISTS vouchers numeric(12,2);

-- Backfill from legacy full_name when present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = 'full_name'
  ) THEN
    UPDATE public.employees
    SET
      first_name = COALESCE(first_name, NULLIF(split_part(trim(full_name), ' ', 1), '')),
      last_name = COALESCE(
        last_name,
        NULLIF(
          regexp_replace(trim(full_name), '^\S+\s*', ''),
          ''
        )
      )
    WHERE full_name IS NOT NULL;
  END IF;
END $$;

-- Keep legacy values where first/last name is single token.
UPDATE public.employees
SET last_name = NULL
WHERE last_name = first_name;

-- Remove outdated columns from previous model.
ALTER TABLE public.employees
  DROP COLUMN IF EXISTS full_name,
  DROP COLUMN IF EXISTS start_date,
  DROP COLUMN IF EXISTS status;

-- Clean up obsolete index from dropped status column.
DROP INDEX IF EXISTS public.idx_employees_status;

COMMIT;
