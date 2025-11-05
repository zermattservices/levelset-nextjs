-- Create function to generate disciplinary action recommendations
-- This function will be called by a trigger or manually to populate the recommended_disc_actions table

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
  v_has_action BOOLEAN;
  v_ninety_days_ago DATE;
BEGIN
  -- Calculate 90 days ago
  v_ninety_days_ago := CURRENT_DATE - INTERVAL '90 days';
  
  -- Clear existing pending recommendations for this org/location
  DELETE FROM recommended_disc_actions
  WHERE org_id = p_org_id
    AND location_id = p_location_id
    AND action_taken IS NULL;
  
  -- Loop through all active employees
  FOR v_employee IN
    SELECT id, full_name, role
    FROM employees
    WHERE org_id = p_org_id
      AND location_id = p_location_id
      AND active = true
  LOOP
    -- Calculate current points from infractions in last 90 days
    SELECT COALESCE(SUM(points), 0)
    INTO v_current_points
    FROM infractions
    WHERE employee_id = v_employee.id
      AND org_id = p_org_id
      AND location_id = p_location_id
      AND infraction_date >= v_ninety_days_ago;
    
    -- Skip if no points
    IF v_current_points <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Find the highest threshold crossed
    SELECT *
    INTO v_highest_threshold
    FROM disc_actions_rubric
    WHERE org_id = p_org_id
      AND location_id = p_location_id
      AND points_threshold <= v_current_points
    ORDER BY points_threshold DESC
    LIMIT 1;
    
    -- Skip if no threshold crossed
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- Check if this action has already been recorded
    SELECT EXISTS (
      SELECT 1
      FROM disc_actions
      WHERE employee_id = v_employee.id
        AND org_id = p_org_id
        AND location_id = p_location_id
        AND (action_id = v_highest_threshold.id OR action = v_highest_threshold.action)
    ) INTO v_has_action;
    
    -- Only recommend if action hasn't been taken yet
    IF NOT v_has_action THEN
      -- Insert recommendation (ignore if already exists)
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
    END IF;
  END LOOP;
END;
$$;

-- Create function to refresh recommendations automatically
-- This can be called after infractions or disc_actions are modified

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
  v_has_action BOOLEAN;
  v_ninety_days_ago DATE;
BEGIN
  v_ninety_days_ago := CURRENT_DATE - INTERVAL '90 days';
  
  -- Clear existing pending recommendations for this employee
  DELETE FROM recommended_disc_actions
  WHERE employee_id = p_employee_id
    AND org_id = p_org_id
    AND location_id = p_location_id
    AND action_taken IS NULL;
  
  -- Calculate current points
  SELECT COALESCE(SUM(points), 0)
  INTO v_current_points
  FROM infractions
  WHERE employee_id = p_employee_id
    AND org_id = p_org_id
    AND location_id = p_location_id
    AND infraction_date >= v_ninety_days_ago;
  
  -- Skip if no points
  IF v_current_points <= 0 THEN
    RETURN;
  END IF;
  
  -- Find the highest threshold crossed
  SELECT *
  INTO v_highest_threshold
  FROM disc_actions_rubric
  WHERE org_id = p_org_id
    AND location_id = p_location_id
    AND points_threshold <= v_current_points
  ORDER BY points_threshold DESC
  LIMIT 1;
  
  -- Skip if no threshold crossed
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if action already recorded
  SELECT EXISTS (
    SELECT 1
    FROM disc_actions
    WHERE employee_id = p_employee_id
      AND org_id = p_org_id
      AND location_id = p_location_id
      AND (action_id = v_highest_threshold.id OR action = v_highest_threshold.action)
  ) INTO v_has_action;
  
  -- Only recommend if action hasn't been taken
  IF NOT v_has_action THEN
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
  END IF;
END;
$$;

-- Create trigger to refresh recommendations when infractions are added/updated
CREATE OR REPLACE FUNCTION trigger_refresh_recommendations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh recommendations for the affected employee
  PERFORM refresh_recommendations_for_employee(
    NEW.employee_id,
    NEW.org_id,
    NEW.location_id
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to infractions table
DROP TRIGGER IF EXISTS refresh_recommendations_on_infraction ON infractions;
CREATE TRIGGER refresh_recommendations_on_infraction
  AFTER INSERT OR UPDATE ON infractions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_recommendations();

-- Create trigger to refresh recommendations when disciplinary actions are recorded
CREATE OR REPLACE FUNCTION trigger_refresh_recommendations_on_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM refresh_recommendations_for_employee(
    NEW.employee_id,
    NEW.org_id,
    NEW.location_id
  );
  RETURN NEW;
END;
$$;

-- Attach trigger to disc_actions table
DROP TRIGGER IF EXISTS refresh_recommendations_on_disc_action ON disc_actions;
CREATE TRIGGER refresh_recommendations_on_disc_action
  AFTER INSERT OR UPDATE ON disc_actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_recommendations_on_action();

