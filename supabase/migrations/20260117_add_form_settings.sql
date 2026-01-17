-- Migration: Add form settings columns
-- For PE form settings (require comments) and discipline infraction signature requirements

-- Add require_rating_comments to org_feature_toggles for PE form settings
ALTER TABLE org_feature_toggles 
ADD COLUMN IF NOT EXISTS require_rating_comments BOOLEAN DEFAULT false;

COMMENT ON COLUMN org_feature_toggles.require_rating_comments IS 'When true, the additional comments field is required when submitting positional ratings';

-- Add signature requirement columns to infractions_rubric
ALTER TABLE infractions_rubric 
ADD COLUMN IF NOT EXISTS require_tm_signature BOOLEAN DEFAULT false;

ALTER TABLE infractions_rubric 
ADD COLUMN IF NOT EXISTS require_leader_signature BOOLEAN DEFAULT false;

COMMENT ON COLUMN infractions_rubric.require_tm_signature IS 'When true, team member signature is required for this infraction type';
COMMENT ON COLUMN infractions_rubric.require_leader_signature IS 'When true, leader signature is required for this infraction type';

