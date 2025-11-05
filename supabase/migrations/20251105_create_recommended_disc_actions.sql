-- Create recommended_disc_actions table to track disciplinary action recommendations
CREATE TABLE IF NOT EXISTS recommended_disc_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  recommended_action_id UUID NOT NULL REFERENCES disc_actions_rubric(id) ON DELETE CASCADE,
  recommended_action TEXT NOT NULL,
  points_when_recommended INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action_taken TEXT CHECK (action_taken IN ('dismissed', 'action_recorded', NULL)),
  action_taken_at TIMESTAMP WITH TIME ZONE,
  action_taken_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  disc_action_id UUID REFERENCES disc_actions(id) ON DELETE SET NULL,
  UNIQUE(employee_id, recommended_action_id, org_id, location_id, created_at)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recommended_disc_actions_employee ON recommended_disc_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_recommended_disc_actions_org_location ON recommended_disc_actions(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_recommended_disc_actions_created ON recommended_disc_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_recommended_disc_actions_pending ON recommended_disc_actions(employee_id) WHERE action_taken IS NULL;

-- Add RLS policies
ALTER TABLE recommended_disc_actions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view recommendations for their org/location
CREATE POLICY "Users can view recommendations for their org/location"
  ON recommended_disc_actions
  FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM employees WHERE id = auth.uid())
    AND location_id IN (SELECT location_id FROM employees WHERE id = auth.uid())
  );

-- Policy: Users can insert recommendations
CREATE POLICY "Users can insert recommendations"
  ON recommended_disc_actions
  FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM employees WHERE id = auth.uid())
    AND location_id IN (SELECT location_id FROM employees WHERE id = auth.uid())
  );

-- Policy: Users can update recommendations for their org/location
CREATE POLICY "Users can update recommendations for their org/location"
  ON recommended_disc_actions
  FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM employees WHERE id = auth.uid())
    AND location_id IN (SELECT location_id FROM employees WHERE id = auth.uid())
  );

-- Policy: Users can delete recommendations for their org/location
CREATE POLICY "Users can delete recommendations for their org/location"
  ON recommended_disc_actions
  FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM employees WHERE id = auth.uid())
    AND location_id IN (SELECT location_id FROM employees WHERE id = auth.uid())
  );

