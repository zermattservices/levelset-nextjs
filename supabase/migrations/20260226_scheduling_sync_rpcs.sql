-- Migration: Scheduling Sync RPCs
-- Adds unique index for time off upserts and RPC functions for atomic
-- delete-then-insert operations during HotSchedules sync.

-- ============================================================================
-- 1. Unique partial index on time_off_requests.hs_id
--    Enables proper upsert by hs_id when syncing from HotSchedules
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_time_off_hs_id_unique
  ON time_off_requests(hs_id) WHERE hs_id IS NOT NULL;

-- ============================================================================
-- 2. RPC: sync_employee_availability
--    Atomically replaces an employee's availability windows + thresholds.
--    Runs in a single transaction so partial failures don't lose data.
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_employee_availability(
  p_employee_id UUID,
  p_org_id UUID,
  p_ranges JSONB,  -- [{day_of_week: int, start_time: text, end_time: text}, ...]
  p_max_hours_week NUMERIC DEFAULT NULL,
  p_max_days_week INTEGER DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete existing availability for this employee
  DELETE FROM employee_availability WHERE employee_id = p_employee_id;

  -- Insert new availability windows
  IF p_ranges IS NOT NULL AND jsonb_array_length(p_ranges) > 0 THEN
    INSERT INTO employee_availability (org_id, employee_id, day_of_week, start_time, end_time)
    SELECT
      p_org_id,
      p_employee_id,
      (r->>'day_of_week')::INTEGER,
      (r->>'start_time')::TIME,
      (r->>'end_time')::TIME
    FROM jsonb_array_elements(p_ranges) AS r;
  END IF;

  -- Update max hours/days thresholds on the employee record
  IF p_max_hours_week IS NOT NULL OR p_max_days_week IS NOT NULL THEN
    UPDATE employees SET
      availability_max_hours_week = COALESCE(p_max_hours_week, availability_max_hours_week),
      availability_max_days_week = COALESCE(p_max_days_week, availability_max_days_week)
    WHERE id = p_employee_id;
  END IF;
END;
$$;

-- ============================================================================
-- 3. RPC: sync_forecast_intervals
--    Atomically replaces all 15-min intervals for a given forecast.
--    Prevents orphaned intervals if the insert partially fails.
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_forecast_intervals(
  p_forecast_id UUID,
  p_intervals JSONB  -- [{interval_start: text, sales_amount: numeric, transaction_count: int|null}, ...]
) RETURNS INTEGER  -- returns number of intervals inserted
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete existing intervals for this forecast
  DELETE FROM sales_forecast_intervals WHERE forecast_id = p_forecast_id;

  -- Insert new intervals
  IF p_intervals IS NOT NULL AND jsonb_array_length(p_intervals) > 0 THEN
    INSERT INTO sales_forecast_intervals (forecast_id, interval_start, sales_amount, transaction_count)
    SELECT
      p_forecast_id,
      (i->>'interval_start')::TIME,
      (i->>'sales_amount')::NUMERIC,
      (i->>'transaction_count')::INTEGER
    FROM jsonb_array_elements(p_intervals) AS i;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  RETURN 0;
END;
$$;

-- ============================================================================
-- 4. RPC: upsert_time_off_request
--    Upserts a time off request by hs_id. If a matching hs_id exists,
--    updates status/note/timestamps. Otherwise inserts a new row.
--    Returns the row id.
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
  -- Try to find existing by hs_id
  SELECT id INTO v_id FROM time_off_requests WHERE hs_id = p_hs_id LIMIT 1;

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
