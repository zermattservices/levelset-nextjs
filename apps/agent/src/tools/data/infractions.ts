/**
 * Infractions tool — query employee infraction/discipline history.
 * All queries are scoped by org_id (and optionally location_id) from auth context.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Get infraction and discipline history for a specific employee.
 * Returns infractions with type, points, date, and documenting leader.
 */
export async function getEmployeeInfractions(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const employeeId = args.employee_id as string;
  const limit = (args.limit as number) || 10;

  let query = supabase
    .from('infractions')
    .select(
      'id, infraction, infraction_date, points, notes, leader_name, ack_bool'
    )
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .order('infraction_date', { ascending: false })
    .limit(limit);

  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: 'No infractions found for this employee',
    });
  }

  return JSON.stringify({ count: data.length, infractions: data });
}
