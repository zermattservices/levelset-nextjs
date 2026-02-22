/**
 * Batch reindex endpoint — processes all documents that need embedding.
 * Levelset Admin only.
 *
 * POST /api/documents/reindex
 *
 * Finds all document_digests and global_document_digests where:
 * - extraction_status = 'completed' (content is available)
 * - embedding_status != 'completed' (hasn't been embedded yet)
 *
 * Processes each through the chunk indexing pipeline.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';
import { indexDocumentChunks } from '@/lib/document-indexing';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireLevelsetAdmin(req, res);
  if (!auth) return;

  const { supabase } = auth;

  const results = {
    global: { total: 0, success: 0, failed: 0, errors: [] as string[] },
    org: { total: 0, success: 0, failed: 0, errors: [] as string[] },
  };

  // 1. Process global document digests
  const { data: globalDigests } = await supabase
    .from('global_document_digests')
    .select('id, document_id, content_md')
    .eq('extraction_status', 'completed')
    .or('embedding_status.is.null,embedding_status.neq.completed');

  if (globalDigests && globalDigests.length > 0) {
    results.global.total = globalDigests.length;

    for (const digest of globalDigests) {
      if (!digest.content_md || digest.content_md.trim().length === 0) {
        results.global.failed++;
        results.global.errors.push(`${digest.id}: no content_md`);
        continue;
      }

      try {
        await indexDocumentChunks(digest.id, 'global_document', null, digest.content_md);
        results.global.success++;
      } catch (err: any) {
        results.global.failed++;
        results.global.errors.push(`${digest.id}: ${err.message}`);
      }
    }
  }

  // 2. Process org document digests
  const { data: orgDigests } = await supabase
    .from('document_digests')
    .select('id, document_id, org_id, content_md')
    .eq('extraction_status', 'completed')
    .or('embedding_status.is.null,embedding_status.neq.completed');

  if (orgDigests && orgDigests.length > 0) {
    results.org.total = orgDigests.length;

    for (const digest of orgDigests) {
      if (!digest.content_md || digest.content_md.trim().length === 0) {
        results.org.failed++;
        results.org.errors.push(`${digest.id}: no content_md`);
        continue;
      }

      try {
        await indexDocumentChunks(digest.id, 'org_document', digest.org_id, digest.content_md);
        results.org.success++;
      } catch (err: any) {
        results.org.failed++;
        results.org.errors.push(`${digest.id}: ${err.message}`);
      }
    }
  }

  return res.status(200).json({
    success: true,
    summary: {
      global_documents: `${results.global.success}/${results.global.total} indexed`,
      org_documents: `${results.org.success}/${results.org.total} indexed`,
    },
    details: results,
  });
}
