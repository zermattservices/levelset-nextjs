-- Phase 2: Extend AI foundation tables for chat functionality

-- 1. Add tool support columns to ai_messages
ALTER TABLE ai_messages
  ADD COLUMN IF NOT EXISTS tool_calls JSONB,
  ADD COLUMN IF NOT EXISTS tool_call_id TEXT;

-- 2. Expand role CHECK constraint to include 'tool' role
ALTER TABLE ai_messages DROP CONSTRAINT IF EXISTS ai_messages_role_check;
ALTER TABLE ai_messages ADD CONSTRAINT ai_messages_role_check
  CHECK (role IN ('user', 'assistant', 'system', 'tool'));

-- 3. RLS policies for ai_conversations (service role full access)
CREATE POLICY "service_role_all" ON ai_conversations
  FOR ALL USING (true) WITH CHECK (true);

-- 4. RLS policies for ai_messages (service role full access)
CREATE POLICY "service_role_all" ON ai_messages
  FOR ALL USING (true) WITH CHECK (true);

-- 5. RLS policies for levi_config (service role full access)
CREATE POLICY "service_role_all" ON levi_config
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Create usage log table for token tracking and billing
CREATE TABLE levi_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id),
  conversation_id UUID REFERENCES ai_conversations(id),
  model TEXT NOT NULL,
  tier TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10,6),
  latency_ms INTEGER,
  escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usage_log_org_date ON levi_usage_log(org_id, created_at);
CREATE INDEX idx_usage_log_billing ON levi_usage_log(org_id, created_at, cost_usd);

ALTER TABLE levi_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON levi_usage_log
  FOR ALL USING (true) WITH CHECK (true);
