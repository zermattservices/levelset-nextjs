import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { employee_id } = req.query;

  if (!employee_id || typeof employee_id !== 'string') {
    return res.status(400).json({ error: 'employee_id is required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Get employee info including consolidated_employee_id
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, consolidated_employee_id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const consolidatedId = employee.consolidated_employee_id || employee.id;

    // Calculate 90-day rolling points
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all infractions for this employee (including consolidated employees)
    const { data: infractions, error: infractionsError } = await supabase
      .from('infractions')
      .select(`
        points,
        employee:employees!infractions_employee_id_fkey(
          id,
          consolidated_employee_id
        )
      `)
      .gte('infraction_date', ninetyDaysAgo);

    if (infractionsError) {
      console.error('Error fetching infractions:', infractionsError);
      return res.status(500).json({ error: 'Failed to fetch infractions' });
    }

    // Filter infractions to only those for this employee (via consolidated_employee_id)
    const employeeInfractions = (infractions || []).filter((inf: any) => {
      const infEmployeeConsolidatedId = inf.employee?.consolidated_employee_id || inf.employee?.id;
      return infEmployeeConsolidatedId === consolidatedId;
    });

    const points = employeeInfractions.reduce((sum: number, inf: any) => sum + (inf.points || 0), 0);

    return res.status(200).json({ points });
  } catch (error) {
    console.error('Error in employee points API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

