-- Google reviews synced from Places API for each location
-- Future-proofed for Levi AI analysis and employee pillar scoring

CREATE TABLE IF NOT EXISTS google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Google review identifier (unique resource name for deduplication)
  google_review_name TEXT NOT NULL,

  -- Author info
  author_name TEXT,
  author_photo_url TEXT,
  author_uri TEXT,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_language TEXT,
  original_text TEXT,
  original_language TEXT,

  -- Timing
  publish_time TIMESTAMPTZ NOT NULL,
  relative_time_description TEXT,

  -- Google Maps link to the review
  google_maps_uri TEXT,

  -- Sync metadata
  first_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Future: Levi AI analysis fields
  mentioned_employee_ids JSONB DEFAULT '[]',
  sentiment_score NUMERIC(3,2),
  ai_summary TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  ai_tags JSONB DEFAULT '[]',

  -- Future: Pillar scoring
  pillar_score_applied BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(location_id, google_review_name)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_google_reviews_location_time
ON google_reviews(location_id, publish_time DESC);

CREATE INDEX IF NOT EXISTS idx_google_reviews_org
ON google_reviews(org_id);

CREATE INDEX IF NOT EXISTS idx_google_reviews_location_rating
ON google_reviews(location_id, rating);

-- Partial indexes for future AI/scoring workflows
CREATE INDEX IF NOT EXISTS idx_google_reviews_unanalyzed
ON google_reviews(ai_analyzed_at) WHERE ai_analyzed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_google_reviews_pillar_unapplied
ON google_reviews(pillar_score_applied) WHERE pillar_score_applied = false;

ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_reviews_select" ON google_reviews
  FOR SELECT USING (true);

CREATE POLICY "google_reviews_insert" ON google_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "google_reviews_update" ON google_reviews
  FOR UPDATE USING (true);

CREATE POLICY "google_reviews_delete" ON google_reviews
  FOR DELETE USING (true);
