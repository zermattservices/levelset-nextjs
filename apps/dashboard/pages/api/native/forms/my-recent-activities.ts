/**
 * Native Form API: My Recent Activities
 * GET /api/native/forms/my-recent-activities?location_id=<id>&employee_id=<id>
 *
 * Returns the last 5 activities (ratings, infractions, disc_actions, reviews)
 * that the authenticated employee RECEIVED, sorted by date descending.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';
import { getRatingThresholds } from '@/lib/rating-thresholds';

interface RecentActivity {
  id: string;
  type: 'rating' | 'infraction' | 'disc_action' | 'review' | 'evaluation';
  date: string;
  position?: string;
  zone?: 'FOH' | 'BOH' | null;
  rating_avg?: number | null;
  rater_name?: string | null;
  infraction_name?: string;
  infraction_name_es?: string | null;
  points?: number;
  action_type?: string;
  action_type_es?: string | null;
  position_es?: string | null;
  leader_name?: string | null;
  author_name?: string | null;
  review_rating?: number;
  review_text_preview?: string | null;
  // Evaluation-specific fields
  evaluation_name?: string;
  evaluation_name_es?: string | null;
  evaluation_score?: number | null;
  evaluation_cadence?: string | null;
  evaluator_name?: string | null;
  employee_role?: string | null;
  employee_role_color?: string | null;
  employee_id?: string;
  /** True if the authenticated user performed this action (rated, submitted, etc.) */
  is_outgoing?: boolean;
  /** Name of the employee who received this activity (for outgoing cards) */
  recipient_name?: string;
}

export default withPermissionAndContext(
  P.SCHED_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = req.query.location_id as string;
    const employeeId = req.query.employee_id as string;
    const limitParam = Math.min(Number(req.query.limit) || 5, 100);
    const startDate = req.query.start_date as string | undefined;

    if (!locationId || !employeeId) {
      return res.status(400).json({ error: 'location_id and employee_id are required' });
    }

    try {
      const location = await validateLocationAccess(context.userId, context.orgId, locationId);
      if (!location) {
        return res.status(403).json({ error: 'Location access denied' });
      }

      const supabase = createServerSupabaseClient();
      const thresholds = await getRatingThresholds(locationId);

      // Look up the authenticated user's app_user + employee_id for outgoing activity detection
      const { data: authAppUser } = await supabase
        .from('app_users')
        .select('id, employee_id')
        .eq('auth_user_id', context.userId)
        .eq('org_id', context.orgId)
        .maybeSingle();
      const authEmployeeId = authAppUser?.employee_id ?? null;
      const authAppUserId = authAppUser?.id ?? null;

      // Fetch all 5 types + position zone labels + org_positions + org_roles in parallel
      const [ratingsRes, infractionsRes, discActionsRes, reviewsRes, evaluationsRes, labelsRes, orgPosRes, orgRolesRes, outRatingsRes, outInfractionsRes, outEvalsRes] = await Promise.all([
        supabase
          .from('ratings')
          .select(`id, position, rating_avg, created_at,
            rater:employees!ratings_rater_user_id_fkey(full_name)`)
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(limitParam),
        supabase
          .from('infractions')
          .select('id, infraction, infraction_es, points, infraction_date, leader_name, created_at')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(limitParam),
        supabase
          .from('disc_actions')
          .select('id, action, action_es, action_date, leader_name, created_at')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(limitParam),
        supabase
          .from('google_reviews')
          .select('id, author_name, rating, review_text, publish_time')
          .eq('location_id', locationId)
          .order('publish_time', { ascending: false })
          .limit(limitParam),
        supabase
          .from('form_submissions')
          .select(`id, score, created_at, template_id, metadata,
            submitted_by_user:app_users!form_submissions_submitted_by_fkey(first_name, last_name),
            form_templates!inner(name, name_es, form_type)`)
          .eq('employee_id', employeeId)
          .eq('org_id', context.orgId)
          .eq('form_type', 'evaluation')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('position_big5_labels')
          .select('position, position_es, zone')
          .eq('org_id', context.orgId)
          .eq('location_id', locationId),
        supabase
          .from('org_positions')
          .select('name, name_es, zone')
          .eq('org_id', context.orgId),
        supabase
          .from('org_roles')
          .select('role_name, color')
          .eq('org_id', context.orgId),
        // Outgoing: ratings submitted BY the authenticated user
        authEmployeeId
          ? supabase
              .from('ratings')
              .select(`id, position, rating_avg, created_at, employee_id,
                employee:employees!ratings_employee_id_fkey(full_name)`)
              .eq('rater_user_id', authEmployeeId)
              .eq('location_id', locationId)
              .neq('employee_id', employeeId)
              .order('created_at', { ascending: false })
              .limit(limitParam)
          : Promise.resolve({ data: null }),
        // Outgoing: infractions submitted BY the authenticated user
        authEmployeeId
          ? supabase
              .from('infractions')
              .select('id, infraction, infraction_es, points, infraction_date, created_at, employee_id, employee:employees!infractions_employee_id_fkey(full_name)')
              .eq('leader_id', authEmployeeId)
              .eq('location_id', locationId)
              .neq('employee_id', employeeId)
              .order('created_at', { ascending: false })
              .limit(limitParam)
          : Promise.resolve({ data: null }),
        // Outgoing: evaluations submitted BY the authenticated user
        authAppUserId
          ? supabase
              .from('form_submissions')
              .select(`id, score, created_at, template_id, employee_id,
                employee:employees!form_submissions_employee_id_fkey(full_name),
                form_templates!inner(name, name_es, form_type)`)
              .eq('submitted_by', authAppUserId)
              .eq('org_id', context.orgId)
              .eq('form_type', 'evaluation')
              .neq('employee_id', employeeId)
              .order('created_at', { ascending: false })
              .limit(limitParam)
          : Promise.resolve({ data: null }),
      ]);

      // Build position → zone and position → position_es lookups
      // Use org_positions as primary zone source, position_big5_labels as fallback
      const zoneMap = new Map<string, 'FOH' | 'BOH'>();
      const positionEsMap = new Map<string, string>();
      if (orgPosRes.data) {
        for (const row of orgPosRes.data as any[]) {
          if (row.zone) zoneMap.set(row.name, row.zone);
          if (row.name_es) positionEsMap.set(row.name, row.name_es);
        }
      }
      if (labelsRes.data) {
        for (const row of labelsRes.data as any[]) {
          if (row.zone && !zoneMap.has(row.position)) zoneMap.set(row.position, row.zone);
          if (row.position_es && !positionEsMap.has(row.position)) positionEsMap.set(row.position, row.position_es);
        }
      }

      // Normalize into unified shape
      const activities: RecentActivity[] = [];

      if (ratingsRes.data) {
        for (const r of ratingsRes.data as any[]) {
          activities.push({
            id: r.id,
            type: 'rating',
            date: r.created_at,
            position: r.position,
            position_es: positionEsMap.get(r.position) ?? null,
            zone: zoneMap.get(r.position) ?? null,
            rating_avg: r.rating_avg,
            rater_name: r.rater?.full_name ?? null,
          });
        }
      }

      if (infractionsRes.data) {
        for (const inf of infractionsRes.data as any[]) {
          activities.push({
            id: inf.id,
            type: 'infraction',
            date: inf.created_at,
            infraction_name: inf.infraction,
            infraction_name_es: inf.infraction_es || null,
            points: inf.points,
            leader_name: inf.leader_name,
          });
        }
      }

      if (discActionsRes.data) {
        for (const da of discActionsRes.data as any[]) {
          activities.push({
            id: da.id,
            type: 'disc_action',
            date: da.created_at,
            action_type: da.action,
            action_type_es: da.action_es || null,
            leader_name: da.leader_name,
          });
        }
      }

      if (reviewsRes.data) {
        for (const rev of reviewsRes.data as any[]) {
          activities.push({
            id: rev.id,
            type: 'review',
            date: rev.publish_time,
            author_name: rev.author_name,
            review_rating: rev.rating,
            review_text_preview: rev.review_text
              ? rev.review_text.slice(0, 80) + (rev.review_text.length > 80 ? '...' : '')
              : null,
          });
        }
      }

      // Build role → color map for evaluation cards
      const roleColorMap = new Map<string, string>();
      if (orgRolesRes.data) {
        for (const r of orgRolesRes.data as any[]) {
          if (r.color) roleColorMap.set(r.role_name, r.color);
        }
      }

      // Look up the employee's role for evaluation cards
      const { data: employeeData } = await supabase
        .from('employees')
        .select('role')
        .eq('id', employeeId)
        .single();
      const employeeRole = employeeData?.role ?? null;
      const employeeRoleColor = employeeRole ? (roleColorMap.get(employeeRole) ?? null) : null;

      // Look up evaluation cadence from schedule rules for this employee's role
      let evalCadenceMap = new Map<string, string>(); // template_id → cadence
      if (employeeRole) {
        const { data: rules } = await supabase
          .from('evaluation_schedule_rules')
          .select('form_template_id, cadence')
          .eq('org_id', context.orgId)
          .eq('is_active', true);
        if (rules) {
          for (const rule of rules) {
            evalCadenceMap.set(rule.form_template_id, rule.cadence);
          }
        }
      }

      if (evaluationsRes.data) {
        for (const ev of evaluationsRes.data as any[]) {
          const tmpl = ev.form_templates;
          const submitter = ev.submitted_by_user;
          const evaluatorName = submitter
            ? [submitter.first_name, submitter.last_name].filter(Boolean).join(' ')
            : null;
          const cadence = evalCadenceMap.get(ev.template_id) ?? null;

          activities.push({
            id: ev.id,
            type: 'evaluation',
            date: ev.created_at,
            evaluation_name: tmpl?.name ?? 'Evaluation',
            evaluation_name_es: tmpl?.name_es ?? null,
            evaluation_score: ev.score,
            evaluation_cadence: cadence,
            evaluator_name: evaluatorName,
            employee_role: employeeRole,
            employee_role_color: employeeRoleColor,
            employee_id: employeeId,
          });
        }
      }

      // -----------------------------------------------------------------------
      // Outgoing activities (submitted/rated BY the authenticated user)
      // -----------------------------------------------------------------------

      if (outRatingsRes.data) {
        for (const r of outRatingsRes.data as any[]) {
          activities.push({
            id: r.id,
            type: 'rating',
            date: r.created_at,
            position: r.position,
            position_es: positionEsMap.get(r.position) ?? null,
            zone: zoneMap.get(r.position) ?? null,
            rating_avg: r.rating_avg,
            is_outgoing: true,
            recipient_name: r.employee?.full_name ?? null,
          });
        }
      }

      if (outInfractionsRes.data) {
        for (const inf of outInfractionsRes.data as any[]) {
          activities.push({
            id: inf.id,
            type: 'infraction',
            date: inf.created_at,
            infraction_name: inf.infraction,
            infraction_name_es: inf.infraction_es || null,
            points: inf.points,
            is_outgoing: true,
            recipient_name: inf.employee?.full_name ?? null,
          });
        }
      }

      if (outEvalsRes.data) {
        for (const ev of outEvalsRes.data as any[]) {
          const tmpl = ev.form_templates;
          const cadence = evalCadenceMap.get(ev.template_id) ?? null;
          activities.push({
            id: ev.id,
            type: 'evaluation',
            date: ev.created_at,
            evaluation_name: tmpl?.name ?? 'Evaluation',
            evaluation_name_es: tmpl?.name_es ?? null,
            evaluation_score: ev.score,
            evaluation_cadence: cadence,
            is_outgoing: true,
            recipient_name: ev.employee?.full_name ?? null,
            employee_id: ev.employee_id,
          });
        }
      }

      // Filter by start_date if provided
      let filtered = activities;
      if (startDate) {
        const startMs = new Date(startDate).getTime();
        filtered = activities.filter((a) => new Date(a.date).getTime() >= startMs);
      }

      // Sort by date descending, take first N
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const result = filtered.slice(0, limitParam);

      res.setHeader('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({ activities: result, thresholds, totalCount: filtered.length });
    } catch (error) {
      console.error('my-recent-activities API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
