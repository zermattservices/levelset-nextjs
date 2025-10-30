-- Update employees hire_date and payroll_name
-- 
-- Usage: Run this in your Supabase SQL Editor
-- Replace the example data with your actual employee IDs and values
--
-- Pro tip: You can generate this SQL from a spreadsheet using CONCATENATE formulas

-- Option 1: Update one employee at a time
UPDATE employees 
SET 
  hire_date = '2024-01-15',
  payroll_name = 'John Doe',
  updated_at = NOW()
WHERE id = 'your-employee-uuid-here';

-- Option 2: Bulk update using CASE statements (more efficient for many records)
UPDATE employees 
SET 
  hire_date = CASE 
    WHEN id = 'employee-uuid-1' THEN '2024-01-15'
    WHEN id = 'employee-uuid-2' THEN '2024-02-20'
    WHEN id = 'employee-uuid-3' THEN '2024-03-10'
    -- Add more WHEN clauses for each employee
    ELSE hire_date  -- Keep existing value if not in the list
  END,
  payroll_name = CASE 
    WHEN id = 'employee-uuid-1' THEN 'John Doe'
    WHEN id = 'employee-uuid-2' THEN 'Jane Smith'
    WHEN id = 'employee-uuid-3' THEN 'Bob Johnson'
    -- Add more WHEN clauses for each employee
    ELSE payroll_name  -- Keep existing value if not in the list
  END,
  updated_at = NOW()
WHERE id IN (
  'employee-uuid-1',
  'employee-uuid-2',
  'employee-uuid-3'
  -- Add all employee IDs you're updating
);

-- Option 3: Update by matching full_name (if you don't have UUIDs)
UPDATE employees 
SET 
  hire_date = '2024-01-15',
  payroll_name = 'John Doe',
  updated_at = NOW()
WHERE full_name = 'John Doe';

-- Option 4: Set payroll_name to full_name for all employees (if they match)
UPDATE employees 
SET 
  payroll_name = full_name,
  updated_at = NOW()
WHERE payroll_name IS NULL;

-- To verify your updates:
SELECT id, full_name, hire_date, payroll_name, updated_at 
FROM employees 
WHERE active = true
ORDER BY full_name;

-- To see how many still need updates:
SELECT 
  COUNT(*) as total_employees,
  COUNT(hire_date) as have_hire_date,
  COUNT(payroll_name) as have_payroll_name,
  COUNT(*) - COUNT(hire_date) as missing_hire_date,
  COUNT(*) - COUNT(payroll_name) as missing_payroll_name
FROM employees
WHERE active = true;

