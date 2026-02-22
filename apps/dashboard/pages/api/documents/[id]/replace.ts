import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

  const supabase = createServerSupabaseClient();

  // Authenticate
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

  const { intent, storage_path, file_type, file_size, original_filename, new_version } = req.body;

  if (intent !== 'finalize') {
    return res.status(400).json({ error: 'Invalid intent. Expected "finalize".' });
  }

  if (!storage_path || !new_version) {
    return res.status(400).json({ error: 'storage_path and new_version are required' });
  }

  // Look up existing document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Archive current version in document_versions
  const { error: versionError } = await supabase
    .from('document_versions')
    .insert({
      document_id: doc.id,
      version_number: doc.current_version,
      storage_path: doc.storage_path,
      file_size: doc.file_size,
      replaced_by: appUser.id,
    });

  if (versionError) {
    console.error('[documents/replace] Failed to archive version', versionError);
    return res.status(500).json({ error: 'Failed to archive current version' });
  }

  // Update document record
  const { data: updated, error: updateError } = await supabase
    .from('documents')
    .update({
      storage_path,
      file_size: file_size || null,
      file_type: file_type || null,
      original_filename: original_filename || null,
      current_version: new_version,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (updateError) {
    console.error('[documents/replace] Failed to update document', updateError);
    return res.status(500).json({ error: updateError.message });
  }

  // Store previous digest content and reset extraction status
  const { data: existingDigest } = await supabase
    .from('document_digests')
    .select('content_md')
    .eq('document_id', id)
    .single();

  if (existingDigest) {
    const { error: digestError } = await supabase
      .from('document_digests')
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
        '[documents/replace] Failed to reset digest',
        digestError
      );
    }
  }

  return res.status(200).json(updated);
}
