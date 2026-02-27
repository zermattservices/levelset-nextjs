-- Migration: Scheduling Expansion
-- Adds tables for sales forecasting, employee availability, time off requests,
-- shift trade requests, and a new scheduling permission sub-item.

-- ============================================================================
-- 1. Sales Forecasts — daily totals per location
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  forecast_date DATE NOT NULL,
  projected_sales NUMERIC,
  projected_transactions INTEGER,
  source TEXT NOT NULL DEFAULT 'hotschedules',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (location_id, forecast_date)
);

CREATE INDEX idx_sales_forecasts_org ON sales_forecasts(org_id);
CREATE INDEX idx_sales_forecasts_location_date ON sales_forecasts(location_id, forecast_date);

-- ============================================================================
-- 2. Sales Forecast Intervals — 15-min breakdown for labor spread chart
-- ============================================================================
CREATE TABLE IF NOT EXISTS sales_forecast_intervals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL REFERENCES sales_forecasts(id) ON DELETE CASCADE,
  interval_start TIME NOT NULL,
  sales_amount NUMERIC,
  transaction_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (forecast_id, interval_start)
);

CREATE INDEX idx_forecast_intervals_forecast ON sales_forecast_intervals(forecast_id);

-- ============================================================================
-- 3. Employee Availability — recurring weekly pattern
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_employee_availability_org ON employee_availability(org_id);
CREATE INDEX idx_employee_availability_employee ON employee_availability(employee_id);

-- Add availability threshold columns to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS availability_max_hours_week NUMERIC(4,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS availability_max_days_week INTEGER;

-- ============================================================================
-- 4. Availability Change Requests — employee requests to modify availability
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  requested_availability JSONB NOT NULL,
  effective_date DATE,
  is_permanent BOOLEAN DEFAULT true,
  end_date DATE,
  employee_notes TEXT,
  manager_notes TEXT,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_availability_requests_org ON availability_change_requests(org_id);
CREATE INDEX idx_availability_requests_employee ON availability_change_requests(employee_id);
CREATE INDEX idx_availability_requests_status ON availability_change_requests(status);

-- ============================================================================
-- 5. Time Off Requests — date-specific datetime ranges
-- ============================================================================
CREATE TABLE IF NOT EXISTS time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  note TEXT,
  is_paid BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  hs_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_off_org ON time_off_requests(org_id);
CREATE INDEX idx_time_off_employee ON time_off_requests(employee_id);
CREATE INDEX idx_time_off_location ON time_off_requests(location_id);
CREATE INDEX idx_time_off_status ON time_off_requests(status);
CREATE INDEX idx_time_off_dates ON time_off_requests(start_datetime, end_datetime);

-- ============================================================================
-- 6. Shift Trade Requests — giveaways, swaps, and house pickups
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_trade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  schedule_id UUID REFERENCES schedules(id),
  type TEXT NOT NULL CHECK (type IN ('giveaway', 'swap', 'house_pickup')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'pending_approval', 'approved', 'denied', 'cancelled', 'expired'
  )),
  source_shift_id UUID NOT NULL REFERENCES shifts(id),
  source_employee_id UUID REFERENCES employees(id),
  target_shift_id UUID REFERENCES shifts(id),
  target_employee_id UUID REFERENCES employees(id),
  notes TEXT,
  manager_notes TEXT,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  hs_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shift_trades_org ON shift_trade_requests(org_id);
CREATE INDEX idx_shift_trades_schedule ON shift_trade_requests(schedule_id);
CREATE INDEX idx_shift_trades_status ON shift_trade_requests(status);
CREATE INDEX idx_shift_trades_source_employee ON shift_trade_requests(source_employee_id);
CREATE INDEX idx_shift_trades_target_employee ON shift_trade_requests(target_employee_id);

-- ============================================================================
-- 7. New permission sub-item: manage_approvals
-- ============================================================================
INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT m.id, 'manage_approvals', 'Manage Approvals',
  'Approve or deny shift trades, time off requests, and availability changes', 4
FROM permission_modules m WHERE m.key = 'scheduling'
ON CONFLICT (module_id, key) DO NOTHING;

-- Enable for hierarchy levels 0 and 1
INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
SELECT
  pp.id AS profile_id,
  psi.id AS sub_item_id,
  CASE WHEN pp.hierarchy_level <= 1 THEN true ELSE false END AS is_enabled
FROM permission_profiles pp
CROSS JOIN permission_sub_items psi
WHERE psi.key = 'manage_approvals'
  AND psi.module_id = (SELECT id FROM permission_modules WHERE key = 'scheduling')
ON CONFLICT (profile_id, sub_item_id) DO NOTHING;
