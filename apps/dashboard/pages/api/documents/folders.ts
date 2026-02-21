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

  // GET: List folders
  if (req.method === 'GET') {
    const { parent_folder_id } = req.query;

    let query = supabase
      .from('document_folders')
      .select('*')
      .eq('org_id', orgId);

    // Filter by parent_folder_id (null = root level)
    if (
      parent_folder_id === 'null' ||
      parent_folder_id === 'root' ||
      parent_folder_id === undefined
    ) {
      query = query.is('parent_folder_id', null);
    } else if (typeof parent_folder_id === 'string') {
      query = query.eq('parent_folder_id', parent_folder_id);
    }

    query = query.order('name', { ascending: true });

    const { data: folders, error } = await query;

    if (error) {
      console.error('[documents/folders] Failed to list folders', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(folders || []);
  }

  // POST: Create folder
  if (req.method === 'POST') {
    const { name, parent_folder_id } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const { data: folder, error } = await supabase
      .from('document_folders')
      .insert({
        org_id: orgId,
        name: name.trim(),
        parent_folder_id: parent_folder_id || null,
        created_by: appUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[documents/folders] Failed to create folder', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(folder);
  }

  // PUT: Rename folder
  if (req.method === 'PUT') {
    const { id, name } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Folder ID is required' });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const { data: folder, error } = await supabase
      .from('document_folders')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[documents/folders] Failed to rename folder', error);
      return res.status(500).json({ error: error.message });
    }

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    return res.status(200).json(folder);
  }

  // DELETE: Delete folder (must be empty)
  if (req.method === 'DELETE') {
    const folderId = req.query.id;

    if (!folderId || typeof folderId !== 'string') {
      return res.status(400).json({ error: 'Folder ID is required' });
    }

    // Verify folder exists and belongs to org
    const { data: folder, error: fetchError } = await supabase
      .from('document_folders')
      .select('id')
      .eq('id', folderId)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Check for documents in this folder
    const { count: docCount, error: docCountError } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folderId)
      .eq('org_id', orgId);

    if (docCountError) {
      console.error('[documents/folders] Failed to count documents', docCountError);
      return res.status(500).json({ error: 'Failed to check folder contents' });
    }

    if ((docCount ?? 0) > 0) {
      return res.status(400).json({
        error: 'Folder is not empty. Remove all documents before deleting.',
      });
    }

    // Check for subfolders
    const { count: subfolderCount, error: subfolderCountError } = await supabase
      .from('document_folders')
      .select('id', { count: 'exact', head: true })
      .eq('parent_folder_id', folderId)
      .eq('org_id', orgId);

    if (subfolderCountError) {
      console.error(
        '[documents/folders] Failed to count subfolders',
        subfolderCountError
      );
      return res.status(500).json({ error: 'Failed to check folder contents' });
    }

    if ((subfolderCount ?? 0) > 0) {
      return res.status(400).json({
        error: 'Folder contains subfolders. Remove all subfolders before deleting.',
      });
    }

    // Delete the folder
    const { error: deleteError } = await supabase
      .from('document_folders')
      .delete()
      .eq('id', folderId)
      .eq('org_id', orgId);

    if (deleteError) {
      console.error('[documents/folders] Failed to delete folder', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
