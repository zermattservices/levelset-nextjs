import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route providing org-level data for form widget dropdowns.
 * Uses server-side Supabase client (service role) to bypass RLS.
 *
 * Query params:
 *   type        — 'positions' | 'infractions' | 'disc_actions' | 'leaders'
 *   org_id      — required
 *   location_id — required for type=leaders
 *   form_type   — optional for type=leaders ('rating' | 'discipline' | 'evaluation' | 'custom'), defaults to hierarchy fallback
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

      case 'leaders': {
        const { location_id, form_type } = req.query;

        if (!location_id || typeof location_id !== 'string') {
          return res.status(400).json({ error: 'location_id is required for type=leaders' });
        }

        const formTypeStr = typeof form_type === 'string' ? form_type : '';
        let allowedRoles: string[] = [];

        if (formTypeStr === 'rating') {
          // Check position_role_permissions (joined with org_positions for org scoping)
          const { data: permRoles, error: permErr } = await supabase
            .from('position_role_permissions')
            .select('role_name, org_positions!inner(org_id)')
            .eq('org_positions.org_id', org_id);

          if (permErr) {
            console.error('widget-data leaders permRoles error:', permErr);
            return res.status(500).json({ error: 'Failed to fetch leader roles' });
          }

          if (permRoles && permRoles.length > 0) {
            // Use roles that have position permissions configured
            allowedRoles = Array.from(new Set(permRoles.map((r: any) => r.role_name)));
          } else {
            // Fallback: hierarchy levels 0-2
            const { data: fallbackRoles, error: fbErr } = await supabase
              .from('org_roles')
              .select('role_name')
              .eq('org_id', org_id)
              .lte('hierarchy_level', 2);

            if (fbErr) {
              console.error('widget-data leaders fallback error:', fbErr);
              return res.status(500).json({ error: 'Failed to fetch leader roles' });
            }
            allowedRoles = (fallbackRoles || []).map(r => r.role_name);
          }
        } else if (formTypeStr === 'discipline') {
          // Fetch all org roles and discipline access settings
          const { data: orgRoles, error: rolesErr } = await supabase
            .from('org_roles')
            .select('role_name, hierarchy_level')
            .eq('org_id', org_id)
            .order('hierarchy_level', { ascending: true });

          if (rolesErr) {
            console.error('widget-data leaders orgRoles error:', rolesErr);
            return res.status(500).json({ error: 'Failed to fetch leader roles' });
          }

          const { data: accessData, error: accessErr } = await supabase
            .from('discipline_role_access')
            .select('role_name, can_submit')
            .eq('org_id', org_id);

          if (accessErr) {
            console.error('widget-data leaders accessData error:', accessErr);
            return res.status(500).json({ error: 'Failed to fetch leader roles' });
          }

          // Build access map from saved settings
          const accessMap = new Map<string, boolean>();
          (accessData || []).forEach(a => accessMap.set(a.role_name, a.can_submit ?? false));

          // Apply DisciplineAccessTab defaults:
          // - Filter out the highest hierarchy level (team members)
          // - Levels 0-1: always included
          // - Level 2: included by default unless explicitly disabled
          // - Level 3+: only if explicitly enabled
          const roles = orgRoles || [];
          const maxLevel = roles.length > 0
            ? Math.max(...roles.map(r => r.hierarchy_level))
            : 0;

          allowedRoles = roles
            .filter(r => r.hierarchy_level < maxLevel)
            .filter(r => {
              if (r.hierarchy_level <= 1) return true;
              const saved = accessMap.get(r.role_name);
              if (r.hierarchy_level === 2) return saved !== undefined ? saved : true;
              return saved === true;
            })
            .map(r => r.role_name);
        } else {
          // evaluation, custom, or unspecified: hierarchy levels 0-2
          const { data: defaultRoles, error: defErr } = await supabase
            .from('org_roles')
            .select('role_name')
            .eq('org_id', org_id)
            .lte('hierarchy_level', 2);

          if (defErr) {
            console.error('widget-data leaders default roles error:', defErr);
            return res.status(500).json({ error: 'Failed to fetch leader roles' });
          }
          allowedRoles = (defaultRoles || []).map(r => r.role_name);
        }

        if (allowedRoles.length === 0) {
          return res.status(200).json({ data: [] });
        }

        // Query active employees at this location with allowed roles
        const { data: employees, error: empErr } = await supabase
          .from('employees')
          .select('id, full_name, role')
          .eq('location_id', location_id)
          .eq('active', true)
          .in('role', allowedRoles)
          .order('full_name');

        if (empErr) {
          console.error('widget-data leaders employees error:', empErr);
          return res.status(500).json({ error: 'Failed to fetch leaders' });
        }

        return res.status(200).json({ data: employees || [] });
      }

      default:
        return res.status(400).json({ error: `Unknown type: ${type}` });
    }
  } catch (error) {
    console.error('widget-data API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
