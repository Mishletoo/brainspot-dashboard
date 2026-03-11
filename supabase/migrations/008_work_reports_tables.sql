-- Work reports module tables
-- Creates monthly_reports and work_report_items if they do not exist.

create extension if not exists pgcrypto;

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  report_month integer not null,
  report_year integer not null,
  status text not null check (status in ('draft', 'submitted')),
  created_at timestamptz default now(),
  constraint monthly_reports_employee_month_year_unique unique (employee_id, report_month, report_year)
);

create table if not exists public.work_report_items (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null references public.monthly_reports(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete restrict,
  hours numeric(8,2) not null,
  notes text,
  task_status text not null check (task_status in ('waiting', 'started', 'in_progress', 'done')),
  created_at timestamptz default now()
);

-- Useful indexes for joins/filtering on list views and reports.
create index if not exists idx_monthly_reports_employee_id on public.monthly_reports(employee_id);
create index if not exists idx_monthly_reports_report_year_month on public.monthly_reports(report_year, report_month);
create index if not exists idx_monthly_reports_status on public.monthly_reports(status);

create index if not exists idx_work_report_items_monthly_report_id on public.work_report_items(monthly_report_id);
create index if not exists idx_work_report_items_client_id on public.work_report_items(client_id);
create index if not exists idx_work_report_items_service_id on public.work_report_items(service_id);
create index if not exists idx_work_report_items_task_id on public.work_report_items(task_id);
create index if not exists idx_work_report_items_task_status on public.work_report_items(task_status);
