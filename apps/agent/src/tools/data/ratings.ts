/**
 * Ratings tool — query employee rating history.
 * All queries are scoped by org_id (and optionally location_id) from auth context.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Get rating history for a specific employee.
 * Returns individual ratings with position and rater info.
 */
export async function getEmployeeRatings(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const employeeId = args.employee_id as string;
  const limit = (args.limit as number) || 10;

  let query = supabase
    .from('ratings')
    .select(
      'id, position, rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg, notes, created_at, rater_name'
    )
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
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
      message: 'No ratings found for this employee',
    });
  }

  return JSON.stringify({ count: data.length, ratings: data });
}
