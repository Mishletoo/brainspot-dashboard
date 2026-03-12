-- Migration: 014_fix_employees_rls
-- Description: Fix employees RLS policies to resolve "Could not verify employee record" on login

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "employees_select_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_select_own" ON public.employees;
DROP POLICY IF EXISTS "employees_update_link_on_register" ON public.employees;

-- Policy: Authenticated users can read their own employee record
CREATE POLICY "employees_select_own"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Policy: Authenticated users can link their employee record during registration
CREATE POLICY "employees_update_link_on_register"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (auth_user_id IS NULL AND lower(email) = lower(auth.email()))
  WITH CHECK (auth_user_id = auth.uid());

COMMIT;
