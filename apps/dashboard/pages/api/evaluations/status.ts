/**
 * Evaluations Status API
 * GET /api/evaluations/status
 *
 * Returns the merged list of cadence-based and event-triggered evaluation
 * items for the authenticated user's org, with computed statuses.
 *
 * Query params:
 *  - org_id (required — resolved by middleware)
 *  - location_id (optional): filter employees to a specific location
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { computeStatus, getDueDate, getPeriodStartISO } from '@/lib/evaluations/compute-status';
import type { EvaluationItem, EvaluationCadence } from '@/lib/evaluations/types';

const STATUS_PRIORITY: Record<string, number> = {
  overdue: 0,
  due: 1,
  not_yet_due: 2,
  completed: 3,
  skipped: 4,
};

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orgId, userId, isAdmin } = context;
  const locationId = req.query.location_id as string | undefined;

  const supabase = createServerSupabaseClient();

  // Check if user can manage evaluations (for canManage flag)
  const canManage =
    isAdmin ||
    (await checkPermission(supabase, userId, orgId, P.EVAL_MANAGE_EVALUATIONS));

  // Resolve the current user's role ID(s) via app_users -> employees -> org_roles
  let userRoleIds: string[] = [];
  {
    const { data: appUser } = await supabase
      .from('app_users')
      .select('employee_id')
      .eq('auth_user_id', userId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (appUser?.employee_id) {
      const { data: emp } = await supabase
        .from('employees')
        .select('role')
        .eq('id', appUser.employee_id)
        .maybeSingle();

      if (emp?.role) {
        const { data: roleRow } = await supabase
          .from('org_roles')
          .select('id')
          .eq('org_id', orgId)
          .eq('role_name', emp.role)
          .maybeSingle();

        if (roleRow?.id) {
          userRoleIds = [roleRow.id];
        }
      }
    }
  }

  // Fetch active schedule rules (LEFT join form_templates to include inactive templates)
  const { data: rules, error: rulesError } = await supabase
    .from('evaluation_schedule_rules')
    .select(`
      id,
      form_template_id,
      target_role_ids,
      reviewer_role_ids,
      cadence,
      is_active,
      form_templates!evaluation_schedule_rules_form_template_id_fkey (
        id,
        name,
        name_es,
        is_active
      )
    `)
    .eq('org_id', orgId)
    .eq('is_active', true);

  if (rulesError) {
    console.error('[evaluations/status] Failed to fetch schedule rules:', rulesError);
    return res.status(500).json({ error: 'Failed to fetch evaluation schedule rules' });
  }

  // Fetch all active employees for the org (optionally filtered by location)
  let employeesQuery = supabase
    .from('employees')
    .select('id, full_name, role, location_id')
    .eq('org_id', orgId)
    .eq('active', true);

  if (locationId) {
    employeesQuery = employeesQuery.eq('location_id', locationId);
  }

  const { data: employees, error: empError } = await employeesQuery;

  if (empError) {
    console.error('[evaluations/status] Failed to fetch employees:', empError);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }

  const allEmployees = employees ?? [];

  // Resolve all role IDs used by rules -> role names via org_roles (batch)
  const allRuleRoleIds = new Set<string>();
  for (const rule of rules ?? []) {
    for (const id of rule.target_role_ids ?? []) allRuleRoleIds.add(id);
    for (const id of rule.reviewer_role_ids ?? []) allRuleRoleIds.add(id);
  }

  const roleIdToName = new Map<string, string>();
  if (allRuleRoleIds.size > 0) {
    const { data: orgRoles } = await supabase
      .from('org_roles')
      .select('id, role_name')
      .eq('org_id', orgId)
      .in('id', Array.from(allRuleRoleIds));

    for (const r of orgRoles ?? []) {
      roleIdToName.set(r.id, r.role_name);
    }
  }

  const activeRuleIds = (rules ?? []).map((r) => r.id);
  const allEmployeeIds = allEmployees.map((e) => e.id);
  const allTemplateIds = [...new Set((rules ?? []).map((r) => r.form_template_id).filter(Boolean))];

  // Batch-fetch all overrides for active rule IDs
  // Key: `${rule_id}_${employee_id}_${period_start}`
  const overrideMap = new Map<string, { override_type: string; defer_until: string | null }>();
  if (activeRuleIds.length > 0) {
    const { data: overrides } = await supabase
      .from('evaluation_schedule_overrides')
      .select('rule_id, employee_id, period_start, override_type, defer_until')
      .eq('org_id', orgId)
      .in('rule_id', activeRuleIds);

    for (const ov of overrides ?? []) {
      const key = `${ov.rule_id}_${ov.employee_id}_${ov.period_start}`;
      overrideMap.set(key, { override_type: ov.override_type, defer_until: ov.defer_until });
    }
  }

  // Batch-fetch all latest form submissions for relevant employee+template combos
  // Key: `${employee_id}_${template_id}` — keep only the most recent per pair
  const submissionMap = new Map<string, { id: string; created_at: string; response_data: any }>();
  if (allEmployeeIds.length > 0 && allTemplateIds.length > 0) {
    const { data: submissions } = await supabase
      .from('form_submissions')
      .select('id, employee_id, form_template_id, created_at, response_data')
      .eq('org_id', orgId)
      .in('employee_id', allEmployeeIds)
      .in('form_template_id', allTemplateIds)
      .order('created_at', { ascending: false });

    for (const sub of submissions ?? []) {
      const key = `${sub.employee_id}_${sub.form_template_id}`;
      if (!submissionMap.has(key)) {
        // First encountered is the most recent (ordered desc)
        submissionMap.set(key, {
          id: sub.id,
          created_at: sub.created_at,
          response_data: sub.response_data,
        });
      }
    }
  }

  const items: EvaluationItem[] = [];

  // Build cadence-based items
  for (const rule of rules ?? []) {
    const template = (rule as any).form_templates;
    const cadence = rule.cadence as EvaluationCadence;
    const periodStart = getPeriodStartISO(cadence);
    const dueDate = getDueDate(cadence);

    // Determine which employees match this rule's target roles
    const targetRoleNames = new Set(
      (rule.target_role_ids ?? []).map((id: string) => roleIdToName.get(id)).filter(Boolean) as string[]
    );
    const reviewerRoleNames = new Set(
      (rule.reviewer_role_ids ?? []).map((id: string) => roleIdToName.get(id)).filter(Boolean) as string[]
    );

    // can_conduct: user's role is in reviewer_role_ids (or they can manage)
    const userCanConduct =
      canManage ||
      userRoleIds.some((id) => (rule.reviewer_role_ids ?? []).includes(id));

    const matchedEmployees = allEmployees.filter((emp) => targetRoleNames.has(emp.role));

    for (const emp of matchedEmployees) {
      const overrideKey = `${rule.id}_${emp.id}_${periodStart}`;
      const override = overrideMap.get(overrideKey) ?? null;
      const subKey = `${emp.id}_${rule.form_template_id}`;
      const lastSub = submissionMap.get(subKey) ?? null;

      const status = computeStatus(
        cadence,
        lastSub?.created_at ?? null,
        override?.override_type ?? null,
        override?.defer_until ?? null
      );

      items.push({
        id: `${rule.id}_${emp.id}`,
        source: 'scheduled',
        employee: {
          id: emp.id,
          name: emp.full_name,
          role: emp.role,
          location_id: emp.location_id,
        },
        evaluation: {
          template_id: rule.form_template_id,
          name: template?.name ?? '',
          is_active: template?.is_active ?? false,
        },
        status,
        last_completed_at: lastSub?.created_at ?? null,
        last_submission_id: lastSub?.id ?? null,
        score: null, // Scores computed on-demand via submission-score endpoint
        due_date: dueDate,
        can_conduct: userCanConduct,
        rule_id: rule.id,
        period_start: periodStart,
        defer_until: override?.defer_until ?? null,
      });
    }
  }

  // Fetch event-triggered evaluation requests (pending + recently completed within 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let requestsQuery = supabase
    .from('evaluation_requests')
    .select(`
      id,
      employee_id,
      form_template_id,
      trigger_source,
      status,
      triggered_at,
      completed_submission_id,
      location_id,
      form_templates!evaluation_requests_form_template_id_fkey (
        id,
        name,
        name_es,
        is_active
      )
    `)
    .eq('org_id', orgId)
    .or(`status.eq.pending,and(status.eq.completed,triggered_at.gte.${thirtyDaysAgo})`);

  if (locationId) {
    requestsQuery = requestsQuery.eq('location_id', locationId);
  }

  const { data: requests, error: reqError } = await requestsQuery;

  if (reqError) {
    console.error('[evaluations/status] Failed to fetch evaluation requests:', reqError);
    // Non-fatal — continue without event-triggered items
  }

  // Fetch certification_evaluation_rules to determine reviewer matching for event-triggered items
  let certRuleReviewerMap = new Map<string, string[]>(); // form_template_id -> reviewer_role_ids
  if ((requests ?? []).length > 0) {
    const { data: certRules } = await supabase
      .from('certification_evaluation_rules')
      .select('form_template_id, reviewer_role_ids')
      .eq('org_id', orgId)
      .eq('is_active', true);

    for (const cr of certRules ?? []) {
      certRuleReviewerMap.set(cr.form_template_id, cr.reviewer_role_ids ?? []);
    }
  }

  // Build employee lookup map for request items
  const empMap = new Map(allEmployees.map((e) => [e.id, e]));

  for (const req of requests ?? []) {
    const emp = empMap.get(req.employee_id);
    if (!emp) continue; // Employee not in current filter scope

    const template = (req as any).form_templates;
    const reviewerIds = certRuleReviewerMap.get(req.form_template_id) ?? [];
    const userCanConduct =
      canManage || userRoleIds.some((id) => reviewerIds.includes(id));

    // Determine status
    const reqStatus = req.status === 'completed' ? 'completed' : 'due';

    const lastSub = req.completed_submission_id
      ? { id: req.completed_submission_id, created_at: req.triggered_at }
      : null;

    items.push({
      id: req.id,
      source: req.trigger_source as any,
      employee: {
        id: emp.id,
        name: emp.full_name,
        role: emp.role,
        location_id: emp.location_id,
      },
      evaluation: {
        template_id: req.form_template_id,
        name: template?.name ?? '',
        is_active: template?.is_active ?? false,
      },
      status: reqStatus,
      last_completed_at: lastSub?.created_at ?? null,
      last_submission_id: lastSub?.id ?? null,
      score: null,
      due_date: req.triggered_at ? new Date(req.triggered_at).toISOString().split('T')[0] : '',
      can_conduct: userCanConduct,
      request_id: req.id,
    });
  }

  // Sort by status priority
  items.sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    // Secondary: employee name
    return a.employee.name.localeCompare(b.employee.name);
  });

  return res.status(200).json({ items, canManage });
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
