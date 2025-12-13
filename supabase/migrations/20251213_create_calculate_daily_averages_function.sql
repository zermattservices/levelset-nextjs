-- Create function to calculate daily position averages for Buda and West Buda employees
CREATE OR REPLACE FUNCTION calculate_daily_position_averages()
RETURNS TABLE(
  employee_id UUID,
  location_id UUID,
  org_id UUID,
  position_averages JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
  buda_location_id UUID := '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd';
  west_buda_location_id UUID := 'e437119c-27d9-4114-9273-350925016738';
  emp_record RECORD;
  rating_record RECORD;
  position_ratings JSONB;
  last_4_ratings NUMERIC[];
  avg_value NUMERIC;
BEGIN
  -- Loop through all active Team Members at Buda and West Buda
  FOR emp_record IN
    SELECT e.id, e.location_id, e.org_id
    FROM employees e
    WHERE e.location_id IN (buda_location_id, west_buda_location_id)
      AND e.active = true
      AND e.role = 'Team Member'
  LOOP
    position_ratings := '{}'::JSONB;
    
    -- Get all positions for this employee
    FOR rating_record IN
      SELECT DISTINCT position
      FROM ratings
      WHERE employee_id = emp_record.id
        AND position IS NOT NULL
    LOOP
      -- Get last 4 ratings for this position
      SELECT ARRAY_AGG(rating_avg ORDER BY created_at DESC)
      INTO last_4_ratings
      FROM (
        SELECT rating_avg, created_at
        FROM ratings
        WHERE employee_id = emp_record.id
          AND position = rating_record.position
          AND rating_avg IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 4
      ) sub;
      
      -- Calculate average if we have ratings
      IF last_4_ratings IS NOT NULL AND array_length(last_4_ratings, 1) > 0 THEN
        SELECT AVG(val) INTO avg_value
        FROM unnest(last_4_ratings) AS val;
        
        position_ratings := position_ratings || jsonb_build_object(rating_record.position, avg_value);
      END IF;
    END LOOP;
    
    -- Only return if employee has at least one position average
    IF jsonb_object_keys(position_ratings) IS NOT NULL THEN
      RETURN QUERY SELECT emp_record.id, emp_record.location_id, emp_record.org_id, position_ratings;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION calculate_daily_position_averages() IS 'Calculates rolling-4 position averages for all active Team Members at Buda and West Buda locations';

