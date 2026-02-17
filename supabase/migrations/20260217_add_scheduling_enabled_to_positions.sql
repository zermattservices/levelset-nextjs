-- Add scheduling_enabled to org_positions
-- Standard positions default to true (enabled for scheduling)
ALTER TABLE org_positions
ADD COLUMN IF NOT EXISTS scheduling_enabled BOOLEAN NOT NULL DEFAULT true;

-- Remove scheduling_enabled from scheduling_areas (areas don't have toggles)
ALTER TABLE scheduling_areas DROP COLUMN IF EXISTS scheduling_enabled;
