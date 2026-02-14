import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { intent } = req.body;

    if (intent === 'create') {
      const {
        schedule_id, org_id, position_id, shift_date,
        start_time, end_time, break_minutes, notes, employee_id,
        is_house_shift,
      } = req.body;

      if (!schedule_id || !org_id || !shift_date || !start_time || !end_time) {
        return res.status(400).json({ error: 'schedule_id, org_id, shift_date, start_time, and end_time are required' });
      }

      // Create the shift
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          schedule_id,
          org_id,
          position_id: position_id || null,
          shift_date,
          start_time,
          end_time,
          break_minutes: break_minutes || 0,
          notes: notes || null,
          is_house_shift: is_house_shift ?? false,
        })
        .select(`
          *,
          position:org_positions(id, name, zone, display_order)
        `)
        .single();

      if (shiftError) {
        console.error('Error creating shift:', shiftError);
        return res.status(500).json({ error: 'Failed to create shift' });
      }

      // If employee_id provided, auto-create assignment
      let assignment = null;
      if (employee_id && shift) {
        const projectedCost = await calculateProjectedCost(supabase, employee_id, start_time, end_time, break_minutes || 0);

        const { data: assignmentData, error: assignError } = await supabase
          .from('shift_assignments')
          .insert({
            shift_id: shift.id,
            employee_id,
            org_id,
            projected_cost: projectedCost,
          })
          .select(`
            *,
            employee:employees(id, full_name, role, is_foh, is_boh, calculated_pay)
          `)
          .single();

        if (assignError) {
          console.error('Error creating assignment:', assignError);
          // Shift was created successfully, just the assignment failed
        } else {
          assignment = assignmentData;
        }
      }

      return res.status(201).json({
        shift: { ...shift, assignment },
      });
    }

    if (intent === 'update') {
      const { id, position_id, shift_date, start_time, end_time, break_minutes, notes, is_house_shift } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (position_id !== undefined) updateData.position_id = position_id || null;
      if (shift_date !== undefined) updateData.shift_date = shift_date;
      if (start_time !== undefined) updateData.start_time = start_time;
      if (end_time !== undefined) updateData.end_time = end_time;
      if (break_minutes !== undefined) updateData.break_minutes = break_minutes;
      if (notes !== undefined) updateData.notes = notes;
      if (is_house_shift !== undefined) updateData.is_house_shift = is_house_shift;

      const { data, error } = await supabase
        .from('shifts')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          position:org_positions(id, name, zone, display_order),
          assignment:shift_assignments(
            id, employee_id, assigned_by, projected_cost,
            employee:employees(id, full_name, role, is_foh, is_boh, calculated_pay)
          )
        `)
        .single();

      if (error) {
        console.error('Error updating shift:', error);
        return res.status(500).json({ error: 'Failed to update shift' });
      }

      // Recalculate projected cost if times changed and there's an assignment
      if ((start_time !== undefined || end_time !== undefined || break_minutes !== undefined) && data) {
        const shiftData = data as any;
        if (shiftData.assignment && shiftData.assignment.length > 0) {
          const assign = shiftData.assignment[0];
          const newCost = await calculateProjectedCost(
            supabase,
            assign.employee_id,
            shiftData.start_time,
            shiftData.end_time,
            shiftData.break_minutes,
          );

          await supabase
            .from('shift_assignments')
            .update({ projected_cost: newCost, updated_at: new Date().toISOString() })
            .eq('id', assign.id);
        }
      }

      // Flatten assignment array
      const result = data as any;
      return res.status(200).json({
        shift: {
          ...result,
          assignment: result.assignment && result.assignment.length > 0
            ? { ...result.assignment[0], employee: result.assignment[0].employee || null }
            : null,
        },
      });
    }

    if (intent === 'delete') {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting shift:', error);
        return res.status(500).json({ error: 'Failed to delete shift' });
      }

      return res.status(200).json({ success: true });
    }

    if (intent === 'bulk_create') {
      const { shifts } = req.body;

      if (!shifts || !Array.isArray(shifts) || shifts.length === 0) {
        return res.status(400).json({ error: 'shifts array is required' });
      }

      const { data, error } = await supabase
        .from('shifts')
        .insert(shifts.map((s: any) => ({
          schedule_id: s.schedule_id,
          org_id: s.org_id,
          position_id: s.position_id || null,
          shift_date: s.shift_date,
          start_time: s.start_time,
          end_time: s.end_time,
          break_minutes: s.break_minutes || 0,
          notes: s.notes || null,
        })))
        .select(`
          *,
          position:org_positions(id, name, zone, display_order)
        `);

      if (error) {
        console.error('Error bulk creating shifts:', error);
        return res.status(500).json({ error: 'Failed to create shifts' });
      }

      return res.status(201).json({ shifts: data });
    }

    return res.status(400).json({ error: 'Invalid intent' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function calculateProjectedCost(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  employeeId: string,
  startTime: string,
  endTime: string,
  breakMinutes: number,
): Promise<number | null> {
  const { data: employee } = await supabase
    .from('employees')
    .select('calculated_pay')
    .eq('id', employeeId)
    .single();

  if (!employee?.calculated_pay) return null;

  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const netHours = Math.max(0, (endMinutes - startMinutes) / 60 - breakMinutes / 60);

  return Math.round(employee.calculated_pay * netHours * 100) / 100;
}

function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}
