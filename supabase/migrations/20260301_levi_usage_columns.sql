-- Add orchestrator-worker pipeline tracking columns to levi_usage_log.
-- Existing model/input_tokens/output_tokens/cost_usd become totals for backward compat.
-- New columns track per-component breakdown for the pipeline architecture.

ALTER TABLE levi_usage_log
  ADD COLUMN IF NOT EXISTS orchestrator_model TEXT,
  ADD COLUMN IF NOT EXISTS orchestrator_input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS orchestrator_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS orchestrator_cost_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS worker_model TEXT,
  ADD COLUMN IF NOT EXISTS worker_input_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS worker_output_tokens INTEGER,
  ADD COLUMN IF NOT EXISTS worker_cost_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS tool_count INTEGER,
  ADD COLUMN IF NOT EXISTS tool_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS fallback BOOLEAN DEFAULT false;
