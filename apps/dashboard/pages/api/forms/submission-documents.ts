import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';
import { validateLocationAccess } from '@/lib/native-auth';

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_SUBMISSION = 5;

function decodeJwt(token: string): { sub: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const decoded = decodeJwt(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createServerSupabaseClient();

  // Parse multipart form
  const form = new IncomingForm({ maxFileSize: MAX_FILE_SIZE });
  const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });

  const submissionId = Array.isArray(fields.submission_id)
    ? fields.submission_id[0]
    : fields.submission_id;
  const locationId = Array.isArray(fields.location_id)
    ? fields.location_id[0]
    : fields.location_id;

  if (!submissionId || !locationId) {
    return res.status(400).json({ error: 'submission_id and location_id are required' });
  }

  // Look up user's org
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', decoded.sub)
    .order('created_at');

  if (!appUsers || appUsers.length === 0) {
    return res.status(403).json({ error: 'No user profile found' });
  }

  const appUser = appUsers.find((u: any) => u.role === 'Levelset Admin') || appUsers[0];
  const orgId = appUser.org_id;

  if (!orgId) return res.status(403).json({ error: 'No organization found' });

  // Validate location access
  const location = await validateLocationAccess(decoded.sub, orgId, locationId);
  if (!location) return res.status(403).json({ error: 'No access to this location' });

  // Permission check
  const isAdmin = appUser.role === 'Levelset Admin';
  if (!isAdmin) {
    const hasPerm = await checkPermission(supabase, decoded.sub, orgId, P.DISC_SUBMIT_INFRACTIONS);
    if (!hasPerm) return res.status(403).json({ error: 'Permission denied' });
  }

  // Fetch the form submission and get infraction_id from metadata
  const { data: submission, error: subError } = await supabase
    .from('form_submissions')
    .select('id, metadata, org_id')
    .eq('id', submissionId)
    .eq('org_id', orgId)
    .single();

  if (subError || !submission) {
    return res.status(404).json({ error: 'Form submission not found' });
  }

  const infractionId = submission.metadata?.infraction_id;
  if (!infractionId) {
    return res.status(409).json({ error: 'Infraction not yet linked — dual-write may still be in progress. Retry shortly.' });
  }

  // Verify infraction exists
  const { data: infraction } = await supabase
    .from('infractions')
    .select('id')
    .eq('id', infractionId)
    .eq('org_id', orgId)
    .single();

  if (!infraction) {
    return res.status(404).json({ error: 'Linked infraction not found' });
  }

  // Check document count limit
  const { count: existingCount } = await supabase
    .from('infraction_documents')
    .select('id', { count: 'exact', head: true })
    .eq('infraction_id', infractionId);

  if ((existingCount ?? 0) >= MAX_FILES_PER_SUBMISSION) {
    return res.status(400).json({ error: 'Maximum document limit reached' });
  }

  // Get the uploaded file
  const fileArray = files.file;
  const uploadedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;
  if (!uploadedFile) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Validate MIME type
  const mimeType = uploadedFile.mimetype || '';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: `File type not allowed: ${mimeType}` });
  }

  // Upload to Supabase Storage
  const fileName = uploadedFile.originalFilename || 'document';
  const storagePath = `${orgId}/${infractionId}/${Date.now()}_${fileName}`;
  const fileBuffer = fs.readFileSync(uploadedFile.filepath);

  const { error: uploadError } = await supabase.storage
    .from('infraction-documents')
    .upload(storagePath, fileBuffer, { contentType: mimeType });

  if (uploadError) {
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Insert document record (same table as existing infraction documents)
  const { data: doc, error: docError } = await supabase
    .from('infraction_documents')
    .insert({
      infraction_id: infractionId,
      org_id: orgId,
      location_id: locationId,
      file_path: storagePath,
      file_name: fileName,
      file_type: mimeType,
      file_size: uploadedFile.size || 0,
      uploaded_by: decoded.sub,
    })
    .select('id, file_name')
    .single();

  if (docError) {
    return res.status(500).json({ error: 'Failed to save document record' });
  }

  return res.status(201).json({ id: doc.id, file_name: doc.file_name });
}
