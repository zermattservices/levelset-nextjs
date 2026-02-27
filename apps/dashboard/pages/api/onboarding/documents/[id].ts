/**
 * GET/PUT/DELETE /api/onboarding/documents/[id]
 *
 * Document detail, update, and delete during onboarding.
 * Same as /api/documents/[id] but without Levelset Admin role check.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateOnboardingUser } from '@/lib/onboarding/documents-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Document ID is required' });
  }

  const auth = await authenticateOnboardingUser(req, res);
  if (!auth) return;

  const { supabase, orgId } = auth;

  // GET: Get single document with download URL
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
    });
  }

  // PUT: Update document metadata
  if (req.method === 'PUT') {
    const { name, description, category } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;

    const { data: updated, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      console.error('[onboarding/documents] Failed to update', error);
      return res.status(500).json({ error: error.message });
    }

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }

    return res.status(200).json(updated);
  }

  // DELETE: Delete document and storage file
  if (req.method === 'DELETE') {
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (fetchError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (doc.storage_path) {
      await supabase.storage
        .from('org_documents')
        .remove([doc.storage_path]);
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (deleteError) {
      console.error('[onboarding/documents] Failed to delete', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
