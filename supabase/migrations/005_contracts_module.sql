-- Migration: 005_contracts_module
-- Created: 2026-03-09
-- Description: Add contracts table connected to clients

BEGIN;

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients (id) ON DELETE CASCADE,
  contract_name text NOT NULL,
  contract_file text,
  signed_date date,
  start_date date,
  end_date date,
  notice_period_days integer,
  reminder_days integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON public.contracts (client_id);

COMMIT;
