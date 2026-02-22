import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  const auth = await requireLevelsetAdmin(req, res);
  if (!auth) return;

  const { supabase, appUser } = auth;

  const { intent, storage_path, file_type, file_size, original_filename, new_version } = req.body;

  if (intent !== 'finalize') {
    return res.status(400).json({ error: 'Invalid intent. Expected "finalize".' });
  }

  if (!storage_path || !new_version) {
    return res.status(400).json({ error: 'storage_path and new_version are required' });
  }

  // Look up existing global document
  const { data: doc, error: docError } = await supabase
    .from('global_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Archive current version in global_document_versions
  const { error: versionError } = await supabase
    .from('global_document_versions')
    .insert({
      document_id: doc.id,
      version_number: doc.current_version,
      storage_path: doc.storage_path,
      file_size: doc.file_size,
      replaced_by: appUser.id,
    });

  if (versionError) {
    console.error(
      '[global-documents/replace] Failed to archive version',
      versionError
    );
    return res.status(500).json({ error: 'Failed to archive current version' });
  }

  // Update document record
  const { data: updated, error: updateError } = await supabase
    .from('global_documents')
    .update({
      storage_path,
      file_size: file_size || null,
      file_type: file_type || null,
      original_filename: original_filename || null,
      current_version: new_version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error(
      '[global-documents/replace] Failed to update document',
      updateError
    );
    return res.status(500).json({ error: updateError.message });
  }

  // Store previous digest content and reset extraction status
  const { data: existingDigest } = await supabase
    .from('global_document_digests')
    .select('content_md')
    .eq('document_id', id)
    .single();

  if (existingDigest) {
    const { error: digestError } = await supabase
      .from('global_document_digests')
      .update({
        previous_content_md: existingDigest.content_md,
        content_md: null,
        content_hash: null,
        extraction_status: 'pending',
        extraction_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', id);

    if (digestError) {
      console.error(
        '[global-documents/replace] Failed to reset digest',
        digestError
      );
    }
  }

  return res.status(200).json(updated);
}
