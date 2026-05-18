-- Ensure free-text task descriptions are available for work reports
-- and force PostgREST schema cache refresh after the change.

alter table public.work_report_items
  add column if not exists task_description text;

alter table public.work_report_items
  alter column task_id drop not null;

notify pgrst, 'reload schema';
