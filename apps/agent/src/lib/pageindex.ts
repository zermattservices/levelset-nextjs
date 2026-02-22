/**
 * PageIndex query client for the agent.
 *
 * PageIndex is a vectorless, reasoning-based RAG engine that provides
 * document-level reasoning with exact page-level citations.
 *
 * Uses the Chat Completions API for querying indexed documents.
 */

const PAGEINDEX_API_URL = 'https://api.pageindex.ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PageIndexResult {
  answer: string;
  sources: Array<{ page: number; text: string }>;
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Query one or more PageIndex documents with a natural language question.
 *
 * Uses the Chat Completions API (non-streaming) with citations enabled.
 * Supports single or multi-document queries.
 *
 * @param docIds - One or more PageIndex doc_ids (pageindex_tree_id values)
 * @param question - The user's question
 * @returns Answer text and source citations
 */
export async function queryPageIndex(
  docIds: string[],
  question: string
): Promise<PageIndexResult> {
  const apiKey = process.env.PAGEINDEX_API_KEY;
  if (!apiKey) {
    throw new Error('PAGEINDEX_API_KEY is not configured');
  }

  if (docIds.length === 0) {
    return { answer: '', sources: [] };
  }

  const docIdParam = docIds.length === 1 ? docIds[0] : docIds;

  const response = await fetch(`${PAGEINDEX_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'api_key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: question },
      ],
      doc_id: docIdParam,
      stream: false,
      temperature: 0.3,
      enable_citations: true,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`PageIndex query failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse inline citations from content: <doc=file.pdf;page=N>
  const sources: Array<{ page: number; text: string }> = [];
  const citationRegex = /<doc=[^;]+;page=(\d+)>/g;
  let match;
  while ((match = citationRegex.exec(content)) !== null) {
    sources.push({
      page: parseInt(match[1], 10),
      text: match[0],
    });
  }

  // Clean citations from the answer text
  const cleanAnswer = content.replace(/<doc=[^>]+>/g, '').trim();

  return {
    answer: cleanAnswer,
    sources,
  };
}

/**
 * Check if PageIndex is available (API key configured).
 */
export function isPageIndexAvailable(): boolean {
  return !!process.env.PAGEINDEX_API_KEY;
}
