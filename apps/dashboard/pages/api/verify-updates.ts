import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createServerSupabaseClient();

    // Get a sample of employees to verify updates
    const { data, error } = await supabase
      .from('employees')
      .select('full_name, hire_date, payroll_name, updated_at')
      .eq('active', true)
      .order('full_name')
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Count how many have values
    const { data: allEmployees, error: countError } = await supabase
      .from('employees')
      .select('hire_date, payroll_name')
      .eq('active', true);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    const stats = {
      total: allEmployees?.length || 0,
      withHireDate: allEmployees?.filter(e => e.hire_date).length || 0,
      withPayrollName: allEmployees?.filter(e => e.payroll_name).length || 0,
      missingHireDate: allEmployees?.filter(e => !e.hire_date).length || 0,
      missingPayrollName: allEmployees?.filter(e => !e.payroll_name).length || 0,
    };

    return res.status(200).json({
      success: true,
      stats,
      sampleEmployees: data
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

