/**
 * Native Form API: My Today
 * GET /api/native/forms/my-today?location_id=<id>&employee_id=<id>
 *
 * Returns the authenticated user's schedule status for today:
 * - setup_assignments (position assignments within shifts)
 * - shifts (if no setup_assignments cover them)
 * - time_off_requests (if approved and overlapping today)
 *
 * Response shape:
 * {
 *   status: 'working' | 'not_scheduled' | 'time_off',
 *   shifts?: Array<{
 *     id: string,
 *     label: string,
 *     start_time: string,
 *     end_time: string,
 *     setup_assignments: Array<{ id: string, label: string, start_time: string, end_time: string }>
 *   }>,
 *   entries?: Array<{ type: 'position' | 'shift', label: string, start_time: string, end_time: string }>,
 *   timeOffNote?: string | null
 * }
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

interface ScheduleEntry {
  type: 'position' | 'shift';
  label: string;
  start_time: string;
  end_time: string;
}

function timeToMinutes(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

interface SetupAssignmentEntry {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
}

interface TodayShiftEntry {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  setup_assignments: SetupAssignmentEntry[];
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
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

      // ---------------------------------------------------------------
      // 1. Check for approved time off overlapping today
      // ---------------------------------------------------------------
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;

      const { data: timeOffRequests, error: timeOffError } = await supabase
        .from('time_off_requests')
        .select('id, note, start_datetime, end_datetime')
        .eq('org_id', context.orgId)
        .eq('employee_id', employeeId)
        .eq('location_id', locationId)
        .eq('status', 'approved')
        .lte('start_datetime', todayEnd)
        .gte('end_datetime', todayStart);

      if (timeOffError) {
        console.error('Error fetching time off requests:', timeOffError);
        return res.status(500).json({ error: 'Failed to fetch time off requests' });
      }

      if (timeOffRequests && timeOffRequests.length > 0) {
        const firstRequest = timeOffRequests[0] as any;
        res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Vary', 'Authorization');
        return res.status(200).json({
          status: 'time_off',
          timeOffNote: firstRequest.note || null,
        });
      }

      // ---------------------------------------------------------------
      // 2. Get published schedule for this week at this location
      // ---------------------------------------------------------------
      const thisWeekStart = getWeekStart(now);

      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('id, week_start, status')
        .eq('location_id', locationId)
        .eq('status', 'published')
        .eq('week_start', thisWeekStart);

      if (schedError) {
        console.error('Error fetching schedules:', schedError);
        return res.status(500).json({ error: 'Failed to fetch schedules' });
      }

      const scheduleIds = (schedules || []).map((s: any) => s.id);

      if (scheduleIds.length === 0) {
        res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Vary', 'Authorization');
        return res.status(200).json({ status: 'not_scheduled' });
      }

      // ---------------------------------------------------------------
      // 3. Fetch today's shifts assigned to this employee
      // ---------------------------------------------------------------
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          id, schedule_id, shift_date, start_time, end_time, break_minutes, notes,
          position:org_positions(id, name),
          assignment:shift_assignments!inner(id, employee_id)
        `)
        .in('schedule_id', scheduleIds)
        .eq('shift_assignments.employee_id', employeeId)
        .eq('shift_date', today)
        .order('start_time');

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        return res.status(500).json({ error: 'Failed to fetch shifts' });
      }

      if (!shifts || shifts.length === 0) {
        res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');
        res.setHeader('Vary', 'Authorization');
        return res.status(200).json({ status: 'not_scheduled' });
      }

      // ---------------------------------------------------------------
      // 4. Fetch setup_assignments for this employee today
      // ---------------------------------------------------------------
      const shiftIds = shifts.map((s: any) => s.id);

      const { data: setupAssignments, error: setupError } = await supabase
        .from('setup_assignments')
        .select(`
          id, shift_id, start_time, end_time,
          position:org_positions(id, name)
        `)
        .eq('org_id', context.orgId)
        .eq('employee_id', employeeId)
        .eq('assignment_date', today)
        .in('shift_id', shiftIds)
        .order('start_time');

      if (setupError) {
        console.error('Error fetching setup assignments:', setupError);
        return res.status(500).json({ error: 'Failed to fetch setup assignments' });
      }

      // ---------------------------------------------------------------
      // 5. Build grouped shifts (with setup assignment children)
      // ---------------------------------------------------------------
      const assignmentsByShift = new Map<string, any[]>();
      for (const sa of (setupAssignments || []) as any[]) {
        const existing = assignmentsByShift.get(sa.shift_id) || [];
        existing.push(sa);
        assignmentsByShift.set(sa.shift_id, existing);
      }

      const groupedShifts: TodayShiftEntry[] = (shifts as any[])
        .map((shift) => {
          const shiftAssignments = (assignmentsByShift.get(shift.id) || [])
            .slice()
            .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))
            .map((sa) => ({
              id: sa.id,
              label: sa.position?.name || 'Position',
              start_time: sa.start_time,
              end_time: sa.end_time,
            }));

          return {
            id: shift.id,
            label: shift.position?.name || 'Shift',
            start_time: shift.start_time,
            end_time: shift.end_time,
            setup_assignments: shiftAssignments,
          };
        })
        .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      // Backward-compatible flattened entries for older clients
      const entries: ScheduleEntry[] = groupedShifts.flatMap((shift) => ([
        {
          type: 'shift' as const,
          label: shift.label,
          start_time: shift.start_time,
          end_time: shift.end_time,
        },
        ...shift.setup_assignments.map((assignment) => ({
          type: 'position' as const,
          label: assignment.label,
          start_time: assignment.start_time,
          end_time: assignment.end_time,
        })),
      ]));

      res.setHeader('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({
        status: 'working',
        shifts: groupedShifts,
        entries,
      });
    } catch (error) {
      console.error('my-today API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
