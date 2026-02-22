/**
 * 3-tier context retriever for Levi AI.
 *
 * Tier 1 — Core Context (~700 tokens, always present):
 *   Condensed domain summaries from levi_core_context.
 *   Cached for 30 minutes via TenantCache.
 *
 * Tier 2 — Semantic Chunks (~300-800 tokens, query-specific):
 *   pgvector cosine similarity search against context_chunks.
 *   Returns top 3-5 relevant chunks from global + org documents.
 *
 * Tier 3 — PageIndex Reasoning (~200-500 tokens, conditional):
 *   If Tier 2 returns high-similarity chunks from documents with
 *   PageIndex tree_ids, queries PageIndex for document-level reasoning.
 */

import { getServiceClient } from '@levelset/supabase-client';
import { generateEmbedding, searchSimilarChunks } from './embeddings.js';
import { queryPageIndex, isPageIndexAvailable } from './pageindex.js';
import { tenantCache, CacheTTL } from './tenant-cache.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RetrievedContext {
  /** Tier 1 — always-present domain summaries */
  coreContext: string;
  /** Tier 2 — pgvector semantic search results */
  semanticChunks: string[];
  /** Tier 3 — PageIndex document reasoning (if available) */
  documentContext?: string;
  /** Total estimated tokens across all tiers */
  totalTokens: number;
}

// ─── Core Context (Tier 1) ────────────────────────────────────────────────────

/**
 * Load core context summaries from levi_core_context.
 * Cached for 30 minutes per org (content is global, but cache is org-scoped).
 */
async function loadCoreContext(orgId: string): Promise<string> {
  return tenantCache.getOrFetch(
    orgId,
    'context:core',
    CacheTTL.CONTEXT,
    async () => {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('levi_core_context')
        .select('context_key, content')
        .eq('active', true)
        .order('context_key');

      if (error || !data || data.length === 0) {
        console.warn('[context-retriever] No core context found');
        return '';
      }

      return data.map((row: any) => row.content).join('\n\n');
    }
  );
}

// ─── Semantic Search (Tier 2) ─────────────────────────────────────────────────

/** Minimum similarity threshold for Tier 2 results */
const SIMILARITY_THRESHOLD = 0.65;
/** Maximum chunks to return from Tier 2 */
const MAX_CHUNKS = 5;
/** Similarity threshold to trigger Tier 3 (PageIndex) */
const PAGEINDEX_TRIGGER_THRESHOLD = 0.75;

/**
 * Search for semantically relevant chunks based on the user's message.
 */
async function searchRelevantChunks(
  userMessage: string,
  orgId: string
): Promise<{ chunks: string[]; triggerPageIndex: boolean; digestIds: string[] }> {
  try {
    const queryEmbedding = await generateEmbedding(userMessage);
    const results = await searchSimilarChunks(
      queryEmbedding,
      orgId,
      MAX_CHUNKS,
      SIMILARITY_THRESHOLD
    );

    if (results.length === 0) {
      return { chunks: [], triggerPageIndex: false, digestIds: [] };
    }

    const chunks = results.map((chunk) => {
      const prefix = chunk.heading ? `**${chunk.heading}**\n` : '';
      return prefix + chunk.content;
    });

    // Check if any high-similarity results warrant PageIndex query
    const highSimilarityResults = results.filter(
      (r) => r.similarity >= PAGEINDEX_TRIGGER_THRESHOLD && r.digestId
    );

    const digestIds = [...new Set(highSimilarityResults.map((r) => r.digestId!))];

    return {
      chunks,
      triggerPageIndex: highSimilarityResults.length > 0,
      digestIds,
    };
  } catch (err) {
    console.error('[context-retriever] Semantic search failed:', err);
    return { chunks: [], triggerPageIndex: false, digestIds: [] };
  }
}

// ─── PageIndex Query (Tier 3) ─────────────────────────────────────────────────

/**
 * Query PageIndex for document-level reasoning on relevant documents.
 * Looks up pageindex_tree_ids from digest records and queries PageIndex.
 */
async function queryDocumentContext(
  digestIds: string[],
  userMessage: string
): Promise<string | undefined> {
  if (!isPageIndexAvailable() || digestIds.length === 0) {
    return undefined;
  }

  try {
    const supabase = getServiceClient();

    // Look up PageIndex tree_ids from both digest tables
    const [globalResult, orgResult] = await Promise.all([
      supabase
        .from('global_document_digests')
        .select('pageindex_tree_id')
        .in('id', digestIds)
        .eq('pageindex_indexed', true)
        .not('pageindex_tree_id', 'is', null),
      supabase
        .from('document_digests')
        .select('pageindex_tree_id')
        .in('id', digestIds)
        .eq('pageindex_indexed', true)
        .not('pageindex_tree_id', 'is', null),
    ]);

    const treeIds = [
      ...(globalResult.data || []).map((r: any) => r.pageindex_tree_id),
      ...(orgResult.data || []).map((r: any) => r.pageindex_tree_id),
    ].filter(Boolean) as string[];

    if (treeIds.length === 0) {
      return undefined;
    }

    const result = await queryPageIndex(treeIds, userMessage);
    return result.answer || undefined;
  } catch (err) {
    console.error('[context-retriever] PageIndex query failed:', err);
    return undefined;
  }
}

// ─── Main Retriever ───────────────────────────────────────────────────────────

/** Rough token estimate: ~4 chars per token */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Retrieve context for a user message across all 3 tiers.
 *
 * Tier 1 (core context) and Tier 2 (semantic search) run in parallel.
 * Tier 3 (PageIndex) runs conditionally based on Tier 2 results.
 *
 * Graceful degradation: if any tier fails, the others still work.
 */
export async function retrieveContext(
  userMessage: string,
  orgId: string,
  _locationId?: string
): Promise<RetrievedContext> {
  // Run Tier 1 and Tier 2 in parallel
  const [coreContext, searchResult] = await Promise.all([
    loadCoreContext(orgId).catch((err) => {
      console.warn('[context-retriever] Core context load failed:', err);
      return '';
    }),
    searchRelevantChunks(userMessage, orgId),
  ]);

  // Tier 3: conditional PageIndex query
  let documentContext: string | undefined;
  if (searchResult.triggerPageIndex) {
    documentContext = await queryDocumentContext(
      searchResult.digestIds,
      userMessage
    );
  }

  // Calculate total tokens
  let totalTokens = estimateTokens(coreContext);
  for (const chunk of searchResult.chunks) {
    totalTokens += estimateTokens(chunk);
  }
  if (documentContext) {
    totalTokens += estimateTokens(documentContext);
  }

  return {
    coreContext,
    semanticChunks: searchResult.chunks,
    documentContext,
    totalTokens,
  };
}
