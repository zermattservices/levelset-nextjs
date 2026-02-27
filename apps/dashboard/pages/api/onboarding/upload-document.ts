/**
 * POST /api/onboarding/upload-document
 *
 * Creates a signed upload URL for a document during onboarding.
 * Returns the signed URL and document ID for the client to upload to.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'Complete account setup first' });
  }

  const { orgId, fileName, fileType, fileSize } = req.body;

  if (!fileName || !fileType) {
    return res.status(400).json({ error: 'fileName and fileType are required' });
  }

  // Validate file size (25 MB limit)
  if (fileSize && fileSize > 25 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Maximum size is 25 MB.' });
  }

  try {
    // Generate a unique storage path
    const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const timestamp = Date.now();
    const storagePath = `${appUser.org_id}/onboarding/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Create signed upload URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from('documents')
      .createSignedUploadUrl(storagePath);

    if (signedError || !signedData) {
      throw new Error(signedError?.message || 'Failed to create upload URL');
    }

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        org_id: appUser.org_id,
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize || null,
        storage_path: storagePath,
        category: 'onboarding',
        uploaded_by: appUser.id,
      })
      .select('id')
      .single();

    if (docError || !doc) {
      throw new Error(docError?.message || 'Failed to create document record');
    }

    return res.status(200).json({
      signedUrl: signedData.signedUrl,
      documentId: doc.id,
      storagePath,
    });
  } catch (err: any) {
    console.error('upload-document error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
