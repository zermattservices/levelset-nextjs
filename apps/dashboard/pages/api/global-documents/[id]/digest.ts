import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  const auth = await requireLevelsetAdmin(req, res);
  if (!auth) return;

  const { supabase } = auth;

  // Verify global document exists (no org_id filter)
  const { data: doc, error: docError } = await supabase
    .from('global_documents')
    .select('id')
    .eq('id', id)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // GET: Return all digest versions for this document
  if (req.method === 'GET') {
    const { data: digests, error } = await supabase
      .from('global_document_digests')
      .select('*')
      .eq('document_id', id)
      .order('version', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(digests || []);
  }

  // PUT: Update digest content
  if (req.method === 'PUT') {
    const { digest_id, content_md } = req.body;

    if (!digest_id || typeof content_md !== 'string') {
      return res.status(400).json({ error: 'digest_id and content_md are required' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('global_document_digests')
      .update({
        content_md,
        updated_at: new Date().toISOString(),
      })
      .eq('id', digest_id)
      .eq('document_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[global-documents/digest] Failed to update digest content', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json(updated);
  }

  // POST: Trigger re-processing
  if (req.method === 'POST') {
    const { data: digest, error: fetchError } = await supabase
      .from('global_document_digests')
      .select('id')
      .eq('document_id', id)
      .single();

    if (fetchError || !digest) {
      // Create a digest record if one doesn't exist
      const { data: newDigest, error: createError } = await supabase
        .from('global_document_digests')
        .insert({
          document_id: id,
          extraction_status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        console.error(
          '[global-documents/digest] Failed to create digest',
          createError
        );
        return res.status(500).json({ error: createError.message });
      }

      return res.status(200).json(newDigest);
    }

    // Reset extraction status to pending
    const { data: updated, error: updateError } = await supabase
      .from('global_document_digests')
      .update({
        extraction_status: 'pending',
        extraction_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', id)
      .select()
      .single();

    if (updateError) {
      console.error(
        '[global-documents/digest] Failed to reset digest',
        updateError
      );
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
