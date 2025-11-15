-- Add ack_bool column to infractions table
ALTER TABLE infractions ADD COLUMN IF NOT EXISTS ack_bool BOOLEAN;

-- Create function to calculate ack_bool based on acknowledgement
CREATE OR REPLACE FUNCTION calculate_ack_bool()
RETURNS TRIGGER AS $$
BEGIN
  -- Set ack_bool to true if acknowledgement is 'Notified' or 'Notified not present'
  -- Set to false if 'Not notified' or NULL
  IF NEW.acknowledgement IN ('Notified', 'Notified not present') THEN
    NEW.ack_bool := TRUE;
  ELSE
    NEW.ack_bool := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set ack_bool on insert or update
DROP TRIGGER IF EXISTS set_ack_bool_on_infractions ON infractions;
CREATE TRIGGER set_ack_bool_on_infractions
  BEFORE INSERT OR UPDATE OF acknowledgement
  ON infractions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ack_bool();

-- Backfill existing records
UPDATE infractions
SET ack_bool = CASE 
  WHEN acknowledgement IN ('Notified', 'Notified not present') THEN TRUE
  ELSE FALSE
END;

