/**
 * Batch reindex script — processes all global documents that need embedding.
 *
 * Usage:
 *   npx tsx scripts/reindex-documents.ts
 *
 * Reads .env.local for:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY, PAGEINDEX_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openrouterKey = process.env.OPENROUTER_API_KEY!;
const pageindexKey = process.env.PAGEINDEX_API_KEY;

if (!supabaseUrl || !supabaseKey || !openrouterKey) {
  console.error('Missing required env vars. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Chunking ──────────────────────────────────────────────────────────────

interface Chunk {
  chunkIndex: number;
  heading: string | null;
  content: string;
  tokenCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const TARGET_MAX_TOKENS = 500;
const TARGET_MIN_TOKENS = 200;

function chunkDocument(contentMd: string): Chunk[] {
  if (!contentMd || contentMd.trim().length === 0) return [];

  const lines = contentMd.split('\n');
  const sections: { heading: string | null; lines: string[] }[] = [];

  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);

    if (h2Match) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, lines: currentLines });
      }
      currentHeading = h2Match[1].trim();
      currentLines = [line];
    } else if (h3Match) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, lines: currentLines });
      }
      currentHeading = h3Match[1].trim();
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, lines: currentLines });
  }

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const content = section.lines.join('\n').trim();
    if (!content) continue;

    const tokens = estimateTokens(content);

    if (tokens <= TARGET_MAX_TOKENS) {
      if (tokens < TARGET_MIN_TOKENS && chunks.length > 0) {
        const prev = chunks[chunks.length - 1];
        const merged = prev.content + '\n\n' + content;
        if (estimateTokens(merged) <= TARGET_MAX_TOKENS) {
          prev.content = merged;
          prev.tokenCount = estimateTokens(merged);
          continue;
        }
      }
      chunks.push({ chunkIndex: chunkIndex++, heading: section.heading, content, tokenCount: tokens });
    } else {
      const paragraphs = content.split(/\n\n+/);
      let accumulator: string[] = [];
      let accTokens = 0;

      for (const para of paragraphs) {
        const paraTokens = estimateTokens(para);
        if (accTokens + paraTokens > TARGET_MAX_TOKENS && accumulator.length > 0) {
          const chunkContent = accumulator.join('\n\n');
          chunks.push({ chunkIndex: chunkIndex++, heading: section.heading, content: chunkContent, tokenCount: estimateTokens(chunkContent) });
          accumulator = [para];
          accTokens = paraTokens;
        } else {
          accumulator.push(para);
          accTokens += paraTokens;
        }
      }

      if (accumulator.length > 0) {
        const chunkContent = accumulator.join('\n\n');
        chunks.push({ chunkIndex: chunkIndex++, heading: section.heading, content: chunkContent, tokenCount: estimateTokens(chunkContent) });
      }
    }
  }

  return chunks;
}

// ─── Embeddings ────────────────────────────────────────────────────────────

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://levelset.io',
      'X-Title': 'Levelset',
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: texts,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter embedding failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return data.data
    .sort((a: any, b: any) => a.index - b.index)
    .map((item: any) => item.embedding);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Reindex Global Documents ===\n');

  // Find all global digests needing embedding
  const { data: digests, error } = await supabase
    .from('global_document_digests')
    .select('id, document_id, content_md, pageindex_indexed')
    .eq('extraction_status', 'completed')
    .or('embedding_status.is.null,embedding_status.neq.completed');

  if (error) {
    console.error('Failed to query digests:', error.message);
    process.exit(1);
  }

  if (!digests || digests.length === 0) {
    console.log('No documents need reindexing.');
    return;
  }

  console.log(`Found ${digests.length} documents to process.\n`);

  // Look up document names
  const docIds = digests.map((d) => d.document_id);
  const { data: docs } = await supabase
    .from('global_documents')
    .select('id, name')
    .in('id', docIds);
  const docNames = new Map((docs || []).map((d: any) => [d.id, d.name]));

  let totalChunks = 0;
  let successCount = 0;
  let failCount = 0;

  for (const digest of digests) {
    const docName = docNames.get(digest.document_id) || digest.document_id;
    console.log(`Processing: ${docName}`);

    if (!digest.content_md || digest.content_md.trim().length === 0) {
      console.log(`  SKIP — no content_md`);
      failCount++;
      continue;
    }

    try {
      // 1. Mark as processing
      await supabase
        .from('global_document_digests')
        .update({ embedding_status: 'processing' })
        .eq('id', digest.id);

      // 2. Chunk
      const chunks = chunkDocument(digest.content_md);
      console.log(`  Chunks: ${chunks.length}`);

      if (chunks.length === 0) {
        await supabase
          .from('global_document_digests')
          .update({ embedding_status: 'completed' })
          .eq('id', digest.id);
        successCount++;
        continue;
      }

      // 3. Generate embeddings (batch)
      const texts = chunks.map((c) => c.content);
      console.log(`  Generating embeddings for ${texts.length} chunks...`);
      const embeddings = await generateEmbeddings(texts);
      console.log(`  Embeddings generated (${embeddings[0]?.length || 0} dimensions each)`);

      // 4. Delete existing chunks for this digest
      await supabase
        .from('context_chunks')
        .delete()
        .eq('global_document_digest_id', digest.id);

      // 5. Insert chunks + embeddings
      const rows = chunks.map((chunk, i) => ({
        source_type: 'global_document',
        global_document_digest_id: digest.id,
        org_id: null,
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
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      // 6. Update status
      await supabase
        .from('global_document_digests')
        .update({
          embedding_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', digest.id);

      totalChunks += chunks.length;
      successCount++;
      console.log(`  OK — ${chunks.length} chunks indexed\n`);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}\n`);
      await supabase
        .from('global_document_digests')
        .update({ embedding_status: 'failed' })
        .eq('id', digest.id);
      failCount++;
    }
  }

  console.log('=== Summary ===');
  console.log(`Total documents: ${digests.length}`);
  console.log(`Succeeded: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total chunks created: ${totalChunks}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
