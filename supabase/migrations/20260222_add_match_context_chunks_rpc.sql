-- RPC function for pgvector cosine similarity search
-- Used by the agent to find relevant context chunks for a user query

CREATE OR REPLACE FUNCTION match_context_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_org_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  heading text,
  content text,
  token_count int,
  source_type text,
  global_document_digest_id uuid,
  document_digest_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.id,
    cc.heading,
    cc.content,
    cc.token_count,
    cc.source_type,
    cc.global_document_digest_id,
    cc.document_digest_id,
    (1 - (cc.embedding <=> query_embedding))::float AS similarity
  FROM context_chunks cc
  WHERE cc.embedding IS NOT NULL
    AND (1 - (cc.embedding <=> query_embedding)) >= match_threshold
    AND (
      cc.source_type IN ('global_document', 'core_context')
      OR (cc.source_type = 'org_document' AND cc.org_id = p_org_id)
    )
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
