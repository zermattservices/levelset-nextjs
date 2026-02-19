/**
 * Employee tools — lookup and list employees.
 * All queries are scoped by org_id (and optionally location_id) from auth context.
 */

import { createServiceClient } from '@levelset/supabase-client';

/**
 * Search for an employee by name. Searches across full_name, first_name, and last_name.
 * Optionally filters by location_id and role.
 */
export async function lookupEmployee(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const name = args.name as string;
  const role = args.role as string | undefined;

  let query = supabase
    .from('employees')
    .select(
      'id, full_name, first_name, last_name, role, hire_date, certified_status, last_points_total, active, is_leader, is_trainer, is_boh, is_foh, location_id, email, phone'
    )
    .eq('org_id', orgId)
    .eq('active', true)
    .or(`full_name.ilike.%${name}%,first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
    .limit(10);

  if (locationId) {
    query = query.eq('location_id', locationId);
  }
  if (role) {
    query = query.ilike('role', `%${role}%`);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: `No active employee found matching "${name}"${locationId ? ' at this location' : ''}`,
    });
  }

  return JSON.stringify(data);
}

/**
 * List employees in the organization with optional filters.
 * Returns employees sorted by name with role/zone summary counts.
 */
export async function listEmployees(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const supabase = createServiceClient();
  const activeOnly = args.active_only !== false; // default true
  const limit = Math.min((args.limit as number) || 20, 50);

  let query = supabase
    .from('employees')
    .select(
      'id, full_name, role, hire_date, certified_status, last_points_total, active, is_leader, is_trainer, is_boh, is_foh'
    )
    .eq('org_id', orgId)
    .order('full_name', { ascending: true })
    .limit(limit);

  if (locationId) {
    query = query.eq('location_id', locationId);
  }
  if (activeOnly) {
    query = query.eq('active', true);
  }
  if (typeof args.is_leader === 'boolean') {
    query = query.eq('is_leader', args.is_leader);
  }
  if (typeof args.is_boh === 'boolean') {
    query = query.eq('is_boh', args.is_boh);
  }
  if (typeof args.is_foh === 'boolean') {
    query = query.eq('is_foh', args.is_foh);
  }
  if (typeof args.is_trainer === 'boolean') {
    query = query.eq('is_trainer', args.is_trainer);
  }
  if (typeof args.role === 'string') {
    query = query.ilike('role', `%${args.role}%`);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({ message: 'No employees found matching the filters' });
  }

  return JSON.stringify({ count: data.length, employees: data });
}
