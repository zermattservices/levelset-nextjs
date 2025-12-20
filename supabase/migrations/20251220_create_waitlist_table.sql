-- Create waitlist table for collecting operator emails from Framer landing page
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'framer', -- Track where the signup came from
  notes TEXT -- Optional notes field
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for the public webhook)
CREATE POLICY "Allow anonymous inserts to waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to view waitlist
CREATE POLICY "Authenticated users can view waitlist"
  ON public.waitlist
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to delete from waitlist
CREATE POLICY "Authenticated users can delete from waitlist"
  ON public.waitlist
  FOR DELETE
  TO authenticated
  USING (true);

COMMENT ON TABLE public.waitlist IS 'Collects operator emails from landing page signup forms';
