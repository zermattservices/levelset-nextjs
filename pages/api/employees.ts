import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  try {
    const supabase = createServerSupabaseClient();

    if (req.method === 'GET') {
      // Fetch employees
      const { org_id, location_id } = req.query;
      
      if (!org_id || !location_id) {
        return res.status(400).json({ error: 'org_id and location_id are required' });
      }

      const { data: employees, error } = await supabase
        .from('employees')
        .select('*')
        .eq('org_id', org_id)
        .eq('location_id', location_id)
        .eq('active', true)
        .order('full_name');

      if (error) {
        console.error('Error fetching employees:', error);
        return res.status(500).json({ error: 'Failed to fetch employees' });
      }

      return res.status(200).json({ employees: employees || [] });
    }

    if (req.method === 'POST') {
      // Update employee
      const { intent, id, role, is_foh, is_boh } = req.body;

      if (intent !== 'update' || !id) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }

      const updateData: Partial<Employee> = {};
      
      if (role !== undefined) updateData.role = role;
      if (is_foh !== undefined) updateData.is_foh = is_foh === 'true' || is_foh === true;
      if (is_boh !== undefined) updateData.is_boh = is_boh === 'true' || is_boh === true;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating employee:', error);
        return res.status(500).json({ error: 'Failed to update employee' });
      }

      return res.status(200).json({ employee: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
