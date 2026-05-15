-- Migration: 026_backfill_employee_is_active
-- Description: Backfill legacy rows where is_active is NULL to TRUE.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = 'is_active'
  ) THEN
    UPDATE public.employees
    SET is_active = true
    WHERE is_active IS NULL;
  END IF;
END $$;

COMMIT;
