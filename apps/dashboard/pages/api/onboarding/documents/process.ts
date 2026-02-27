/**
 * POST /api/onboarding/documents/process
 *
 * Trigger document text extraction during onboarding.
 * Same extraction logic as /api/documents/process but without Levelset Admin role check.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { authenticateOnboardingUser } from '@/lib/onboarding/documents-auth';

/**
 * Validate that a URL is safe to fetch server-side (prevent SSRF).
 * Blocks private IP ranges, localhost, and non-HTTPS URLs.
 */
function isUrlSafeToFetch(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Only allow HTTPS
    if (url.protocol !== 'https:') return false;

    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1') {
      return false;
    }

    // Block private IP ranges
    const parts = hostname.split('.');
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      const octets = parts.map(Number);
      // 10.0.0.0/8
      if (octets[0] === 10) return false;
      // 172.16.0.0/12
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return false;
      // 192.168.0.0/16
      if (octets[0] === 192 && octets[1] === 168) return false;
      // 169.254.0.0/16 (link-local / AWS metadata)
      if (octets[0] === 169 && octets[1] === 254) return false;
      // 0.0.0.0
      if (octets.every(o => o === 0)) return false;
    }

    // Block IPv6 private addresses (bracketed)
    if (hostname.startsWith('[')) return false;

    // Block common cloud metadata endpoints
    if (hostname === 'metadata.google.internal') return false;

    return true;
  } catch {
    return false;
  }
}

function getExtractionMethod(sourceType: string | null, fileType: string | null): string {
  if (sourceType === 'url') return 'web_scrape';
  if (!fileType) return 'text_extract';
  if (fileType.includes('pdf')) return 'pdf_extract';
  if (fileType.includes('word') || fileType.includes('officedocument')) return 'docx_extract';
  if (fileType.startsWith('image/')) return 'ocr';
  return 'text_extract';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateOnboardingUser(req, res);
  if (!auth) return;

  const { supabase, orgId } = auth;
  const { document_id } = req.body;

  if (!document_id) {
    return res.status(400).json({ error: 'document_id is required' });
  }

  // Fetch document and verify org ownership
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', document_id)
    .eq('org_id', orgId)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Ensure digest record exists
  const { data: digest } = await supabase
    .from('document_digests')
    .select('id')
    .eq('document_id', document_id)
    .single();

  if (!digest) {
    await supabase.from('document_digests').insert({
      document_id,
      org_id: orgId,
      extraction_status: 'pending',
    });
  }

  // Set status to processing
  await supabase
    .from('document_digests')
    .update({
      extraction_status: 'processing',
      extraction_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('document_id', document_id);

  // Respond immediately, run extraction in background
  res.status(200).json({ status: 'processing' });

  // Run extraction after response is sent
  const extractionMethod = getExtractionMethod(doc.source_type, doc.file_type);

  try {
    let text = '';

    if (doc.source_type === 'url') {
      if (!doc.original_url) throw new Error('No original_url found');

      if (!isUrlSafeToFetch(doc.original_url)) {
        throw new Error('URL is not allowed: must be HTTPS and not a private/internal address');
      }

      const response = await fetch(doc.original_url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Levelset/1.0; +https://levelset.io)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);

      const html = await response.text();
      const { Defuddle } = await import('defuddle/node');
      const result = await Defuddle(html, doc.original_url, { markdown: true });
      text = result.contentMarkdown || result.content || '';
    } else if (!doc.storage_path) {
      throw new Error('No storage_path found');
    } else {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('org_documents')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download: ${downloadError?.message || 'Unknown'}`);
      }

      if (extractionMethod === 'text_extract') {
        text = await fileData.text();
      } else if (extractionMethod === 'pdf_extract') {
        const { PDFParse } = await import('pdf-parse');
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await parser.getText();
        text = textResult.text;
        await parser.destroy();
      } else if (extractionMethod === 'docx_extract') {
        const mammoth = await import('mammoth');
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else if (extractionMethod === 'ocr') {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured for OCR');

        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = doc.file_type || 'image/png';

        const ocrResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'Extract all text from this image, preserving structure. Return clean markdown.',
              },
              {
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
                  { type: 'text', text: 'Extract all text from this image.' },
                ],
              },
            ],
            max_tokens: 4096,
          }),
        });

        if (!ocrResponse.ok) throw new Error(`OCR failed (${ocrResponse.status})`);

        const ocrData = await ocrResponse.json();
        text = ocrData.choices?.[0]?.message?.content || '';
      }
    }

    const contentHash = crypto.createHash('sha256').update(text).digest('hex');
    const wordCount = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;

    await supabase
      .from('document_digests')
      .update({
        content_md: text,
        content_hash: contentHash,
        extraction_method: extractionMethod,
        extraction_status: 'completed',
        extraction_error: null,
        metadata: { word_count: wordCount },
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', document_id);
  } catch (err: any) {
    console.error('[onboarding/documents/process] Extraction failed', err);
    await supabase
      .from('document_digests')
      .update({
        extraction_status: 'failed',
        extraction_error: err.message || 'Extraction failed',
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', document_id);
  }
}
