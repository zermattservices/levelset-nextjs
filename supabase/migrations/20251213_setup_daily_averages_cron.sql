-- Set up pg_cron job to calculate and store daily position averages
-- This runs daily at 2 AM UTC

-- First, ensure pg_cron extension is enabled (if not already)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily position averages calculation
SELECT cron.schedule(
  'calculate-daily-position-averages',
  '0 2 * * *', -- 2 AM UTC daily
  $$SELECT store_daily_position_averages()$$
);

COMMENT ON EXTENSION pg_cron IS 'Job scheduler for PostgreSQL - used to run daily position average calculations';

