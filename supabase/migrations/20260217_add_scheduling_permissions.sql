-- Migration: Add Scheduling permission module
-- For scheduling settings access control

-- Insert the Scheduling module (order 11, after Billing)
INSERT INTO permission_modules (key, name, description, display_order, is_active)
VALUES ('scheduling', 'Scheduling', 'Schedule configuration, break rules, and position setup', 11, true)
ON CONFLICT (key) DO NOTHING;

-- Insert sub-items: view_schedule
INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT m.id, 'view_schedule', 'View Schedule', 'Access to view the scheduling dashboard', 1
FROM permission_modules m WHERE m.key = 'scheduling'
ON CONFLICT (module_id, key) DO NOTHING;

-- Insert sub-items: manage_schedule
INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT m.id, 'manage_schedule', 'Manage Schedule', 'Create, edit, and publish schedules', 2
FROM permission_modules m WHERE m.key = 'scheduling'
ON CONFLICT (module_id, key) DO NOTHING;

-- Insert sub-items: manage_settings
INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT m.id, 'manage_settings', 'Manage Scheduling Settings', 'Configure break rules, position setup, and scheduling preferences', 3
FROM permission_modules m WHERE m.key = 'scheduling'
ON CONFLICT (module_id, key) DO NOTHING;

-- Enable permissions for all existing permission profiles
-- Hierarchy levels 0 and 1 get enabled by default
INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
SELECT
  pp.id AS profile_id,
  psi.id AS sub_item_id,
  CASE WHEN pp.hierarchy_level <= 1 THEN true ELSE false END AS is_enabled
FROM permission_profiles pp
CROSS JOIN permission_sub_items psi
WHERE psi.module_id = (SELECT id FROM permission_modules WHERE key = 'scheduling')
ON CONFLICT (profile_id, sub_item_id) DO NOTHING;
