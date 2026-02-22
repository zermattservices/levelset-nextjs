-- Add agent_context column to roadmap_features
-- Stores internal implementation context for AI agents (Claude).
-- This field is NOT exposed in public-facing roadmap queries.

ALTER TABLE roadmap_features
ADD COLUMN agent_context text;
