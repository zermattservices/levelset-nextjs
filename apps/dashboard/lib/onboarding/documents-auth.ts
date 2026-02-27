/**
 * Shared auth helper for onboarding document API routes.
 *
 * Unlike the main /api/documents/* routes which require Levelset Admin role,
 * these only require a valid authenticated user with an org_id — because
 * during onboarding the user has role 'Owner/Operator' or 'Director',
 * not 'Levelset Admin'.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface OnboardingAuthResult {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  appUser: { id: string; org_id: string; role: string };
  orgId: string;
}

export async function authenticateOnboardingUser(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<OnboardingAuthResult | null> {
  const supabase = createServerSupabaseClient();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);
  if (authError || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!appUser?.org_id) {
    res.status(403).json({ error: 'Complete account setup first' });
    return null;
  }

  return { supabase, appUser: appUser as OnboardingAuthResult['appUser'], orgId: appUser.org_id };
}
