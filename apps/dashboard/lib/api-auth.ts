import type { NextApiResponse } from 'next';
import type { NextApiRequest } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface AuthResult {
  supabase: ReturnType<typeof createServerSupabaseClient>;
  appUser: { id: string; org_id: string; role: string };
  orgId: string;
}

/**
 * Authenticate the request and verify the caller is a Levelset Admin.
 * Returns null (and sends the appropriate HTTP error) if auth fails.
 */
export async function requireLevelsetAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthResult | null> {
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
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', user.id)
    .order('created_at');

  const appUser =
    appUsers?.find((u) => u.role === 'Levelset Admin') || appUsers?.[0];
  if (!appUser?.org_id) {
    res.status(403).json({ error: 'No organization found' });
    return null;
  }
  if (appUser.role !== 'Levelset Admin') {
    res.status(403).json({ error: 'Insufficient permissions' });
    return null;
  }

  return { supabase, appUser, orgId: appUser.org_id };
}
