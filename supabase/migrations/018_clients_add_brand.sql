-- Migration: 018_clients_add_brand
-- Description: Add brand column to clients table for public-facing name

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS brand text;

COMMIT;

