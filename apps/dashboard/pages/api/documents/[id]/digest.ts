import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  // Get authenticated user
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  // Get app user and resolve org
  const requestedOrgId = req.headers['x-org-id'] as string | undefined;

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at');

  let appUser = requestedOrgId
    ? appUsers?.find((u) => u.org_id === requestedOrgId)
    : null;
  if (!appUser) appUser = appUsers?.[0] ?? null;
  if (!appUser?.org_id)
    return res.status(403).json({ error: 'No organization found' });

  // Levelset Admins can scope to any org via x-org-id header
  const orgId = (appUser.role === 'Levelset Admin' && requestedOrgId)
    ? requestedOrgId
    : appUser.org_id;

  // Verify document belongs to this org
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // GET: Return digest for this document
  if (req.method === 'GET') {
    const { data: digest, error } = await supabase
      .from('document_digests')
      .select('*')
      .eq('document_id', id)
      .single();

    if (error || !digest) {
      return res.status(404).json({ error: 'Digest not found' });
    }

    return res.status(200).json(digest);
  }

  // POST: Trigger re-processing
  if (req.method === 'POST') {
    const { data: digest, error: fetchError } = await supabase
      .from('document_digests')
      .select('id')
      .eq('document_id', id)
      .single();

    if (fetchError || !digest) {
      // Create a digest record if one doesn't exist
      const { data: newDigest, error: createError } = await supabase
        .from('document_digests')
        .insert({
          document_id: id,
          org_id: orgId,
          extraction_status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        console.error('[documents/digest] Failed to create digest', createError);
        return res.status(500).json({ error: createError.message });
      }

      return res.status(200).json(newDigest);
    }

    // Reset extraction status to pending
    const { data: updated, error: updateError } = await supabase
      .from('document_digests')
      .update({
        extraction_status: 'pending',
        extraction_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('document_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[documents/digest] Failed to reset digest', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
