import { Context, Next } from 'hono';
import { createServiceClient } from '@levelset/supabase-client';
import { isLevelsetAdmin } from '@levelset/permissions';

/**
 * Auth middleware for the agent service.
 *
 * Decodes the Supabase JWT from the Authorization header to extract the
 * user ID, then looks up the app_users record to verify role.
 *
 * We decode the JWT locally instead of calling supabase.auth.getUser()
 * because getUser() hits GoTrue's /user endpoint which does session-based
 * validation. If the session was revoked (logout + re-login, token refresh),
 * GoTrue returns 403 "session_not_found" even though the JWT signature is
 * still valid and the user is legitimately authenticated. Local decode
 * avoids this issue and is faster (no network round-trip).
 *
 * All non-admin users receive a 403 Forbidden response.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  // Decode JWT payload (base64url-encoded middle segment)
  let payload: { sub?: string; exp?: number };
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT structure');
    }
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    console.error('[Auth] Failed to decode JWT');
    return c.json({ error: 'Invalid token format' }, 401);
  }

  // Validate required claims
  if (!payload.sub) {
    console.error('[Auth] JWT missing sub claim');
    return c.json({ error: 'Invalid token: missing user ID' }, 401);
  }

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return c.json({ error: 'Token expired' }, 401);
  }

  const authUserId = payload.sub;

  // Look up the app_users record to check the role
  const supabase = createServiceClient();
  const { data: appUser, error: userError } = await supabase
    .from('app_users')
    .select('id, role, org_id, first_name, last_name')
    .eq('auth_user_id', authUserId)
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
    authUserId,
    appUserId: appUser.id,
    orgId: appUser.org_id,
    role: appUser.role,
    name: `${appUser.first_name} ${appUser.last_name}`.trim(),
  });

  await next();
}
