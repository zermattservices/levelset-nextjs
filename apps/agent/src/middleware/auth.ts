import { Context, Next } from 'hono';
import { getServiceClient } from '@levelset/supabase-client';
import { isLevelsetAdmin, AI_USE_PERMISSION } from '@levelset/permissions';

/** Feature key for Levi AI on the org_features table */
const LEVI_AI_FEATURE = 'levi_ai';

/**
 * Auth middleware for the agent service.
 *
 * Two-gate access model:
 *   1. Org gate  — org must have the levi_ai feature enabled
 *   2. User gate — user must have the ai_assistant.use_ai_assistant permission
 *   Levelset Admin bypasses both gates.
 *
 * JWT is decoded locally (not via GoTrue) to avoid session-revocation race
 * conditions. See git history for original rationale.
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

  if (!payload.sub) {
    console.error('[Auth] JWT missing sub claim');
    return c.json({ error: 'Invalid token: missing user ID' }, 401);
  }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return c.json({ error: 'Token expired' }, 401);
  }

  const authUserId = payload.sub;
  const supabase = getServiceClient();

  // Look up app_users record (primary org = earliest created)
  const { data: appUsers, error: userError } = await supabase
    .from('app_users')
    .select('id, role, org_id, first_name, last_name, employee_id, permission_profile_id, use_role_default')
    .eq('auth_user_id', authUserId)
    .order('created_at', { ascending: true })
    .limit(1);

  const appUser = appUsers?.[0] ?? null;

  if (userError || !appUser) {
    return c.json({ error: 'User not found in application' }, 403);
  }

  const isAdmin = isLevelsetAdmin(appUser.role);

  // Gate 0: Levelset Admin bypasses everything
  if (isAdmin) {
    c.set('user', {
      authUserId,
      appUserId: appUser.id,
      orgId: appUser.org_id,
      role: appUser.role,
      name: `${appUser.first_name} ${appUser.last_name}`.trim(),
      isAdmin: true,
      employeeId: appUser.employee_id ?? undefined,
      hierarchyLevel: 0,
      permissions: new Set<string>(),
      accessibleLocationIds: [],
    });
    return next();
  }

  // Gate 1: Org must have levi_ai feature enabled
  const { data: feature } = await supabase
    .from('org_features')
    .select('enabled')
    .eq('org_id', appUser.org_id)
    .eq('feature_key', LEVI_AI_FEATURE)
    .maybeSingle();

  if (!feature?.enabled) {
    return c.json(
      { error: 'Levi AI is not enabled for your organization.' },
      403
    );
  }

  // Gate 2: User must have ai_assistant.use_ai_assistant permission
  const permResult = await checkUserPermission(supabase, appUser);

  if (!permResult.allowed) {
    return c.json(
      { error: 'You do not have permission to use Levi AI. Contact your administrator.' },
      403
    );
  }

  c.set('user', {
    authUserId,
    appUserId: appUser.id,
    orgId: appUser.org_id,
    role: appUser.role,
    name: `${appUser.first_name} ${appUser.last_name}`.trim(),
    isAdmin: false,
    employeeId: appUser.employee_id ?? undefined,
    hierarchyLevel: permResult.hierarchyLevel,
    permissions: new Set<string>(),
    accessibleLocationIds: [],
  });

  return next();
}

/**
 * Check if a user has the AI_USE permission via their permission profile.
 * Mirrors the dashboard's loadUserPermissions logic:
 *   - use_role_default=true  → resolve profile from employee role's hierarchy level
 *   - use_role_default=false → use explicit permission_profile_id
 */
async function checkUserPermission(
  supabase: ReturnType<typeof getServiceClient>,
  appUser: {
    id: string;
    org_id: string;
    employee_id: string | null;
    permission_profile_id: string | null;
    use_role_default: boolean | null;
  }
): Promise<{ allowed: boolean; hierarchyLevel: number }> {
  const deny = { allowed: false, hierarchyLevel: 999 };
  let profileId = appUser.permission_profile_id;
  let hierarchyLevel = 999;

  if (appUser.use_role_default || !profileId) {
    // Resolve from employee role → org_roles hierarchy → system default profile
    if (!appUser.employee_id) return deny;

    const { data: employee } = await supabase
      .from('employees')
      .select('role')
      .eq('id', appUser.employee_id)
      .maybeSingle();

    if (!employee?.role) return deny;

    const { data: orgRole } = await supabase
      .from('org_roles')
      .select('hierarchy_level')
      .eq('org_id', appUser.org_id)
      .eq('role_name', employee.role)
      .maybeSingle();

    hierarchyLevel = orgRole?.hierarchy_level ?? 999;

    const { data: systemProfile } = await supabase
      .from('permission_profiles')
      .select('id')
      .eq('org_id', appUser.org_id)
      .eq('hierarchy_level', hierarchyLevel)
      .eq('is_system_default', true)
      .maybeSingle();

    profileId = systemProfile?.id ?? null;
  }

  if (!profileId) return deny;

  // Look up the sub_item_id for ai_assistant.use_ai_assistant
  const [moduleKey, subItemKey] = AI_USE_PERMISSION.split('.');

  const { data: subItem } = await supabase
    .from('permission_sub_items')
    .select('id, permission_modules!inner(key)')
    .eq('key', subItemKey)
    .eq('permission_modules.key', moduleKey)
    .maybeSingle();

  if (!subItem) return deny;

  // Check if this profile has the sub_item enabled
  const { data: access } = await supabase
    .from('permission_profile_access')
    .select('is_enabled')
    .eq('profile_id', profileId)
    .eq('sub_item_id', subItem.id)
    .eq('is_enabled', true)
    .maybeSingle();

  return { allowed: !!access, hierarchyLevel };
}
