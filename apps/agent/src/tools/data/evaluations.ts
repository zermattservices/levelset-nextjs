/**
 * Evaluation Status tool — evaluation overview and individual history.
 *
 * Feature-gated: only available when enable_evaluations is true.
 *
 * Two modes:
 *   - Without employee_id: location-wide evaluation overview (planned, completed, by status)
 *   - With employee_id: individual evaluation history + certification audit trail
 */

import { getServiceClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache.js';

/**
 * Get evaluation status — location overview or individual history.
 * Input: { employee_id?: string }
 */
export async function getEvaluationStatus(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const employeeId = args.employee_id as string | undefined;
  const cacheKey = employeeId
    ? `eval_status:${employeeId}`
    : `eval_overview:${locationId ?? 'org'}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.TEAM, () =>
    employeeId
      ? _getEmployeeEvalHistory(orgId, locationId, employeeId)
      : _getEvalOverview(orgId, locationId)
  );
}

// ─── Location-Wide Overview ──────────────────────────────────────────────────

async function _getEvalOverview(
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = getServiceClient();

  // Fetch all evaluations for the org/location
  let evalQuery = supabase
    .from('evaluations')
    .select(
      'id, employee_id, employee_name, leader_name, status, month, evaluation_date, rating_status, state_before, state_after'
    )
    .eq('org_id', orgId)
    .order('evaluation_date', { ascending: false });

  if (locationId) {
    evalQuery = evalQuery.eq('location_id', locationId);
  }

  const evalResult = await evalQuery;

  if (evalResult.error) {
    return JSON.stringify({ error: evalResult.error.message });
  }

  const evaluations = evalResult.data ?? [];

  if (evaluations.length === 0) {
    return JSON.stringify({
      message: 'No evaluations found for this location',
    });
  }

  // Count by status
  const statusCounts: Record<string, number> = {};
  for (const e of evaluations) {
    const status = (e as any).status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  // Count by month
  const monthCounts: Record<string, number> = {};
  for (const e of evaluations) {
    const month = (e as any).month || 'Unknown';
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  }

  // Upcoming (Planned or Scheduled)
  const upcoming = evaluations
    .filter((e: any) => e.status === 'Planned' || e.status === 'Scheduled')
    .slice(0, 10)
    .map((e: any) => ({
      employee: e.employee_name,
      status: e.status,
      month: e.month,
      evaluation_date: e.evaluation_date,
      leader: e.leader_name,
    }));

  // Recently completed
  const completed = evaluations
    .filter((e: any) => e.status === 'Completed')
    .slice(0, 10)
    .map((e: any) => ({
      employee: e.employee_name,
      evaluation_date: e.evaluation_date,
      rating_completed: e.rating_status,
      state_before: e.state_before,
      state_after: e.state_after,
      leader: e.leader_name,
    }));

  // Certification changes (state_before → state_after)
  const certChanges = evaluations
    .filter(
      (e: any) =>
        e.status === 'Completed' && e.state_before && e.state_after && e.state_before !== e.state_after
    )
    .slice(0, 10)
    .map((e: any) => ({
      employee: e.employee_name,
      date: e.evaluation_date,
      from: e.state_before,
      to: e.state_after,
    }));

  return JSON.stringify({
    total_evaluations: evaluations.length,
    by_status: statusCounts,
    by_month: monthCounts,
    upcoming,
    recently_completed: completed,
    certification_changes: certChanges.length > 0 ? certChanges : undefined,
  });
}

// ─── Individual Employee History ─────────────────────────────────────────────

async function _getEmployeeEvalHistory(
  orgId: string,
  locationId: string | undefined,
  employeeId: string
): Promise<string> {
  const supabase = getServiceClient();

  // Fetch employee info + evaluations + certification audit in parallel
  const [empResult, evalResult, auditResult] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, role, certified_status')
      .eq('id', employeeId)
      .eq('org_id', orgId)
      .maybeSingle(),

    supabase
      .from('evaluations')
      .select(
        'id, employee_name, leader_name, status, month, evaluation_date, rating_status, state_before, state_after, notes'
      )
      .eq('employee_id', employeeId)
      .eq('org_id', orgId)
      .order('evaluation_date', { ascending: false })
      .limit(20),

    supabase
      .from('certification_audit')
      .select(
        'audit_date, status_before, status_after, all_positions_qualified, position_averages, notes'
      )
      .eq('employee_id', employeeId)
      .eq('org_id', orgId)
      .order('audit_date', { ascending: false })
      .limit(10),
  ]);

  if (!empResult.data) {
    return JSON.stringify({ error: 'Employee not found' });
  }

  const emp = empResult.data as any;
  const evaluations = evalResult.data ?? [];
  const audits = auditResult.data ?? [];

  // Format evaluations
  const formattedEvals = evaluations.map((e: any) => {
    const result: Record<string, unknown> = {
      date: e.evaluation_date,
      month: e.month,
      status: e.status,
      rating_completed: e.rating_status,
      leader: e.leader_name,
    };
    if (e.state_before || e.state_after) {
      result.certification_change = `${e.state_before ?? '—'} → ${e.state_after ?? '—'}`;
    }
    if (e.notes) result.notes = e.notes;
    return result;
  });

  // Format certification audit trail
  const formattedAudits = audits.map((a: any) => {
    const result: Record<string, unknown> = {
      date: a.audit_date,
      status_change: `${a.status_before} → ${a.status_after}`,
      all_positions_qualified: a.all_positions_qualified,
    };
    if (a.position_averages && Object.keys(a.position_averages).length > 0) {
      result.position_averages = a.position_averages;
    }
    if (a.notes) result.notes = a.notes;
    return result;
  });

  return JSON.stringify({
    employee: emp.full_name,
    role: emp.role,
    current_certification_status: emp.certified_status ?? 'Not Certified',
    evaluations: formattedEvals.length > 0 ? formattedEvals : 'No evaluations on record',
    certification_audit_trail:
      formattedAudits.length > 0 ? formattedAudits : 'No certification audit entries',
  });
}
