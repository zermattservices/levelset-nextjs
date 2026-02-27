-- Migration: Fix scheduling and onboarding issues
-- Addresses: missing pg_trgm extension, redundant indexes, null hs_id RPC bug,
-- and missing unique constraint on employee_availability.

-- ============================================================================
-- 1. Ensure pg_trgm extension exists (required by onboarding_tables migration)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- 2. Drop redundant unique indexes (column-level UNIQUE already creates one)
-- ============================================================================
DROP INDEX IF EXISTS idx_onboarding_sessions_token;
DROP INDEX IF EXISTS idx_onboarding_invites_token;

-- ============================================================================
-- 3. Fix upsert_time_off_request RPC — guard against NULL hs_id
--    NULL = NULL returns UNKNOWN in SQL, so the lookup would never match.
--    With this fix, NULL hs_id always inserts a new row.
-- ============================================================================
CREATE OR REPLACE FUNCTION upsert_time_off_request(
  p_org_id UUID,
  p_employee_id UUID,
  p_location_id UUID,
  p_start_datetime TIMESTAMPTZ,
  p_end_datetime TIMESTAMPTZ,
  p_status TEXT,
  p_note TEXT,
  p_is_paid BOOLEAN,
  p_hs_id BIGINT
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Only attempt lookup if hs_id is non-null (NULL = NULL is UNKNOWN in SQL)
  IF p_hs_id IS NOT NULL THEN
    SELECT id INTO v_id FROM time_off_requests WHERE hs_id = p_hs_id LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    -- Update existing record
    UPDATE time_off_requests SET
      status = p_status,
      note = p_note,
      start_datetime = p_start_datetime,
      end_datetime = p_end_datetime,
      updated_at = now()
    WHERE id = v_id;
  ELSE
    -- Insert new record
    INSERT INTO time_off_requests (
      org_id, employee_id, location_id,
      start_datetime, end_datetime,
      status, note, is_paid, hs_id
    ) VALUES (
      p_org_id, p_employee_id, p_location_id,
      p_start_datetime, p_end_datetime,
      p_status, p_note, p_is_paid, p_hs_id
    ) RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- ============================================================================
-- 4. Add unique constraint on employee_availability to prevent duplicate entries
--    for the same employee + day + time slot
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_availability_unique
  ON employee_availability(employee_id, day_of_week, start_time);
