-- Extend monthly_reports with explicit submission/lock metadata and richer statuses.
-- This keeps draft rows editable while allowing admin lock/unlock flows.

alter table public.monthly_reports
  add column if not exists submitted_at timestamptz;

alter table public.monthly_reports
  add column if not exists locked_at timestamptz;

alter table public.monthly_reports
  drop constraint if exists monthly_reports_status_check;

alter table public.monthly_reports
  add constraint monthly_reports_status_check
  check (
    status in (
      'draft',
      'submitted',
      'pending_review',
      'approved',
      'rejected',
      'edit_requested',
      'locked',
      'finalized'
    )
  );
