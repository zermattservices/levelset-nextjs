/**
 * Native Form API: My Schedule
 * GET /api/native/forms/my-schedule?location_id=<id>&employee_id=<id>
 *
 * Returns the authenticated user's assigned shifts for the current week
 * and next week (if published). Shifts are grouped by week with position data.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

/**
 * Get the Sunday that starts the week containing the given date.
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Move to Sunday
  return d.toISOString().split('T')[0];
}

/**
 * Get the Sunday of the following week.
 */
function getNextWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 7);
  return d.toISOString().split('T')[0];
}

export default withPermissionAndContext(
  P.SCHED_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = req.query.location_id as string;
    const employeeId = req.query.employee_id as string;

    if (!locationId || !employeeId) {
      return res.status(400).json({ error: 'location_id and employee_id are required' });
    }

    try {
      // Validate location access
      const location = await validateLocationAccess(context.userId, context.orgId, locationId);
      if (!location) {
        return res.status(403).json({ error: 'Location access denied' });
      }

      const supabase = createServerSupabaseClient();
      const now = new Date();
      const thisWeekStart = getWeekStart(now);
      const nextWeekStart = getNextWeekStart(now);

      // Fetch published schedules for this week and next week
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('id, week_start, status')
        .eq('location_id', locationId)
        .eq('status', 'published')
        .in('week_start', [thisWeekStart, nextWeekStart]);

      if (schedError) {
        console.error('Error fetching schedules:', schedError);
        return res.status(500).json({ error: 'Failed to fetch schedules' });
      }

      const scheduleIds = (schedules || []).map((s: any) => s.id);

      if (scheduleIds.length === 0) {
        return res.status(200).json({
          thisWeek: { weekStart: thisWeekStart, shifts: [] },
          nextWeek: null,
        });
      }

      // Fetch shifts assigned to this employee from those schedules
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          id, schedule_id, shift_date, start_time, end_time, break_minutes, notes,
          position:org_positions(id, name),
          assignment:shift_assignments!inner(id, employee_id)
        `)
        .in('schedule_id', scheduleIds)
        .eq('shift_assignments.employee_id', employeeId)
        .order('shift_date')
        .order('start_time');

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        return res.status(500).json({ error: 'Failed to fetch shifts' });
      }

      // Build a schedule lookup
      const scheduleMap = new Map<string, string>();
      for (const s of (schedules || []) as any[]) {
        scheduleMap.set(s.id, s.week_start);
      }

      // Split shifts into this week and next week
      const thisWeekShifts: any[] = [];
      const nextWeekShifts: any[] = [];

      for (const shift of (shifts || []) as any[]) {
        const weekStart = scheduleMap.get(shift.schedule_id);
        const formatted = {
          id: shift.id,
          shift_date: shift.shift_date,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes || 0,
          notes: shift.notes || null,
          position: shift.position || null,
        };

        if (weekStart === thisWeekStart) {
          thisWeekShifts.push(formatted);
        } else if (weekStart === nextWeekStart) {
          nextWeekShifts.push(formatted);
        }
      }

      const hasNextWeek = schedules?.some((s: any) => s.week_start === nextWeekStart);

      res.setHeader('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({
        thisWeek: { weekStart: thisWeekStart, shifts: thisWeekShifts },
        nextWeek: hasNextWeek
          ? { weekStart: nextWeekStart, shifts: nextWeekShifts }
          : null,
      });
    } catch (error) {
      console.error('my-schedule API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
