-- Seed evaluations permission module and sub-items into existing profiles
DO $$
DECLARE
  v_module_id UUID;
  v_sub_view_id UUID;
  v_sub_manage_id UUID;
  v_sub_conduct_id UUID;
  v_profile RECORD;
BEGIN
  -- Insert module
  INSERT INTO permission_modules (key, name, description, display_order)
  VALUES ('evaluations', 'Evaluations', 'Performance evaluation scheduling and management', 16)
  ON CONFLICT (key) DO NOTHING
  RETURNING id INTO v_module_id;

  IF v_module_id IS NULL THEN
    SELECT id INTO v_module_id FROM permission_modules WHERE key = 'evaluations';
  END IF;

  -- Insert sub-items
  INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
  VALUES (v_module_id, 'view_evaluations', 'View Evaluations', 'Access the evaluations page and view evaluations assigned to you', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_view_id;
  IF v_sub_view_id IS NULL THEN
    SELECT id INTO v_sub_view_id FROM permission_sub_items WHERE module_id = v_module_id AND key = 'view_evaluations';
  END IF;

  INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
  VALUES (v_module_id, 'manage_evaluations', 'Manage Evaluations', 'View all evaluations, configure schedule rules, and manage overrides', 2)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_manage_id;
  IF v_sub_manage_id IS NULL THEN
    SELECT id INTO v_sub_manage_id FROM permission_sub_items WHERE module_id = v_module_id AND key = 'manage_evaluations';
  END IF;

  INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
  VALUES (v_module_id, 'conduct_evaluations', 'Conduct Evaluations', 'Start and submit evaluation reviews for employees', 3)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_conduct_id;
  IF v_sub_conduct_id IS NULL THEN
    SELECT id INTO v_sub_conduct_id FROM permission_sub_items WHERE module_id = v_module_id AND key = 'conduct_evaluations';
  END IF;

  -- Grant all 3 permissions to system-default profiles at levels 0, 1, 2
  FOR v_profile IN
    SELECT id FROM permission_profiles
    WHERE is_system_default = true AND hierarchy_level IN (0, 1, 2)
  LOOP
    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_view_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;

    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_manage_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;

    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_conduct_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;
  END LOOP;
END $$;
