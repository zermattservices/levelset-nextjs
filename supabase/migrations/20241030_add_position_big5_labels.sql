-- Create position_big5_labels table for storing Big 5 rating criteria labels per position
-- Each location can have unique Big 5 labels for each position

CREATE TABLE IF NOT EXISTS position_big5_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  location_id UUID NOT NULL,
  position TEXT NOT NULL,
  label_1 TEXT NOT NULL,
  label_2 TEXT NOT NULL,
  label_3 TEXT NOT NULL,
  label_4 TEXT NOT NULL,
  label_5 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, location_id, position)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_position_big5_location ON position_big5_labels(location_id);
CREATE INDEX IF NOT EXISTS idx_position_big5_org ON position_big5_labels(org_id);
CREATE INDEX IF NOT EXISTS idx_position_big5_position ON position_big5_labels(position);

-- Add comments for documentation
COMMENT ON TABLE position_big5_labels IS 'Stores the Big 5 rating criteria labels for each position at each location';
COMMENT ON COLUMN position_big5_labels.position IS 'Position name matching the ratings table position values';
COMMENT ON COLUMN position_big5_labels.label_1 IS 'First rating criteria label (e.g., Speed, Quality, etc.)';
COMMENT ON COLUMN position_big5_labels.label_2 IS 'Second rating criteria label';
COMMENT ON COLUMN position_big5_labels.label_3 IS 'Third rating criteria label';
COMMENT ON COLUMN position_big5_labels.label_4 IS 'Fourth rating criteria label';
COMMENT ON COLUMN position_big5_labels.label_5 IS 'Fifth rating criteria label';

