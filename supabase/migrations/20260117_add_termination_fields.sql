-- Migration: Add termination fields to employees table
-- For HR Reporting feature to track terminated employee details

-- Add termination_date column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS termination_date DATE;

-- Add termination_reason column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS termination_reason TEXT;

-- Create index on termination_date for efficient queries on inactive employees
CREATE INDEX IF NOT EXISTS idx_employees_termination_date 
ON employees(termination_date) WHERE termination_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN employees.termination_date IS 'Date when the employee was terminated/deactivated';
COMMENT ON COLUMN employees.termination_reason IS 'Reason for employee termination (e.g., Voluntary, Involuntary, Job Abandonment)';

