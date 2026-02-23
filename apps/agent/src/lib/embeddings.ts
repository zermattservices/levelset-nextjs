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
    console.error('[embeddings] match_context_chunks RPC failed:', error.message);
    throw new Error(`pgvector search failed: ${error.message}`);
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
