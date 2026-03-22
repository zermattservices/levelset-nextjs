-- Migration: Add published_snapshot to shifts and create shift_audit_log table
-- Purpose: Support published vs draft state for mobile app visibility,
--          and provide audit trail for schedule change reporting.

-- 1. Add published_snapshot column to shifts
-- Stores the shift state as it was when last published.
-- Mobile app reads this; dashboard reads live columns.
-- NULL means the shift has never been published.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS published_snapshot jsonb DEFAULT NULL;

-- 2. Create shift_audit_log table for change tracking
CREATE TABLE IF NOT EXISTS shift_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES orgs(id),
  changed_by uuid REFERENCES app_users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_type text NOT NULL CHECK (change_type IN (
    'created', 'updated', 'deleted', 'published',
    'assigned', 'unassigned', 'reassigned'
  )),
  old_values jsonb,
  new_values jsonb
);

-- Index for querying audit log by schedule (week-level reports)
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_schedule
  ON shift_audit_log (schedule_id, changed_at DESC);

-- Index for querying audit log by shift
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_shift
  ON shift_audit_log (shift_id, changed_at DESC);

-- Index for querying audit log by who made changes
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_changed_by
  ON shift_audit_log (changed_by, changed_at DESC)
  WHERE changed_by IS NOT NULL;

-- Partial index on org_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_shift_audit_log_org
  ON shift_audit_log (org_id, changed_at DESC);

-- 3. Backfill published_snapshot for already-published shifts
-- Captures the current state as the published snapshot for any shift
-- that has been published (published_at IS NOT NULL).
UPDATE shifts s
SET published_snapshot = jsonb_build_object(
  'shift_date', s.shift_date,
  'start_time', s.start_time::text,
  'end_time', s.end_time::text,
  'break_minutes', s.break_minutes,
  'position_id', s.position_id,
  'is_house_shift', s.is_house_shift,
  'notes', s.notes,
  'employee_id', (
    SELECT sa.employee_id
    FROM shift_assignments sa
    WHERE sa.shift_id = s.id
    LIMIT 1
  )
)
WHERE s.published_at IS NOT NULL
  AND s.published_snapshot IS NULL;

-- 4. Auto-update updated_at on shifts when the row is modified
-- This ensures any edit (time change, position change, etc.) is detected
-- as an unpublished change when updated_at > published_at.
CREATE OR REPLACE FUNCTION update_shifts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_shifts_updated_at();

-- 5. Auto-update shifts.updated_at when assignment changes
-- So that assign/reassign/unassign on a published shift shows the red dot.
CREATE OR REPLACE FUNCTION update_shift_on_assignment_change()
RETURNS trigger AS $$
BEGIN
  -- On INSERT or UPDATE, touch the shift's updated_at
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE shifts SET updated_at = now() WHERE id = NEW.shift_id;
    RETURN NEW;
  END IF;
  -- On DELETE, touch the shift's updated_at
  IF TG_OP = 'DELETE' THEN
    UPDATE shifts SET updated_at = now() WHERE id = OLD.shift_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shift_assignments_touch_shift
  AFTER INSERT OR UPDATE OR DELETE ON shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_on_assignment_change();
