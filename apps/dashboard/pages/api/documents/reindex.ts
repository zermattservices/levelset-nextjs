/**
 * Batch reindex endpoint — processes all documents that need embedding or PageIndex indexing.
 * Levelset Admin only.
 *
 * POST /api/documents/reindex
 *
 * Finds all document_digests and global_document_digests where:
 * - extraction_status = 'completed' (content is available)
 * - embedding_status != 'completed' (hasn't been embedded yet)
 * - OR pageindex_indexed = false (hasn't been indexed in PageIndex)
 *
 * Processes each through the chunk indexing and PageIndex pipelines.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';
import { indexDocumentChunks } from '@/lib/document-indexing';
import { indexDocumentInPageIndex } from '@/lib/pageindex';

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
    global: { total: 0, success: 0, failed: 0, pageindex: 0, errors: [] as string[] },
    org: { total: 0, success: 0, failed: 0, pageindex: 0, errors: [] as string[] },
  };

  // 1. Process global document digests (embedding + PageIndex)
  const { data: globalDigests } = await supabase
    .from('global_document_digests')
    .select('id, document_id, content_md, pageindex_indexed')
    .eq('extraction_status', 'completed')
    .or('embedding_status.is.null,embedding_status.neq.completed,pageindex_indexed.eq.false');

  if (globalDigests && globalDigests.length > 0) {
    results.global.total = globalDigests.length;

    // Look up document metadata for PageIndex
    const docIds = globalDigests.map((d) => d.document_id);
    const { data: globalDocs } = await supabase
      .from('global_documents')
      .select('id, name, file_type, storage_path')
      .in('id', docIds);

    const docMap = new Map((globalDocs || []).map((d: any) => [d.id, d]));

    for (const digest of globalDigests) {
      const needsEmbedding = !digest.content_md || digest.content_md.trim().length === 0
        ? false
        : true;

      if (!digest.content_md || digest.content_md.trim().length === 0) {
        results.global.failed++;
        results.global.errors.push(`${digest.id}: no content_md`);
        continue;
      }

      try {
        // Embedding indexing
        await indexDocumentChunks(digest.id, 'global_document', null, digest.content_md);
        results.global.success++;
      } catch (err: any) {
        results.global.failed++;
        results.global.errors.push(`${digest.id}: ${err.message}`);
      }

      // PageIndex indexing (if not already indexed)
      if (!digest.pageindex_indexed) {
        const doc = docMap.get(digest.document_id);
        if (doc) {
          try {
            await indexDocumentInPageIndex(
              digest.id, 'global_document', digest.document_id,
              doc.file_type, doc.storage_path, digest.content_md, doc.name
            );
            results.global.pageindex++;
          } catch (err: any) {
            results.global.errors.push(`${digest.id} (pageindex): ${err.message}`);
          }
        }
      }
    }
  }

  // 2. Process org document digests (embedding + PageIndex)
  const { data: orgDigests } = await supabase
    .from('document_digests')
    .select('id, document_id, org_id, content_md, pageindex_indexed')
    .eq('extraction_status', 'completed')
    .or('embedding_status.is.null,embedding_status.neq.completed,pageindex_indexed.eq.false');

  if (orgDigests && orgDigests.length > 0) {
    results.org.total = orgDigests.length;

    // Look up document metadata for PageIndex
    const docIds = orgDigests.map((d) => d.document_id);
    const { data: orgDocs } = await supabase
      .from('documents')
      .select('id, name, file_type, storage_path')
      .in('id', docIds);

    const docMap = new Map((orgDocs || []).map((d: any) => [d.id, d]));

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

      // PageIndex indexing (if not already indexed)
      if (!digest.pageindex_indexed) {
        const doc = docMap.get(digest.document_id);
        if (doc) {
          try {
            await indexDocumentInPageIndex(
              digest.id, 'org_document', digest.document_id,
              doc.file_type, doc.storage_path, digest.content_md, doc.name
            );
            results.org.pageindex++;
          } catch (err: any) {
            results.org.errors.push(`${digest.id} (pageindex): ${err.message}`);
          }
        }
      }
    }
  }

  return res.status(200).json({
    success: true,
    summary: {
      global_documents: `${results.global.success}/${results.global.total} embedded, ${results.global.pageindex} pageindex`,
      org_documents: `${results.org.success}/${results.org.total} embedded, ${results.org.pageindex} pageindex`,
    },
    details: results,
  });
}
