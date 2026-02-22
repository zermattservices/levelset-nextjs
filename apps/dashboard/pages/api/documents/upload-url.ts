import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import crypto from 'crypto';

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
  // Use x-org-id header to scope to the correct org when user has multiple
  const requestedOrgId = req.headers['x-org-id'] as string | undefined;

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at');

  let appUser = requestedOrgId
    ? appUsers?.find((u) => u.org_id === requestedOrgId && u.role === 'Levelset Admin')
    : appUsers?.find((u) => u.role === 'Levelset Admin');
  if (!appUser) appUser = appUsers?.[0] ?? null;
  if (!appUser?.org_id)
    return res.status(403).json({ error: 'No organization found' });
  if (appUser.role !== 'Levelset Admin')
    return res.status(403).json({ error: 'Insufficient permissions' });

  const orgId = appUser.org_id;

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

  const documentId = crypto.randomUUID();
  const sanitized = sanitizeFilename(filename);
  const storagePath = `${orgId}/${documentId}/${sanitized}`;

  const { data, error } = await supabase.storage
    .from('org_documents')
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error('[documents/upload-url] Failed to create signed URL', error);
    return res.status(500).json({ error: 'Failed to create upload URL' });
  }

  return res.status(200).json({
    signed_url: data.signedUrl,
    token: data.token,
    storage_path: storagePath,
  });
}
