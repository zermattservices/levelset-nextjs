/**
 * Certification Evaluation Rules API
 * GET/POST/PATCH/DELETE /api/evaluations/certification-rules
 *
 * CRUD for certification-triggered evaluation rules.
 *
 * Query params (GET):
 *  - org_id (required — resolved by middleware)
 *  - location_id (optional): filter by location
 *
 * Body params:
 *  - POST: location_id, form_template_id, target_role_ids, reviewer_role_ids, trigger_on
 *  - PATCH: id, form_template_id?, target_role_ids?, reviewer_role_ids?, trigger_on?, is_active?
 *  - DELETE: id
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const { orgId } = context;
  const supabase = createServerSupabaseClient();

  // GET — list certification rules with form_template join
  if (req.method === 'GET') {
    const { location_id } = req.query as Record<string, string | undefined>;

    let query = supabase
      .from('certification_evaluation_rules')
      .select(`
        id,
        org_id,
        location_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        trigger_on,
        is_active,
        created_at,
        updated_at,
        form_templates!certification_evaluation_rules_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[certification-rules] GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch certification evaluation rules' });
    }

    return res.status(200).json({ rules: data ?? [] });
  }

  // POST — create a new certification rule
  if (req.method === 'POST') {
    const { location_id, form_template_id, target_role_ids, reviewer_role_ids, trigger_on } =
      req.body ?? {};

    if (!location_id) return res.status(400).json({ error: 'location_id is required' });
    if (!form_template_id) return res.status(400).json({ error: 'form_template_id is required' });
    if (!target_role_ids || !Array.isArray(target_role_ids) || target_role_ids.length === 0) {
      return res.status(400).json({ error: 'target_role_ids is required and must be a non-empty array' });
    }
    if (!reviewer_role_ids || !Array.isArray(reviewer_role_ids) || reviewer_role_ids.length === 0) {
      return res.status(400).json({ error: 'reviewer_role_ids is required and must be a non-empty array' });
    }
    if (!trigger_on || !Array.isArray(trigger_on) || trigger_on.length === 0) {
      return res.status(400).json({ error: 'trigger_on is required and must be a non-empty array' });
    }

    const { data, error } = await supabase
      .from('certification_evaluation_rules')
      .insert({
        org_id: orgId,
        location_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        trigger_on,
      })
      .select(`
        id,
        org_id,
        location_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        trigger_on,
        is_active,
        created_at,
        updated_at,
        form_templates!certification_evaluation_rules_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('[certification-rules] POST error:', error);
      return res.status(500).json({ error: 'Failed to create certification evaluation rule' });
    }

    return res.status(201).json({ rule: data });
  }

  // PATCH — update a certification rule
  if (req.method === 'PATCH') {
    const { id, form_template_id, target_role_ids, reviewer_role_ids, trigger_on, is_active } =
      req.body ?? {};

    if (!id) return res.status(400).json({ error: 'id is required' });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (form_template_id !== undefined) updates.form_template_id = form_template_id;
    if (target_role_ids !== undefined) updates.target_role_ids = target_role_ids;
    if (reviewer_role_ids !== undefined) updates.reviewer_role_ids = reviewer_role_ids;
    if (trigger_on !== undefined) updates.trigger_on = trigger_on;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const { data, error } = await supabase
      .from('certification_evaluation_rules')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select(`
        id,
        org_id,
        location_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        trigger_on,
        is_active,
        created_at,
        updated_at,
        form_templates!certification_evaluation_rules_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .maybeSingle();

    if (error) {
      console.error('[certification-rules] PATCH error:', error);
      return res.status(500).json({ error: 'Failed to update certification evaluation rule' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    return res.status(200).json({ rule: data });
  }

  // DELETE — remove a certification rule
  if (req.method === 'DELETE') {
    const id = (req.body?.id ?? req.query?.id) as string | undefined;

    if (!id) return res.status(400).json({ error: 'id is required' });

    const { error } = await supabase
      .from('certification_evaluation_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      console.error('[certification-rules] DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete certification evaluation rule' });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_MANAGE_EVALUATIONS, handler);
