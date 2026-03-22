import { withAuth } from '@/lib/permissions/middleware';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * GET /api/scheduling/overtime-rules?location_id=xxx
 *
 * Returns the applicable overtime rules for a location based on its state.
 * Falls back to federal FLSA defaults if no state is set or no state-specific rules exist.
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { location_id } = req.query;

    if (!location_id) {
      return res.status(400).json({ error: 'location_id is required' });
    }

    // Get location state
    const { data: location } = await supabase
      .from('locations')
      .select('state')
      .eq('id', location_id)
      .single();

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const stateCode = location.state ?? null;

    // Try state-specific rules first, fall back to _default
    let rules: any[] = [];

    if (stateCode) {
      const { data: stateRules } = await supabase
        .from('overtime_rules')
        .select('rule_type, threshold_hours, multiplier, priority, description')
        .eq('state_code', stateCode)
        .eq('is_active', true)
        .order('priority', { ascending: true });

      if (stateRules && stateRules.length > 0) {
        rules = stateRules;
      }
    }

    // Fall back to defaults
    if (rules.length === 0) {
      const { data: defaultRules } = await supabase
        .from('overtime_rules')
        .select('rule_type, threshold_hours, multiplier, priority, description')
        .eq('state_code', '_default')
        .eq('is_active', true)
        .order('priority', { ascending: true });

      rules = defaultRules || [];
    }

    // Cache aggressively — OT rules rarely change
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

    return res.status(200).json({
      state: stateCode,
      rules,
    });
  } catch (error) {
    console.error('Error fetching overtime rules:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAuth(handler);
