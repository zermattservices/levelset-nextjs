-- Create rating_thresholds table for location-specific rating color coding thresholds

CREATE TABLE IF NOT EXISTS rating_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL UNIQUE,
  yellow_threshold NUMERIC(4, 2) NOT NULL DEFAULT 1.75,
  green_threshold NUMERIC(4, 2) NOT NULL DEFAULT 2.75,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_rating_thresholds_location 
    FOREIGN KEY (location_id) 
    REFERENCES locations(id) 
    ON DELETE CASCADE
);

-- Create index on location_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_rating_thresholds_location_id ON rating_thresholds(location_id);

-- Add comments for documentation
COMMENT ON TABLE rating_thresholds IS 'Location-specific thresholds for rating color coding (green/yellow/red)';
COMMENT ON COLUMN rating_thresholds.yellow_threshold IS 'Minimum rating value for yellow color (On the Rise). Default: 1.75';
COMMENT ON COLUMN rating_thresholds.green_threshold IS 'Minimum rating value for green color (Crushing It). Default: 2.75';

-- Insert default rows for all existing locations
INSERT INTO rating_thresholds (location_id, yellow_threshold, green_threshold)
SELECT 
  id,
  1.75,
  2.75
FROM locations
WHERE id NOT IN (SELECT location_id FROM rating_thresholds)
ON CONFLICT (location_id) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rating_thresholds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating_thresholds_updated_at
  BEFORE UPDATE ON rating_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_rating_thresholds_updated_at();

