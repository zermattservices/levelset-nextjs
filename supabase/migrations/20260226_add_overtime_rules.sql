-- Add state column to locations for overtime rule lookups,
-- and create overtime_rules table with seed data for top CFA states.
--
-- Overtime rules are state-based (not org-configurable).
-- Top states by CFA location count (covering ~50%):
--   TX (15.7%), GA (8.6%), FL (8.3%), CA (7.0%), NC (6.0%), VA (~4.5%)
-- All follow federal FLSA (>40hrs/week = 1.5x) except California,
-- which adds daily overtime (>8hrs = 1.5x, >12hrs = 2.0x).

-- 1. Add state column to locations
ALTER TABLE locations ADD COLUMN IF NOT EXISTS state TEXT;

-- 2. Create overtime_rules table
CREATE TABLE overtime_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('daily', 'weekly', 'seventh_consecutive_day')),
  threshold_hours NUMERIC NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 1.5,
  priority INT NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one active rule per state/type/threshold combo
CREATE UNIQUE INDEX idx_overtime_rules_unique
  ON overtime_rules (state_code, rule_type, threshold_hours)
  WHERE is_active = true;

-- Index for fast lookup by state
CREATE INDEX idx_overtime_rules_state ON overtime_rules (state_code) WHERE is_active = true;

-- Enable RLS
ALTER TABLE overtime_rules ENABLE ROW LEVEL SECURITY;

-- Service-role-only policy (overtime rules are system-managed, not user-editable)
CREATE POLICY "Service role access only"
  ON overtime_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 3. Seed default overtime rules

-- Federal FLSA default (applies to any state without specific rules: TX, GA, FL, NC, VA, etc.)
INSERT INTO overtime_rules (state_code, rule_type, threshold_hours, multiplier, priority, description)
VALUES ('_default', 'weekly', 40, 1.5, 0, 'Federal FLSA: 1.5x after 40 hours/week');

-- California-specific rules
INSERT INTO overtime_rules (state_code, rule_type, threshold_hours, multiplier, priority, description)
VALUES
  ('CA', 'daily', 8, 1.5, 10, 'California: 1.5x after 8 hours/day'),
  ('CA', 'daily', 12, 2.0, 20, 'California: 2x after 12 hours/day'),
  ('CA', 'weekly', 40, 1.5, 0, 'California: 1.5x after 40 hours/week');
