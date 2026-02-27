-- Onboarding Expansion: Levi analysis tracking + invite system
-- Applied via Supabase MCP on 2026-02-26

-- Table for tracking Levi's document analysis results
CREATE TABLE IF NOT EXISTS onboarding_levi_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  extracted_infractions JSONB DEFAULT '[]',
  extracted_actions JSONB DEFAULT '[]',
  raw_response TEXT,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_levi_analysis_org ON onboarding_levi_analysis(org_id);

-- Table for tracking onboarding invites
CREATE TABLE IF NOT EXISTS onboarding_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID REFERENCES app_users(id),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_invites_org ON onboarding_invites(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_invites_token ON onboarding_invites(token);
