-- Onboarding Tables Migration
-- Creates tables and columns needed for the self-service onboarding flow.

-- ============================================================
-- 1. CFA Location Directory (for store number lookup)
-- ============================================================

CREATE TABLE IF NOT EXISTS cfa_location_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT NOT NULL,
  location_number TEXT NOT NULL UNIQUE,
  operator_name TEXT,
  location_type TEXT,
  state TEXT,
  open_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfa_dir_location_number
  ON cfa_location_directory(location_number);

CREATE INDEX IF NOT EXISTS idx_cfa_dir_location_name
  ON cfa_location_directory USING gin(location_name gin_trgm_ops);

-- ============================================================
-- 2. Onboarding Sessions (progress tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  step_data JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_sessions_token
  ON onboarding_sessions(token);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_org_id
  ON onboarding_sessions(org_id);

-- ============================================================
-- 3. Add onboarding & trial columns to orgs
-- ============================================================

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS is_multi_unit BOOLEAN DEFAULT FALSE;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS trial_ai_query_limit INTEGER DEFAULT 50;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS trial_ai_queries_used INTEGER DEFAULT 0;
