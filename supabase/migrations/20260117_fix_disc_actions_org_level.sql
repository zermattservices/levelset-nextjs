-- Migration: Fix disc_actions_rubric to be org-level for Reece Howard org
-- This moves location-specific entries to org-level so they apply to all locations

-- Move 04066 (Buda FSU) entries to org-level for Reece Howard org
UPDATE disc_actions_rubric
SET location_id = NULL
WHERE org_id = '54b9864f-9df9-4a15-a209-7b99e1c274f4'
  AND location_id = '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd';

