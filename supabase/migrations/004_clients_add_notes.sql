-- Migration: 004_clients_add_notes
-- Created: 2026-03-09
-- Description: Add notes column to clients table

BEGIN;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notes text;

COMMIT;
