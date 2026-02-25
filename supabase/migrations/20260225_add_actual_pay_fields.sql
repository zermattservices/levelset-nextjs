ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS actual_pay NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_pay_type TEXT DEFAULT 'hourly'
    CHECK (actual_pay_type IN ('hourly', 'salary')),
  ADD COLUMN IF NOT EXISTS actual_pay_annual NUMERIC;
