-- Fix disciplinary recommendation functions to check org-level settings when location-level settings don't exist
-- The disc_actions_rubric table can have settings at:
-- 1. Location level: org_id = X, location_id = Y (specific to a location)
-- 2. Org level: org_id = X, location_id = NULL (applies to all locations in org)

CREATE OR REPLACE FUNCTION generate_disciplinary_recommendations(
  p_org_id UUID,
  p_location_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee RECORD;
  v_current_points INTEGER;
  v_highest_threshold RECORD;
  v_ninety_days_ago DATE;
  v_highest_recorded_threshold INTEGER;
  v_use_org_level BOOLEAN;
BEGIN
  v_ninety_days_ago := CURRENT_DATE - INTERVAL '90 days';

  -- Check if location-specific settings exist, otherwise use org-level
  SELECT NOT EXISTS (
    SELECT 1 FROM disc_actions_rubric 
    WHERE org_id = p_org_id AND location_id = p_location_id
  ) INTO v_use_org_level;

  DELETE FROM recommended_disc_actions
  WHERE org_id = p_org_id
    AND location_id = p_location_id
    AND action_taken IS NULL;

  FOR v_employee IN
    SELECT id
    FROM employees
    WHERE org_id = p_org_id
      AND location_id = p_location_id
      AND active = true
  LOOP
    SELECT COALESCE(SUM(points), 0)
    INTO v_current_points
    FROM infractions
    WHERE employee_id = v_employee.id
      AND org_id = p_org_id
      AND location_id = p_location_id
      AND infraction_date >= v_ninety_days_ago;

    IF v_current_points <= 0 THEN
      CONTINUE;
    END IF;

    -- Look up threshold based on whether we use org or location level settings
    IF v_use_org_level THEN
      SELECT *
      INTO v_highest_threshold
      FROM disc_actions_rubric
      WHERE org_id = p_org_id
        AND location_id IS NULL
        AND points_threshold <= v_current_points
      ORDER BY points_threshold DESC
      LIMIT 1;
    ELSE
      SELECT *
      INTO v_highest_threshold
      FROM disc_actions_rubric
      WHERE org_id = p_org_id
        AND location_id = p_location_id
        AND points_threshold <= v_current_points
      ORDER BY points_threshold DESC
      LIMIT 1;
    END IF;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(r.points_threshold), 0)
    INTO v_highest_recorded_threshold
    FROM disc_actions da
    LEFT JOIN disc_actions_rubric r ON da.action_id = r.id
    WHERE da.employee_id = v_employee.id
      AND da.org_id = p_org_id
      AND da.location_id = p_location_id;

    IF v_highest_recorded_threshold = 0 THEN
      SELECT COALESCE(MAX(r.points_threshold), 0)
      INTO v_highest_recorded_threshold
      FROM disc_actions da
      JOIN disc_actions_rubric r
        ON LOWER(r.action) = LOWER(da.action)
      WHERE da.employee_id = v_employee.id
        AND da.org_id = p_org_id
        AND da.location_id = p_location_id;
    END IF;

    IF v_highest_recorded_threshold >= COALESCE(v_highest_threshold.points_threshold, 0) THEN
      CONTINUE;
    END IF;

    INSERT INTO recommended_disc_actions (
      employee_id,
      org_id,
      location_id,
      recommended_action_id,
      recommended_action,
      points_when_recommended
    )
    VALUES (
      v_employee.id,
      p_org_id,
      p_location_id,
      v_highest_threshold.id,
      v_highest_threshold.action,
      v_current_points
    )
    ON CONFLICT (employee_id, recommended_action_id, org_id, location_id, created_at)
    DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_recommendations_for_employee(
  p_employee_id UUID,
  p_org_id UUID,
  p_location_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points INTEGER;
  v_highest_threshold RECORD;
  v_ninety_days_ago DATE;
  v_highest_recorded_threshold INTEGER;
  v_use_org_level BOOLEAN;
BEGIN
  v_ninety_days_ago := CURRENT_DATE - INTERVAL '90 days';

  -- Check if location-specific settings exist, otherwise use org-level
  SELECT NOT EXISTS (
    SELECT 1 FROM disc_actions_rubric 
    WHERE org_id = p_org_id AND location_id = p_location_id
  ) INTO v_use_org_level;

  DELETE FROM recommended_disc_actions
  WHERE employee_id = p_employee_id
    AND org_id = p_org_id
    AND location_id = p_location_id
    AND action_taken IS NULL;

  SELECT COALESCE(SUM(points), 0)
  INTO v_current_points
  FROM infractions
  WHERE employee_id = p_employee_id
    AND org_id = p_org_id
    AND location_id = p_location_id
    AND infraction_date >= v_ninety_days_ago;

  IF v_current_points <= 0 THEN
    RETURN;
  END IF;

  -- Look up threshold based on whether we use org or location level settings
  IF v_use_org_level THEN
    SELECT *
    INTO v_highest_threshold
    FROM disc_actions_rubric
    WHERE org_id = p_org_id
      AND location_id IS NULL
      AND points_threshold <= v_current_points
    ORDER BY points_threshold DESC
    LIMIT 1;
  ELSE
    SELECT *
    INTO v_highest_threshold
    FROM disc_actions_rubric
    WHERE org_id = p_org_id
      AND location_id = p_location_id
      AND points_threshold <= v_current_points
    ORDER BY points_threshold DESC
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(MAX(r.points_threshold), 0)
  INTO v_highest_recorded_threshold
  FROM disc_actions da
  LEFT JOIN disc_actions_rubric r ON da.action_id = r.id
  WHERE da.employee_id = p_employee_id
    AND da.org_id = p_org_id
    AND da.location_id = p_location_id;

  IF v_highest_recorded_threshold = 0 THEN
    SELECT COALESCE(MAX(r.points_threshold), 0)
    INTO v_highest_recorded_threshold
    FROM disc_actions da
    JOIN disc_actions_rubric r
      ON LOWER(r.action) = LOWER(da.action)
    WHERE da.employee_id = p_employee_id
      AND da.org_id = p_org_id
      AND da.location_id = p_location_id;
  END IF;

  IF v_highest_recorded_threshold >= COALESCE(v_highest_threshold.points_threshold, 0) THEN
    RETURN;
  END IF;

  INSERT INTO recommended_disc_actions (
    employee_id,
    org_id,
    location_id,
    recommended_action_id,
    recommended_action,
    points_when_recommended
  )
  VALUES (
    p_employee_id,
    p_org_id,
    p_location_id,
    v_highest_threshold.id,
    v_highest_threshold.action,
    v_current_points
  )
  ON CONFLICT (employee_id, recommended_action_id, org_id, location_id, created_at)
  DO NOTHING;
END;
$$;

-- Regenerate all recommendations with the updated logic
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT org_id, id AS location_id FROM locations LOOP
    PERFORM generate_disciplinary_recommendations(rec.org_id, rec.location_id);
  END LOOP;
END $$;
