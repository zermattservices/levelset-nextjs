-- Create function to store daily position averages
CREATE OR REPLACE FUNCTION store_daily_position_averages()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  result_record RECORD;
  inserted_count INTEGER := 0;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Delete any existing records for today (idempotent)
  DELETE FROM daily_position_averages
  WHERE calculation_date = today_date;
  
  -- Calculate and insert averages for today
  FOR result_record IN
    SELECT * FROM calculate_daily_position_averages()
  LOOP
    INSERT INTO daily_position_averages (
      employee_id,
      location_id,
      org_id,
      calculation_date,
      position_averages
    )
    VALUES (
      result_record.employee_id,
      result_record.location_id,
      result_record.org_id,
      today_date,
      result_record.position_averages
    )
    ON CONFLICT (employee_id, calculation_date) 
    DO UPDATE SET
      position_averages = EXCLUDED.position_averages,
      created_at = NOW();
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION store_daily_position_averages() IS 'Stores daily position averages for all employees. Idempotent - can be run multiple times per day.';

