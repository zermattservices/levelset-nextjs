import type { SupabaseClient } from '@supabase/supabase-js';

export type PointsResetMode = 'rolling_90' | 'quarterly';

/**
 * Synchronous cutoff date calculation when the mode is already known.
 * Returns an ISO date string (YYYY-MM-DD).
 */
export function calculateCutoffDate(mode: PointsResetMode): string {
  if (mode === 'quarterly') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const quarterStartMonth = Math.floor(month / 3) * 3;
    const start = new Date(year, quarterStartMonth, 1);
    return start.toISOString().split('T')[0];
  }

  // Default: rolling 90 days
  return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/**
 * Look up the org's discipline reset mode and return the appropriate cutoff date.
 * Falls back to 'rolling_90' if no config row exists.
 * Returns an ISO date string (YYYY-MM-DD).
 */
export async function getDisciplineCutoffDate(
  supabase: SupabaseClient,
  orgId: string
): Promise<string> {
  const mode = await getDisciplineResetMode(supabase, orgId);
  return calculateCutoffDate(mode);
}

/**
 * Fetch the points reset mode for an org.
 * Returns 'rolling_90' if no config row exists.
 */
export async function getDisciplineResetMode(
  supabase: SupabaseClient,
  orgId: string
): Promise<PointsResetMode> {
  const { data } = await supabase
    .from('org_discipline_config')
    .select('points_reset_mode')
    .eq('org_id', orgId)
    .maybeSingle();

  return (data?.points_reset_mode as PointsResetMode) || 'rolling_90';
}
