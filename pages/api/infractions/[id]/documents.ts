import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
  const idParam = req.query.id;
  const infractionId = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!infractionId) {
    return res.status(400).json({ error: 'Missing infraction ID' });
  }

  const supabase = createServerSupabaseClient();

  // GET: List documents with signed URLs
  if (req.method === 'GET') {
    const { data: docs, error } = await supabase
      .from('infraction_documents')
      .select('*')
      .eq('infraction_id', infractionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[documents] Failed to fetch documents', error);
      return res.status(500).json({ error: 'Failed to fetch documents' });
    }

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        const { data: signedData } = await supabase.storage
          .from('infraction_documents')
          .createSignedUrl(doc.file_path, 3600); // 1-hour expiry

        return {
          ...doc,
          url: signedData?.signedUrl || null,
        };
      })
    );

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ documents: documentsWithUrls });
  }

  // POST: Upload a new document
  if (req.method === 'POST') {
    // Check existing document count
    const { count, error: countError } = await supabase
      .from('infraction_documents')
      .select('id', { count: 'exact', head: true })
      .eq('infraction_id', infractionId);

    if (countError) {
      console.error('[documents] Failed to count documents', countError);
      return res.status(500).json({ error: 'Failed to check document count' });
    }

    if ((count ?? 0) >= MAX_FILES_PER_INFRACTION) {
      return res.status(400).json({
        error: `Maximum of ${MAX_FILES_PER_INFRACTION} documents per infraction`,
      });
    }

    // Get infraction to know the org_id and location_id
    const { data: infraction, error: infractionError } = await supabase
      .from('infractions')
      .select('org_id, location_id')
      .eq('id', infractionId)
      .single();

    if (infractionError || !infraction) {
      return res.status(404).json({ error: 'Infraction not found' });
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
      console.error('[documents] Form parse error', err);
      if (err.code === formidable.errors.biggerThanMaxFileSize) {
        return res.status(400).json({ error: 'File exceeds 10MB limit' });
      }
      return res.status(400).json({ error: 'Failed to parse upload' });
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
        error: `File type not allowed. Accepted: JPEG, PNG, HEIC, WebP, PDF`,
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
      console.error('[documents] Storage upload failed', uploadError);
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
      })
      .select()
      .single();

    if (insertError) {
      console.error('[documents] DB insert failed', insertError);
      // Try to clean up the uploaded file
      await supabase.storage.from('infraction_documents').remove([storagePath]);
      return res.status(500).json({ error: 'Failed to save document record' });
    }

    // Generate signed URL for the response
    const { data: signedData } = await supabase.storage
      .from('infraction_documents')
      .createSignedUrl(storagePath, 3600);

    // Clean up temp file
    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch {
      // Ignore cleanup errors
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json({
      document: {
        ...docRecord,
        url: signedData?.signedUrl || null,
      },
    });
  }

  // DELETE: Remove a document
  if (req.method === 'DELETE') {
    const documentId = req.query.document_id;
    const docId = Array.isArray(documentId) ? documentId[0] : documentId;

    if (!docId) {
      return res.status(400).json({ error: 'Missing document_id parameter' });
    }

    // Fetch the document to get file_path
    const { data: doc, error: fetchError } = await supabase
      .from('infraction_documents')
      .select('file_path')
      .eq('id', docId)
      .eq('infraction_id', infractionId)
      .single();

    if (fetchError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('infraction_documents')
      .remove([doc.file_path]);

    if (storageError) {
      console.error('[documents] Storage delete failed', storageError);
      // Continue to delete the DB record anyway
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('infraction_documents')
      .delete()
      .eq('id', docId);

    if (deleteError) {
      console.error('[documents] DB delete failed', deleteError);
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
