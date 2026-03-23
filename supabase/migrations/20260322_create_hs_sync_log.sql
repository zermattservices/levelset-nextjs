-- Sync attempt logging for HotSchedules sync
-- Captures every sync attempt including failures and crashes
-- for debugging (e.g., Manor FSU's failed sync left no trace before this)

CREATE TABLE IF NOT EXISTS hs_sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID REFERENCES locations(id),
  org_id UUID REFERENCES orgs(id),
  location_number TEXT,
  hs_client_id BIGINT,
  status TEXT NOT NULL DEFAULT 'started',     -- 'started', 'success', 'error', 'client_error'
  source TEXT,                                 -- 'bookmarklet', 'manual_paste', 'api'
  bookmarklet_version INT,
  error_message TEXT,
  request_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Query sync history for a specific location
CREATE INDEX idx_hs_sync_log_location ON hs_sync_log(location_id, created_at DESC);

-- Find crashed syncs (stuck in 'started' status)
CREATE INDEX idx_hs_sync_log_status ON hs_sync_log(status) WHERE status = 'started';
