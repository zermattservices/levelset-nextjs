import type { NextApiRequest, NextApiResponse } from 'next';
import { requireLevelsetAdmin } from '@/lib/api-auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  const auth = await requireLevelsetAdmin(req, res);
  if (!auth) return;

  const { supabase } = auth;

  // GET: Get single global document with details
  if (req.method === 'GET') {
    const { data: doc, error } = await supabase
      .from('global_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Fetch digest
    const { data: digest } = await supabase
      .from('global_document_digests')
      .select('*')
      .eq('document_id', id)
      .single();

    // Fetch versions
    const { data: versions } = await supabase
      .from('global_document_versions')
      .select('*')
      .eq('document_id', id)
      .order('version_number', { ascending: false });

    // Generate signed URL if storage_path exists
    let signedUrl: string | null = null;
    if (doc.storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from('global_documents')
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
    const { name, description, category, folder_id, raw_content } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (folder_id !== undefined) updates.folder_id = folder_id;
    if (raw_content !== undefined) updates.raw_content = raw_content;

    const { data: updated, error } = await supabase
      .from('global_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[global-documents] Failed to update document', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(updated);
  }

  // DELETE: Delete document and associated files
  if (req.method === 'DELETE') {
    const { data: doc, error: fetchError } = await supabase
      .from('global_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove the main file from storage
    if (doc.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('global_documents')
        .remove([doc.storage_path]);

      if (storageError) {
        console.error(
          '[global-documents] Failed to remove file from storage',
          storageError
        );
      }
    }

    // Remove version files from storage
    const { data: versions } = await supabase
      .from('global_document_versions')
      .select('storage_path')
      .eq('document_id', id);

    if (versions && versions.length > 0) {
      const versionPaths = versions
        .map((v) => v.storage_path)
        .filter(Boolean) as string[];

      if (versionPaths.length > 0) {
        const { error: versionStorageError } = await supabase.storage
          .from('global_documents')
          .remove(versionPaths);

        if (versionStorageError) {
          console.error(
            '[global-documents] Failed to remove version files from storage',
            versionStorageError
          );
        }
      }
    }

    // Delete from database (cascades to digests and versions)
    const { error: deleteError } = await supabase
      .from('global_documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[global-documents] Failed to delete document', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
