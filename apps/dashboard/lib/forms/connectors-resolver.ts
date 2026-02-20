/**
 * Connected Questions Resolver
 *
 * Server-side resolver that evaluates Levelset data connectors for
 * evaluation forms. Each connector key maps to a specific database
 * query that returns a boolean, number, or percentage.
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface ConnectorInput {
  key: string;
  params?: Record<string, any>;
}

type ConnectorResult = boolean | number | null;

/**
 * Resolve connected question values for a given employee.
 *
 * @returns A record mapping connector keys to their resolved values.
 */
export async function resolveConnectedQuestions(
  supabase: SupabaseClient,
  employeeId: string,
  orgId: string,
  locationId: string | null,
  connectors: ConnectorInput[]
): Promise<Record<string, ConnectorResult>> {
  const results: Record<string, ConnectorResult> = {};

  for (const connector of connectors) {
    try {
      results[connector.key] = await resolveConnector(
        supabase,
        connector.key,
        employeeId,
        orgId,
        locationId,
        connector.params || {}
      );
    } catch (err) {
      console.error(`[Connector] Error resolving ${connector.key}:`, err);
      results[connector.key] = null;
    }
  }

  return results;
}

async function resolveConnector(
  supabase: SupabaseClient,
  key: string,
  employeeId: string,
  orgId: string,
  locationId: string | null,
  params: Record<string, any>
): Promise<ConnectorResult> {
  switch (key) {
    case 'no_discipline_30d':
      return resolveNoDiscipline(supabase, employeeId, orgId, 30);

    case 'no_discipline_60d':
      return resolveNoDiscipline(supabase, employeeId, orgId, 60);

    case 'no_discipline_90d':
      return resolveNoDiscipline(supabase, employeeId, orgId, 90);

    case 'avg_rating_gte':
      return resolveAvgRatingGte(supabase, employeeId, orgId, params.threshold ?? 2.5);

    case 'certified_status':
      return resolveCertifiedStatus(supabase, employeeId);

    case 'no_unresolved_actions':
      return resolveNoUnresolvedActions(supabase, employeeId, orgId);

    default:
      console.warn(`[Connector] Unknown connector key: ${key}`);
      return null;
  }
}

/**
 * Check if the employee has zero infraction points in the given timeframe.
 */
async function resolveNoDiscipline(
  supabase: SupabaseClient,
  employeeId: string,
  orgId: string,
  days: number
): Promise<boolean> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('infractions')
    .select('points')
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .gte('infraction_date', sinceStr);

  if (error) throw error;

  const totalPoints = (data || []).reduce((sum: number, row: any) => sum + (row.points || 0), 0);
  return totalPoints === 0;
}

/**
 * Check if the employee's average rating meets or exceeds the threshold.
 * Returns boolean (true if avg >= threshold).
 */
async function resolveAvgRatingGte(
  supabase: SupabaseClient,
  employeeId: string,
  orgId: string,
  threshold: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ratings')
    .select('rating_avg')
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .not('rating_avg', 'is', null);

  if (error) throw error;

  if (!data || data.length === 0) return false;

  const avg =
    data.reduce((sum: number, r: any) => sum + Number(r.rating_avg), 0) / data.length;
  return avg >= threshold;
}

/**
 * Check the employee's certified_status field.
 */
async function resolveCertifiedStatus(
  supabase: SupabaseClient,
  employeeId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('employees')
    .select('certified_status')
    .eq('id', employeeId)
    .maybeSingle();

  if (error) throw error;
  return data?.certified_status === true;
}

/**
 * Check if the employee has zero unresolved disciplinary actions.
 */
async function resolveNoUnresolvedActions(
  supabase: SupabaseClient,
  employeeId: string,
  orgId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('recommended_disc_actions')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .eq('resolved', false);

  if (error) throw error;
  return (count || 0) === 0;
}
