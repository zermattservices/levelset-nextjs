import { withAuth } from '@/lib/permissions/middleware';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  calculateWeeklyOvertime,
  DEFAULT_OT_RULES,
  type OvertimeRule,
  type ShiftForOT,
} from '@/lib/scheduling/overtime';
import { setCorsOrigin } from '@/lib/cors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
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

      // Fetch all shifts with their positions and assignments (with employee data)
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select(`
          *,
          position:org_positions(id, name, zone, display_order),
          assignment:shift_assignments(
            id, employee_id, assigned_by, projected_cost,
            employee:employees(id, full_name, role, is_foh, is_boh, calculated_pay, actual_pay, actual_pay_type, actual_pay_annual)
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
      // Recalculate projected_cost on the fly from current pay rates
      const flattenedShifts = (shifts || []).map((shift: any) => {
        const assignment = shift.assignment && shift.assignment.length > 0
          ? shift.assignment[0]
          : null;

        let projectedCost = assignment?.projected_cost ?? null;

        // Recalculate from current pay rate if employee has hourly pay
        if (assignment?.employee) {
          const emp = assignment.employee;
          if (emp.actual_pay_type !== 'salary') {
            const rate = emp.actual_pay ?? emp.calculated_pay;
            if (rate) {
              const [sh, sm] = shift.start_time.split(':').map(Number);
              const [eh, em] = shift.end_time.split(':').map(Number);
              let endMin = eh * 60 + em;
              const startMin = sh * 60 + sm;
              if (endMin <= startMin) endMin += 1440;
              const netHours = Math.max(0, (endMin - startMin - (shift.break_minutes || 0)) / 60);
              projectedCost = Math.round(rate * netHours * 100) / 100;
            }
          }
        }

        return {
          ...shift,
          position: shift.position || null,
          assignment: assignment
            ? {
                ...assignment,
                projected_cost: projectedCost,
                employee: assignment.employee || null,
              }
            : null,
        };
      });

      res.setHeader('Cache-Control', 'private, no-store');

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

        // Validate published_by is a real app_users.id (FK constraint)
        let publishedBy: string | null = null;
        if (user_id) {
          const { data: appUser } = await supabase
            .from('app_users')
            .select('id')
            .eq('id', user_id)
            .maybeSingle();
          publishedBy = appUser?.id ?? null;
        }

        const now = new Date().toISOString();

        // Hard-delete any shifts marked pending_delete
        const { error: hardDeleteError } = await supabase
          .from('shifts')
          .delete()
          .eq('schedule_id', id)
          .eq('pending_delete', true);

        if (hardDeleteError) {
          console.error('Error hard-deleting pending shifts:', hardDeleteError);
          return res.status(500).json({ error: 'Failed to delete pending shifts' });
        }

        // Snapshot current state for all shifts before marking as published.
        // This captures what the employee/mobile app should see as "published".
        const { data: shiftsPre } = await supabase
          .from('shifts')
          .select('id, shift_date, start_time, end_time, break_minutes, position_id, is_house_shift, notes, org_id, shift_assignments(employee_id)')
          .eq('schedule_id', id);

        if (shiftsPre) {
          for (const s of shiftsPre as any[]) {
            const empId = s.shift_assignments?.[0]?.employee_id ?? null;
            const snapshot = {
              shift_date: s.shift_date,
              start_time: s.start_time,
              end_time: s.end_time,
              break_minutes: s.break_minutes,
              position_id: s.position_id,
              is_house_shift: s.is_house_shift,
              notes: s.notes,
              employee_id: empId,
            };
            await supabase
              .from('shifts')
              .update({ published_snapshot: snapshot })
              .eq('id', s.id);

            // Audit log entry for each published shift
            await supabase
              .from('shift_audit_log')
              .insert({
                shift_id: s.id,
                schedule_id: id,
                org_id: s.org_id,
                changed_by: publishedBy,
                change_type: 'published',
                new_values: snapshot,
              });
          }
        }

        // Mark all remaining shifts as published (idempotent — safe to re-stamp already-published shifts)
        const { data: updatedShifts, error: publishShiftError } = await supabase
          .from('shifts')
          .update({ published_at: now })
          .eq('schedule_id', id)
          .select('id');

        if (publishShiftError) {
          console.error('Error publishing shifts:', publishShiftError);
          return res.status(500).json({ error: 'Failed to publish shifts' });
        }

        const publishedCount = updatedShifts?.length ?? 0;

        // Fetch ALL shifts for total hours/cost calculation
        const { data: allShifts } = await supabase
          .from('shifts')
          .select(`
            id, shift_date, start_time, end_time, break_minutes,
            shift_assignments(
              projected_cost, employee_id,
              employees(actual_pay, actual_pay_type, calculated_pay)
            )
          `)
          .eq('schedule_id', id);

        let totalHours = 0;
        let totalCost = 0;
        const otShifts: ShiftForOT[] = [];

        for (const shift of (allShifts || []) as any[]) {
          const start = parseTime(shift.start_time);
          let end = parseTime(shift.end_time);
          if (end <= start) end += 24 * 60;
          const breakHours = (shift.break_minutes || 0) / 60;
          const hours = Math.max(0, (end - start) / 60 - breakHours);
          totalHours += hours;

          if (shift.shift_assignments && shift.shift_assignments.length > 0) {
            const assign = shift.shift_assignments[0];
            totalCost += assign.projected_cost || 0;

            if (assign.employee_id && assign.employees) {
              const emp = assign.employees;
              if (emp.actual_pay_type !== 'salary') {
                const hourlyRate = emp.actual_pay ?? emp.calculated_pay;
                if (hourlyRate) {
                  otShifts.push({
                    id: shift.id,
                    employee_id: assign.employee_id,
                    shift_date: shift.shift_date,
                    start_time: shift.start_time,
                    end_time: shift.end_time,
                    break_minutes: shift.break_minutes || 0,
                    hourly_rate: hourlyRate,
                  });
                }
              }
            }
          }
        }

        // Calculate OT premium (wrapped in try/catch to prevent 500s)
        let otPremium = 0;
        try {
          if (otShifts.length > 0) {
            const { data: schedData } = await supabase
              .from('schedules')
              .select('location_id')
              .eq('id', id)
              .single();

            let otRules: OvertimeRule[] = DEFAULT_OT_RULES;
            if (schedData?.location_id) {
              const { data: location } = await supabase
                .from('locations')
                .select('state')
                .eq('id', schedData.location_id)
                .single();

              if (location?.state) {
                const { data: stateRules } = await supabase
                  .from('overtime_rules')
                  .select('rule_type, threshold_hours, multiplier, priority')
                  .eq('state_code', location.state)
                  .eq('is_active', true);

                if (stateRules && stateRules.length > 0) {
                  otRules = stateRules as OvertimeRule[];
                }
              }
            }

            const otResult = calculateWeeklyOvertime(otShifts, otRules);
            otPremium = otResult.total_ot_premium;
          }
        } catch (otErr) {
          console.error('[schedules] OT calculation failed, continuing without OT premium:', otErr);
        }

        // Update schedule-level summary
        const { data, error } = await supabase
          .from('schedules')
          .update({
            status: 'published',
            published_at: now,
            published_by: publishedBy,
            total_hours: Math.round(totalHours * 100) / 100,
            total_labor_cost: Math.round((totalCost + otPremium) * 100) / 100,
            updated_at: now,
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating schedule after publish:', error);
          return res.status(500).json({ error: 'Failed to update schedule' });
        }

        return res.status(200).json({ schedule: data, published_count: publishedCount });
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

export default withAuth(handler);
