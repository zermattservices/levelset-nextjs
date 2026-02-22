import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import formidable from 'formidable';
import fs from 'fs';
import crypto from 'crypto';

// Disable Next.js body parser for multipart uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
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

  // Authenticate manually (can't use middleware with bodyParser disabled)
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

  // Parse multipart form
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  });

  let files: formidable.Files;

  try {
    [, files] = await form.parse(req);
  } catch (err: any) {
    console.error('[global-documents/upload] Form parse error', err);
    if (err.code === formidable.errors.biggerThanMaxFileSize) {
      return res.status(400).json({ error: 'File exceeds 25MB limit' });
    }
    return res.status(400).json({ error: 'Failed to parse upload' });
  }

  const fileArray = files.file;
  const uploadedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;

  if (!uploadedFile) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Validate MIME type
  const mimeType = uploadedFile.mimetype || '';
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({
      error: `File type not allowed. Accepted: PDF, DOC, DOCX, TXT, MD, JPEG, PNG, WebP`,
    });
  }

  // Generate a document_id for the storage path (no org_id prefix for global docs)
  const documentId = crypto.randomUUID();
  const originalName = uploadedFile.originalFilename || 'unnamed';
  const sanitized = sanitizeFilename(originalName);
  const storagePath = `${documentId}/${sanitized}`;

  // Read file buffer and upload to Supabase storage
  const fileBuffer = fs.readFileSync(uploadedFile.filepath);

  const { error: uploadError } = await supabase.storage
    .from('global_documents')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[global-documents/upload] Storage upload failed', uploadError);
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Clean up temp file
  try {
    fs.unlinkSync(uploadedFile.filepath);
  } catch {
    // Ignore cleanup errors
  }

  return res.status(200).json({
    document_id: documentId,
    storage_path: storagePath,
    file_type: mimeType,
    file_size: uploadedFile.size || fileBuffer.length,
    original_filename: originalName,
  });
}
