-- Migration: 019_employees_compensation_extended
-- Description: Extend employees compensation model with detailed cost structure

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employer_contributions numeric(12, 2),
  ADD COLUMN IF NOT EXISTS monthly_hours numeric(8, 2);

-- Monthly cost = gross + employer contributions + vouchers + bonus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = 'monthly_cost'
  ) THEN
    ALTER TABLE public.employees
      ADD COLUMN monthly_cost numeric(12, 2)
      GENERATED ALWAYS AS (
        COALESCE(gross_salary, 0)
        + COALESCE(employer_contributions, 0)
        + COALESCE(vouchers, 0)
        + COALESCE(bonus, 0)
      ) STORED;
  END IF;
END $$;

-- Hourly cost = monthly_cost / monthly_hours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'employees'
      AND column_name = 'hourly_cost'
  ) THEN
    ALTER TABLE public.employees
      ADD COLUMN hourly_cost numeric(12, 4)
      GENERATED ALWAYS AS (
        CASE
          WHEN monthly_hours IS NOT NULL
               AND monthly_hours > 0
               AND monthly_cost IS NOT NULL
               AND monthly_cost > 0
          THEN monthly_cost / monthly_hours
          ELSE NULL
        END
      ) STORED;
  END IF;
END $$;

COMMIT;

