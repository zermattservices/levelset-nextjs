import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import formidable from 'formidable';
import fs from 'fs';

// Disable Next.js body parser for multipart uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_INFRACTION = 5;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenParam = req.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  // Validate token
  const location = await fetchLocationByToken(token);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  if (!location.org_id) {
    return res.status(500).json({ error: 'Location is missing org reference' });
  }

  // Parse multipart form
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 1,
  });

  let fields: formidable.Fields;
  let files: formidable.Files;

  try {
    [fields, files] = await form.parse(req);
  } catch (err: any) {
    console.error('[mobile-documents] Form parse error', err);
    if (err.code === formidable.errors.biggerThanMaxFileSize) {
      return res.status(400).json({ error: 'File exceeds 10MB limit' });
    }
    return res.status(400).json({ error: 'Failed to parse upload' });
  }

  // Get infraction_id from form fields
  const infractionIdField = fields.infraction_id;
  const infractionId = Array.isArray(infractionIdField) ? infractionIdField[0] : infractionIdField;

  if (!infractionId) {
    return res.status(400).json({ error: 'Missing infraction_id' });
  }

  const supabase = createServerSupabaseClient();

  // Verify the infraction exists and belongs to this location
  const { data: infraction, error: infractionError } = await supabase
    .from('infractions')
    .select('id, org_id, location_id')
    .eq('id', infractionId)
    .eq('location_id', location.id)
    .single();

  if (infractionError || !infraction) {
    return res.status(404).json({ error: 'Infraction not found for this location' });
  }

  // Check existing document count
  const { count, error: countError } = await supabase
    .from('infraction_documents')
    .select('id', { count: 'exact', head: true })
    .eq('infraction_id', infractionId);

  if (countError) {
    console.error('[mobile-documents] Failed to count documents', countError);
    return res.status(500).json({ error: 'Failed to check document count' });
  }

  if ((count ?? 0) >= MAX_FILES_PER_INFRACTION) {
    return res.status(400).json({
      error: `Maximum of ${MAX_FILES_PER_INFRACTION} documents per infraction`,
    });
  }

  const fileArray = files.file;
  const uploadedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;

  if (!uploadedFile) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Validate file type
  const mimeType = uploadedFile.mimetype || '';
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return res.status(400).json({
      error: 'File type not allowed. Accepted: JPEG, PNG, HEIC, WebP, PDF',
    });
  }

  // Read file buffer
  const fileBuffer = fs.readFileSync(uploadedFile.filepath);
  const originalName = uploadedFile.originalFilename || 'unnamed';
  const sanitized = sanitizeFilename(originalName);
  const timestamp = Date.now();
  const storagePath = `${infraction.org_id}/${infractionId}/${timestamp}_${sanitized}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('infraction_documents')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('[mobile-documents] Storage upload failed', uploadError);
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Insert record into database
  const { data: docRecord, error: insertError } = await supabase
    .from('infraction_documents')
    .insert({
      infraction_id: infractionId,
      org_id: infraction.org_id,
      location_id: infraction.location_id,
      file_path: storagePath,
      file_name: originalName,
      file_type: mimeType,
      file_size: uploadedFile.size || fileBuffer.length,
      uploaded_by: 'mobile',
    })
    .select('id, file_name')
    .single();

  if (insertError) {
    console.error('[mobile-documents] DB insert failed', insertError);
    // Clean up the uploaded file
    await supabase.storage.from('infraction_documents').remove([storagePath]);
    return res.status(500).json({ error: 'Failed to save document record' });
  }

  // Clean up temp file
  try {
    fs.unlinkSync(uploadedFile.filepath);
  } catch {
    // Ignore cleanup errors
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json({
    id: docRecord.id,
    file_name: docRecord.file_name,
  });
}
