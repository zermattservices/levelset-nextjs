-- Structured business hours from Google Maps for each location
-- Supports multiple open/close periods per day (e.g., lunch & dinner)

CREATE TABLE IF NOT EXISTS location_business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday (matches Google Places API)
  open_hour INTEGER NOT NULL CHECK (open_hour >= 0 AND open_hour <= 23),
  open_minute INTEGER NOT NULL CHECK (open_minute >= 0 AND open_minute <= 59),
  close_hour INTEGER NOT NULL CHECK (close_hour >= 0 AND close_hour <= 23),
  close_minute INTEGER NOT NULL CHECK (close_minute >= 0 AND close_minute <= 59),
  period_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, day_of_week, period_index)
);

CREATE INDEX IF NOT EXISTS idx_location_business_hours_location
ON location_business_hours(location_id);

ALTER TABLE location_business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_business_hours_select" ON location_business_hours
  FOR SELECT USING (true);

CREATE POLICY "location_business_hours_insert" ON location_business_hours
  FOR INSERT WITH CHECK (true);

CREATE POLICY "location_business_hours_update" ON location_business_hours
  FOR UPDATE USING (true);

CREATE POLICY "location_business_hours_delete" ON location_business_hours
  FOR DELETE USING (true);
