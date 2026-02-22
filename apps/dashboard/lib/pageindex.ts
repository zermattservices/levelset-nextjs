/**
 * PageIndex integration for document indexing.
 *
 * PageIndex is a vectorless, reasoning-based RAG engine that processes
 * documents holistically and generates hierarchical tree structures.
 *
 * All org-uploaded documents are indexed in PageIndex:
 * - PDFs: uploaded directly from storage (best quality)
 * - Non-PDFs (markdown, text, URL content): converted to PDF via pdfkit
 *
 * The 4 authored context docs (levelset-domain-model, etc.) are excluded
 * since they're already served by Tier 1 core context + Tier 2 embeddings.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import PDFDocument from 'pdfkit';

const PAGEINDEX_API_URL = 'https://api.pageindex.ai';

/**
 * Deterministic UUIDs for authored context documents.
 * These are excluded from PageIndex since they're covered by Tier 1 + Tier 2.
 */
const AUTHORED_CONTEXT_DOC_IDS = new Set([
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000002',
  '00000000-0000-0000-0001-000000000003',
  '00000000-0000-0000-0001-000000000004',
]);

// ─── PDF Generation ───────────────────────────────────────────────────────────

/**
 * Convert markdown/text content to a PDF buffer using pdfkit.
 * Produces a clean text PDF — PageIndex cares about content, not formatting.
 */
function markdownToPdfBuffer(content: string, title?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Uint8Array[] = [];

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (title) {
      doc.fontSize(16).text(title, { underline: true });
      doc.moveDown();
    }

    // Simple markdown rendering: headings get larger font, rest is body text
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        doc.moveDown(0.5);
        doc.fontSize(16).text(line.replace(/^#\s+/, ''), { underline: true });
        doc.moveDown(0.3);
      } else if (line.startsWith('## ')) {
        doc.moveDown(0.5);
        doc.fontSize(14).text(line.replace(/^##\s+/, ''));
        doc.moveDown(0.2);
      } else if (line.startsWith('### ')) {
        doc.moveDown(0.3);
        doc.fontSize(12).text(line.replace(/^###\s+/, ''), { underline: true });
        doc.moveDown(0.2);
      } else if (line.trim() === '') {
        doc.moveDown(0.3);
      } else {
        doc.fontSize(11).text(line);
      }
    }

    doc.end();
  });
}

// ─── PageIndex API ────────────────────────────────────────────────────────────

/**
 * Submit a PDF buffer to PageIndex for processing.
 * Returns the doc_id (stored as pageindex_tree_id in our schema).
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
 * Index a document in PageIndex after extraction.
 *
 * Strategy:
 * - PDFs in storage → upload the original PDF directly (best quality)
 * - Non-PDFs with content_md → convert markdown to PDF via pdfkit, then upload
 * - Authored context docs → skip (covered by Tier 1 + Tier 2)
 * - No content and no storage path → skip
 */
export async function indexDocumentInPageIndex(
  digestId: string,
  sourceType: 'global_document' | 'org_document',
  documentId: string,
  fileType: string | null,
  storagePath: string | null,
  contentMd: string | null,
  documentName?: string | null
): Promise<void> {
  // Skip authored context documents
  if (AUTHORED_CONTEXT_DOC_IDS.has(documentId)) {
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
    let pdfBuffer: Buffer;
    let fileName: string;

    if (fileType?.includes('pdf') && storagePath) {
      // Strategy 1: Original PDF from storage (best quality)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(storageBucket)
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message || 'Unknown error'}`);
      }

      pdfBuffer = Buffer.from(await fileData.arrayBuffer());
      fileName = storagePath.split('/').pop() || 'document.pdf';
    } else if (contentMd && contentMd.trim().length > 0) {
      // Strategy 2: Convert content_md to PDF
      const title = documentName || undefined;
      pdfBuffer = await markdownToPdfBuffer(contentMd, title || undefined);
      fileName = `${(documentName || 'document').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
    } else {
      // No PDF and no content — nothing to index
      return;
    }

    // Submit to PageIndex
    const docId = await submitToPageIndex(pdfBuffer, fileName);

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
