import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import formidable from 'formidable';
import fs from 'fs';

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

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
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

  // Look up existing global document (no org_id filter)
  const { data: doc, error: docError } = await supabase
    .from('global_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (docError || !doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Parse multipart form
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  });

  let files: formidable.Files;

  try {
    [, files] = await form.parse(req);
  } catch (err: any) {
    console.error('[global-documents/replace] Form parse error', err);
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

  // Upload new file to storage (no org_id prefix for global docs)
  const originalName = uploadedFile.originalFilename || 'unnamed';
  const sanitized = sanitizeFilename(originalName);
  const newStoragePath = `${doc.id}/${sanitized}`;

  const fileBuffer = fs.readFileSync(uploadedFile.filepath);

  const { error: uploadError } = await supabase.storage
    .from('global_documents')
    .upload(newStoragePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    console.error(
      '[global-documents/replace] Storage upload failed',
      uploadError
    );
    return res.status(500).json({ error: 'Failed to upload replacement file' });
  }

  // Clean up temp file
  try {
    fs.unlinkSync(uploadedFile.filepath);
  } catch {
    // Ignore cleanup errors
  }

  // Update document record
  const newVersion = (doc.current_version || 1) + 1;

  const { data: updated, error: updateError } = await supabase
    .from('global_documents')
    .update({
      storage_path: newStoragePath,
      file_size: uploadedFile.size || fileBuffer.length,
      file_type: mimeType,
      original_filename: originalName,
      current_version: newVersion,
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
