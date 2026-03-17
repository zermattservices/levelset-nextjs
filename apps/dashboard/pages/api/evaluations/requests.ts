/**
 * Evaluation Requests API
 * GET/PATCH /api/evaluations/requests
 *
 * Manage event-triggered evaluation requests.
 *
 * Query params (GET):
 *  - org_id (required — resolved by middleware)
 *  - status (optional): filter by request status
 *  - location_id (optional): filter by location
 *
 * Body params (PATCH):
 *  - id: request ID
 *  - status: new status value
 *  - completed_submission_id (optional)
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';
import { createServerSupabaseClient } from '@/lib/supabase-server';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const { orgId, userId, isAdmin } = context;
  const supabase = createServerSupabaseClient();

  // GET — list requests with form_template join
  if (req.method === 'GET') {
    const { status, location_id } = req.query as Record<string, string | undefined>;

    let query = supabase
      .from('evaluation_requests')
      .select(`
        id,
        org_id,
        location_id,
        employee_id,
        form_template_id,
        trigger_source,
        status,
        triggered_at,
        completed_submission_id,
        created_by,
        created_at,
        updated_at,
        form_templates!evaluation_requests_form_template_id_fkey (
          id,
          name,
          name_es,
          is_active
        )
      `)
      .eq('org_id', orgId)
      .order('triggered_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (location_id) {
      query = query.eq('location_id', location_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[requests] GET error:', error);
      return res.status(500).json({ error: 'Failed to fetch evaluation requests' });
    }

    return res.status(200).json({ requests: data ?? [] });
  }

  // PATCH — update request status + optional completed_submission_id
  if (req.method === 'PATCH') {
    // Inline permission check: conducting evaluations requires EVAL_CONDUCT_EVALUATIONS
    if (!isAdmin) {
      const canConduct = await checkPermission(supabase, userId, orgId, P.EVAL_CONDUCT_EVALUATIONS);
      if (!canConduct) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    const { id, status, completed_submission_id } = req.body ?? {};

    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!status) return res.status(400).json({ error: 'status is required' });

    const updates: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (completed_submission_id !== undefined) {
      updates.completed_submission_id = completed_submission_id;
    }

    const { data, error } = await supabase
      .from('evaluation_requests')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[requests] PATCH error:', error);
      return res.status(500).json({ error: 'Failed to update evaluation request' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Request not found' });
    }

    return res.status(200).json({ request: data });
  }

  res.setHeader('Allow', 'GET,PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
