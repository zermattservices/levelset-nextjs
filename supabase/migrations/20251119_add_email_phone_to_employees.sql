-- Migration: Add email and phone fields to employees table
-- For HotSchedules employee sync functionality

-- Add email column (nullable, with index for efficient lookups)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add phone column (nullable)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create index on email for efficient lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(LOWER(email));

-- Add comment for documentation
COMMENT ON COLUMN employees.email IS 'Employee email address - used for matching with HotSchedules sync';
COMMENT ON COLUMN employees.phone IS 'Employee phone number from HotSchedules';

