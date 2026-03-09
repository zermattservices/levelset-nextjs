# Levi AI Access Control — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hardcoded Levelset Admin check in agent middleware with org-level feature flag (`levi_ai`) + user-level permission (`ai_assistant.use_ai_assistant`) so any org can grant Levi access to their users.

**Architecture:** Two-gate model — the org must have the `levi_ai` feature enabled in `org_features`, AND the user must have `P.AI_USE` permission via their permission profile. Levelset Admin bypasses both gates. The agent queries Supabase directly using its existing service client (no dashboard dependency).

**Tech Stack:** Hono middleware (agent), Supabase service client, existing permission tables (`permission_profile_access`, `org_features`, `permission_profiles`, `org_roles`)

---

### Task 1: Add `P.AI_USE` to Default Permission Levels 0-2

**Files:**
- Modify: `apps/dashboard/lib/permissions/defaults.ts`

**Step 1: Add AI_USE to Level 1 (Director) defaults**

In `defaults.ts`, add `P.AI_USE` to the Level 1 set, after the existing billing entries:

```typescript
    // Billing - view and edit
    P.BILLING_VIEW,
    P.BILLING_EDIT,
    // AI Assistant
    P.AI_USE,
  ]),
```

**Step 2: Add AI_USE to Level 2 (Team Lead) defaults**

Add `P.AI_USE` to the Level 2 set, after the existing billing entry:

```typescript
    // Billing - view only
    P.BILLING_VIEW,
    // AI Assistant
    P.AI_USE,
  ]),
```

Note: Level 0 (Operator) already gets `AI_USE` via `...Object.values(P)`.

**Step 3: Commit**

```bash
git add apps/dashboard/lib/permissions/defaults.ts
git commit -m "feat(permissions): add AI_USE to default levels 0-2"
```

---

### Task 2: Write Migration to Seed AI_USE into Existing Profiles

**Files:**
- Create: `supabase/migrations/20260309_seed_ai_use_permission.sql`

**Step 1: Write the migration**

This migration inserts `AI_USE` into all existing system-default profiles at hierarchy levels 0, 1, and 2 that don't already have it. It finds the `ai_assistant.use_ai_assistant` sub-item and inserts enabled access rows.

```sql
-- Seed AI_USE permission into existing system-default profiles at levels 0, 1, 2
-- This ensures existing orgs get the permission without re-running the seed script.

DO $$
DECLARE
  v_sub_item_id UUID;
  v_profile RECORD;
BEGIN
  -- Find the sub-item ID for ai_assistant.use_ai_assistant
  SELECT psi.id INTO v_sub_item_id
  FROM permission_sub_items psi
  JOIN permission_modules pm ON psi.module_id = pm.id
  WHERE pm.key = 'ai_assistant' AND psi.key = 'use_ai_assistant';

  -- If the sub-item doesn't exist yet, skip (seed script hasn't run)
  IF v_sub_item_id IS NULL THEN
    RAISE NOTICE 'ai_assistant.use_ai_assistant sub-item not found, skipping';
    RETURN;
  END IF;

  -- Insert into all system-default profiles at levels 0, 1, 2
  FOR v_profile IN
    SELECT id FROM permission_profiles
    WHERE is_system_default = true
      AND hierarchy_level IN (0, 1, 2)
  LOOP
    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_item_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;
  END LOOP;
END $$;
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260309_seed_ai_use_permission.sql
git commit -m "feat(migrations): seed AI_USE into existing level 0-2 profiles"
```

---

### Task 3: Update Agent Auth Middleware

**Files:**
- Modify: `apps/agent/src/middleware/auth.ts`

**Step 1: Replace the middleware**

Replace the entire `authMiddleware` function. The new version:
1. Decodes JWT and looks up `app_users` (same as before)
2. If Levelset Admin → allow (same as before)
3. Checks `org_features` for `levi_ai` → 403 if not enabled
4. Resolves user's permission profile (respecting `use_role_default`)
5. Checks `permission_profile_access` for `ai_assistant.use_ai_assistant` → 403 if not granted

```typescript
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
 * conditions — see original comment block for rationale.
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

  // Gate 0: Levelset Admin bypasses everything
  if (isLevelsetAdmin(appUser.role)) {
    c.set('user', {
      authUserId,
      appUserId: appUser.id,
      orgId: appUser.org_id,
      role: appUser.role,
      name: `${appUser.first_name} ${appUser.last_name}`.trim(),
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
  const hasPermission = await checkUserPermission(supabase, appUser);

  if (!hasPermission) {
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
): Promise<boolean> {
  let profileId = appUser.permission_profile_id;

  if (appUser.use_role_default || !profileId) {
    // Resolve from employee role → org_roles hierarchy → system default profile
    if (!appUser.employee_id) return false;

    const { data: employee } = await supabase
      .from('employees')
      .select('role')
      .eq('id', appUser.employee_id)
      .maybeSingle();

    if (!employee?.role) return false;

    const { data: orgRole } = await supabase
      .from('org_roles')
      .select('hierarchy_level')
      .eq('org_id', appUser.org_id)
      .eq('role_name', employee.role)
      .maybeSingle();

    const level = orgRole?.hierarchy_level ?? 999;

    const { data: systemProfile } = await supabase
      .from('permission_profiles')
      .select('id')
      .eq('org_id', appUser.org_id)
      .eq('hierarchy_level', level)
      .eq('is_system_default', true)
      .maybeSingle();

    profileId = systemProfile?.id ?? null;
  }

  if (!profileId) return false;

  // Parse permission key: "ai_assistant.use_ai_assistant" → module=ai_assistant, sub=use_ai_assistant
  const [moduleKey, subItemKey] = AI_USE_PERMISSION.split('.');

  // Check if this profile has the permission enabled
  const { data: access } = await supabase
    .from('permission_profile_access')
    .select('is_enabled')
    .eq('profile_id', profileId)
    .eq('is_enabled', true)
    .eq(
      'sub_item_id',
      // Subquery: find the sub_item_id for ai_assistant.use_ai_assistant
      supabase
        .from('permission_sub_items')
        .select('id')
        .eq('key', subItemKey)
    )
    .maybeSingle();

  // The nested subquery won't work with Supabase JS. Use a two-step approach instead.
  // (This is handled in the actual implementation below)
  return !!access?.is_enabled;
}
```

**Important:** The Supabase JS client doesn't support subqueries in `.eq()`. The actual implementation should do a two-step lookup:

```typescript
async function checkUserPermission(
  supabase: ReturnType<typeof getServiceClient>,
  appUser: {
    id: string;
    org_id: string;
    employee_id: string | null;
    permission_profile_id: string | null;
    use_role_default: boolean | null;
  }
): Promise<boolean> {
  let profileId = appUser.permission_profile_id;

  if (appUser.use_role_default || !profileId) {
    if (!appUser.employee_id) return false;

    const { data: employee } = await supabase
      .from('employees')
      .select('role')
      .eq('id', appUser.employee_id)
      .maybeSingle();

    if (!employee?.role) return false;

    const { data: orgRole } = await supabase
      .from('org_roles')
      .select('hierarchy_level')
      .eq('org_id', appUser.org_id)
      .eq('role_name', employee.role)
      .maybeSingle();

    const level = orgRole?.hierarchy_level ?? 999;

    const { data: systemProfile } = await supabase
      .from('permission_profiles')
      .select('id')
      .eq('org_id', appUser.org_id)
      .eq('hierarchy_level', level)
      .eq('is_system_default', true)
      .maybeSingle();

    profileId = systemProfile?.id ?? null;
  }

  if (!profileId) return false;

  // Look up the sub_item_id for ai_assistant.use_ai_assistant
  const [moduleKey, subItemKey] = AI_USE_PERMISSION.split('.');

  const { data: subItem } = await supabase
    .from('permission_sub_items')
    .select('id, permission_modules!inner(key)')
    .eq('key', subItemKey)
    .eq('permission_modules.key', moduleKey)
    .maybeSingle();

  if (!subItem) return false;

  // Check if this profile has the sub_item enabled
  const { data: access } = await supabase
    .from('permission_profile_access')
    .select('is_enabled')
    .eq('profile_id', profileId)
    .eq('sub_item_id', subItem.id)
    .eq('is_enabled', true)
    .maybeSingle();

  return !!access;
}
```

**Step 2: Commit**

```bash
git add apps/agent/src/middleware/auth.ts
git commit -m "feat(agent): replace admin-only check with feature flag + permission"
```

---

### Task 4: Verify TypeScript Compiles

**Step 1: Typecheck agent**

```bash
pnpm --filter @levelset/agent exec tsc --noEmit
```

Expected: No errors.

**Step 2: Typecheck dashboard** (defaults.ts changed)

```bash
pnpm typecheck
```

Expected: No errors.

**Step 3: Commit if any fixes needed**

---

### Task 5: Test End-to-End on Mobile

**Step 1: Ensure the org has `levi_ai` enabled**

Check via Supabase: `SELECT * FROM org_features WHERE org_id = '<test-org-id>' AND feature_key = 'levi_ai';`

If missing, insert: `INSERT INTO org_features (org_id, feature_key, enabled) VALUES ('<test-org-id>', 'levi_ai', true);`

**Step 2: Ensure the user's permission profile has AI_USE**

Run the seed migration or manually verify via:
```sql
SELECT ppa.is_enabled, psi.key, pm.key as module
FROM permission_profile_access ppa
JOIN permission_sub_items psi ON ppa.sub_item_id = psi.id
JOIN permission_modules pm ON psi.module_id = pm.id
WHERE ppa.profile_id = '<user-profile-id>'
  AND pm.key = 'ai_assistant';
```

**Step 3: Test on mobile**

- Sign in as Executive user (non-admin)
- Navigate to Levi tab
- Send a message
- Expected: Message processes successfully (no 403)

**Step 4: Test negative cases**

- User without AI_USE permission → should see "You do not have permission to use Levi AI"
- Org without levi_ai feature → should see "Levi AI is not enabled for your organization"
- Levelset Admin → should always work regardless of feature/permission state
