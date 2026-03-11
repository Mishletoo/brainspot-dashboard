create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  invoice_number text not null,
  amount numeric(12, 2) not null,
  issue_date date,
  due_date date,
  status text not null check (status in ('draft', 'sent', 'waiting', 'paid', 'overdue')),
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_invoices_client_id on public.invoices(client_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_due_date on public.invoices(due_date);
