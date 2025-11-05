-- Create recommended_actions table to track disciplinary action recommendations
CREATE TABLE IF NOT EXISTS recommended_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  action_id UUID NOT NULL REFERENCES disc_actions_rubric(id) ON DELETE CASCADE,
  points_threshold INTEGER NOT NULL,
  employee_points INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES employees(id),
  action_taken_id UUID REFERENCES disc_actions(id),
  action_taken_at TIMESTAMP WITH TIME ZONE,
  action_taken_by UUID REFERENCES employees(id),
  created_by UUID REFERENCES employees(id),
  CONSTRAINT unique_pending_recommendation UNIQUE (employee_id, action_id, org_id, location_id) WHERE acknowledged_at IS NULL AND action_taken_at IS NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_recommended_actions_employee ON recommended_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_recommended_actions_org_location ON recommended_actions(org_id, location_id);
CREATE INDEX IF NOT EXISTS idx_recommended_actions_pending ON recommended_actions(org_id, location_id) WHERE acknowledged_at IS NULL AND action_taken_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_recommended_actions_action_id ON recommended_actions(action_id);

-- Add comments for documentation
COMMENT ON TABLE recommended_actions IS 'Tracks recommended disciplinary actions for employees based on point thresholds';
COMMENT ON COLUMN recommended_actions.employee_id IS 'The employee who needs disciplinary action';
COMMENT ON COLUMN recommended_actions.action_id IS 'Reference to the recommended action from disc_actions_rubric';
COMMENT ON COLUMN recommended_actions.points_threshold IS 'The point threshold that triggered this recommendation';
COMMENT ON COLUMN recommended_actions.employee_points IS 'The employee point total when recommendation was created';
COMMENT ON COLUMN recommended_actions.acknowledged_at IS 'When the recommendation was dismissed/ignored';
COMMENT ON COLUMN recommended_actions.acknowledged_by IS 'Employee who dismissed the recommendation';
COMMENT ON COLUMN recommended_actions.action_taken_id IS 'Reference to the disc_actions record if action was taken';
COMMENT ON COLUMN recommended_actions.action_taken_at IS 'When the disciplinary action was recorded';
COMMENT ON COLUMN recommended_actions.action_taken_by IS 'Employee who recorded the disciplinary action';
COMMENT ON COLUMN recommended_actions.created_by IS 'Employee who created this recommendation (system or user)';
