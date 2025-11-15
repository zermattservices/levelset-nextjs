create extension if not exists "uuid-ossp";

create table if not exists public.evaluations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  location_id uuid references public.locations (id) on delete set null,
  org_id uuid references public.orgs (id) on delete set null,
  employee_id uuid references public.employees (id) on delete cascade,
  leader_id uuid references public.employees (id) on delete set null,
  employee_name text not null,
  leader_name text,
  evaluation_date date,
  month text not null,
  role text,
  status text not null default 'Planned'
    check (status in ('Planned', 'Scheduled', 'Completed', 'Cancelled')),
  rating_status boolean not null default false,
  state_before text
    check (state_before is null or state_before in ('Not Certified', 'Pending', 'Certified', 'PIP')),
  state_after text
    check (state_after is null or state_after in ('Not Certified', 'Pending', 'Certified', 'PIP')),
  notes text
);

create index if not exists idx_evaluations_employee_id on public.evaluations (employee_id);
create index if not exists idx_evaluations_location_id on public.evaluations (location_id);
create index if not exists idx_evaluations_org_id on public.evaluations (org_id);

