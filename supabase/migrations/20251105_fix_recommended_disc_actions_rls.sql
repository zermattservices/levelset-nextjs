-- Fix RLS policies for recommended_disc_actions table
-- The previous policies were too restrictive

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view recommendations for their org/location" ON recommended_disc_actions;
DROP POLICY IF EXISTS "Users can insert recommendations" ON recommended_disc_actions;
DROP POLICY IF EXISTS "Users can update recommendations for their org/location" ON recommended_disc_actions;
DROP POLICY IF EXISTS "Users can delete recommendations for their org/location" ON recommended_disc_actions;

-- Create more permissive policies for authenticated users

-- Policy: Authenticated users can view all recommendations
CREATE POLICY "Authenticated users can view recommendations"
  ON recommended_disc_actions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert recommendations
CREATE POLICY "Authenticated users can insert recommendations"
  ON recommended_disc_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update recommendations
CREATE POLICY "Authenticated users can update recommendations"
  ON recommended_disc_actions
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete recommendations
CREATE POLICY "Authenticated users can delete recommendations"
  ON recommended_disc_actions
  FOR DELETE
  TO authenticated
  USING (true);

-- For service role (backend operations), allow all
CREATE POLICY "Service role can do everything"
  ON recommended_disc_actions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

