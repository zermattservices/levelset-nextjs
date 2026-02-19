import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

const ASSIGNMENT_SELECT = `
  *,
  employee:employees(id, full_name, calculated_pay),
  position:org_positions(id, name, zone),
  shift:shifts(id, start_time, end_time, position_id)
`;

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
      const { org_id, date, start_time, end_time } = req.query;

      if (!org_id || !date || !start_time || !end_time) {
        return res.status(400).json({ error: 'org_id, date, start_time, and end_time are required' });
      }

      const { data, error } = await supabase
        .from('setup_assignments')
        .select(ASSIGNMENT_SELECT)
        .eq('org_id', org_id as string)
        .eq('assignment_date', date as string)
        .gte('end_time', start_time as string)
        .lte('start_time', end_time as string)
        .order('position_id')
        .order('start_time');

      if (error) {
        console.error('Error fetching setup assignments:', error);
        return res.status(500).json({ error: 'Failed to fetch setup assignments' });
      }

      return res.status(200).json({ assignments: data || [] });
    }

    if (req.method === 'POST') {
      const { intent } = req.body;

      if (intent === 'assign') {
        const { org_id, shift_id, employee_id, position_id, assignment_date, start_time, end_time, assigned_by } = req.body;

        if (!org_id || !shift_id || !employee_id || !position_id || !assignment_date || !start_time || !end_time) {
          return res.status(400).json({
            error: 'org_id, shift_id, employee_id, position_id, assignment_date, start_time, and end_time are required',
          });
        }

        // Verify the shift exists and belongs to this org
        const { data: shift, error: shiftError } = await supabase
          .from('shifts')
          .select('id, org_id')
          .eq('id', shift_id)
          .eq('org_id', org_id)
          .single();

        if (shiftError || !shift) {
          return res.status(404).json({ error: 'Shift not found or does not belong to this organization' });
        }

        const { data, error } = await supabase
          .from('setup_assignments')
          .insert({
            org_id,
            shift_id,
            employee_id,
            position_id,
            assignment_date,
            start_time,
            end_time,
            assigned_by: assigned_by || null,
          })
          .select(ASSIGNMENT_SELECT)
          .single();

        if (error) {
          console.error('Error creating setup assignment:', error);
          if (error.code === '23505') {
            return res.status(409).json({ error: 'This setup assignment already exists' });
          }
          return res.status(500).json({ error: 'Failed to create setup assignment' });
        }

        return res.status(201).json({ assignment: data });
      }

      if (intent === 'unassign') {
        const { id, shift_id, employee_id, position_id, start_time, end_time } = req.body;

        let query = supabase.from('setup_assignments').delete();

        if (id) {
          query = query.eq('id', id);
        } else if (shift_id && employee_id && position_id && start_time && end_time) {
          query = query
            .eq('shift_id', shift_id)
            .eq('employee_id', employee_id)
            .eq('position_id', position_id)
            .eq('start_time', start_time)
            .eq('end_time', end_time);
        } else {
          return res.status(400).json({
            error: 'id or (shift_id, employee_id, position_id, start_time, end_time) is required',
          });
        }

        const { error } = await query;

        if (error) {
          console.error('Error removing setup assignment:', error);
          return res.status(500).json({ error: 'Failed to remove setup assignment' });
        }

        return res.status(200).json({ success: true });
      }

      if (intent === 'reassign') {
        const { id, position_id } = req.body;

        if (!id || !position_id) {
          return res.status(400).json({ error: 'id and position_id are required' });
        }

        const { data, error } = await supabase
          .from('setup_assignments')
          .update({
            position_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select(ASSIGNMENT_SELECT)
          .single();

        if (error) {
          console.error('Error reassigning setup assignment:', error);
          return res.status(500).json({ error: 'Failed to reassign setup assignment' });
        }

        if (!data) {
          return res.status(404).json({ error: 'Setup assignment not found' });
        }

        return res.status(200).json({ assignment: data });
      }

      if (intent === 'bulk_assign') {
        const { assignments } = req.body;

        if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
          return res.status(400).json({ error: 'assignments array is required and must not be empty' });
        }

        const { data, error } = await supabase
          .from('setup_assignments')
          .insert(
            assignments.map((a: any) => ({
              org_id: a.org_id,
              shift_id: a.shift_id,
              employee_id: a.employee_id,
              position_id: a.position_id,
              assignment_date: a.assignment_date,
              start_time: a.start_time,
              end_time: a.end_time,
            }))
          )
          .select(ASSIGNMENT_SELECT);

        if (error) {
          console.error('Error bulk creating setup assignments:', error);
          return res.status(500).json({ error: 'Failed to create setup assignments' });
        }

        return res.status(201).json({ assignments: data || [] });
      }

      return res.status(400).json({ error: 'Invalid intent' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
