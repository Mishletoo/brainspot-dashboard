-- Add start_date and end_date to work_report_items for application compatibility.
-- Uses IF NOT EXISTS so existing migrations (e.g. 009) or re-runs do not fail.
-- Columns are nullable so existing rows are unchanged.

alter table public.work_report_items
  add column if not exists start_date date;

alter table public.work_report_items
  add column if not exists end_date date;
