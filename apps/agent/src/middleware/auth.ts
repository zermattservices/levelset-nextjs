import { Context, Next } from 'hono';
import { createClient } from '@supabase/supabase-js';
import { isLevelsetAdmin } from '@levelset/permissions';

/**
 * Auth middleware for the agent service.
 *
 * Verifies the JWT from the Authorization header against Supabase,
 * then checks that the user has the Levelset Admin role.
 *
 * All non-admin users receive a 403 Forbidden response.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return c.json({ error: 'Server configuration error' }, 500);
  }

  // Use anon-style client to verify the user's JWT
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Verify the JWT and get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Look up the app_users record to check the role
  const { data: appUser, error: userError } = await supabase
    .from('app_users')
    .select('id, role, org_id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .single();

  if (userError || !appUser) {
    return c.json({ error: 'User not found in application' }, 403);
  }

  // Only Levelset Admin can access agent endpoints
  if (!isLevelsetAdmin(appUser.role)) {
    return c.json(
      { error: 'Access denied. AI features are restricted to Levelset Admin.' },
      403
    );
  }

  // Attach user info to the context for downstream handlers
  c.set('user', {
    authUserId: user.id,
    appUserId: appUser.id,
    orgId: appUser.org_id,
    role: appUser.role,
    name: `${appUser.first_name} ${appUser.last_name}`.trim(),
  });

  await next();
}
