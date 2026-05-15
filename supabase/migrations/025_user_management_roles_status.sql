-- Migration: 025_user_management_roles_status
-- Description:
--   - Add employee account activation flag
--   - Expand allowed application roles
--   - Keep employee emails unique (case-insensitive) for auth syncing

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_app_role_check;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_app_role_check
  CHECK (app_role IN ('admin', 'finance_admin', 'manager', 'employee'));

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique_ci_idx
  ON public.employees (lower(email))
  WHERE email IS NOT NULL;

COMMENT ON COLUMN public.employees.app_role IS
  'Application role: admin, finance_admin, manager, employee.';
COMMENT ON COLUMN public.employees.is_active IS
  'Whether the user account is active and allowed to sign in.';

COMMIT;
