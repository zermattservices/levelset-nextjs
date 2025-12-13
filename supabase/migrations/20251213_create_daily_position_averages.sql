-- Create table to store daily position averages for historical tracking
CREATE TABLE daily_position_averages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  calculation_date DATE NOT NULL,
  position_averages JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per employee per day
  UNIQUE(employee_id, calculation_date)
);

-- Indexes for efficient queries
CREATE INDEX idx_daily_avg_employee_date ON daily_position_averages(employee_id, calculation_date DESC);
CREATE INDEX idx_daily_avg_location_date ON daily_position_averages(location_id, calculation_date DESC);
CREATE INDEX idx_daily_avg_date ON daily_position_averages(calculation_date DESC);

-- RLS policies
ALTER TABLE daily_position_averages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily averages for their org"
ON daily_position_averages FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
  )
);

-- Add comment for documentation
COMMENT ON TABLE daily_position_averages IS 'Stores daily rolling-4 position averages for all employees. Used for historical tracking and faster evaluation lookups.';
COMMENT ON COLUMN daily_position_averages.position_averages IS 'JSONB object containing position:average pairs (e.g., {"iPOS": 2.95, "Host": 2.80})';

