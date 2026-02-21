import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const supabase = createServerSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

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

  // GET: Get single document with details
  if (req.method === 'GET') {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Fetch digest
    const { data: digest } = await supabase
      .from('document_digests')
      .select('*')
      .eq('document_id', id)
      .single();

    // Fetch versions
    const { data: versions } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', id)
      .order('version_number', { ascending: false });

    // Generate signed URL if storage_path exists
    let signedUrl: string | null = null;
    if (doc.storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from('org_documents')
        .createSignedUrl(doc.storage_path, 3600);
      signedUrl = signedUrlData?.signedUrl || null;
    }

    return res.status(200).json({
      ...doc,
      signed_url: signedUrl,
      digest: digest || null,
      versions: versions || [],
    });
  }

  // PUT: Update document metadata
  if (req.method === 'PUT') {
    const { name, description, category, folder_id } = req.body;

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (folder_id !== undefined) updates.folder_id = folder_id;

    const { data: updated, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[documents] Failed to update document', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(updated);
  }

  // DELETE: Delete document and associated files
  if (req.method === 'DELETE') {
    // Fetch the document first
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove the main file from storage
    if (doc.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('org_documents')
        .remove([doc.storage_path]);

      if (storageError) {
        console.error('[documents] Failed to remove file from storage', storageError);
        // Continue with deletion anyway
      }
    }

    // Remove version files from storage
    const { data: versions } = await supabase
      .from('document_versions')
      .select('storage_path')
      .eq('document_id', id);

    if (versions && versions.length > 0) {
      const versionPaths = versions
        .map((v) => v.storage_path)
        .filter(Boolean) as string[];

      if (versionPaths.length > 0) {
        const { error: versionStorageError } = await supabase.storage
          .from('org_documents')
          .remove(versionPaths);

        if (versionStorageError) {
          console.error(
            '[documents] Failed to remove version files from storage',
            versionStorageError
          );
        }
      }
    }

    // Delete from database (cascades to digests and versions)
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (deleteError) {
      console.error('[documents] Failed to delete document', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
