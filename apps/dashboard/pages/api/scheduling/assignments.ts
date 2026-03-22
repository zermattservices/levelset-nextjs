import { withAuth } from '@/lib/permissions/middleware';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { setCorsOrigin } from '@/lib/cors';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    setCorsOrigin(req, res);
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

    if (intent === 'assign') {
      const { shift_id, employee_id, org_id, assigned_by } = req.body;

      if (!shift_id || !employee_id || !org_id) {
        return res.status(400).json({ error: 'shift_id, employee_id, and org_id are required' });
      }

      // Get the shift details for overlap checking and cost calculation
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .select('id, shift_date, start_time, end_time, break_minutes, schedule_id')
        .eq('id', shift_id)
        .single();

      if (shiftError || !shift) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      // Check for overlapping assignments for this employee on the same day
      const { data: existingShifts } = await supabase
        .from('shift_assignments')
        .select(`
          shift_id,
          shifts!inner(shift_date, start_time, end_time)
        `)
        .eq('employee_id', employee_id)
        .neq('shift_id', shift_id);

      const overlapping = (existingShifts as any[] || []).some((existing: any) => {
        const existingShift = existing.shifts;
        if (existingShift.shift_date !== shift.shift_date) return false;
        // Check time overlap
        return existingShift.start_time < shift.end_time && existingShift.end_time > shift.start_time;
      });

      if (overlapping) {
        return res.status(409).json({ error: 'Employee already has an overlapping shift on this day' });
      }

      // Calculate projected cost
      const projectedCost = await calculateProjectedCost(
        supabase, employee_id, shift.start_time, shift.end_time, shift.break_minutes,
      );

      const { data, error } = await supabase
        .from('shift_assignments')
        .insert({
          shift_id,
          employee_id,
          org_id,
          assigned_by: assigned_by || null,
          projected_cost: projectedCost,
        })
        .select(`
          *,
          employee:employees(id, full_name, role, is_foh, is_boh, calculated_pay, actual_pay, actual_pay_type, actual_pay_annual)
        `)
        .single();

      if (error) {
        console.error('Error creating assignment:', error);
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Employee is already assigned to this shift' });
        }
        return res.status(500).json({ error: 'Failed to create assignment' });
      }

      // Audit log
      await supabase.from('shift_audit_log').insert({
        shift_id,
        schedule_id: shift.schedule_id,
        org_id,
        changed_by: assigned_by || null,
        change_type: 'assigned',
        new_values: { employee_id, projected_cost: projectedCost },
      });

      return res.status(201).json({ assignment: data });
    }

    if (intent === 'unassign') {
      const { id, shift_id, employee_id } = req.body;

      // Fetch shift info for audit log before deletion
      let auditShift: any = null;
      if (shift_id) {
        const { data } = await supabase.from('shifts').select('schedule_id, org_id').eq('id', shift_id).single();
        auditShift = data;
      }

      // Support deletion by id or by shift_id + employee_id
      let query = supabase.from('shift_assignments').delete();

      if (id) {
        query = query.eq('id', id);
      } else if (shift_id && employee_id) {
        query = query.eq('shift_id', shift_id).eq('employee_id', employee_id);
      } else {
        return res.status(400).json({ error: 'id or (shift_id + employee_id) is required' });
      }

      const { error } = await query;

      if (error) {
        console.error('Error removing assignment:', error);
        return res.status(500).json({ error: 'Failed to remove assignment' });
      }

      // Audit log
      if (auditShift && shift_id) {
        await supabase.from('shift_audit_log').insert({
          shift_id,
          schedule_id: auditShift.schedule_id,
          org_id: auditShift.org_id,
          change_type: 'unassigned',
          old_values: { employee_id },
        });
      }

      return res.status(200).json({ success: true });
    }

    if (intent === 'reassign') {
      const { shift_id, old_employee_id, new_employee_id, org_id } = req.body;

      if (!shift_id || !new_employee_id) {
        return res.status(400).json({ error: 'shift_id and new_employee_id are required' });
      }

      // Get shift details
      const { data: shift } = await supabase
        .from('shifts')
        .select('start_time, end_time, break_minutes, shift_date, schedule_id, org_id')
        .eq('id', shift_id)
        .single();

      if (!shift) {
        return res.status(404).json({ error: 'Shift not found' });
      }

      // Remove old assignment if specified
      if (old_employee_id) {
        await supabase
          .from('shift_assignments')
          .delete()
          .eq('shift_id', shift_id)
          .eq('employee_id', old_employee_id);
      } else {
        // Remove any existing assignment for this shift
        await supabase
          .from('shift_assignments')
          .delete()
          .eq('shift_id', shift_id);
      }

      // Calculate new projected cost
      const projectedCost = await calculateProjectedCost(
        supabase, new_employee_id, shift.start_time, shift.end_time, shift.break_minutes,
      );

      // Create new assignment
      const { data, error } = await supabase
        .from('shift_assignments')
        .insert({
          shift_id,
          employee_id: new_employee_id,
          org_id: org_id || null,
          projected_cost: projectedCost,
        })
        .select(`
          *,
          employee:employees(id, full_name, role, is_foh, is_boh, calculated_pay, actual_pay, actual_pay_type, actual_pay_annual)
        `)
        .single();

      if (error) {
        console.error('Error reassigning:', error);
        return res.status(500).json({ error: 'Failed to reassign shift' });
      }

      // Audit log
      if (shift) {
        await supabase.from('shift_audit_log').insert({
          shift_id,
          schedule_id: (shift as any).schedule_id,
          org_id: (shift as any).org_id || org_id,
          change_type: 'reassigned',
          old_values: { employee_id: old_employee_id },
          new_values: { employee_id: new_employee_id, projected_cost: projectedCost },
        });
      }

      return res.status(200).json({ assignment: data });
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
    .select('actual_pay, actual_pay_type, actual_pay_annual, calculated_pay')
    .eq('id', employeeId)
    .single();

  if (!employee) return null;

  // Salaried employees: no per-shift cost (flat weekly rate)
  if (employee.actual_pay_type === 'salary') return null;

  // Prefer actual_pay (from HS), fall back to calculated_pay (from org rules)
  const hourlyRate = employee.actual_pay ?? employee.calculated_pay;
  if (!hourlyRate) return null;

  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  const netHours = Math.max(0, (endMinutes - startMinutes) / 60 - breakMinutes / 60);

  return Math.round(hourlyRate * netHours * 100) / 100;
}

function parseTime(time: string): number {
  const parts = time.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export default withAuth(handler);
