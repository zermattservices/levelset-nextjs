-- Create payroll_sync_notifications table for HR/Payroll report syncs
CREATE TABLE IF NOT EXISTS payroll_sync_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  sync_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed BOOLEAN DEFAULT false
);

-- Create index on location_id and created_at for efficient polling
CREATE INDEX IF NOT EXISTS idx_payroll_sync_notifications_location_created 
ON payroll_sync_notifications(location_id, created_at DESC);

-- Create index on viewed for filtering unviewed notifications
CREATE INDEX IF NOT EXISTS idx_payroll_sync_notifications_viewed 
ON payroll_sync_notifications(viewed) WHERE viewed = false;

-- Add comment for documentation
COMMENT ON TABLE payroll_sync_notifications IS 'Stores sync notifications for HR/Payroll report uploads - employees are only modified when user confirms in modal';

