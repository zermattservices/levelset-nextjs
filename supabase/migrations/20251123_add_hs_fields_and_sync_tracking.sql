-- Migration: Add HotSchedules fields and sync tracking
-- For HotSchedules employee sync functionality

-- Add hs_id column to employees table (HotSchedules employee ID)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS hs_id BIGINT;

-- Add birth_date column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Create unique index on hs_id for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_hs_id ON employees(hs_id) WHERE hs_id IS NOT NULL;

-- Add has_synced_before flag to locations table
ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS has_synced_before BOOLEAN DEFAULT false;

-- Create hs_sync_notifications table
CREATE TABLE IF NOT EXISTS hs_sync_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sync_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed BOOLEAN DEFAULT false
);

-- Create index on location_id and created_at for efficient polling
CREATE INDEX IF NOT EXISTS idx_hs_sync_notifications_location_created 
ON hs_sync_notifications(location_id, created_at DESC);

-- Create index on viewed for filtering unviewed notifications
CREATE INDEX IF NOT EXISTS idx_hs_sync_notifications_viewed 
ON hs_sync_notifications(viewed) WHERE viewed = false;

-- Add comments for documentation
COMMENT ON COLUMN employees.hs_id IS 'HotSchedules employee ID - used for matching employees across syncs';
COMMENT ON COLUMN employees.birth_date IS 'Employee birth date from HotSchedules';
COMMENT ON COLUMN locations.has_synced_before IS 'Tracks if location has ever completed a HotSchedules sync';
COMMENT ON TABLE hs_sync_notifications IS 'Stores sync notifications for real-time detection in the sync modal';

