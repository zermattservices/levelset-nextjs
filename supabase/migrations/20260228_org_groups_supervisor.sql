-- Add supervisor_group_id to org_groups for group-to-group reporting
-- Allows a role group (e.g. "FOH Team Members") to report to another
-- role group (e.g. "Shift Leaders"), creating edges on the org chart.

ALTER TABLE org_groups
  ADD COLUMN IF NOT EXISTS supervisor_group_id UUID REFERENCES org_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_groups_supervisor_group
  ON org_groups(supervisor_group_id) WHERE supervisor_group_id IS NOT NULL;
