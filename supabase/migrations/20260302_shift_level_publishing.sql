-- Add per-shift publish tracking
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill: if the parent schedule is published, mark all its shifts as published too
UPDATE shifts s
SET published_at = sch.published_at
FROM schedules sch
WHERE s.schedule_id = sch.id
  AND sch.status = 'published'
  AND s.published_at IS NULL;

-- Index for finding unpublished shifts efficiently
CREATE INDEX IF NOT EXISTS idx_shifts_published_at ON shifts(schedule_id, published_at);
