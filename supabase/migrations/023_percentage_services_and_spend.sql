-- Migration: 023_percentage_services_and_spend
-- Created: 2026-03-17
-- Description: Add monthly spend storage for percentage services

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.client_service_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  spend numeric(12, 2) NOT NULL DEFAULT 0 CHECK (spend >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_service_spend_month
  ON public.client_service_spend (month);

CREATE INDEX IF NOT EXISTS idx_client_service_spend_client_id
  ON public.client_service_spend (client_id);

CREATE INDEX IF NOT EXISTS idx_client_service_spend_service_id
  ON public.client_service_spend (service_id);

CREATE OR REPLACE FUNCTION public.set_client_service_spend_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_service_spend_updated_at ON public.client_service_spend;

CREATE TRIGGER trg_client_service_spend_updated_at
BEFORE UPDATE ON public.client_service_spend
FOR EACH ROW
EXECUTE FUNCTION public.set_client_service_spend_updated_at();

COMMIT;
