-- Global Documents Module: Tables, Indexes, RLS Policies, and Storage Bucket
-- Provides cross-org document management for Levelset-wide foundational content
-- (CFA standards, design systems, locale info) that applies to ALL organizations.
-- Mirrors the org-scoped document tables but without org_id scoping.

-- ============================================================
-- Global Document Folders: folder hierarchy (no org scoping)
-- ============================================================
CREATE TABLE IF NOT EXISTS global_document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES global_document_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_doc_folders_parent ON global_document_folders(parent_folder_id);

-- ============================================================
-- Global Documents: uploaded document records (user-visible)
-- Categories differ from org documents
-- ============================================================
CREATE TABLE IF NOT EXISTS global_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES global_document_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'cfa_general',
    'cfa_design_system',
    'levelset_general',
    'levelset_design_system',
    'locale_information',
    'other'
  )),
  source_type TEXT NOT NULL CHECK (source_type IN ('file', 'url')),
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT,
  original_url TEXT,
  original_filename TEXT,
  uploaded_by UUID REFERENCES app_users(id),
  current_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_documents_folder ON global_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_global_documents_category ON global_documents(category);
CREATE INDEX IF NOT EXISTS idx_global_documents_created ON global_documents(created_at DESC);

-- ============================================================
-- Global Document Digests: extracted content for RAG/indexing
-- ============================================================
CREATE TABLE IF NOT EXISTS global_document_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES global_documents(id) ON DELETE CASCADE,
  content_md TEXT,
  content_hash TEXT,
  extraction_method TEXT CHECK (extraction_method IN (
    'text_extract',
    'ocr',
    'web_scrape',
    'pdf_extract',
    'docx_extract'
  )),
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN (
    'pending',
    'processing',
    'completed',
    'failed'
  )),
  extraction_error TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  previous_content_md TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version)
);

CREATE INDEX IF NOT EXISTS idx_global_doc_digests_document ON global_document_digests(document_id);
CREATE INDEX IF NOT EXISTS idx_global_doc_digests_status ON global_document_digests(extraction_status);

-- ============================================================
-- Global Document Versions: history when documents are replaced
-- ============================================================
CREATE TABLE IF NOT EXISTS global_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES global_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  content_diff_summary TEXT,
  replaced_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_global_doc_versions_document ON global_document_versions(document_id);

-- ============================================================
-- Row Level Security: service role only
-- All access goes through API routes that verify Levelset Admin
-- ============================================================
ALTER TABLE global_document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_document_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_doc_folders_service" ON global_document_folders FOR ALL TO service_role USING (true);
CREATE POLICY "global_documents_service" ON global_documents FOR ALL TO service_role USING (true);
CREATE POLICY "global_doc_digests_service" ON global_document_digests FOR ALL TO service_role USING (true);
CREATE POLICY "global_doc_versions_service" ON global_document_versions FOR ALL TO service_role USING (true);

-- ============================================================
-- Storage Bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('global_documents', 'global_documents', false)
ON CONFLICT (id) DO NOTHING;
