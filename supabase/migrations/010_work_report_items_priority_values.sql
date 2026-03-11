-- Align priority allowed values with UI: low, normal, high, urgent.

alter table public.work_report_items
  drop constraint if exists work_report_items_priority_check;

alter table public.work_report_items
  add constraint work_report_items_priority_check
  check (priority is null or priority in ('low', 'normal', 'high', 'urgent'));
