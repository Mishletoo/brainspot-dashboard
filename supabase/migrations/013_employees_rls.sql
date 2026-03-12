-- Migration: 013_employees_rls
-- Description: Enable RLS on employees and add policies for self-read, registration link, and admin access

BEGIN;

-- Enable Row Level Security on employees
ALTER TABLE public.employees
  ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read their own employee record
CREATE POLICY "employees_select_own"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

-- Policy: Authenticated users can link their employee record during registration
-- (update auth_user_id when it is null and email matches auth.email())
CREATE POLICY "employees_update_link_on_register"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (auth_user_id IS NULL AND email = auth.email())
  WITH CHECK (auth_user_id = auth.uid());

-- Policy: Admins can read all employees
CREATE POLICY "employees_select_admin"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid() AND e.app_role = 'admin'
    )
  );

-- Policy: Admins can update all employees
CREATE POLICY "employees_update_admin"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid() AND e.app_role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.auth_user_id = auth.uid() AND e.app_role = 'admin'
    )
  );

COMMIT;
