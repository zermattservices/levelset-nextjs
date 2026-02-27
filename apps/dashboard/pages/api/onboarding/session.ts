/**
 * GET /api/onboarding/session
 *
 * Returns the onboarding state for the authenticated user.
 * Used by the onboarding page to determine current step and load saved data.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  try {
    // Find app_user for this auth user
    const { data: appUser } = await supabase
      .from('app_users')
      .select('id, first_name, last_name, email, role, org_id, location_id, employee_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!appUser || !appUser.org_id) {
      // User has auth account but hasn't completed Step 1 yet
      return res.status(200).json({
        needsSetup: true,
        session: null,
        org: null,
        locations: [],
        user: null,
        orgRoles: [],
      });
    }

    const orgId = appUser.org_id;

    // Fetch org, locations, onboarding session, and org roles in parallel
    const [orgResult, locationsResult, sessionResult, rolesResult] = await Promise.all([
      supabase
        .from('orgs')
        .select('id, name, is_multi_unit, trial_ends_at, onboarding_completed')
        .eq('id', orgId)
        .single(),
      supabase
        .from('locations')
        .select('id, name, location_number')
        .eq('org_id', orgId)
        .order('created_at'),
      supabase
        .from('onboarding_sessions')
        .select('id, current_step, completed_steps, step_data, completed_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('org_roles')
        .select('id, role_name, hierarchy_level, is_leader, color')
        .eq('org_id', orgId)
        .order('hierarchy_level'),
    ]);

    if (orgResult.error || !orgResult.data) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    return res.status(200).json({
      needsSetup: false,
      session: sessionResult.data || null,
      org: orgResult.data,
      locations: locationsResult.data || [],
      user: {
        id: appUser.id,
        firstName: appUser.first_name,
        lastName: appUser.last_name,
        email: appUser.email,
        role: appUser.role,
      },
      orgRoles: rolesResult.data || [],
    });
  } catch (err) {
    console.error('onboarding session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
