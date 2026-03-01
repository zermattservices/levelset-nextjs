-- The Approach 2026 — Event Funnel Page
-- Timeslot content table + leads table extensions

-- 1. Timeslot content (managed directly in Supabase)
CREATE TABLE the_approach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeslot_number INTEGER NOT NULL UNIQUE,
  day_label TEXT NOT NULL,
  time_range TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  badge_text TEXT,
  headline TEXT NOT NULL,
  subtext TEXT NOT NULL,
  feature_cards JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_the_approach_timeslot ON the_approach(timeslot_number);

-- Enable RLS
ALTER TABLE the_approach ENABLE ROW LEVEL SECURITY;

-- Public read access for the_approach (content is not sensitive)
CREATE POLICY "Public can read active timeslots"
  ON the_approach FOR SELECT
  USING (active = true);

-- 2. Extend existing leads table for The Approach form
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_operator BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Replace unique constraint on email with unique on (email, source)
-- so a person can be a lead from multiple sources
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_source ON leads(email, source);

-- Index for filtering by source (if not exists)
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
