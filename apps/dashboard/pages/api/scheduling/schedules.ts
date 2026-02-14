import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const supabase = createServerSupabaseClient();

    if (req.method === 'GET') {
      const { location_id, week_start } = req.query;

      if (!location_id || !week_start) {
        return res.status(400).json({ error: 'location_id and week_start are required' });
      }

      // Fetch the schedule for this location + week
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('location_id', location_id)
        .eq('week_start', week_start)
        .maybeSingle();

      if (scheduleError) {
        console.error('Error fetching schedule:', scheduleError);
        return res.status(500).json({ error: 'Failed to fetch schedule' });
      }

      if (!schedule) {
        return res.status(200).json({ schedule: null, shifts: [] });
      }

      // Fetch all shifts with their areas and assignments (with employee data)
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          *,
          shift_area:shift_areas(id, name, color, display_order),
          assignment:shift_assignments(
            id, employee_id, assigned_by, projected_cost,
            employee:employees(id, full_name, role, is_foh, is_boh, calculated_pay)
          )
        `)
        .eq('schedule_id', schedule.id)
        .order('shift_date')
        .order('start_time');

      if (shiftsError) {
        console.error('Error fetching shifts:', shiftsError);
        return res.status(500).json({ error: 'Failed to fetch shifts' });
      }

      // Flatten the nested assignment array (each shift has at most one assignment in MVP)
      const flattenedShifts = (shifts || []).map((shift: any) => ({
        ...shift,
        shift_area: shift.shift_area || null,
        assignment: shift.assignment && shift.assignment.length > 0
          ? {
              ...shift.assignment[0],
              employee: shift.assignment[0].employee || null,
            }
          : null,
      }));

      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');

      return res.status(200).json({
        schedule,
        shifts: flattenedShifts,
      });
    }

    if (req.method === 'POST') {
      const { intent } = req.body;

      if (intent === 'create') {
        const { location_id, org_id, week_start } = req.body;

        if (!location_id || !org_id || !week_start) {
          return res.status(400).json({ error: 'location_id, org_id, and week_start are required' });
        }

        const { data, error } = await supabase
          .from('schedules')
          .insert({
            location_id,
            org_id,
            week_start,
            status: 'draft',
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating schedule:', error);
          if (error.code === '23505') {
            return res.status(409).json({ error: 'A schedule already exists for this location and week' });
          }
          return res.status(500).json({ error: 'Failed to create schedule' });
        }

        return res.status(201).json({ schedule: data });
      }

      if (intent === 'publish') {
        const { id, user_id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

        // Calculate total hours and labor cost from shifts
        const { data: shifts } = await supabase
          .from('shifts')
          .select(`
            start_time, end_time, break_minutes,
            shift_assignments(projected_cost)
          `)
          .eq('schedule_id', id);

        let totalHours = 0;
        let totalCost = 0;

        for (const shift of (shifts || []) as any[]) {
          const start = parseTime(shift.start_time);
          const end = parseTime(shift.end_time);
          const breakHours = (shift.break_minutes || 0) / 60;
          const hours = Math.max(0, (end - start) / 60 - breakHours);
          totalHours += hours;

          if (shift.shift_assignments && shift.shift_assignments.length > 0) {
            totalCost += shift.shift_assignments[0].projected_cost || 0;
          }
        }

        const { data, error } = await supabase
          .from('schedules')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            published_by: user_id || null,
            total_hours: Math.round(totalHours * 100) / 100,
            total_labor_cost: Math.round(totalCost * 100) / 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error publishing schedule:', error);
          return res.status(500).json({ error: 'Failed to publish schedule' });
        }

        return res.status(200).json({ schedule: data });
      }

      if (intent === 'unpublish') {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'id is required' });
        }

        const { data, error } = await supabase
          .from('schedules')
          .update({
            status: 'draft',
            published_at: null,
            published_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error unpublishing schedule:', error);
          return res.status(500).json({ error: 'Failed to unpublish schedule' });
        }

        return res.status(200).json({ schedule: data });
      }

      return res.status(400).json({ error: 'Invalid intent' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Parse "HH:MM:SS" or "HH:MM" time string to minutes since midnight
function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
