-- Create termination_reasons table for org-customizable termination reasons
-- Replaces hardcoded termination reason options in RosterTable.tsx
-- Supports categories (Voluntary/Involuntary/Other) for retention analytics

CREATE TABLE IF NOT EXISTS termination_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Voluntary', 'Involuntary', 'Other')),
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, reason)
);

CREATE INDEX IF NOT EXISTS idx_termination_reasons_org ON termination_reasons(org_id);
CREATE INDEX IF NOT EXISTS idx_termination_reasons_org_active ON termination_reasons(org_id, active);

ALTER TABLE termination_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "termination_reasons_select" ON termination_reasons FOR SELECT USING (true);
CREATE POLICY "termination_reasons_insert" ON termination_reasons FOR INSERT WITH CHECK (true);
CREATE POLICY "termination_reasons_update" ON termination_reasons FOR UPDATE USING (true);
CREATE POLICY "termination_reasons_delete" ON termination_reasons FOR DELETE USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_termination_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_termination_reasons_updated_at
  BEFORE UPDATE ON termination_reasons
  FOR EACH ROW EXECUTE FUNCTION update_termination_reasons_updated_at();
