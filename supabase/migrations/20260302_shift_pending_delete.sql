-- Add pending_delete flag to shifts for soft-delete before publishing
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS pending_delete boolean NOT NULL DEFAULT false;
