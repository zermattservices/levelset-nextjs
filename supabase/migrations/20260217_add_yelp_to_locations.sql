-- Add Yelp business fields to locations table
-- Enables automatic Yelp matching when a Google Place is connected

ALTER TABLE locations ADD COLUMN IF NOT EXISTS yelp_biz_id TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS yelp_business_url TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS yelp_rating NUMERIC(2,1);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS yelp_review_count INTEGER;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS yelp_last_synced_at TIMESTAMPTZ;

-- A Yelp business should only be linked to one location
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_yelp_biz_id
ON locations(yelp_biz_id) WHERE yelp_biz_id IS NOT NULL;
