import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
];

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

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

  // Verify document exists and belongs to org
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, current_version')
    .eq('id', id)
    .eq('org_id', orgId)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const { filename, content_type, file_size } = req.body;

  if (!filename || !content_type) {
    return res.status(400).json({ error: 'filename and content_type are required' });
  }

  if (!ALLOWED_TYPES.includes(content_type)) {
    return res.status(400).json({
      error: 'File type not allowed. Accepted: PDF, DOC, DOCX, TXT, MD, JPEG, PNG, WebP',
    });
  }

  if (file_size && file_size > MAX_FILE_SIZE) {
    return res.status(400).json({ error: 'File exceeds 100MB limit' });
  }

  const sanitized = sanitizeFilename(filename);
  const storagePath = `${orgId}/${doc.id}/${sanitized}`;
  const newVersion = (doc.current_version || 1) + 1;

  const { data, error } = await supabase.storage
    .from('org_documents')
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (error) {
    console.error('[documents/replace-url] Failed to create signed URL', error);
    return res.status(500).json({ error: 'Failed to create upload URL' });
  }

  return res.status(200).json({
    signed_url: data.signedUrl,
    token: data.token,
    storage_path: storagePath,
    new_version: newVersion,
  });
}
