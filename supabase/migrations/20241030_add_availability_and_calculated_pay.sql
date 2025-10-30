-- Add availability and calculated_pay columns to employees table
-- For CFA Buda and CFA West Buda locations

-- Add availability column with enum type
DO $$ BEGIN
  CREATE TYPE availability_type AS ENUM ('Limited', 'Available');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS availability availability_type DEFAULT 'Available';

-- Add calculated_pay column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS calculated_pay NUMERIC(5,2);

-- Add comment for documentation
COMMENT ON COLUMN employees.availability IS 'Employee availability status - affects pay calculation for Team Members and Trainers';
COMMENT ON COLUMN employees.calculated_pay IS 'Auto-calculated hourly pay based on role, FOH/BOH, availability, and certification status';

-- Create index for faster queries filtering by availability
CREATE INDEX IF NOT EXISTS idx_employees_availability ON employees(availability);
CREATE INDEX IF NOT EXISTS idx_employees_calculated_pay ON employees(calculated_pay);

