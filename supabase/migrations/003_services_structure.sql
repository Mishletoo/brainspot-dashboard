-- Migration: 003_services_structure
-- Created: 2026-03-09
-- Description: Add services catalog and client service terms

BEGIN;

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  pricing_type text NOT NULL CHECK (pricing_type IN ('one_time', 'monthly', 'percentage')),
  fixed_price numeric(12, 2),
  monthly_price numeric(12, 2),
  percentage_rate numeric(8, 4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_services_client_id ON public.client_services (client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_service_id ON public.client_services (service_id);
CREATE INDEX IF NOT EXISTS idx_client_services_pricing_type ON public.client_services (pricing_type);

COMMIT;
