/**
 * Evaluation Schedule Overrides API
 * POST/DELETE /api/evaluations/overrides
 *
 * Create (upsert) or delete per-employee overrides for a schedule rule period.
 *
 * Query/body params:
 *  - org_id (required — resolved by middleware)
 *  - POST body: rule_id, employee_id, override_type, period_start, defer_until?, reason?
 *  - DELETE body/query: id
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

  // POST — upsert an override on (rule_id, employee_id, period_start)
  if (req.method === 'POST') {
    const { rule_id, employee_id, override_type, period_start, defer_until, reason } =
      req.body ?? {};

    if (!rule_id) return res.status(400).json({ error: 'rule_id is required' });
    if (!employee_id) return res.status(400).json({ error: 'employee_id is required' });
    if (!override_type) return res.status(400).json({ error: 'override_type is required' });
    if (!period_start) return res.status(400).json({ error: 'period_start is required' });

    const { data, error } = await supabase
      .from('evaluation_schedule_overrides')
      .upsert(
        {
          org_id: orgId,
          rule_id,
          employee_id,
          override_type,
          period_start,
          defer_until: defer_until ?? null,
          reason: reason ?? null,
          created_by: userId,
        },
        { onConflict: 'rule_id,employee_id,period_start' }
      )
      .select()
      .single();

    if (error) {
      console.error('[overrides] POST error:', error);
      return res.status(500).json({ error: 'Failed to upsert override' });
    }

    return res.status(200).json({ override: data });
  }

  // DELETE — remove an override by id, scoped to org
  if (req.method === 'DELETE') {
    const id = (req.body?.id ?? req.query?.id) as string | undefined;

    if (!id) return res.status(400).json({ error: 'id is required' });

    const { error } = await supabase
      .from('evaluation_schedule_overrides')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      console.error('[overrides] DELETE error:', error);
      return res.status(500).json({ error: 'Failed to delete override' });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', 'POST,DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_MANAGE_EVALUATIONS, handler);
