import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await requireLevelsetAdmin(req, res);
  if (!auth) return;

  const { supabase, appUser } = auth;

  // GET: List global documents
  if (req.method === 'GET') {
    const { folder_id, category, search } = req.query;

    let query = supabase
      .from('global_documents')
      .select(
        `
        *,
        uploaded_by_user:app_users!global_documents_uploaded_by_fkey(id, full_name),
        global_document_digests(id, extraction_status)
      `
      );

    // Filter by folder_id (null means root level)
    if (folder_id === 'null' || folder_id === 'root') {
      query = query.is('folder_id', null);
    } else if (folder_id && typeof folder_id === 'string') {
      query = query.eq('folder_id', folder_id);
    }

    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    if (search && typeof search === 'string') {
      query = query.ilike('name', `%${search}%`);
    }

    query = query.order('name', { ascending: true });

    const { data: documents, error } = await query;

    if (error) {
      console.error('[global-documents] Failed to list documents', error);
      return res.status(500).json({ error: error.message });
    }

    // Transform joined data
    const transformed = (documents || []).map((doc: any) => ({
      ...doc,
      uploaded_by_name: doc.uploaded_by_user?.full_name || null,
      extraction_status:
        doc.global_document_digests?.[0]?.extraction_status || null,
      uploaded_by_user: undefined,
      global_document_digests: undefined,
    }));

    return res.status(200).json(transformed);
  }

  // POST: Create a global document
  if (req.method === 'POST') {
    const { intent } = req.body;

    if (intent !== 'create') {
      return res.status(400).json({ error: 'Invalid intent' });
    }

    const {
      name,
      description,
      category,
      source_type,
      folder_id,
      storage_path,
      original_url,
      original_filename,
      file_type,
      file_size,
    } = req.body;

    if (!name || !category || !source_type) {
      return res.status(400).json({
        error: 'name, category, and source_type are required',
      });
    }

    const { data: document, error: insertError } = await supabase
      .from('global_documents')
      .insert({
        name,
        description: description || null,
        category,
        source_type,
        folder_id: folder_id || null,
        storage_path: storage_path || null,
        original_url: original_url || null,
        original_filename: original_filename || null,
        file_type: file_type || null,
        file_size: file_size || null,
        uploaded_by: appUser.id,
        current_version: 1,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[global-documents] Failed to create document', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Create initial digest record
    const { error: digestError } = await supabase
      .from('global_document_digests')
      .insert({
        document_id: document.id,
        extraction_status: 'pending',
      });

    if (digestError) {
      console.error(
        '[global-documents] Failed to create digest record',
        digestError
      );
    }

    return res.status(201).json(document);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
