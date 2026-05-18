-- Ensure employee activity flag exists for access checks
-- and force PostgREST schema cache refresh.

alter table public.employees
  add column if not exists is_active boolean default true;

notify pgrst, 'reload schema';
