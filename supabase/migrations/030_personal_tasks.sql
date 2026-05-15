-- Personal tasks module (private per employee/user).

create extension if not exists pgcrypto;

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title text not null,
  details text,
  due_date date,
  is_important boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_tasks_employee_id on public.personal_tasks(employee_id);
create index if not exists idx_personal_tasks_due_date on public.personal_tasks(due_date);
create index if not exists idx_personal_tasks_completed_at on public.personal_tasks(completed_at);

create or replace function public.set_personal_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_personal_tasks_updated_at on public.personal_tasks;
create trigger trg_personal_tasks_updated_at
before update on public.personal_tasks
for each row
execute function public.set_personal_tasks_updated_at();

alter table public.personal_tasks enable row level security;

drop policy if exists "personal_tasks_select_own" on public.personal_tasks;
create policy "personal_tasks_select_own"
on public.personal_tasks
for select
using (
  exists (
    select 1
    from public.employees e
    where e.id = personal_tasks.employee_id
      and (
        e.auth_user_id = auth.uid()
        or lower(e.email) = lower(auth.email())
      )
  )
);

drop policy if exists "personal_tasks_insert_own" on public.personal_tasks;
create policy "personal_tasks_insert_own"
on public.personal_tasks
for insert
with check (
  exists (
    select 1
    from public.employees e
    where e.id = personal_tasks.employee_id
      and (
        e.auth_user_id = auth.uid()
        or lower(e.email) = lower(auth.email())
      )
  )
);

drop policy if exists "personal_tasks_update_own" on public.personal_tasks;
create policy "personal_tasks_update_own"
on public.personal_tasks
for update
using (
  exists (
    select 1
    from public.employees e
    where e.id = personal_tasks.employee_id
      and (
        e.auth_user_id = auth.uid()
        or lower(e.email) = lower(auth.email())
      )
  )
)
with check (
  exists (
    select 1
    from public.employees e
    where e.id = personal_tasks.employee_id
      and (
        e.auth_user_id = auth.uid()
        or lower(e.email) = lower(auth.email())
      )
  )
);

drop policy if exists "personal_tasks_delete_own" on public.personal_tasks;
create policy "personal_tasks_delete_own"
on public.personal_tasks
for delete
using (
  exists (
    select 1
    from public.employees e
    where e.id = personal_tasks.employee_id
      and (
        e.auth_user_id = auth.uid()
        or lower(e.email) = lower(auth.email())
      )
  )
);
