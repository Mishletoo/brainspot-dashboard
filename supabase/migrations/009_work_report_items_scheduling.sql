-- Add flexible scheduling fields to work_report_items.
-- All nullable so existing rows are unchanged.

alter table public.work_report_items
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists priority text;

-- Restrict priority to allowed values when set (null allowed).
alter table public.work_report_items
  drop constraint if exists work_report_items_priority_check;

alter table public.work_report_items
  add constraint work_report_items_priority_check
  check (priority is null or priority in ('low', 'normal', 'high', 'urgent'));
