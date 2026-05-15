-- Migration: 024_client_service_spend_unique_constraint
-- Created: 2026-03-23
-- Description: Ensure upsert key exists for client_service_spend

BEGIN;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY client_id, service_id, month
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.client_service_spend
)
DELETE FROM public.client_service_spend
WHERE id IN (
  SELECT id
  FROM ranked
  WHERE rn > 1
);

ALTER TABLE public.client_service_spend
  DROP CONSTRAINT IF EXISTS client_service_spend_client_service_month_key;

ALTER TABLE public.client_service_spend
  ADD CONSTRAINT client_service_spend_client_service_month_key
  UNIQUE (client_id, service_id, month);

COMMIT;
