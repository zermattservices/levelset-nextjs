/**
 * Embedding generation for the dashboard via OpenRouter.
 * Uses text-embedding-3-small (1536 dimensions) routed through OpenRouter.
 *
 * This is the dashboard copy — the agent has its own copy with search functions.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const [result] = await generateEmbeddings([text]);
  return result;
}

/**
 * Generate embedding vectors for multiple text strings (batched).
 * OpenRouter/OpenAI supports up to 2048 inputs per request.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured — required for embeddings');
  }

  if (texts.length === 0) return [];

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
      input: texts,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter embedding failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const embeddings: number[][] = data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => item.embedding);

  // Validate dimensions
  for (const emb of embeddings) {
    if (emb.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${emb.length}`);
    }
  }

  return embeddings;
}

export { EMBEDDING_DIMENSIONS };
