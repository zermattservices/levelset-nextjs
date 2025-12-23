-- Create user_location_access table to track which locations each user has access to
CREATE TABLE IF NOT EXISTS user_location_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_location_access_user ON user_location_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_access_location ON user_location_access(location_id);

-- Enable RLS
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_location_access
CREATE POLICY "user_location_access_select" ON user_location_access
  FOR SELECT USING (true);

CREATE POLICY "user_location_access_insert" ON user_location_access
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_location_access_update" ON user_location_access
  FOR UPDATE USING (true);

CREATE POLICY "user_location_access_delete" ON user_location_access
  FOR DELETE USING (true);

-- Populate initial data: give all existing users access to all locations in their org
INSERT INTO user_location_access (user_id, location_id)
SELECT DISTINCT au.id, l.id
FROM app_users au
JOIN locations l ON l.org_id = au.org_id
WHERE NOT EXISTS (
  SELECT 1 FROM user_location_access ula 
  WHERE ula.user_id = au.id AND ula.location_id = l.id
);
