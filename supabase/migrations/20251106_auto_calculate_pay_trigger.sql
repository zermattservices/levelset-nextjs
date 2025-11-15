-- Automatic pay calculation trigger
-- Recalculates pay whenever role, certified_status, is_foh, is_boh, or availability changes

-- Step 1: Create function to calculate pay (mirrors lib/pay-calculator.ts logic)
CREATE OR REPLACE FUNCTION calculate_employee_pay(
  p_role TEXT,
  p_certified_status TEXT,
  p_is_foh BOOLEAN,
  p_is_boh BOOLEAN,
  p_availability TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_is_certified BOOLEAN;
  v_normalized_role TEXT;
  v_is_production BOOLEAN;
  v_is_service BOOLEAN;
BEGIN
  -- Determine if certified for pay purposes (Certified or PIP)
  v_is_certified := (p_certified_status IN ('Certified', 'PIP'));
  
  -- Normalize role
  v_normalized_role := LOWER(TRIM(p_role));
  
  -- Team Member or New Hire
  IF v_normalized_role IN ('team member', 'new hire') THEN
    v_is_production := (p_is_boh = true);
    v_is_service := (p_is_foh = true AND p_is_boh = false);
    
    IF v_is_production THEN
      -- Production (BOH)
      IF p_availability = 'Limited' THEN
        RETURN CASE WHEN v_is_certified THEN 15 ELSE 14 END;
      ELSE
        RETURN CASE WHEN v_is_certified THEN 18 ELSE 16 END;
      END IF;
    ELSIF v_is_service THEN
      -- Service (FOH)
      IF p_availability = 'Limited' THEN
        RETURN CASE WHEN v_is_certified THEN 13 ELSE 11 END;
      ELSE
        RETURN CASE WHEN v_is_certified THEN 17 ELSE 15 END;
      END IF;
    ELSE
      -- Neither FOH nor BOH set - default to Service Available
      RETURN CASE WHEN v_is_certified THEN 17 ELSE 15 END;
    END IF;
  END IF;
  
  -- Trainer (ignore FOH/BOH)
  IF v_normalized_role = 'trainer' THEN
    IF p_availability = 'Limited' THEN
      RETURN CASE WHEN v_is_certified THEN 15 ELSE 14 END;
    ELSE
      RETURN CASE WHEN v_is_certified THEN 20 ELSE 19 END;
    END IF;
  END IF;
  
  -- Team Leader
  IF v_normalized_role IN ('team lead', 'team leader') THEN
    RETURN CASE WHEN v_is_certified THEN 25 ELSE 21 END;
  END IF;
  
  -- Director
  IF v_normalized_role = 'director' THEN
    RETURN CASE WHEN v_is_certified THEN 30 ELSE 27 END;
  END IF;
  
  -- Executive
  IF v_normalized_role = 'executive' THEN
    RETURN CASE WHEN v_is_certified THEN 36 ELSE 32 END;
  END IF;
  
  -- Unknown role or Operator - return null
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Create trigger function
CREATE OR REPLACE FUNCTION update_calculated_pay()
RETURNS TRIGGER AS $$
DECLARE
  v_should_calculate BOOLEAN;
  v_new_pay NUMERIC;
BEGIN
  -- Check if this is a CFA Buda or West Buda location
  v_should_calculate := NEW.location_id IN (
    '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', -- CFA Buda
    'e437119c-27d9-4114-9273-350925016738'  -- CFA West Buda
  );
  
  -- Only calculate pay for Buda/West Buda locations
  IF NOT v_should_calculate THEN
    RETURN NEW;
  END IF;
  
  -- Calculate pay using the function
  v_new_pay := calculate_employee_pay(
    NEW.role,
    NEW.certified_status,
    NEW.is_foh,
    NEW.is_boh,
    NEW.availability
  );
  
  -- Update calculated_pay if we got a valid result
  IF v_new_pay IS NOT NULL THEN
    NEW.calculated_pay := v_new_pay;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger that fires on INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_update_calculated_pay ON employees;

CREATE TRIGGER trigger_update_calculated_pay
  BEFORE INSERT OR UPDATE OF role, certified_status, is_foh, is_boh, availability
  ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_calculated_pay();

-- Step 4: Add comment
COMMENT ON FUNCTION calculate_employee_pay IS 'Calculates hourly pay rate based on role, certification status, FOH/BOH designation, and availability. Certified and PIP statuses receive certified pay rates.';
COMMENT ON FUNCTION update_calculated_pay IS 'Trigger function that automatically recalculates pay when role, certified_status, is_foh, is_boh, or availability changes.';

-- Step 5: Backfill all existing employees in Buda/West Buda
UPDATE employees
SET calculated_pay = calculate_employee_pay(role, certified_status, is_foh, is_boh, availability)
WHERE location_id IN (
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd',
  'e437119c-27d9-4114-9273-350925016738'
)
AND calculate_employee_pay(role, certified_status, is_foh, is_boh, availability) IS NOT NULL;

