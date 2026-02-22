/**
 * Embedding generation and pgvector search for the agent.
 * Uses text-embedding-3-small (1536 dimensions) via OpenRouter.
 *
 * This is the agent copy — the dashboard has its own copy for indexing.
 */

import { getServiceClient } from '@levelset/supabase-client';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// ─── Embedding Generation ────────────────────────────────────────────────────

/**
 * Generate an embedding vector for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured — required for embeddings');
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://levelset.io',
      'X-Title': 'Levelset',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter embedding failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const embedding: number[] = data.data[0].embedding;

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`);
  }

  return embedding;
}

// ─── pgvector Search ─────────────────────────────────────────────────────────

export interface ContextChunk {
  id: string;
  heading: string | null;
  content: string;
  tokenCount: number;
  similarity: number;
  sourceType: string;
  digestId: string | null;
}

/**
 * Search for similar chunks using pgvector cosine similarity.
 *
 * Retrieves chunks that are:
 * - Global documents (available to all orgs)
 * - Core context chunks
 * - Org-specific documents (matching orgId)
 *
 * @param queryEmbedding - The embedding vector of the user's message
 * @param orgId - The org to include org-specific chunks for (null = global only)
 * @param limit - Maximum number of results (default 5)
 * @param threshold - Minimum similarity score 0-1 (default 0.7)
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  orgId: string | null,
  limit: number = 5,
  threshold: number = 0.7
): Promise<ContextChunk[]> {
  const supabase = getServiceClient();

  // Use raw SQL for pgvector cosine similarity query
  // 1 - (embedding <=> query) gives cosine similarity (0 to 1)
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  const { data, error } = await supabase.rpc('match_context_chunks' as any, {
    query_embedding: embeddingStr,
    match_threshold: threshold,
    match_count: limit,
    p_org_id: orgId,
  });

  if (error) {
    // If RPC doesn't exist, fall back to raw SQL
    console.warn('[embeddings] match_context_chunks RPC not found, using raw query');
    return searchSimilarChunksRaw(supabase, queryEmbedding, orgId, limit, threshold);
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    heading: row.heading,
    content: row.content,
    tokenCount: row.token_count,
    similarity: row.similarity,
    sourceType: row.source_type,
    digestId: row.global_document_digest_id || row.document_digest_id || null,
  }));
}

/**
 * Fallback: raw SQL query for pgvector search when RPC is not available.
 */
async function searchSimilarChunksRaw(
  supabase: any,
  queryEmbedding: number[],
  orgId: string | null,
  limit: number,
  threshold: number
): Promise<ContextChunk[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build WHERE clause: global docs + core_context always, plus org docs if orgId provided
  const orgFilter = orgId
    ? `AND (source_type IN ('global_document', 'core_context') OR (source_type = 'org_document' AND org_id = '${orgId}'))`
    : `AND source_type IN ('global_document', 'core_context')`;

  const query = `
    SELECT
      id,
      heading,
      content,
      token_count,
      source_type,
      global_document_digest_id,
      document_digest_id,
      1 - (embedding <=> '${embeddingStr}'::vector) as similarity
    FROM context_chunks
    WHERE embedding IS NOT NULL
      ${orgFilter}
      AND 1 - (embedding <=> '${embeddingStr}'::vector) >= ${threshold}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `;

  const { data, error } = await supabase.rpc('exec_sql' as any, { query });

  if (error) {
    // Last resort: use Supabase SQL execution via postgrest
    // This won't work with standard postgrest, so just return empty
    console.error('[embeddings] Raw SQL search failed:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    heading: row.heading,
    content: row.content,
    tokenCount: row.token_count,
    similarity: row.similarity,
    sourceType: row.source_type,
    digestId: row.global_document_digest_id || row.document_digest_id || null,
  }));
}

export { EMBEDDING_DIMENSIONS };
