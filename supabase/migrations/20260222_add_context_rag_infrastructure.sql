-- Context & RAG Infrastructure for Levi AI
-- Adds pgvector extension, context_chunks table for semantic search,
-- levi_core_context table for always-present Tier 1 summaries,
-- and PageIndex/embedding tracking columns on digest tables.

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Context chunks table (stores embedded content from all documents)
CREATE TABLE context_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('global_document', 'org_document', 'core_context')),
  global_document_digest_id UUID REFERENCES global_document_digests(id) ON DELETE CASCADE,
  document_digest_id UUID REFERENCES document_digests(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  token_count INTEGER,
  embedding extensions.vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for cosine similarity search (better than IVFFlat for small datasets)
CREATE INDEX idx_context_chunks_embedding ON context_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

CREATE INDEX idx_context_chunks_source ON context_chunks(source_type, org_id);
CREATE INDEX idx_context_chunks_global_digest ON context_chunks(global_document_digest_id)
  WHERE global_document_digest_id IS NOT NULL;
CREATE INDEX idx_context_chunks_org_digest ON context_chunks(document_digest_id)
  WHERE document_digest_id IS NOT NULL;

-- RLS: service_role only (accessed via API routes and agent)
ALTER TABLE context_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "context_chunks_service" ON context_chunks FOR ALL TO service_role USING (true);

-- 3. Core context table (always-injected Tier 1 summaries)
CREATE TABLE levi_core_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_key TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  token_count INTEGER,
  version INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: service_role only
ALTER TABLE levi_core_context ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levi_core_context_service" ON levi_core_context FOR ALL TO service_role USING (true);

-- 4. PageIndex + embedding tracking on global_document_digests
ALTER TABLE global_document_digests
  ADD COLUMN IF NOT EXISTS pageindex_tree_id TEXT,
  ADD COLUMN IF NOT EXISTS pageindex_indexed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pageindex_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));

-- 5. PageIndex + embedding tracking on document_digests
ALTER TABLE document_digests
  ADD COLUMN IF NOT EXISTS pageindex_tree_id TEXT,
  ADD COLUMN IF NOT EXISTS pageindex_indexed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pageindex_indexed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS embedding_status TEXT DEFAULT 'pending'
    CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed'));
