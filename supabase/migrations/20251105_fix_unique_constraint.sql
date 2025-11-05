-- Fix UNIQUE constraint on recommended_disc_actions
-- The original constraint included created_at, which allowed duplicates
-- We need to enforce uniqueness based only on employee, action, org, and location

-- Drop the old constraint
ALTER TABLE recommended_disc_actions 
DROP CONSTRAINT IF EXISTS recommended_disc_actions_employee_id_recommended_action_id_org_;

-- Add new constraint without created_at
-- Only allow one pending recommendation per employee/action/org/location combination
ALTER TABLE recommended_disc_actions
ADD CONSTRAINT recommended_disc_actions_unique_pending
UNIQUE (employee_id, recommended_action_id, org_id, location_id)
WHERE (action_taken IS NULL);

-- Note: This is a partial unique index that only enforces uniqueness for pending recommendations
-- Once a recommendation is dismissed or actioned, a new one can be created if needed

