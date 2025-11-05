-- Add foreign key constraint for org_id in recommended_disc_actions table
-- The org_id should reference the orgs table

ALTER TABLE recommended_disc_actions
ADD CONSTRAINT recommended_disc_actions_org_id_fkey
FOREIGN KEY (org_id)
REFERENCES orgs(id)
ON DELETE CASCADE;

-- Also verify/update the original table creation if needed
-- This ensures consistency across all discipline-related tables

