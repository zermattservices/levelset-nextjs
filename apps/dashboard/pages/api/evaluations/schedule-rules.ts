/**
 * Evaluation Schedule Rules API
 * GET/POST/PATCH/DELETE /api/evaluations/schedule-rules
 *
 * CRUD for cadence-based evaluation schedule rules.
 *
 * Query/body params:
 *  - org_id (required — resolved by middleware)
 *  - id (PATCH/DELETE): rule ID to update or delete
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
  const { orgId, userId } = context;
  const supabase = createServerSupabaseClient();

  // GET — list all rules with form_template join
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('evaluation_schedule_rules')
      .select(`
        id,
        org_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        cadence,
        is_active,
        created_by,
        created_at,
        updated_at,
        form_templates!evaluation_schedule_rules_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[schedule-rules] GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch schedule rules' });
    }

    return res.status(200).json({ rules: data ?? [] });
  }

  // POST — create a new rule
  if (req.method === 'POST') {
    const { form_template_id, target_role_ids, reviewer_role_ids, cadence } = req.body ?? {};

    if (!form_template_id) {
      return res.status(400).json({ error: 'form_template_id is required' });
    }
    if (!target_role_ids || !Array.isArray(target_role_ids) || target_role_ids.length === 0) {
      return res.status(400).json({ error: 'target_role_ids is required and must be a non-empty array' });
    }
    if (!reviewer_role_ids || !Array.isArray(reviewer_role_ids) || reviewer_role_ids.length === 0) {
      return res.status(400).json({ error: 'reviewer_role_ids is required and must be a non-empty array' });
    }
    if (!cadence) {
      return res.status(400).json({ error: 'cadence is required' });
    }

    const { data, error } = await supabase
      .from('evaluation_schedule_rules')
      .insert({
        org_id: orgId,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        cadence,
        created_by: userId,
      })
      .select(`
        id,
        org_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        cadence,
        is_active,
        created_by,
        created_at,
        updated_at,
        form_templates!evaluation_schedule_rules_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('[schedule-rules] POST error:', error);
      return res.status(500).json({ error: 'Failed to create schedule rule' });
    }

    return res.status(201).json({ rule: data });
  }

  // PATCH — update an existing rule
  if (req.method === 'PATCH') {
    const { id, target_role_ids, reviewer_role_ids, cadence, is_active, form_template_id } =
      req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (target_role_ids !== undefined) updates.target_role_ids = target_role_ids;
    if (reviewer_role_ids !== undefined) updates.reviewer_role_ids = reviewer_role_ids;
    if (cadence !== undefined) updates.cadence = cadence;
    if (is_active !== undefined) updates.is_active = is_active;
    if (form_template_id !== undefined) updates.form_template_id = form_template_id;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const { data, error } = await supabase
      .from('evaluation_schedule_rules')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select(`
        id,
        org_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        cadence,
        is_active,
        created_by,
        created_at,
        updated_at,
        form_templates!evaluation_schedule_rules_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .maybeSingle();

    if (error) {
      console.error('[schedule-rules] PATCH error:', error);
      return res.status(500).json({ error: 'Failed to update schedule rule' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    return res.status(200).json({ rule: data });
  }

  // DELETE — remove a rule
  if (req.method === 'DELETE') {
    const id = (req.body?.id ?? req.query?.id) as string | undefined;

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const { error } = await supabase
      .from('evaluation_schedule_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      console.error('[schedule-rules] DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete schedule rule' });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'GET,POST,PATCH,DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_MANAGE_EVALUATIONS, handler);
