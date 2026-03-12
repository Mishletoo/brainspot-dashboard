-- Migration: 017_employees_registration_link_function
-- Description: Add SECURITY DEFINER function for employee registration linking via RPC

BEGIN;

CREATE OR REPLACE FUNCTION public.link_employee_on_register(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_employee public.employees%ROWTYPE;
  v_current_uid uuid := auth.uid();
  v_current_email text := auth.email();
BEGIN
  -- Require authenticated user
  IF v_current_uid IS NULL THEN
    RETURN jsonb_build_object('status', 'unauthenticated');
  END IF;

  -- Ensure the provided email matches the authenticated user's email
  IF v_current_email IS NULL OR lower(p_email) <> lower(v_current_email) THEN
    RETURN jsonb_build_object('status', 'email_mismatch');
  END IF;

  -- Find matching employee record by email
  SELECT *
  INTO v_employee
  FROM public.employees
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- If already linked, return appropriate status
  IF v_employee.auth_user_id IS NOT NULL THEN
    IF v_employee.auth_user_id = v_current_uid THEN
      RETURN jsonb_build_object('status', 'already_linked');
    ELSE
      RETURN jsonb_build_object('status', 'conflict');
    END IF;
  END IF;

  -- Link the employee record to the current auth user
  UPDATE public.employees
  SET auth_user_id = v_current_uid
  WHERE id = v_employee.id;

  RETURN jsonb_build_object('status', 'linked');
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_employee_on_register(text) TO authenticated;

COMMIT;

