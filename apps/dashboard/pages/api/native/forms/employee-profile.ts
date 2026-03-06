/**
 * Native Form API: Employee Profile
 * GET /api/native/forms/employee-profile?location_id=<id>&employee_id=<id>&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 *
 * Returns detailed profile data for a single employee:
 * infractions, disciplinary actions, ratings, position averages,
 * thresholds, and this week's schedule.
 *
 * start_date/end_date are optional; default to 90 days back / today.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Move to Sunday
  return d.toISOString().split('T')[0];
}

// OE pillar score computation (mirrors operational-excellence.ts)
function normalizeTo100(avg: number): number {
  return ((avg - 1) / 2) * 100;
}

interface PillarAccumulator {
  weightedSum: number;
  totalWeight: number;
}

interface CriteriaMapping {
  position_id: string;
  criteria_order: number;
  pillar_1_id: string | null;
  pillar_2_id: string | null;
}

function distributeRatingToPillars(
  rating: { position: string; rating_1: number | null; rating_2: number | null; rating_3: number | null; rating_4: number | null; rating_5: number | null },
  criteriaByPosition: Map<string, CriteriaMapping[]>,
  positionNameToId: Map<string, string>,
  contributions: Record<string, PillarAccumulator>
) {
  const positionId = positionNameToId.get(rating.position);
  if (!positionId) return;

  const criteria = criteriaByPosition.get(positionId);
  if (!criteria) return;

  const ratingValues = [rating.rating_1, rating.rating_2, rating.rating_3, rating.rating_4, rating.rating_5];

  for (const criterion of criteria) {
    const value = ratingValues[criterion.criteria_order - 1];
    if (value == null) continue;

    if (criterion.pillar_1_id && criterion.pillar_2_id) {
      if (!contributions[criterion.pillar_1_id]) contributions[criterion.pillar_1_id] = { weightedSum: 0, totalWeight: 0 };
      if (!contributions[criterion.pillar_2_id]) contributions[criterion.pillar_2_id] = { weightedSum: 0, totalWeight: 0 };
      contributions[criterion.pillar_1_id].weightedSum += value * 0.6;
      contributions[criterion.pillar_1_id].totalWeight += 0.6;
      contributions[criterion.pillar_2_id].weightedSum += value * 0.4;
      contributions[criterion.pillar_2_id].totalWeight += 0.4;
    } else if (criterion.pillar_1_id) {
      if (!contributions[criterion.pillar_1_id]) contributions[criterion.pillar_1_id] = { weightedSum: 0, totalWeight: 0 };
      contributions[criterion.pillar_1_id].weightedSum += value;
      contributions[criterion.pillar_1_id].totalWeight += 1;
    }
  }
}

export default withPermissionAndContext(
  P.ROSTER_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = Array.isArray(req.query.location_id)
      ? req.query.location_id[0]
      : req.query.location_id;
    const employeeId = Array.isArray(req.query.employee_id)
      ? req.query.employee_id[0]
      : req.query.employee_id;
    const startDateParam = Array.isArray(req.query.start_date)
      ? req.query.start_date[0]
      : req.query.start_date;
    const endDateParam = Array.isArray(req.query.end_date)
      ? req.query.end_date[0]
      : req.query.end_date;

    if (!locationId || !employeeId) {
      return res.status(400).json({ error: 'location_id and employee_id are required' });
    }

    // Default to 90 days back / today if not provided
    const endDate = endDateParam || new Date().toISOString().split('T')[0];
    const startDate = startDateParam || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const location = await validateLocationAccess(context.userId, context.orgId, locationId);
    if (!location) {
      return res.status(403).json({ error: 'Access denied for this location' });
    }

    try {
      const supabase = createServerSupabaseClient();

      // Verify employee belongs to this location
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, first_name, last_name, role, hire_date, phone, email, title, is_foh, is_boh, is_leader')
        .eq('id', employeeId)
        .eq('location_id', locationId)
        .maybeSingle();

      if (empError || !employee) {
        return res.status(404).json({ error: 'Employee not found at this location' });
      }

      // Get profile image from app_users
      const { data: appUserData } = await supabase
        .from('app_users')
        .select('profile_image, email')
        .eq('employee_id', employeeId)
        .eq('org_id', context.orgId)
        .maybeSingle();

      // Fetch all data in parallel
      const [
        infractionsResult,
        discActionsResult,
        ratingsResult,
        scheduleResult,
        positionAvgResult,
        orgPositionsResult,
        thresholdsResult,
        rubricResult,
        oePillarsResult,
        positionCriteriaResult,
      ] = await Promise.all([
        // Infractions (date range)
        supabase
          .from('infractions')
          .select('id, infraction, infraction_es, infraction_date, points, leader_name, ack_bool')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .gte('infraction_date', startDate)
          .lte('infraction_date', endDate)
          .order('infraction_date', { ascending: false }),

        // Disciplinary actions (date range)
        supabase
          .from('disc_actions')
          .select('id, action, action_es, action_date, leader_name')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .gte('action_date', startDate)
          .lte('action_date', endDate)
          .order('action_date', { ascending: false }),

        // Ratings (date range)
        supabase
          .from('ratings')
          .select(`
            id, position, rating_1, rating_2, rating_3, rating_4, rating_5,
            rating_avg, notes, created_at,
            rater:employees!ratings_rater_user_id_fkey(full_name)
          `)
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .gte('created_at', startDate + 'T00:00:00Z')
          .lte('created_at', endDate + 'T23:59:59Z')
          .order('created_at', { ascending: false }),

        // This week's schedule
        (async () => {
          const thisWeekStart = getWeekStart(new Date());

          const { data: schedules } = await supabase
            .from('schedules')
            .select('id, week_start')
            .eq('location_id', locationId)
            .eq('status', 'published')
            .eq('week_start', thisWeekStart);

          if (!schedules?.length) return { data: null, weekStart: thisWeekStart };

          const scheduleIds = schedules.map((s: any) => s.id);

          const { data: shifts } = await supabase
            .from('shifts')
            .select(`
              id, shift_date, start_time, end_time, break_minutes, notes,
              position:org_positions(id, name),
              assignment:shift_assignments!inner(id, employee_id)
            `)
            .in('schedule_id', scheduleIds)
            .eq('shift_assignments.employee_id', employeeId)
            .order('shift_date')
            .order('start_time');

          return {
            data: (shifts ?? []).map((s: any) => ({
              id: s.id,
              shift_date: s.shift_date,
              start_time: s.start_time,
              end_time: s.end_time,
              break_minutes: s.break_minutes || 0,
              notes: s.notes || null,
              position: s.position || null,
            })),
            weekStart: thisWeekStart,
          };
        })(),

        // Position averages (most recent snapshot)
        supabase
          .from('daily_position_averages')
          .select('position_averages')
          .eq('employee_id', employeeId)
          .order('calculation_date', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Org positions (for zone lookup)
        supabase
          .from('org_positions')
          .select('name, zone')
          .eq('org_id', context.orgId),

        // Rating thresholds for this location
        supabase
          .from('rating_thresholds')
          .select('green_threshold, yellow_threshold')
          .eq('location_id', locationId)
          .maybeSingle(),

        // Discipline actions rubric (for point thresholds / color mapping)
        (async () => {
          // Try org-level first (location_id IS NULL)
          const { data: orgActions } = await supabase
            .from('disc_actions_rubric')
            .select('action, points_threshold')
            .eq('org_id', context.orgId)
            .is('location_id', null)
            .order('points_threshold', { ascending: true });

          if (orgActions && orgActions.length > 0) return orgActions;

          // Fallback to location-specific
          const { data: locActions } = await supabase
            .from('disc_actions_rubric')
            .select('action, points_threshold')
            .eq('location_id', locationId)
            .order('points_threshold', { ascending: true });

          return locActions ?? [];
        })(),

        // OE pillars (global)
        supabase
          .from('oe_pillars')
          .select('id, name, weight, description, display_order')
          .order('display_order', { ascending: true }),

        // Position criteria with pillar mappings for org positions
        (async () => {
          const { data: positions } = await supabase
            .from('org_positions')
            .select('id, name')
            .eq('org_id', context.orgId);

          if (!positions?.length) return { positions: [], criteria: [] };

          const positionIds = positions.map((p: any) => p.id);
          const { data: criteria } = await supabase
            .from('position_criteria')
            .select('position_id, criteria_order, pillar_1_id, pillar_2_id')
            .in('position_id', positionIds);

          return {
            positions: positions as Array<{ id: string; name: string }>,
            criteria: (criteria ?? []).filter((c: any) => c.pillar_1_id) as CriteriaMapping[],
          };
        })(),
      ]);

      const infractions = infractionsResult.data ?? [];
      const discActions = discActionsResult.data ?? [];
      const ratingsRaw = ratingsResult.data ?? [];

      // Build zone map from org_positions
      const zoneMap: Record<string, string | null> = {};
      for (const pos of orgPositionsResult.data ?? []) {
        zoneMap[pos.name] = pos.zone ?? null;
      }

      // Build position counts from ratings
      const positionCounts: Record<string, number> = {};
      for (const r of ratingsRaw) {
        if (r.position) {
          positionCounts[r.position] = (positionCounts[r.position] || 0) + 1;
        }
      }

      // Transform daily_position_averages JSONB into array
      const rawAvgs = positionAvgResult.data?.position_averages as Record<string, number> | null;
      const positionAverages = rawAvgs
        ? Object.entries(rawAvgs).map(([position, average]) => ({
            position,
            average: Math.round(average * 100) / 100,
            count: positionCounts[position] || 0,
            zone: zoneMap[position] ?? null,
          }))
        : [];

      // Format ratings with rater name and zone
      const ratings = ratingsRaw.map((r: any) => ({
        id: r.id,
        position: r.position,
        zone: zoneMap[r.position] ?? null,
        rating_1: r.rating_1,
        rating_2: r.rating_2,
        rating_3: r.rating_3,
        rating_4: r.rating_4,
        rating_5: r.rating_5,
        rating_avg: r.rating_avg,
        notes: r.notes,
        created_at: r.created_at,
        rater_name: r.rater?.full_name ?? null,
      }));

      // Build summary
      const totalPoints = infractions.reduce((sum: number, i: any) => sum + (i.points || 0), 0);
      const ratingAvgs = ratings
        .map((r: any) => r.rating_avg)
        .filter((v: any) => v != null);
      const avgRating = ratingAvgs.length > 0
        ? ratingAvgs.reduce((a: number, b: number) => a + b, 0) / ratingAvgs.length
        : null;

      const employeeName = employee.full_name?.trim() ||
        `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim() ||
        'Unnamed';

      // Rating thresholds
      const thresholds = thresholdsResult.data
        ? {
            green_threshold: thresholdsResult.data.green_threshold,
            yellow_threshold: thresholdsResult.data.yellow_threshold,
          }
        : null;

      // Build discipline rubric array
      const rubricActions = (rubricResult ?? []).map((a: any) => ({
        action: a.action,
        points_threshold: a.points_threshold,
      }));

      // Compute OE pillar scores for this employee
      const pillarDefs = (oePillarsResult.data ?? []) as Array<{
        id: string; name: string; weight: number; description: string; display_order: number;
      }>;

      const { positions: orgPosWithIds, criteria: allCriteria } = positionCriteriaResult as {
        positions: Array<{ id: string; name: string }>;
        criteria: CriteriaMapping[];
      };

      // Build lookup maps
      const positionNameToId = new Map<string, string>();
      for (const p of orgPosWithIds) {
        positionNameToId.set(p.name, p.id);
      }

      const criteriaByPosition = new Map<string, CriteriaMapping[]>();
      for (const c of allCriteria) {
        const existing = criteriaByPosition.get(c.position_id) || [];
        existing.push(c);
        criteriaByPosition.set(c.position_id, existing);
      }

      // Distribute this employee's ratings to pillars
      const empContributions: Record<string, PillarAccumulator> = {};
      for (const r of ratingsRaw) {
        distributeRatingToPillars(r as any, criteriaByPosition, positionNameToId, empContributions);
      }

      // Compute scores and overall
      let overallOEScore = 0;
      let totalPillarWeight = 0;

      const oePillars = pillarDefs.map(p => {
        const acc = empContributions[p.id];
        let score: number | null = null;
        if (acc && acc.totalWeight > 0) {
          score = Math.round(normalizeTo100(acc.weightedSum / acc.totalWeight) * 10) / 10;
          overallOEScore += score * (p.weight ?? 0);
          totalPillarWeight += p.weight ?? 0;
        }
        return {
          id: p.id,
          name: p.name,
          weight: p.weight,
          description: p.description,
          score,
        };
      });

      const oeOverall = totalPillarWeight > 0
        ? Math.round((overallOEScore / totalPillarWeight) * 10) / 10
        : null;

      res.setHeader('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({
        employee: {
          id: employee.id,
          full_name: employeeName,
          role: employee.role ?? null,
          hire_date: employee.hire_date ?? null,
          profile_image: appUserData?.profile_image ?? null,
          phone: employee.phone ?? null,
          email: appUserData?.email ?? employee.email ?? null,
          title: employee.title ?? null,
        },
        infractions,
        disc_actions: discActions,
        ratings,
        position_averages: positionAverages,
        thresholds,
        disc_rubric: rubricActions,
        schedule: scheduleResult.data
          ? { weekStart: scheduleResult.weekStart, shifts: scheduleResult.data }
          : null,
        summary: {
          infraction_count: infractions.length,
          total_points: totalPoints,
          avg_rating: avgRating != null ? Math.round(avgRating * 100) / 100 : null,
        },
        oe_pillars: oePillars,
        oe_overall: oeOverall,
      });
    } catch (error) {
      console.error('[employee-profile API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
