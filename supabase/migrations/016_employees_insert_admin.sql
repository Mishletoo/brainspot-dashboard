-- Migration: 016_employees_insert_admin
-- Description: Add INSERT policy for admins on public.employees

BEGIN;

-- Policy: Admins can insert employees
CREATE POLICY "employees_insert_admin"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.auth_user_id = auth.uid()
        AND e.app_role = 'admin'
    )
  );

COMMIT;

