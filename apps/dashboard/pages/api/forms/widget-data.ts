import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route providing org-level data for form widget dropdowns.
 * Uses server-side Supabase client (service role) to bypass RLS.
 *
 * Employee/Leader data uses the existing /api/employees route (location-scoped).
 * This route handles org-scoped reference data only.
 *
 * Query params:
 *   type     — 'positions' | 'infractions' | 'disc_actions'
 *   org_id   — required
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, org_id } = req.query;

  if (!type || !org_id || typeof type !== 'string' || typeof org_id !== 'string') {
    return res.status(400).json({ error: 'type and org_id are required' });
  }

  try {
    const supabase = createServerSupabaseClient();

    switch (type) {
      case 'positions': {
        const { data, error } = await supabase
          .from('org_positions')
          .select('id, name, zone, description')
          .eq('org_id', org_id)
          .eq('is_active', true)
          .eq('position_type', 'standard')
          .order('zone')
          .order('display_order');

        if (error) {
          console.error('widget-data positions error:', error);
          return res.status(500).json({ error: 'Failed to fetch positions' });
        }

        return res.status(200).json({ data: data || [] });
      }

      case 'infractions': {
        const { data, error } = await supabase
          .from('infractions_rubric')
          .select('id, action, action_es, points')
          .eq('org_id', org_id)
          .is('location_id', null)
          .order('points', { ascending: true });

        if (error) {
          console.error('widget-data infractions error:', error);
          return res.status(500).json({ error: 'Failed to fetch infractions' });
        }

        return res.status(200).json({ data: data || [] });
      }

      case 'disc_actions': {
        const { data, error } = await supabase
          .from('disc_actions_rubric')
          .select('id, action, points_threshold')
          .eq('org_id', org_id)
          .is('location_id', null)
          .order('points_threshold', { ascending: true });

        if (error) {
          console.error('widget-data disc_actions error:', error);
          return res.status(500).json({ error: 'Failed to fetch discipline actions' });
        }

        return res.status(200).json({ data: data || [] });
      }

      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }
  } catch (error) {
    console.error('widget-data API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
