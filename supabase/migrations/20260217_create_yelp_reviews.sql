-- Yelp reviews synced via Outscraper for each location
-- Mirrors google_reviews structure for unified AI analysis

CREATE TABLE IF NOT EXISTS yelp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,

  -- Yelp review identifier (unique key for deduplication)
  yelp_review_id TEXT NOT NULL,

  -- Author info
  author_name TEXT,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  review_photos JSONB DEFAULT '[]',
  review_tags JSONB DEFAULT '[]',
  owner_replies JSONB DEFAULT '[]',

  -- Timing
  publish_time TIMESTAMPTZ,

  -- Sync metadata
  first_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- AI analysis fields (same as google_reviews for unified analysis)
  mentioned_employee_ids JSONB DEFAULT '[]',
  sentiment_score NUMERIC(3,2),
  ai_summary TEXT,
  ai_analyzed_at TIMESTAMPTZ,
  ai_tags JSONB DEFAULT '[]',

  -- Pillar scoring
  pillar_score_applied BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(location_id, yelp_review_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_yelp_reviews_location_time
ON yelp_reviews(location_id, publish_time DESC);

CREATE INDEX IF NOT EXISTS idx_yelp_reviews_org
ON yelp_reviews(org_id);

CREATE INDEX IF NOT EXISTS idx_yelp_reviews_location_rating
ON yelp_reviews(location_id, rating);

-- Partial indexes for AI/scoring workflows
CREATE INDEX IF NOT EXISTS idx_yelp_reviews_unanalyzed
ON yelp_reviews(ai_analyzed_at) WHERE ai_analyzed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_yelp_reviews_pillar_unapplied
ON yelp_reviews(pillar_score_applied) WHERE pillar_score_applied = false;

ALTER TABLE yelp_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "yelp_reviews_select" ON yelp_reviews
  FOR SELECT USING (true);

CREATE POLICY "yelp_reviews_insert" ON yelp_reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "yelp_reviews_update" ON yelp_reviews
  FOR UPDATE USING (true);

CREATE POLICY "yelp_reviews_delete" ON yelp_reviews
  FOR DELETE USING (true);
