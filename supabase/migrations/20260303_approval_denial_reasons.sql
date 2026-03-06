-- Migration: Approval Denial Reasons
-- Adds configurable denial reasons per org and links them to request tables.

-- ============================================================================
-- 1. Denial Reasons lookup table
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_denial_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('time_off', 'availability', 'shift_swap')),
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_denial_reasons_org_type ON approval_denial_reasons(org_id, request_type);

-- ============================================================================
-- 2. Add denial_reason_id and denial_message to request tables
-- ============================================================================
ALTER TABLE time_off_requests
  ADD COLUMN IF NOT EXISTS denial_reason_id UUID REFERENCES approval_denial_reasons(id),
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

ALTER TABLE availability_change_requests
  ADD COLUMN IF NOT EXISTS denial_reason_id UUID REFERENCES approval_denial_reasons(id),
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

ALTER TABLE shift_trade_requests
  ADD COLUMN IF NOT EXISTS denial_reason_id UUID REFERENCES approval_denial_reasons(id),
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

-- ============================================================================
-- 3. Seed default denial reasons for all existing orgs
-- ============================================================================

-- Time Off reasons
INSERT INTO approval_denial_reasons (org_id, request_type, label, display_order)
SELECT o.id, 'time_off', r.label, r.display_order
FROM orgs o
CROSS JOIN (VALUES
  ('Low staff', 1),
  ('Full on requests', 2),
  ('Other', 3)
) AS r(label, display_order)
ON CONFLICT DO NOTHING;

-- Availability reasons
INSERT INTO approval_denial_reasons (org_id, request_type, label, display_order)
SELECT o.id, 'availability', r.label, r.display_order
FROM orgs o
CROSS JOIN (VALUES
  ('Doesn''t fit business needs', 1),
  ('Probationary Period', 2),
  ('Other', 3)
) AS r(label, display_order)
ON CONFLICT DO NOTHING;

-- Shift Swap reasons
INSERT INTO approval_denial_reasons (org_id, request_type, label, display_order)
SELECT o.id, 'shift_swap', r.label, r.display_order
FROM orgs o
CROSS JOIN (VALUES
  ('Proficiency mismatch', 1),
  ('Would cause excessive overtime', 2),
  ('Other', 3)
) AS r(label, display_order)
ON CONFLICT DO NOTHING;
