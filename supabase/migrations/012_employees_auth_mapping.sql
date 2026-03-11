-- Migration: 012_employees_auth_mapping
-- Description: Add Supabase Auth mapping to employees for login
--   - auth_user_id: links employee row to auth.users(id)
--   - app_role: allowed values 'admin' | 'employee'

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS app_role text NOT NULL DEFAULT 'employee'
    CHECK (app_role IN ('admin', 'employee'));

-- Index for lookups by auth user (UNIQUE already creates an index; optional comment)
COMMENT ON COLUMN public.employees.auth_user_id IS 'References auth.users(id); nullable until employee signs in.';
COMMENT ON COLUMN public.employees.app_role IS 'Application role: admin or employee.';

COMMIT;
