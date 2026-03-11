-- Migration: 007_seed_tasks_starter_types
-- Created: 2026-03-09
-- Description: Seed starter task types into tasks table (insert missing names only)

BEGIN;

DO $$
BEGIN
  -- Data-only seed: no schema change, only insert names that are not present.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
  ) THEN
    WITH starter_tasks(name, description) AS (
      VALUES
        ('Client communication', 'Client calls, follow-ups, and clarifications'),
        ('Document collection', 'Requesting and collecting required documents'),
        ('Data entry', 'Entering source data into the system'),
        ('Reconciliation', 'Checking balances and reconciling records'),
        ('Invoice preparation', 'Preparing invoices and billing drafts'),
        ('Tax preparation', 'Preparing tax-related calculations and documents'),
        ('Payroll processing', 'Preparing payroll data and summaries'),
        ('Report preparation', 'Preparing monthly/periodic reports'),
        ('Review and quality check', 'Internal review and quality control'),
        ('Administrative follow-up', 'Operational/admin follow-up tasks')
    )
    INSERT INTO public.tasks (name, description)
    SELECT st.name, st.description
    FROM starter_tasks st
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE lower(trim(t.name)) = lower(trim(st.name))
    );
  END IF;
END $$;

COMMIT;
