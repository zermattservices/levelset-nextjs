-- Migration: Create break_rules table for scheduling
-- Org-scoped rules: "X minute break for every Y hours of consecutive shift"

CREATE TABLE IF NOT EXISTS break_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  break_duration_minutes INTEGER NOT NULL CHECK (break_duration_minutes > 0),
  trigger_hours NUMERIC(4,2) NOT NULL CHECK (trigger_hours > 0),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_break_rules_org ON break_rules(org_id);

ALTER TABLE break_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "break_rules_select" ON break_rules
  FOR SELECT USING (true);

CREATE POLICY "break_rules_insert" ON break_rules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "break_rules_update" ON break_rules
  FOR UPDATE USING (true);

CREATE POLICY "break_rules_delete" ON break_rules
  FOR DELETE USING (true);
