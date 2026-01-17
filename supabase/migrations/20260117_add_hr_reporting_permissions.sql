-- Migration: Add HR Reporting permission module
-- For HR Reporting feature access control

-- Insert the HR Reporting module
INSERT INTO permission_modules (key, name, description, display_order, is_active)
VALUES ('hr_reporting', 'HR Reporting', 'Access to HR reporting dashboards and reports', 9, true)
ON CONFLICT (key) DO NOTHING;

-- Insert the view_hr_reporting sub-item
INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT 
  m.id,
  'view_hr_reporting',
  'View HR Reporting',
  'Access to view HR reporting dashboards, discipline reports, and employee data',
  1
FROM permission_modules m
WHERE m.key = 'hr_reporting'
ON CONFLICT (module_id, key) DO NOTHING;

-- Enable the permission for all existing permission profiles at hierarchy levels 0 and 1
-- (Operators and Directors get access by default)
INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
SELECT 
  pp.id AS profile_id,
  psi.id AS sub_item_id,
  CASE WHEN pp.hierarchy_level <= 1 THEN true ELSE false END AS is_enabled
FROM permission_profiles pp
CROSS JOIN permission_sub_items psi
WHERE psi.key = 'view_hr_reporting'
  AND psi.module_id = (SELECT id FROM permission_modules WHERE key = 'hr_reporting')
ON CONFLICT (profile_id, sub_item_id) DO NOTHING;

