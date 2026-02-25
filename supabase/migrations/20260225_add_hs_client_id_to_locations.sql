ALTER TABLE locations ADD COLUMN IF NOT EXISTS hs_client_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_hs_client_id
  ON locations(hs_client_id) WHERE hs_client_id IS NOT NULL;
