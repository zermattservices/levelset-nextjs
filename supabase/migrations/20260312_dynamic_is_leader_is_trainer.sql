-- Replace hardcoded is_leader/is_trainer generated columns on employees
-- with regular columns maintained by triggers that read from org_roles.
--
-- Previously these were generated columns checking exact role name strings:
--   is_leader: lower(role) = ANY ('operator','director','team lead')
--   is_trainer: lower(role) = ANY ('operator','director','team lead','trainer')
--
-- This broke for orgs with custom role names (e.g. "Executive Team", "Team Leader").
-- Now the values are derived from org_roles.is_leader / org_roles.is_trainer.

-- Step 1: Drop the generated columns
ALTER TABLE employees DROP COLUMN IF EXISTS is_leader;
ALTER TABLE employees DROP COLUMN IF EXISTS is_trainer;

-- Step 2: Re-add as regular boolean columns with defaults
ALTER TABLE employees ADD COLUMN is_leader BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE employees ADD COLUMN is_trainer BOOLEAN NOT NULL DEFAULT false;

-- Step 3: Backfill from org_roles
UPDATE employees e
SET
  is_leader = COALESCE(r.is_leader, false),
  is_trainer = COALESCE(r.is_trainer, false)
FROM org_roles r
WHERE r.org_id = e.org_id
  AND r.role_name = e.role;

-- Step 4: Create trigger function — syncs is_leader/is_trainer from org_roles
-- Fires when an employee's role or org_id changes.
CREATE OR REPLACE FUNCTION sync_employee_leader_flags()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(r.is_leader, false), COALESCE(r.is_trainer, false)
  INTO NEW.is_leader, NEW.is_trainer
  FROM org_roles r
  WHERE r.org_id = NEW.org_id AND r.role_name = NEW.role;

  -- If no matching org_role found, default to false
  IF NOT FOUND THEN
    NEW.is_leader := false;
    NEW.is_trainer := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employee_sync_leader_flags
  BEFORE INSERT OR UPDATE OF role, org_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_leader_flags();

-- Step 5: Create trigger function — cascades org_role changes to employees
-- When org_roles.is_leader, is_trainer, or role_name changes, update affected employees.
CREATE OR REPLACE FUNCTION cascade_org_role_to_employees()
RETURNS TRIGGER AS $$
BEGIN
  -- If role_name was renamed, update employees.role
  IF TG_OP = 'UPDATE' AND OLD.role_name IS DISTINCT FROM NEW.role_name THEN
    UPDATE employees
    SET role = NEW.role_name
    WHERE org_id = NEW.org_id AND role = OLD.role_name;

    -- Also cascade to position_role_permissions
    UPDATE position_role_permissions prp
    SET role_name = NEW.role_name
    FROM org_positions op
    WHERE prp.position_id = op.id
      AND op.org_id = NEW.org_id
      AND prp.role_name = OLD.role_name;
  END IF;

  -- If is_leader or is_trainer changed, update employees with this role
  IF TG_OP = 'UPDATE' AND (
    OLD.is_leader IS DISTINCT FROM NEW.is_leader OR
    OLD.is_trainer IS DISTINCT FROM NEW.is_trainer
  ) THEN
    UPDATE employees
    SET
      is_leader = NEW.is_leader,
      is_trainer = NEW.is_trainer
    WHERE org_id = NEW.org_id AND role = NEW.role_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_role_cascade_to_employees
  AFTER UPDATE ON org_roles
  FOR EACH ROW
  EXECUTE FUNCTION cascade_org_role_to_employees();

-- Step 6: Create index for the join pattern used by triggers
CREATE INDEX IF NOT EXISTS idx_employees_org_id_role ON employees (org_id, role);
