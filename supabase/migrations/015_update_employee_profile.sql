-- Migration: 015_update_employee_profile
-- Description: Add RPC to allow employees to update only non-sensitive profile fields

BEGIN;

CREATE OR REPLACE FUNCTION public.update_employee_profile(
  p_phone text,
  p_birth_date date,
  p_photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_uid uuid;
BEGIN
  v_auth_uid := auth.uid();

  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.employees
  SET
    phone = p_phone,
    birth_date = p_birth_date,
    photo_url = p_photo_url
  WHERE auth_user_id = v_auth_uid;
END;
$$;

COMMIT;

