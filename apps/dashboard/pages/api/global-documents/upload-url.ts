import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';
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

  const auth = await requireLevelsetAdmin(req, res);
  if (!auth) return;

  const { supabase } = auth;

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
  const storagePath = `${documentId}/${sanitized}`;

  const { data, error } = await supabase.storage
    .from('global_documents')
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error('[global-documents/upload-url] Failed to create signed URL', error);
    return res.status(500).json({ error: 'Failed to create upload URL' });
  }

  return res.status(200).json({
    signed_url: data.signedUrl,
    token: data.token,
    storage_path: storagePath,
  });
}
