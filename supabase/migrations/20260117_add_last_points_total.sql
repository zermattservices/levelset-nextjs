-- Migration: Add last_points_total column and seed termination data for inactive employees

-- Add last_points_total column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS last_points_total NUMERIC DEFAULT NULL;

COMMENT ON COLUMN employees.last_points_total IS 'Points total at the time of termination. Only populated for inactive employees.';

-- Seed termination_date with updated_at for inactive employees that don't have it set
UPDATE employees 
SET termination_date = updated_at::date
WHERE active = false 
  AND termination_date IS NULL;

-- Seed last_points_total for inactive employees using their current 90-day rolling points
-- This calculates points from infractions in the last 90 days relative to now
WITH employee_points AS (
  SELECT 
    e.id as employee_id,
    COALESCE(SUM(i.points), 0) as total_points
  FROM employees e
  LEFT JOIN infractions i ON (
    i.employee_id = e.id 
    OR i.employee_id IN (
      SELECT id FROM employees WHERE consolidated_employee_id = e.consolidated_employee_id
    )
  ) AND i.infraction_date >= (CURRENT_DATE - INTERVAL '90 days')
  WHERE e.active = false
  GROUP BY e.id
)
UPDATE employees e
SET last_points_total = ep.total_points
FROM employee_points ep
WHERE e.id = ep.employee_id
  AND e.active = false
  AND e.last_points_total IS NULL;

