import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { withPermission } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location_id } = req.query;

  if (!location_id || typeof location_id !== 'string') {
    return res.status(400).json({ error: 'location_id is required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    // Get location's org_id and image_url
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('org_id, image_url')
      .eq('id', location_id)
      .single();

    if (locationError || !location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Fetch discipline actions rubric (org-level first, then location-level)
    let actionsData: any[] = [];
    
    // Try org-level actions first
    const { data: orgActions } = await supabase
      .from('disc_actions_rubric')
      .select('points_threshold, action')
      .eq('org_id', location.org_id)
      .is('location_id', null)
      .order('points_threshold', { ascending: true });

    if (orgActions && orgActions.length > 0) {
      actionsData = orgActions;
    } else {
      // Fallback to location-specific actions
      const { data: locActions } = await supabase
        .from('disc_actions_rubric')
        .select('points_threshold, action')
        .eq('location_id', location_id)
        .order('points_threshold', { ascending: true });

      actionsData = locActions || [];
    }

    // Fetch active employees
    const { data: activeEmployeesRaw, error: activeError } = await supabase
      .from('employees')
      .select('id, full_name, role, hire_date, consolidated_employee_id')
      .eq('location_id', location_id)
      .eq('active', true)
      .order('full_name');

    if (activeError) {
      console.error('Error fetching active employees:', activeError);
      return res.status(500).json({ error: 'Failed to fetch active employees' });
    }

    // Fetch inactive employees
    const { data: inactiveEmployeesRaw, error: inactiveError } = await supabase
      .from('employees')
      .select('id, full_name, role, hire_date, termination_date, termination_reason')
      .eq('location_id', location_id)
      .eq('active', false)
      .order('full_name');

    if (inactiveError) {
      console.error('Error fetching inactive employees:', inactiveError);
      return res.status(500).json({ error: 'Failed to fetch inactive employees' });
    }

    // Get infractions for last 90 days to calculate current points
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get consolidated employee IDs for current location employees
    const currentLocationConsolidatedIds = new Set(
      (activeEmployeesRaw || []).map((emp: any) => emp.consolidated_employee_id || emp.id)
    );

    // Fetch all infractions in date range
    const { data: infractions, error: infractionsError } = await supabase
      .from('infractions')
      .select(`
        employee_id, 
        points, 
        infraction_date,
        employee:employees!infractions_employee_id_fkey(
          id,
          consolidated_employee_id
        )
      `)
      .gte('infraction_date', ninetyDaysAgo)
      .order('infraction_date', { ascending: false });

    if (infractionsError) {
      console.error('Error fetching infractions:', infractionsError);
    }

    // Filter infractions to only those where employee exists in current location
    const relevantInfractions = (infractions || []).filter((inf: any) => {
      const employeeConsolidatedId = inf.employee?.consolidated_employee_id || inf.employee_id;
      return currentLocationConsolidatedIds.has(employeeConsolidatedId);
    });

    // Calculate current points and last infraction for each active employee
    const activeEmployees = (activeEmployeesRaw || []).map((emp: any) => {
      const empConsolidatedId = emp.consolidated_employee_id || emp.id;
      const empInfractions = relevantInfractions.filter((inf: any) => {
        const infEmployeeConsolidatedId = inf.employee?.consolidated_employee_id || inf.employee_id;
        return infEmployeeConsolidatedId === empConsolidatedId;
      });
      
      const current_points = empInfractions.reduce((sum: number, inf: any) => sum + (inf.points || 0), 0);
      const last_infraction = empInfractions.length > 0 ? empInfractions[0]?.infraction_date : null;

      return {
        id: emp.id,
        full_name: emp.full_name || 'Unknown',
        role: emp.role || 'Team Member',
        hire_date: emp.hire_date,
        last_infraction,
        current_points,
      };
    }).sort((a: any, b: any) => b.current_points - a.current_points || a.full_name.localeCompare(b.full_name));

    // Format inactive employees
    const inactiveEmployees = (inactiveEmployeesRaw || []).map((emp: any) => ({
      id: emp.id,
      full_name: emp.full_name || 'Unknown',
      role: emp.role || 'Team Member',
      hire_date: emp.hire_date,
      termination_date: emp.termination_date,
      termination_reason: emp.termination_reason,
    }));

    return res.status(200).json({
      activeEmployees,
      inactiveEmployees,
      disciplineActions: actionsData,
      locationImageUrl: location.image_url,
    });
  } catch (error) {
    console.error('Error in discipline-data API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Wrap with permission check
export default withPermission(P.HR_VIEW_REPORTING, handler);

