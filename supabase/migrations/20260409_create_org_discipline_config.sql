-- Org-level discipline configuration
-- Stores per-org settings for discipline point calculations
create table org_discipline_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  points_reset_mode text not null default 'rolling_90'
    check (points_reset_mode in ('rolling_90', 'quarterly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

-- RLS not enabled — matches project convention where all tables rely on
-- service-role key for API routes and anon key for browser reads.
-- The table contains non-sensitive config data (reset mode only).
