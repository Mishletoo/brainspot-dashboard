-- Migration: 027_restore_employee_compensation_without_duplicates
-- Description:
--   - Verify key employee records exist (notice-only, non-blocking)
--   - Restore missing compensation/profile fields using UPDATE only
--   - Never INSERT new employees (prevents duplicates)

BEGIN;

DO $$
DECLARE
  missing_names text[];
BEGIN
  WITH expected(first_name, last_name) AS (
    VALUES
      ('Анна', 'Константинова'),
      ('Валентин', 'Димитров'),
      ('Мариян', 'Маринов'),
      ('Диан', 'Трифонов'),
      ('Петър', 'Събев'),
      ('Богомил', 'Петров'),
      ('Кристияна', 'Станева')
  ),
  missing AS (
    SELECT format('%s %s', e.first_name, e.last_name) AS full_name
    FROM expected AS e
    LEFT JOIN public.employees AS emp
      ON emp.first_name = e.first_name
     AND emp.last_name = e.last_name
    WHERE emp.id IS NULL
  )
  SELECT array_agg(full_name) INTO missing_names
  FROM missing;

  IF missing_names IS NULL OR array_length(missing_names, 1) IS NULL THEN
    RAISE NOTICE 'All target employees are present.';
  ELSE
    RAISE NOTICE 'Missing employees (no insert performed): %', array_to_string(missing_names, ', ');
  END IF;
END
$$;

WITH seed AS (
  SELECT *
  FROM (
    VALUES
      ('Анна', 'Константинова', 'anna@brainspot.bg', 'Manager', 8::numeric, 659.57::numeric, 511.81::numeric, 124.80::numeric, 102.26::numeric, 0::numeric, 160::numeric),
      ('Валентин', 'Димитров', 'valentin@digitalnosti.bg', 'Старши дизайнер', 8::numeric, 628.45::numeric, 487.66::numeric, 118.91::numeric, 102.26::numeric, 613.55::numeric, 160::numeric),
      ('Мариян', 'Маринов', 'mariyan@digitalnosti.bg', 'PPC', 8::numeric, 628.45::numeric, 487.66::numeric, 118.91::numeric, 102.26::numeric, 715.81::numeric, 160::numeric),
      ('Диан', 'Трифонов', 'dean@digitalnosti.bg', 'Видео едитър', 8::numeric, 624.73::numeric, 484.78::numeric, 118.20::numeric, 102.26::numeric, 715.81::numeric, 160::numeric),
      ('Петър', 'Събев', 'petar@digitalnosti.bg', 'Мениджмънт', 8::numeric, 635.90::numeric, 493.44::numeric, 120.31::numeric, 102.26::numeric, 1022.58::numeric, 160::numeric),
      ('Богомил', 'Петров', 'bogomil@digitalnosti.bg', 'Младши дизайнер', 6::numeric, 466.00::numeric, 358.82::numeric, 88.00::numeric, 102.26::numeric, 305.86::numeric, 120::numeric),
      ('Кристияна', 'Станева', 'contentcreator@digitalnosti.bg', 'Social media', 4::numeric, 311.00::numeric, 239.47::numeric, 59.00::numeric, 102.26::numeric, 425.21::numeric, 80::numeric)
  ) AS v(
    first_name,
    last_name,
    email,
    position,
    hours_per_day,
    gross_salary,
    net_salary,
    employer_contributions,
    vouchers,
    bonus,
    monthly_hours
  )
)
UPDATE public.employees AS e
SET
  email = COALESCE(NULLIF(e.email, ''), s.email),
  position = COALESCE(NULLIF(e.position, ''), s.position),
  hours_per_day = COALESCE(e.hours_per_day, s.hours_per_day),
  gross_salary = COALESCE(e.gross_salary, s.gross_salary),
  net_salary = COALESCE(e.net_salary, s.net_salary),
  employer_contributions = COALESCE(e.employer_contributions, s.employer_contributions),
  vouchers = COALESCE(e.vouchers, s.vouchers),
  bonus = COALESCE(e.bonus, s.bonus),
  monthly_hours = COALESCE(e.monthly_hours, s.monthly_hours)
FROM seed AS s
WHERE e.first_name = s.first_name
  AND e.last_name = s.last_name;

COMMIT;
