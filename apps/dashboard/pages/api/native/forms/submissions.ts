/**
 * Native Form API: Submissions List
 * GET /api/native/forms/submissions
 *
 * Returns a unified, chronological list of all form submissions
 * the user has access to at a given location.
 *
 * Query params:
 * - location_id (required)
 * - form_type (optional): 'ratings' | 'infractions' | 'disc_actions'
 * - employee_id (optional): filter by employee
 * - submitted_by (optional): filter by submitter (leader)
 * - start_date / end_date (optional): date range filter
 * - page / limit (optional): pagination, default limit=50
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

interface SubmissionRecord {
  id: string;
  form_type: 'ratings' | 'infractions' | 'disc_actions';
  created_at: string;
  submitted_by_name: string;
  employee_name: string;
  position?: string;
  overall_score?: number;
  infraction_name?: string;
  point_value?: number;
  action_name?: string;
}

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    location_id: locationId,
    form_type: formType,
    employee_id: employeeId,
    submitted_by: submittedBy,
    start_date: startDate,
    end_date: endDate,
    page: pageStr,
    limit: limitStr,
  } = req.query as Record<string, string | undefined>;

  if (!locationId) {
    return res.status(400).json({ error: 'Missing location_id' });
  }

  const location = await validateLocationAccess(context.userId, context.orgId, locationId);
  if (!location) {
    return res.status(403).json({ error: 'Access denied for this location' });
  }

  const page = Math.max(1, parseInt(pageStr || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitStr || '50', 10)));
  const offset = (page - 1) * limit;
  const orgId = location.org_id;

  const supabase = createServerSupabaseClient();
  const submissions: SubmissionRecord[] = [];

  // Helper: build date range filters
  const applyDateFilter = (query: any, dateColumn: string) => {
    if (startDate) query = query.gte(dateColumn, startDate);
    if (endDate) query = query.lte(dateColumn, endDate);
    return query;
  };

  // Fetch ratings
  if (!formType || formType === 'ratings') {
    let ratingsQuery = supabase
      .from('ratings')
      .select(`
        id,
        created_at,
        position,
        rating_1,
        rating_2,
        rating_3,
        rating_4,
        rating_5,
        employee:employees!ratings_employee_id_fkey ( full_name ),
        rater:employees!ratings_rater_user_id_fkey ( full_name )
      `)
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (employeeId) ratingsQuery = ratingsQuery.eq('employee_id', employeeId);
    if (submittedBy) ratingsQuery = ratingsQuery.eq('rater_user_id', submittedBy);
    ratingsQuery = applyDateFilter(ratingsQuery, 'created_at');

    const { data: ratingsData, error: ratingsError } = await ratingsQuery;

    if (ratingsError) {
      console.error('[submissions] ratings query error:', ratingsError);
    } else if (ratingsData) {
      for (const r of ratingsData as any[]) {
        const scores = [r.rating_1, r.rating_2, r.rating_3, r.rating_4, r.rating_5].filter(
          (v: any) => v != null
        );
        const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

        submissions.push({
          id: r.id,
          form_type: 'ratings',
          created_at: r.created_at,
          submitted_by_name: r.rater?.full_name ?? 'Unknown',
          employee_name: r.employee?.full_name ?? 'Unknown',
          position: r.position ?? undefined,
          overall_score: Math.round(avg * 10) / 10,
        });
      }
    }
  }

  // Fetch infractions
  if (!formType || formType === 'infractions') {
    let infractionsQuery = supabase
      .from('infractions')
      .select(`
        id,
        created_at,
        infraction,
        points,
        employee:employees!infractions_employee_id_fkey ( full_name ),
        leader:employees!infractions_leader_id_fkey ( full_name )
      `)
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (employeeId) infractionsQuery = infractionsQuery.eq('employee_id', employeeId);
    if (submittedBy) infractionsQuery = infractionsQuery.eq('leader_id', submittedBy);
    infractionsQuery = applyDateFilter(infractionsQuery, 'created_at');

    const { data: infractionsData, error: infractionsError } = await infractionsQuery;

    if (infractionsError) {
      console.error('[submissions] infractions query error:', infractionsError);
    } else if (infractionsData) {
      for (const inf of infractionsData as any[]) {
        submissions.push({
          id: inf.id,
          form_type: 'infractions',
          created_at: inf.created_at,
          submitted_by_name: inf.leader?.full_name ?? 'Unknown',
          employee_name: inf.employee?.full_name ?? 'Unknown',
          infraction_name: inf.infraction ?? undefined,
          point_value: inf.points ?? undefined,
        });
      }
    }
  }

  // Fetch disciplinary actions
  if (!formType || formType === 'disc_actions') {
    let actionsQuery = supabase
      .from('disc_actions')
      .select(`
        id,
        created_at,
        action,
        employee:employees!disc_actions_employee_id_fkey ( full_name ),
        leader:employees!disc_actions_acting_leader_fkey ( full_name )
      `)
      .eq('org_id', orgId)
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });

    if (employeeId) actionsQuery = actionsQuery.eq('employee_id', employeeId);
    if (submittedBy) actionsQuery = actionsQuery.eq('acting_leader', submittedBy);
    actionsQuery = applyDateFilter(actionsQuery, 'created_at');

    const { data: actionsData, error: actionsError } = await actionsQuery;

    if (actionsError) {
      console.error('[submissions] disc_actions query error:', actionsError);
    } else if (actionsData) {
      for (const a of actionsData as any[]) {
        submissions.push({
          id: a.id,
          form_type: 'disc_actions',
          created_at: a.created_at,
          submitted_by_name: a.leader?.full_name ?? 'Unknown',
          employee_name: a.employee?.full_name ?? 'Unknown',
          action_name: a.action ?? undefined,
        });
      }
    }
  }

  // Sort merged results by created_at descending
  submissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Apply pagination
  const total = submissions.length;
  const paged = submissions.slice(offset, offset + limit);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    submissions: paged,
    total,
    page,
    limit,
  });
}

// Require either ratings or infractions permission (leaders who can submit forms can view submissions)
export default withPermissionAndContext(
  [P.PE_SUBMIT_RATINGS, P.DISC_SUBMIT_INFRACTIONS],
  handler,
  'any'
);
