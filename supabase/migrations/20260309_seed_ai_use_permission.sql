-- Seed AI_USE permission into existing system-default profiles at levels 0, 1, 2
-- This ensures existing orgs get the permission without re-running the seed script.

DO $$
DECLARE
  v_sub_item_id UUID;
  v_profile RECORD;
BEGIN
  -- Find the sub-item ID for ai_assistant.use_ai_assistant
  SELECT psi.id INTO v_sub_item_id
  FROM permission_sub_items psi
  JOIN permission_modules pm ON psi.module_id = pm.id
  WHERE pm.key = 'ai_assistant' AND psi.key = 'use_ai_assistant';

  -- If the sub-item doesn't exist yet, skip (seed script hasn't run)
  IF v_sub_item_id IS NULL THEN
    RAISE NOTICE 'ai_assistant.use_ai_assistant sub-item not found, skipping';
    RETURN;
  END IF;

  -- Insert into all system-default profiles at levels 0, 1, 2
  FOR v_profile IN
    SELECT id FROM permission_profiles
    WHERE is_system_default = true
      AND hierarchy_level IN (0, 1, 2)
  LOOP
    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_item_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;
  END LOOP;
END $$;
