CREATE TABLE IF NOT EXISTS hs_position_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  hs_job_id BIGINT NOT NULL,
  hs_job_name TEXT NOT NULL,
  hs_role_id BIGINT,
  hs_role_name TEXT,
  position_id UUID REFERENCES org_positions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, hs_job_id)
);

ALTER TABLE hs_position_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON hs_position_mappings FOR ALL USING (true);

CREATE INDEX idx_hs_position_mappings_location ON hs_position_mappings(location_id);
CREATE INDEX idx_hs_position_mappings_org ON hs_position_mappings(org_id);
