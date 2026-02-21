-- Documents Module: Tables, Indexes, RLS Policies, and Storage Bucket
-- Provides org-scoped document management with folder hierarchy,
-- behind-the-scenes content digestion for RAG/indexing, and version tracking.

-- ============================================================
-- Document Folders: org-scoped folder hierarchy
-- ============================================================
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_folder_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_folders_org_parent ON document_folders(org_id, parent_folder_id);

-- ============================================================
-- Documents: uploaded document records (user-visible)
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'employee_handbook',
    'leadership_resource',
    'development_resource',
    'organization_info',
    'benefits',
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

CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_folder ON documents(org_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_category ON documents(org_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- ============================================================
-- Document Digests: extracted content for RAG/indexing (not user-visible)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_document_digests_document ON document_digests(document_id);
CREATE INDEX IF NOT EXISTS idx_document_digests_org_status ON document_digests(org_id, extraction_status);

-- ============================================================
-- Document Versions: history when documents are replaced
-- ============================================================
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  content_diff_summary TEXT,
  replaced_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);

-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Document Folders RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_folders_select" ON document_folders
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_folders_insert" ON document_folders
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_folders_update" ON document_folders
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_folders_delete" ON document_folders
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- Documents RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON documents
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "documents_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "documents_update" ON documents
  FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

CREATE POLICY "documents_delete" ON documents
  FOR DELETE TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- Document Digests RLS (read-only for authenticated users)
ALTER TABLE document_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_digests_select" ON document_digests
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid()));

-- Document Versions RLS (read-only for authenticated users)
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_versions_select" ON document_versions
  FOR SELECT TO authenticated
  USING (document_id IN (
    SELECT id FROM documents
    WHERE org_id IN (SELECT org_id FROM app_users WHERE auth_user_id = auth.uid())
  ));

-- ============================================================
-- Storage Bucket (created via Supabase API, documented here)
-- ============================================================
-- Bucket: org_documents
-- Public: false
-- File path: {org_id}/{document_id}/{filename}
-- Note: Create via Supabase dashboard or:
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('org_documents', 'org_documents', false)
--   ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('org_documents', 'org_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org-scoped access
CREATE POLICY "org_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'org_documents'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "org_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'org_documents'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "org_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'org_documents'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM app_users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "org_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'org_documents'
    AND (storage.foldername(name))[1] IN (
      SELECT org_id::text FROM app_users WHERE auth_user_id = auth.uid()
    )
  );
