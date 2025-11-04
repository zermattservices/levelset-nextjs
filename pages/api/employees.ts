import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Employee } from '@/lib/supabase.types';
import { calculatePay, shouldCalculatePay } from '@/lib/pay-calculator';

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

      // Add cache headers for better performance (cache for 60 seconds, stale-while-revalidate for 120 seconds)
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

      return res.status(200).json({ employees: employees || [] });
    }

    if (req.method === 'POST') {
      // Update employee
      const { intent, id, role, is_certified, is_foh, is_boh, availability } = req.body;

      if (intent !== 'update' || !id) {
        return res.status(400).json({ error: 'Invalid request parameters' });
      }

      // First, get current employee data to check location and calculate pay
      const { data: currentEmployee, error: fetchError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !currentEmployee) {
        console.error('Error fetching employee:', fetchError);
        return res.status(404).json({ error: 'Employee not found' });
      }

      const updateData: Partial<Employee> = {};
      
      // Track if any pay-affecting fields changed
      let payFieldsChanged = false;

      if (role !== undefined) {
        updateData.role = role;
        payFieldsChanged = true;
      }
      if (is_certified !== undefined) {
        updateData.is_certified = is_certified === 'true' || is_certified === true;
        payFieldsChanged = true;
      }
      if (is_foh !== undefined) {
        updateData.is_foh = is_foh === 'true' || is_foh === true;
        payFieldsChanged = true;
      }
      if (is_boh !== undefined) {
        updateData.is_boh = is_boh === 'true' || is_boh === true;
        payFieldsChanged = true;
      }
      if (availability !== undefined) {
        updateData.availability = availability;
        payFieldsChanged = true;
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updateData.updated_at = new Date().toISOString();

      // Calculate pay if this is a CFA Buda/West Buda location and pay-affecting fields changed
      if (payFieldsChanged && shouldCalculatePay(currentEmployee.location_id)) {
        const updatedEmployee = { ...currentEmployee, ...updateData };
        const calculatedPay = calculatePay(updatedEmployee);
        if (calculatedPay !== null) {
          updateData.calculated_pay = calculatedPay;
        }
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
