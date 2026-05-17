-- Migration: 022_services_catalog_normalization
-- Created: 2026-03-23
-- Description: Normalize services catalog pricing setup and seed canonical services

BEGIN;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS pricing_type text,
  ADD COLUMN IF NOT EXISTS percentage_value numeric(8, 4);

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_pricing_type_check,
  DROP CONSTRAINT IF EXISTS services_percentage_value_check;

-- Legacy state used "fixed". Map to the new normalized type vocabulary.
UPDATE public.services
SET pricing_type = 'one_time'
WHERE pricing_type = 'fixed';

-- Keep names normalized to avoid near-duplicate entries (leading/trailing spaces).
UPDATE public.services
SET name = btrim(name)
WHERE name <> btrim(name);

-- Normalize known legacy naming variants before deduplication.
DO $$
DECLARE
  canonical_id uuid;
BEGIN
  SELECT id INTO canonical_id
  FROM public.services
  WHERE lower(btrim(name)) = lower('Изработка на уебсайт')
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF canonical_id IS NULL THEN
    UPDATE public.services
    SET name = 'Изработка на уебсайт'
    WHERE lower(btrim(name)) = lower('Изработка на Уеб Сайт');
  ELSE
    UPDATE public.client_services
    SET service_id = canonical_id
    WHERE service_id IN (
      SELECT id
      FROM public.services
      WHERE lower(btrim(name)) = lower('Изработка на Уеб Сайт')
    );

    IF to_regclass('public.work_report_items') IS NOT NULL THEN
      UPDATE public.work_report_items
      SET service_id = canonical_id
      WHERE service_id IN (
        SELECT id
        FROM public.services
        WHERE lower(btrim(name)) = lower('Изработка на Уеб Сайт')
      );
    END IF;

    DELETE FROM public.services
    WHERE lower(btrim(name)) = lower('Изработка на Уеб Сайт');
  END IF;
END
$$;

-- Collapse duplicates by normalized name and re-point references safely.
CREATE TEMP TABLE tmp_service_duplicates AS
SELECT duplicate_id, keep_id
FROM (
  SELECT
    id AS duplicate_id,
    first_value(id) OVER (
      PARTITION BY lower(btrim(name))
      ORDER BY created_at ASC, id ASC
    ) AS keep_id,
    row_number() OVER (
      PARTITION BY lower(btrim(name))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.services
) ranked
WHERE rn > 1;

UPDATE public.client_services AS cs
SET service_id = d.keep_id
FROM tmp_service_duplicates AS d
WHERE cs.service_id = d.duplicate_id;

DO $$
BEGIN
  IF to_regclass('public.work_report_items') IS NOT NULL THEN
    UPDATE public.work_report_items AS wri
    SET service_id = d.keep_id
    FROM tmp_service_duplicates AS d
    WHERE wri.service_id = d.duplicate_id;
  END IF;
END
$$;

DELETE FROM public.services AS s
USING tmp_service_duplicates AS d
WHERE s.id = d.duplicate_id;

DROP TABLE tmp_service_duplicates;

-- Canonical catalog with explicit pricing logic.
CREATE TEMP TABLE tmp_canonical_services (
  name text PRIMARY KEY,
  pricing_type text NOT NULL,
  percentage_value numeric(8, 4)
);

INSERT INTO tmp_canonical_services (name, pricing_type, percentage_value)
VALUES
  ('Meta Ads', 'percentage', 30),
  ('Google Ads', 'percentage', 30),
  ('Мениджмънт на социални мрежи', 'monthly', NULL),
  ('CRM / Automation', 'monthly', NULL),
  ('Консултация', 'monthly', NULL),
  ('Брандинг', 'one_time', NULL),
  ('Изработка на лого', 'one_time', NULL),
  ('Изработка на уебсайт', 'one_time', NULL),
  ('Изработка на лендинг страница', 'one_time', NULL),
  ('Снимачен ден', 'one_time', NULL);

DO $$
DECLARE
  item record;
  target_service_id uuid;
BEGIN
  FOR item IN SELECT * FROM tmp_canonical_services LOOP
    SELECT s.id
    INTO target_service_id
    FROM public.services AS s
    WHERE lower(btrim(s.name)) = lower(item.name)
    ORDER BY s.created_at ASC, s.id ASC
    LIMIT 1;

    IF target_service_id IS NULL THEN
      INSERT INTO public.services (name, pricing_type, percentage_value)
      VALUES (item.name, item.pricing_type, item.percentage_value)
      RETURNING id INTO target_service_id;
    ELSE
      UPDATE public.services
      SET
        name = item.name,
        pricing_type = item.pricing_type,
        percentage_value = item.percentage_value
      WHERE id = target_service_id;
    END IF;

    -- Ensure no duplicates remain after canonical naming update.
    UPDATE public.client_services AS cs
    SET service_id = target_service_id
    WHERE cs.service_id IN (
      SELECT s.id
      FROM public.services AS s
      WHERE lower(btrim(s.name)) = lower(item.name)
        AND s.id <> target_service_id
    );

    IF to_regclass('public.work_report_items') IS NOT NULL THEN
      UPDATE public.work_report_items AS wri
      SET service_id = target_service_id
      WHERE wri.service_id IN (
        SELECT s.id
        FROM public.services AS s
        WHERE lower(btrim(s.name)) = lower(item.name)
          AND s.id <> target_service_id
      );
    END IF;

    DELETE FROM public.services
    WHERE id IN (
      SELECT s.id
      FROM public.services AS s
      WHERE lower(btrim(s.name)) = lower(item.name)
        AND s.id <> target_service_id
    );
  END LOOP;
END
$$;

DROP TABLE tmp_canonical_services;

UPDATE public.services
SET pricing_type = 'one_time'
WHERE pricing_type IS NULL;

UPDATE public.services
SET percentage_value = NULL
WHERE pricing_type <> 'percentage';

ALTER TABLE public.services
  ADD CONSTRAINT services_pricing_type_check
  CHECK (pricing_type IN ('one_time', 'monthly', 'percentage'));

ALTER TABLE public.services
  ADD CONSTRAINT services_percentage_value_check
  CHECK (
    (pricing_type = 'percentage' AND percentage_value IS NOT NULL AND percentage_value > 0 AND percentage_value <= 100)
    OR
    (pricing_type IN ('one_time', 'monthly') AND percentage_value IS NULL)
  );

ALTER TABLE public.services
  ALTER COLUMN pricing_type SET DEFAULT 'one_time',
  ALTER COLUMN pricing_type SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_name_normalized
  ON public.services ((lower(btrim(name))));

COMMIT;
