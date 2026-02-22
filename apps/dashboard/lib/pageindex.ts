/**
 * PageIndex integration for document indexing.
 *
 * PageIndex is a vectorless, reasoning-based RAG engine that processes
 * documents holistically and generates hierarchical tree structures.
 *
 * Currently only PDF files are supported for indexing.
 * Non-PDF documents (markdown, text, URLs) are handled by pgvector embeddings only.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';

const PAGEINDEX_API_URL = 'https://api.pageindex.ai';

// ─── Indexing ─────────────────────────────────────────────────────────────────

/**
 * Submit a PDF document to PageIndex for processing.
 * Returns the doc_id (used as pageindex_tree_id in our schema).
 */
export async function submitToPageIndex(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const apiKey = process.env.PAGEINDEX_API_KEY;
  if (!apiKey) {
    throw new Error('PAGEINDEX_API_KEY is not configured');
  }

  const formData = new FormData();
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  ) as ArrayBuffer;
  formData.append('file', new Blob([arrayBuffer], { type: 'application/pdf' }), fileName);

  const response = await fetch(`${PAGEINDEX_API_URL}/doc/`, {
    method: 'POST',
    headers: {
      'api_key': apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`PageIndex submit failed (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  return data.doc_id;
}

/**
 * Check the processing status of a PageIndex document.
 * Returns 'processing' | 'completed' | 'failed'.
 */
export async function getPageIndexStatus(docId: string): Promise<string> {
  const apiKey = process.env.PAGEINDEX_API_KEY;
  if (!apiKey) throw new Error('PAGEINDEX_API_KEY is not configured');

  const response = await fetch(`${PAGEINDEX_API_URL}/doc/${docId}/?type=tree`, {
    headers: { 'api_key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`PageIndex status check failed (${response.status})`);
  }

  const data = await response.json();
  return data.status;
}

// ─── Document Processing Hook ─────────────────────────────────────────────────

/**
 * Index a PDF document in PageIndex after extraction.
 *
 * Downloads the original PDF from storage, submits to PageIndex,
 * and updates the digest record with the tree_id.
 *
 * Only processes PDF documents — skips non-PDF files silently.
 */
export async function indexDocumentInPageIndex(
  digestId: string,
  sourceType: 'global_document' | 'org_document',
  fileType: string | null,
  storagePath: string | null
): Promise<void> {
  // Only process PDFs
  if (!fileType?.includes('pdf') || !storagePath) {
    return;
  }

  const apiKey = process.env.PAGEINDEX_API_KEY;
  if (!apiKey) {
    console.warn('[pageindex] PAGEINDEX_API_KEY not configured, skipping indexing');
    return;
  }

  const supabase = createServerSupabaseClient();
  const digestTable = sourceType === 'global_document' ? 'global_document_digests' : 'document_digests';
  const storageBucket = sourceType === 'global_document' ? 'global_documents' : 'org_documents';

  try {
    // Download original PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(storageBucket)
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileName = storagePath.split('/').pop() || 'document.pdf';

    // Submit to PageIndex
    const docId = await submitToPageIndex(buffer, fileName);

    // Update digest with PageIndex tree_id
    await supabase
      .from(digestTable)
      .update({
        pageindex_tree_id: docId,
        pageindex_indexed: true,
        pageindex_indexed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', digestId);

    console.log(`[pageindex] Indexed ${fileName} → ${docId}`);
  } catch (err: any) {
    console.error(`[pageindex] Failed to index digest ${digestId}:`, err.message);
    // Don't update pageindex_indexed — leave as false for retry
  }
}
