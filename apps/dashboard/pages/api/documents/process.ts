import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { indexDocumentChunks } from '@/lib/document-indexing';
import { indexDocumentInPageIndex } from '@/lib/pageindex';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Get authenticated user
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Get app user and verify Levelset Admin
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at');

  const appUser =
    appUsers?.find((u) => u.role === 'Levelset Admin') || appUsers?.[0];
  if (!appUser?.org_id)
    return res.status(403).json({ error: 'No organization found' });
  if (appUser.role !== 'Levelset Admin')
    return res.status(403).json({ error: 'Insufficient permissions' });

  const orgId = appUser.org_id;

  const { document_id } = req.body;

  if (!document_id) {
    return res.status(400).json({ error: 'document_id is required' });
  }

  // Look up document and verify org ownership
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', document_id)
    .eq('org_id', orgId)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Verify digest record exists
  const { data: digest, error: digestError } = await supabase
    .from('document_digests')
    .select('id')
    .eq('document_id', document_id)
    .single();

  if (digestError || !digest) {
    // Create digest record if missing
    await supabase.from('document_digests').insert({
      document_id,
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

  // Determine extraction method
  const extractionMethod = getExtractionMethod(doc.source_type, doc.file_type);

  try {
    let text = '';
    let extractionMetadata: Record<string, any> = {};

    if (doc.source_type === 'url') {
      // URL-based documents: fetch HTML and extract with Defuddle
      if (!doc.original_url) {
        throw new Error('No original_url found for URL-type document');
      }

      const response = await fetch(doc.original_url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Levelset/1.0; +https://levelset.io)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch URL (${response.status}): ${doc.original_url}`
        );
      }

      const html = await response.text();
      const { Defuddle } = await import('defuddle/node');
      const result = await Defuddle(html, doc.original_url, {
        markdown: true,
      });

      text = result.contentMarkdown || result.content || '';
      extractionMetadata = {
        source_title: result.title || undefined,
        source_author: result.author || undefined,
        source_description: result.description || undefined,
        source_domain: result.domain || undefined,
      };
    } else if (!doc.storage_path) {
      throw new Error('No storage_path found for this document');
    } else {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('org_documents')
        .download(doc.storage_path);

      if (downloadError || !fileData) {
        throw new Error(
          `Failed to download file: ${downloadError?.message || 'Unknown error'}`
        );
      }

      // Extract text based on file type
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
        // OCR via OpenAI Vision API (GPT-4o) through OpenRouter
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          throw new Error(
            'OPENROUTER_API_KEY is not configured — required for image OCR'
          );
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = doc.file_type || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64}`;

        const ocrResponse = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://levelset.io',
              'X-Title': 'Levelset',
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o',
              messages: [
                {
                  role: 'system',
                  content:
                    'Extract all text from this image, preserving structure and formatting. Return the result as clean markdown. If no text is found, return an empty string.',
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: { url: dataUrl },
                    },
                    {
                      type: 'text',
                      text: 'Extract all text from this image.',
                    },
                  ],
                },
              ],
              max_tokens: 4096,
            }),
          }
        );

        if (!ocrResponse.ok) {
          const errBody = await ocrResponse.text();
          throw new Error(
            `OpenRouter OCR failed (${ocrResponse.status}): ${errBody}`
          );
        }

        const ocrData = await ocrResponse.json();
        text = ocrData.choices?.[0]?.message?.content || '';
      }
    }

    // Compute content hash
    const contentHash = crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');

    // Calculate word count
    const wordCount = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;

    // Update digest with extracted content
    const { error: updateError } = await supabase
      .from('document_digests')
      .update({
        content_md: text,
        content_hash: contentHash,
        extraction_method: extractionMethod,
        extraction_status: 'completed',
        extraction_error: null,
        metadata: { word_count: wordCount, ...extractionMetadata },
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', document_id);

    if (updateError) {
      throw new Error(`Failed to update digest: ${updateError.message}`);
    }

    // Get the digest ID for embedding indexing
    const { data: updatedDigest } = await supabase
      .from('document_digests')
      .select('id')
      .eq('document_id', document_id)
      .single();

    // Trigger embedding + PageIndex indexing (non-blocking, parallel)
    if (updatedDigest?.id && text.trim().length > 0) {
      indexDocumentChunks(updatedDigest.id, 'org_document', orgId, text)
        .catch((err) => console.error('[documents/process] Embedding indexing failed:', err));

      indexDocumentInPageIndex(updatedDigest.id, 'org_document', doc.file_type, doc.storage_path)
        .catch((err) => console.error('[documents/process] PageIndex indexing failed:', err));
    }

    return res.status(200).json({
      success: true,
      extraction_status: 'completed',
      word_count: wordCount,
    });
  } catch (err: any) {
    console.error('[documents/process] Extraction failed', err);

    // Set extraction status to failed
    await supabase
      .from('document_digests')
      .update({
        extraction_status: 'failed',
        extraction_error: err.message || 'Unknown extraction error',
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', document_id);

    return res.status(500).json({
      success: false,
      extraction_status: 'failed',
      error: err.message || 'Extraction failed',
    });
  }
}

function getExtractionMethod(
  sourceType: string | null,
  fileType: string | null
): string {
  if (sourceType === 'url') return 'web_scrape';
  if (!fileType) return 'text_extract';
  if (fileType.includes('pdf')) return 'pdf_extract';
  if (fileType.includes('word') || fileType.includes('officedocument'))
    return 'docx_extract';
  if (fileType.startsWith('image/')) return 'ocr';
  return 'text_extract';
}
