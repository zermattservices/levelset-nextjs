import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();

  // Get authenticated user
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

  // GET: List documents
  if (req.method === 'GET') {
    const { folder_id, category, search } = req.query;

    let query = supabase
      .from('documents')
      .select(
        `
        *,
        uploaded_by_user:app_users!documents_uploaded_by_fkey(id, first_name, last_name),
        document_digests(id, extraction_status)
      `
      )
      .eq('org_id', orgId);

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
      console.error('[documents] Failed to list documents', error);
      return res.status(500).json({ error: error.message });
    }

    // Transform joined data
    const transformed = (documents || []).map((doc: any) => ({
      ...doc,
      uploaded_by_name: doc.uploaded_by_user
        ? [doc.uploaded_by_user.first_name, doc.uploaded_by_user.last_name].filter(Boolean).join(' ')
        : null,
      extraction_status: doc.document_digests?.[0]?.extraction_status || null,
      uploaded_by_user: undefined,
      document_digests: undefined,
    }));

    return res.status(200).json(transformed);
  }

  // POST: Create a document
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

    // Validate required fields
    if (!name || !category || !source_type) {
      return res.status(400).json({
        error: 'name, category, and source_type are required',
      });
    }

    // Insert document
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        org_id: orgId,
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
      console.error('[documents] Failed to create document', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Create initial digest record
    const { error: digestError } = await supabase
      .from('document_digests')
      .insert({
        document_id: document.id,
        extraction_status: 'pending',
      });

    if (digestError) {
      console.error('[documents] Failed to create digest record', digestError);
      // Document was created successfully, don't fail the request
    }

    return res.status(201).json(document);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
