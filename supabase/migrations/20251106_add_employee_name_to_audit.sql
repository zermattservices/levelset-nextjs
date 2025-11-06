-- Add employee_name column to certification_audit table

ALTER TABLE certification_audit
ADD COLUMN employee_name TEXT;

-- Backfill employee names from employees table
UPDATE certification_audit ca
SET employee_name = e.full_name
FROM employees e
WHERE ca.employee_id = e.id;

-- Add index for easier querying
CREATE INDEX idx_cert_audit_employee_name ON certification_audit(employee_name);

-- Add comment
COMMENT ON COLUMN certification_audit.employee_name IS 'Employee full name for easier audit review';

