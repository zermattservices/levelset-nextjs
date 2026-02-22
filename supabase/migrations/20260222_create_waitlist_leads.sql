-- Add new columns to existing waitlist table for marketing site form fields
-- Original table created in 20251220_create_waitlist_table.sql

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS operator_name text,
  ADD COLUMN IF NOT EXISTS store_number text,
  ADD COLUMN IF NOT EXISTS is_multi_unit boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
