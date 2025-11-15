-- Migration: Convert is_certified boolean to certified_status text enum
-- and create certification_audit table for tracking state transitions

-- Step 1: Create enum type for certification status
CREATE TYPE certification_status_enum AS ENUM ('Not Certified', 'Pending', 'Certified', 'PIP');

-- Step 2: Add new certified_status column (nullable initially)
ALTER TABLE employees 
ADD COLUMN certified_status TEXT;

-- Step 3: Migrate existing data
-- Set certified_status based on current is_certified value
UPDATE employees 
SET certified_status = CASE 
  WHEN is_certified = true THEN 'Certified'
  ELSE 'Not Certified'
END;

-- Step 4: Set default and make non-nullable
ALTER TABLE employees 
ALTER COLUMN certified_status SET DEFAULT 'Not Certified',
ALTER COLUMN certified_status SET NOT NULL;

-- Step 5: Add check constraint to ensure valid values
ALTER TABLE employees
ADD CONSTRAINT certified_status_check 
CHECK (certified_status IN ('Not Certified', 'Pending', 'Certified', 'PIP'));

-- Step 6: Add index for query performance
CREATE INDEX idx_employees_certified_status ON employees(certified_status);

-- Step 7: Drop old is_certified column
ALTER TABLE employees DROP COLUMN is_certified;

-- Step 8: Create certification_audit table
CREATE TABLE certification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL,
  status_before TEXT NOT NULL,
  status_after TEXT NOT NULL,
  all_positions_qualified BOOLEAN NOT NULL,
  position_averages JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  
  -- Constraints
  CONSTRAINT status_before_check CHECK (status_before IN ('Not Certified', 'Pending', 'Certified', 'PIP')),
  CONSTRAINT status_after_check CHECK (status_after IN ('Not Certified', 'Pending', 'Certified', 'PIP'))
);

-- Step 9: Create indexes on certification_audit for common queries
CREATE INDEX idx_cert_audit_employee_id ON certification_audit(employee_id);
CREATE INDEX idx_cert_audit_audit_date ON certification_audit(audit_date DESC);
CREATE INDEX idx_cert_audit_employee_date ON certification_audit(employee_id, audit_date DESC);
CREATE INDEX idx_cert_audit_location ON certification_audit(location_id);

-- Step 10: Enable RLS on certification_audit
ALTER TABLE certification_audit ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies for certification_audit
-- Allow users to read audit records for their org/location
CREATE POLICY "Users can view certification audit for their org" 
ON certification_audit FOR SELECT 
USING (
  org_id IN (
    SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
  )
);

-- Allow authenticated users to insert audit records
CREATE POLICY "Authenticated users can insert certification audit" 
ON certification_audit FOR INSERT 
WITH CHECK (
  org_id IN (
    SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()
  )
);

-- Step 12: Add comment for documentation
COMMENT ON TABLE certification_audit IS 'Tracks certification status changes and position averages for each PEA Audit Day evaluation';
COMMENT ON COLUMN certification_audit.position_averages IS 'JSON object containing position:average pairs (e.g., {"iPOS": 2.95, "Host": 2.80})';
COMMENT ON COLUMN certification_audit.all_positions_qualified IS 'TRUE if all positions had average >= 2.85 on this audit date';
