-- Add location_id to ai_conversations so each location gets its own conversation thread.
-- Nullable for backward compat with existing rows (which were org-scoped only).

ALTER TABLE ai_conversations
  ADD COLUMN location_id UUID REFERENCES locations(id);

-- Replace the org+user index with one that includes location
DROP INDEX IF EXISTS idx_ai_conversations_org_user;
CREATE INDEX idx_ai_conversations_org_user_location
  ON ai_conversations(org_id, user_id, location_id);
