-- Add Google Maps / Places API fields to locations table
-- Enables location-level Google Maps integration for hours, reviews, and geolocation

ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_rating NUMERIC(2,1);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_review_count INTEGER;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_hours_display JSONB;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS google_last_synced_at TIMESTAMPTZ;

-- Unique index: a Google Place should only be linked to one location
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_google_place_id
ON locations(google_place_id) WHERE google_place_id IS NOT NULL;
