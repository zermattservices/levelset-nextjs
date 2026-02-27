/**
 * GET/POST /api/onboarding/documents
 *
 * List and create documents during onboarding.
 * Same as /api/documents but without Levelset Admin role check.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateOnboardingUser } from '@/lib/onboarding/documents-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await authenticateOnboardingUser(req, res);
  if (!auth) return;

  const { supabase, appUser, orgId } = auth;

  // GET: List documents
  if (req.method === 'GET') {
    const { category, search } = req.query;

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

    if (category && typeof category === 'string') {
      query = query.eq('category', category);
    }

    if (search && typeof search === 'string') {
      query = query.ilike('name', `%${search}%`);
    }

    query = query.order('name', { ascending: true });

    const { data: documents, error } = await query;

    if (error) {
      console.error('[onboarding/documents] Failed to list documents', error);
      return res.status(500).json({ error: error.message });
    }

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
      .from('documents')
      .insert({
        org_id: orgId,
        name,
        description: description || null,
        category,
        source_type,
        folder_id: null,
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
      console.error('[onboarding/documents] Failed to create document', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Create initial digest record (org_id is NOT NULL)
    await supabase
      .from('document_digests')
      .insert({
        document_id: document.id,
        org_id: orgId,
        extraction_status: 'pending',
      });

    return res.status(201).json(document);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
