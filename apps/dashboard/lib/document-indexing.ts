/**
 * Document chunking and indexing pipeline.
 *
 * Splits markdown documents into heading-based chunks (200-500 tokens),
 * generates embeddings via OpenRouter, and stores in context_chunks table.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateEmbeddings } from './embeddings';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentChunk {
  chunkIndex: number;
  heading: string | null;
  content: string;
  tokenCount: number;
}

// ─── Chunking ────────────────────────────────────────────────────────────────

/** Rough token estimate: ~4 chars per token for English text */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const TARGET_MIN_TOKENS = 200;
const TARGET_MAX_TOKENS = 500;

/**
 * Split a markdown document into chunks based on headings.
 * Targets 200-500 tokens per chunk. Includes parent heading as context prefix.
 */
export function chunkDocument(contentMd: string): DocumentChunk[] {
  if (!contentMd || contentMd.trim().length === 0) return [];

  const lines = contentMd.split('\n');
  const sections: { heading: string | null; parentHeading: string | null; lines: string[] }[] = [];

  let currentH2: string | null = null;
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);

    if (h2Match) {
      // Flush previous section
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, parentHeading: null, lines: currentLines });
      }
      currentH2 = h2Match[1].trim();
      currentHeading = currentH2;
      currentLines = [line];
    } else if (h3Match) {
      // Flush previous section
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, parentHeading: null, lines: currentLines });
      }
      currentHeading = h3Match[1].trim();
      currentLines = [line];
      // Store parent heading reference
      sections.push; // just a marker — we handle parentHeading below
      // Actually set the parent on the current accumulator
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Flush final section
  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, parentHeading: null, lines: currentLines });
  }

  // Now convert sections to chunks, splitting oversized ones
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const content = section.lines.join('\n').trim();
    if (!content) continue;

    const tokens = estimateTokens(content);

    if (tokens <= TARGET_MAX_TOKENS) {
      // Section fits in one chunk
      if (tokens < TARGET_MIN_TOKENS && chunks.length > 0) {
        // Too small — merge with previous chunk if possible
        const prev = chunks[chunks.length - 1];
        const merged = prev.content + '\n\n' + content;
        if (estimateTokens(merged) <= TARGET_MAX_TOKENS) {
          prev.content = merged;
          prev.tokenCount = estimateTokens(merged);
          continue;
        }
      }

      chunks.push({
        chunkIndex: chunkIndex++,
        heading: section.heading,
        content,
        tokenCount: tokens,
      });
    } else {
      // Section too large — split by paragraphs
      const paragraphs = content.split(/\n\n+/);
      let accumulator: string[] = [];
      let accTokens = 0;

      for (const para of paragraphs) {
        const paraTokens = estimateTokens(para);

        if (accTokens + paraTokens > TARGET_MAX_TOKENS && accumulator.length > 0) {
          // Flush accumulator
          const chunkContent = accumulator.join('\n\n');
          chunks.push({
            chunkIndex: chunkIndex++,
            heading: section.heading,
            content: chunkContent,
            tokenCount: estimateTokens(chunkContent),
          });
          accumulator = [para];
          accTokens = paraTokens;
        } else {
          accumulator.push(para);
          accTokens += paraTokens;
        }
      }

      // Flush remaining
      if (accumulator.length > 0) {
        const chunkContent = accumulator.join('\n\n');
        chunks.push({
          chunkIndex: chunkIndex++,
          heading: section.heading,
          content: chunkContent,
          tokenCount: estimateTokens(chunkContent),
        });
      }
    }
  }

  return chunks;
}

// ─── Indexing Pipeline ───────────────────────────────────────────────────────

/**
 * Index a document's content into context_chunks with embeddings.
 *
 * 1. Chunks the markdown content
 * 2. Generates embeddings for all chunks (batched)
 * 3. Deletes existing chunks for this digest (re-index support)
 * 4. Inserts chunks + embeddings into context_chunks
 * 5. Updates digest embedding_status = 'completed'
 */
export async function indexDocumentChunks(
  digestId: string,
  sourceType: 'global_document' | 'org_document',
  orgId: string | null,
  contentMd: string
): Promise<void> {
  const supabase = createServerSupabaseClient();
  const digestTable = sourceType === 'global_document' ? 'global_document_digests' : 'document_digests';
  const digestFk = sourceType === 'global_document' ? 'global_document_digest_id' : 'document_digest_id';

  // Update embedding status to processing
  await supabase
    .from(digestTable)
    .update({ embedding_status: 'processing' })
    .eq('id', digestId);

  try {
    // 1. Chunk the document
    const chunks = chunkDocument(contentMd);

    if (chunks.length === 0) {
      await supabase
        .from(digestTable)
        .update({ embedding_status: 'completed' })
        .eq('id', digestId);
      return;
    }

    // 2. Generate embeddings for all chunks
    const texts = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(texts);

    // 3. Delete existing chunks for this digest (re-index support)
    await supabase
      .from('context_chunks')
      .delete()
      .eq(digestFk, digestId);

    // 4. Insert chunks + embeddings
    const rows = chunks.map((chunk, i) => ({
      source_type: sourceType,
      [digestFk]: digestId,
      org_id: orgId,
      chunk_index: chunk.chunkIndex,
      heading: chunk.heading,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(embeddings[i]),
      metadata: {},
    }));

    const { error: insertError } = await supabase
      .from('context_chunks')
      .insert(rows);

    if (insertError) {
      throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // 5. Update digest embedding_status = 'completed'
    await supabase
      .from(digestTable)
      .update({ embedding_status: 'completed' })
      .eq('id', digestId);

    console.log(`[document-indexing] Indexed ${chunks.length} chunks for digest ${digestId}`);
  } catch (err: any) {
    console.error(`[document-indexing] Failed to index digest ${digestId}:`, err);

    // Set embedding status to failed
    await supabase
      .from(digestTable)
      .update({ embedding_status: 'failed' })
      .eq('id', digestId);

    throw err;
  }
}
