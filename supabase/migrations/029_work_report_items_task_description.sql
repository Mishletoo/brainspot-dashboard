-- Allow free-text task entry in work reports while preserving legacy task_id links.

alter table public.work_report_items
  add column if not exists task_description text;

alter table public.work_report_items
  alter column task_id drop not null;
