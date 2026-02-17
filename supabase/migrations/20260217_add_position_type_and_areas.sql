-- Migration: Add position_type to org_positions and create scheduling_areas table

-- A. Add position_type to org_positions for scheduling-only positions
-- All existing positions default to 'standard' (backwards compatible)
ALTER TABLE org_positions
ADD COLUMN IF NOT EXISTS position_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (position_type IN ('standard', 'scheduling_only'));

-- B. Custom scheduling areas (beyond hardcoded FOH/BOH)
CREATE TABLE IF NOT EXISTS scheduling_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_scheduling_areas_org ON scheduling_areas(org_id);

ALTER TABLE scheduling_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduling_areas_select" ON scheduling_areas
  FOR SELECT USING (true);

CREATE POLICY "scheduling_areas_insert" ON scheduling_areas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "scheduling_areas_update" ON scheduling_areas
  FOR UPDATE USING (true);

CREATE POLICY "scheduling_areas_delete" ON scheduling_areas
  FOR DELETE USING (true);

-- C. Add optional area_id FK to org_positions (nullable; if null, falls back to zone)
ALTER TABLE org_positions
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES scheduling_areas(id) ON DELETE SET NULL;
