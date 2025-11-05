-- Fix action_taken_by to reference app_users instead of employees

-- Drop existing foreign key constraint
ALTER TABLE recommended_disc_actions
DROP CONSTRAINT IF EXISTS recommended_disc_actions_action_taken_by_fkey;

-- Add correct foreign key to app_users table
ALTER TABLE recommended_disc_actions
ADD CONSTRAINT recommended_disc_actions_action_taken_by_fkey
FOREIGN KEY (action_taken_by)
REFERENCES app_users(id)
ON DELETE SET NULL;

