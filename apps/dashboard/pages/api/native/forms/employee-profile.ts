/**
 * Native Form API: Employee Profile
 * GET /api/native/forms/employee-profile?location_id=<id>&employee_id=<id>
 *
 * Returns detailed profile data for a single employee:
 * infractions, disciplinary actions, ratings, and this week's schedule.
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

    if (!locationId || !employeeId) {
      return res.status(400).json({ error: 'location_id and employee_id are required' });
    }

    const location = await validateLocationAccess(context.userId, context.orgId, locationId);
    if (!location) {
      return res.status(403).json({ error: 'Access denied for this location' });
    }

    try {
      const supabase = createServerSupabaseClient();
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Verify employee belongs to this location
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, first_name, last_name, role, hire_date, phone, email, position, is_foh, is_boh, is_leader')
        .eq('id', employeeId)
        .eq('location_id', locationId)
        .maybeSingle();

      if (empError || !employee) {
        return res.status(404).json({ error: 'Employee not found at this location' });
      }

      // Get profile image from app_users
      const { data: appUserData } = await supabase
        .from('app_users')
        .select('profile_image')
        .eq('employee_id', employeeId)
        .eq('org_id', context.orgId)
        .maybeSingle();

      // Fetch all data in parallel
      const [infractionsResult, discActionsResult, ratingsResult, scheduleResult] = await Promise.all([
        // Infractions (last 90 days)
        supabase
          .from('infractions')
          .select('id, infraction, description, infraction_date, points, leader_name, ack_bool')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .gte('infraction_date', ninetyDaysAgo)
          .order('infraction_date', { ascending: false }),

        // Disciplinary actions (last 90 days)
        supabase
          .from('disc_actions')
          .select('id, action, action_date, leader_name')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .gte('action_date', ninetyDaysAgo)
          .order('action_date', { ascending: false }),

        // Ratings (last 90 days)
        supabase
          .from('ratings')
          .select(`
            id, position, rating_1, rating_2, rating_3, rating_4, rating_5,
            rating_avg, notes, created_at,
            rater:employees!ratings_rater_user_id_fkey(full_name)
          `)
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
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
      ]);

      const infractions = infractionsResult.data ?? [];
      const discActions = discActionsResult.data ?? [];
      const ratingsRaw = ratingsResult.data ?? [];

      // Format ratings with rater name
      const ratings = ratingsRaw.map((r: any) => ({
        id: r.id,
        position: r.position,
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

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({
        employee: {
          id: employee.id,
          full_name: employeeName,
          role: employee.role ?? null,
          hire_date: employee.hire_date ?? null,
          profile_image: appUserData?.profile_image ?? null,
          phone: employee.phone ?? null,
          email: employee.email ?? null,
          position: employee.position ?? null,
        },
        infractions,
        disc_actions: discActions,
        ratings,
        schedule: scheduleResult.data
          ? { weekStart: scheduleResult.weekStart, shifts: scheduleResult.data }
          : null,
        summary: {
          infraction_count: infractions.length,
          total_points: totalPoints,
          avg_rating: avgRating != null ? Math.round(avgRating * 100) / 100 : null,
        },
      });
    } catch (error) {
      console.error('[employee-profile API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
