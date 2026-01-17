import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { employee_id, location_id } = req.query;

  if (!employee_id || typeof employee_id !== 'string') {
    return res.status(400).json({ error: 'employee_id is required' });
  }

  if (!location_id || typeof location_id !== 'string') {
    return res.status(400).json({ error: 'location_id is required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, full_name, role, hire_date, consolidated_employee_id, location_id, org_id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get location's org_id
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', location_id)
      .single();

    if (locationError || !location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const orgId = location.org_id;
    const consolidatedEmployeeId = employee.consolidated_employee_id || employee.id;

    // Fetch ALL infractions for this employee (entire history, not just 90 days)
    // Include infractions from any location where the employee exists
    const { data: infractions, error: infractionsError } = await supabase
      .from('infractions')
      .select(`
        id,
        infraction_date,
        infraction,
        points,
        leader_name,
        notes,
        acknowledgement,
        ack_bool,
        leader_signature,
        team_member_signature,
        created_at,
        employee:employees!infractions_employee_id_fkey(
          id,
          consolidated_employee_id
        )
      `)
      .order('infraction_date', { ascending: false });

    if (infractionsError) {
      console.error('Error fetching infractions:', infractionsError);
      return res.status(500).json({ error: 'Failed to fetch infractions' });
    }

    // Filter infractions to only those for this employee (via consolidated_employee_id)
    const employeeInfractions = (infractions || []).filter((inf: any) => {
      const infEmployeeConsolidatedId = inf.employee?.consolidated_employee_id || inf.employee?.id;
      return infEmployeeConsolidatedId === consolidatedEmployeeId;
    }).map((inf: any) => ({
      id: inf.id,
      infraction_date: inf.infraction_date,
      infraction: inf.infraction,
      points: inf.points,
      leader_name: inf.leader_name,
      notes: inf.notes,
      acknowledgement: inf.acknowledgement,
      ack_bool: inf.ack_bool,
      leader_signature: inf.leader_signature,
      team_member_signature: inf.team_member_signature,
      created_at: inf.created_at,
    }));

    // Fetch ALL disciplinary actions for this employee (entire history)
    const { data: actions, error: actionsError } = await supabase
      .from('disc_actions')
      .select(`
        id,
        action_date,
        action,
        leader_name,
        notes,
        created_at,
        employee_id
      `)
      .eq('employee_id', employee_id)
      .order('action_date', { ascending: false });

    if (actionsError) {
      console.error('Error fetching disciplinary actions:', actionsError);
      return res.status(500).json({ error: 'Failed to fetch disciplinary actions' });
    }

    // Fetch discipline actions rubric (org-level first, then location-level)
    let actionThresholds: any[] = [];
    
    // Try org-level actions first
    const { data: orgThresholds } = await supabase
      .from('disc_actions_rubric')
      .select('points_threshold, action')
      .eq('org_id', orgId)
      .is('location_id', null)
      .order('points_threshold', { ascending: true });

    if (orgThresholds && orgThresholds.length > 0) {
      actionThresholds = orgThresholds;
    } else {
      // Fallback to location-specific actions
      const { data: locThresholds } = await supabase
        .from('disc_actions_rubric')
        .select('points_threshold, action')
        .eq('location_id', location_id)
        .order('points_threshold', { ascending: true });

      actionThresholds = locThresholds || [];
    }

    // Calculate current points (90-day rolling)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentPoints = employeeInfractions
      .filter((inf: any) => inf.infraction_date >= ninetyDaysAgo)
      .reduce((sum: number, inf: any) => sum + (inf.points || 0), 0);

    return res.status(200).json({
      employee: {
        id: employee.id,
        full_name: employee.full_name,
        role: employee.role,
        hire_date: employee.hire_date,
      },
      currentPoints,
      infractions: employeeInfractions,
      actions: actions || [],
      actionThresholds,
    });
  } catch (error) {
    console.error('Error in discipline-report API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

