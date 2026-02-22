-- Add raw_content column and 'text' source type to global_documents
-- This allows creating documents by pasting markdown directly

-- Update source_type check constraint to allow 'text'
ALTER TABLE global_documents
  DROP CONSTRAINT IF EXISTS global_documents_source_type_check;

ALTER TABLE global_documents
  ADD CONSTRAINT global_documents_source_type_check
  CHECK (source_type IN ('file', 'url', 'text'));

-- Add raw_content column for text documents
ALTER TABLE global_documents
  ADD COLUMN IF NOT EXISTS raw_content TEXT;
