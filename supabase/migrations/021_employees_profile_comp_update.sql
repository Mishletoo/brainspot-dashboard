-- Migration: 021_employees_profile_comp_update
-- Description: Update existing employees with profile and compensation data
-- Notes:
-- - This migration updates ONLY existing rows (no inserts).
-- - Matching is done by first_name + last_name (Bulgarian spellings already used in earlier seeds).
-- - It overwrites only the explicitly provided fields:
--     email, position, hours_per_day, monthly_hours, vouchers, bonus.
-- - Other fields such as auth_user_id, app_role, phone, department,
--   gross_salary, net_salary, employer_contributions remain unchanged.

BEGIN;

-- Анна Константинова / Anna Konstantinova
UPDATE public.employees
SET
  email = 'anna@brainspot.bg',
  position = 'Manager',
  hours_per_day = 8,
  monthly_hours = 160,
  vouchers = 0,
  bonus = 0
WHERE first_name = 'Анна'
  AND last_name = 'Константинова';

-- Валентин Димитров
UPDATE public.employees
SET
  email = 'valentin@digitalnosti.bg',
  position = 'Старши дизайнер',
  hours_per_day = 8,
  monthly_hours = 160,
  vouchers = 102.26,
  bonus = 613.55
WHERE first_name = 'Валентин'
  AND last_name = 'Димитров';

-- Мариян Маринов
UPDATE public.employees
SET
  email = 'mariyan@digitalnosti.bg',
  position = 'PPC',
  hours_per_day = 8,
  monthly_hours = 160,
  vouchers = 102.26,
  bonus = 715.81
WHERE first_name = 'Мариян'
  AND last_name = 'Маринов';

-- Диан Трифонов
UPDATE public.employees
SET
  email = 'dean@digitalnosti.bg',
  position = 'Видео едитър',
  hours_per_day = 8,
  monthly_hours = 160,
  vouchers = 102.26,
  bonus = 715.81
WHERE first_name = 'Диан'
  AND last_name = 'Трифонов';

-- Петър Събев
UPDATE public.employees
SET
  email = 'petar@digitalnosti.bg',
  position = 'Мениджмънт',
  hours_per_day = 8,
  monthly_hours = 160,
  vouchers = 102.26,
  bonus = 1022.58
WHERE first_name = 'Петър'
  AND last_name = 'Събев';

-- Богомил Петров
UPDATE public.employees
SET
  email = 'bogomil@digitalnosti.bg',
  position = 'Младши дизайнер',
  hours_per_day = 6,
  monthly_hours = 120,
  vouchers = 102.26,
  bonus = 305.86
WHERE first_name = 'Богомил'
  AND last_name = 'Петров';

-- Кристияна Станева
UPDATE public.employees
SET
  email = 'contentcreator@digitalnosti.bg',
  position = 'Social media',
  hours_per_day = 4,
  monthly_hours = 80,
  vouchers = 102.26,
  bonus = 425.21
WHERE first_name = 'Кристияна'
  AND last_name = 'Станева';

COMMIT;

