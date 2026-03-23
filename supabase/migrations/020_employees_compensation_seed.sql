-- Migration: 020_employees_compensation_seed
-- Description: Ensure employees have detailed compensation data (upsert-style)
-- Rules:
-- - Update if employee exists (match by first_name + last_name), otherwise create.
-- - Do not overwrite existing non-null values.

BEGIN;

-- Анна Константинова
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Анна'
    AND last_name = 'Константинова'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 8),
      gross_salary = COALESCE(gross_salary, 659.57),
      net_salary = COALESCE(net_salary, 511.81),
      employer_contributions = COALESCE(employer_contributions, 124.80),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 0),
      monthly_hours = COALESCE(monthly_hours, 160)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Анна', 'Константинова', 8, 659.57, 511.81, 124.80, 102.26, 0, 160);
  END IF;
END $$;

-- Валентин Димитров
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Валентин'
    AND last_name = 'Димитров'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 8),
      gross_salary = COALESCE(gross_salary, 628.45),
      net_salary = COALESCE(net_salary, 487.66),
      employer_contributions = COALESCE(employer_contributions, 118.91),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 0),
      monthly_hours = COALESCE(monthly_hours, 160)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Валентин', 'Димитров', 8, 628.45, 487.66, 118.91, 102.26, 0, 160);
  END IF;
END $$;

-- Диан Трифонов
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Диан'
    AND last_name = 'Трифонов'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 8),
      gross_salary = COALESCE(gross_salary, 624.73),
      net_salary = COALESCE(net_salary, 484.78),
      employer_contributions = COALESCE(employer_contributions, 118.20),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 0),
      monthly_hours = COALESCE(monthly_hours, 160)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Диан', 'Трифонов', 8, 624.73, 484.78, 118.20, 102.26, 0, 160);
  END IF;
END $$;

-- Мариян Маринов
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Мариян'
    AND last_name = 'Маринов'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 8),
      gross_salary = COALESCE(gross_salary, 628.45),
      net_salary = COALESCE(net_salary, 487.66),
      employer_contributions = COALESCE(employer_contributions, 118.91),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 0),
      monthly_hours = COALESCE(monthly_hours, 160)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Мариян', 'Маринов', 8, 628.45, 487.66, 118.91, 102.26, 0, 160);
  END IF;
END $$;

-- Петър Събев
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Петър'
    AND last_name = 'Събев'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 8),
      gross_salary = COALESCE(gross_salary, 635.90),
      net_salary = COALESCE(net_salary, 493.44),
      employer_contributions = COALESCE(employer_contributions, 120.31),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 0),
      monthly_hours = COALESCE(monthly_hours, 160)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Петър', 'Събев', 8, 635.90, 493.44, 120.31, 102.26, 0, 160);
  END IF;
END $$;

-- Кристияна Станева
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Кристияна'
    AND last_name = 'Станева'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 4),
      gross_salary = COALESCE(gross_salary, 311.00),
      net_salary = COALESCE(net_salary, 239.47),
      employer_contributions = COALESCE(employer_contributions, 59.00),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 425.21),
      monthly_hours = COALESCE(monthly_hours, 80)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Кристияна', 'Станева', 4, 311.00, 239.47, 59.00, 102.26, 425.21, 80);
  END IF;
END $$;

-- Богомил Петров
DO $$
DECLARE
  v_employee_id uuid;
BEGIN
  SELECT id
  INTO v_employee_id
  FROM public.employees
  WHERE first_name = 'Богомил'
    AND last_name = 'Петров'
  LIMIT 1;

  IF v_employee_id IS NOT NULL THEN
    UPDATE public.employees
    SET
      hours_per_day = COALESCE(hours_per_day, 6),
      gross_salary = COALESCE(gross_salary, 466.00),
      net_salary = COALESCE(net_salary, 358.82),
      employer_contributions = COALESCE(employer_contributions, 88.00),
      vouchers = COALESCE(vouchers, 102.26),
      bonus = COALESCE(bonus, 305.86),
      monthly_hours = COALESCE(monthly_hours, 120)
    WHERE id = v_employee_id;
  ELSE
    INSERT INTO public.employees (
      first_name,
      last_name,
      hours_per_day,
      gross_salary,
      net_salary,
      employer_contributions,
      vouchers,
      bonus,
      monthly_hours
    )
    VALUES ('Богомил', 'Петров', 6, 466.00, 358.82, 88.00, 102.26, 305.86, 120);
  END IF;
END $$;

COMMIT;

