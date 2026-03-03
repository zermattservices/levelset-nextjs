# Auth Security Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix a critical vulnerability where authenticated users without `app_users` records gain access to all organizations' data, and harden the entire auth/data access chain.

**Architecture:** Three-layer defense: (1) OnboardingGuard blocks unapprovisioned users at the UI layer, (2) LocationContext refuses to return locations when no `app_users` record exists, (3) RLS on core Supabase tables prevents data access at the database layer even if application logic fails. Additionally, audit and fix all API routes using an unsafe user-selection fallback pattern.

**Tech Stack:** Next.js Pages Router, Supabase (auth + postgres + RLS), React Context providers

---

## Background / Vulnerability Summary

A user who signs up (creating an `auth.users` record) but never completes onboarding (no `app_users` record) can:

1. Pass through `OnboardingGuard` because it lets users with no `app_user` through (line 46-48 of `AppProviders.tsx`)
2. Trigger `LocationContext.fetchAccessibleLocations()` which falls through to a query with **no org_id filter** when `appUser` is null (line 138 of `LocationContext.tsx`)
3. See **ALL locations across ALL organizations** in the location selector modal
4. Select any location, which sets `selectedLocationOrgId` to that location's org_id
5. Browse all data (employees, ratings, infractions, etc.) scoped to the stolen org_id

**Root cause:** The condition `appUser?.role !== 'Levelset Admin' && appUser?.org_id` evaluates to `false` when `appUser` is `null`, so the `org_id` filter is never applied. No RLS exists as a safety net.

---

## Impact Analysis — Existing Users Are NOT Affected

Each fix was verified against the current database state:

- **All existing `app_users` records** have a non-null `role` and non-null `org_id` (confirmed via SQL query)
- **Only 1 Levelset Admin** exists (`andrew@levelset.io`) with exactly 1 `app_users` record — no multi-record ambiguity
- **`location_mobile_token`** is actively used by 3 UI features (PEA embed modal, Classic View embed, Mobile App Access settings) — it will NOT be removed from client queries
- **OnboardingGuard redirect** only fires when `auth.authUser` exists but `auth.appUser?.org_id` is falsy — existing users all have org_ids so they pass straight through
- **RLS policies** will use the service role key bypass built into Supabase — `createServerSupabaseClient()` (used by all API routes) automatically bypasses RLS, so server-side logic is unaffected. Only browser-client queries are gated.

---

## Task 1: Guard LocationContext against null appUser

The highest-priority fix. Prevents the unscoped location query from ever executing.

**Files:**
- Modify: `apps/dashboard/components/CodeComponents/LocationContext.tsx:81-140`

**Step 1: Add null-appUser early return after line 81**

At line 81, immediately after `const appUser = appUserRows?.[0] ?? null;`, add an early return:

```typescript
const appUser = appUserRows?.[0] ?? null;

// SECURITY: No app_users record means no provisioned identity — return zero locations.
if (!appUser) {
  return { userId: user.id, userRole: null, locations: [] };
}
```

**Step 2: Fix the fallback condition at line 137-140**

Replace the existing condition that fails open:

```typescript
// BEFORE (vulnerable — when appUser is null, condition is false, no filter applied):
// if (appUser?.role !== 'Levelset Admin' && appUser?.org_id) {
//   query.eq('org_id', appUser.org_id);
// }

// AFTER (fail closed — only Levelset Admin skips the org filter):
if (appUser.role !== 'Levelset Admin') {
  if (!appUser.org_id) {
    return { userId: user.id, userRole: appUser.role, locations: [] };
  }
  query.eq('org_id', appUser.org_id);
}
```

Note: Because of the null guard added in Step 1, `appUser` is guaranteed non-null here. The `!appUser.org_id` check handles the edge case where an `app_users` record exists but has no org — return empty rather than all.

**Step 3: Verify the build passes**

Run: `pnpm --filter dashboard build`
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add apps/dashboard/components/CodeComponents/LocationContext.tsx
git commit -m "fix(security): guard LocationContext against null appUser

Prevents authenticated users without app_users records from seeing
all locations across all orgs. Adds early return when appUser is null
and fixes fallback condition that failed open."
```

---

## Task 2: Fix OnboardingGuard to redirect unapprovisioned users

Currently the guard lets users with no `app_user` through to the full dashboard. It should redirect them to onboarding.

**Files:**
- Modify: `apps/dashboard/lib/providers/AppProviders.tsx:45-48`

**Step 1: Change the no-appUser branch to redirect**

Replace lines 45-48:

```typescript
// BEFORE (fails open):
// if (!auth.appUser?.org_id) {
//   setChecked(true);
//   return;
// }

// AFTER (redirects to onboarding):
if (auth.authUser && !auth.appUser?.org_id) {
  router.replace('/onboarding');
  return;
}
```

Key difference: We now check `auth.authUser` is truthy first (user IS authenticated) AND `!auth.appUser?.org_id` (but has no provisioned identity). This correctly handles:
- No authUser, no appUser → falls through to the earlier `!auth.authUser` check (line 40) which lets the login guard handle it
- authUser exists, no appUser → REDIRECT to /onboarding (new behavior)
- authUser exists, appUser exists with org_id → passes through (existing behavior, unchanged)

**Step 2: Verify the build passes**

Run: `pnpm --filter dashboard build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/dashboard/lib/providers/AppProviders.tsx
git commit -m "fix(security): redirect unapprovisioned users to onboarding

Users with an auth session but no app_users record are now redirected
to /onboarding instead of being let through to the dashboard."
```

---

## Task 3: Harden API routes — add explicit null-appUser checks

All 7 files with the `find(admin) || [0]` pattern already have `if (!appUser?.org_id) return 403` which catches the null case. However, the pattern is confusing and should be made explicit. Replace with a clear null check followed by the existing org_id check.

**Note:** The `find(Levelset Admin) || [0]` pattern is kept because it was designed for potential multi-record users. Currently no multi-record admins exist, but removing the pattern could regress if one is added. The fix is to add an **explicit** null guard above it.

**Files (all under `apps/dashboard/pages/api/`):**
- `forms/index.ts:28`
- `forms/[id].ts:33`
- `forms/submissions.ts:29`
- `forms/submissions/[id].ts:32`
- `forms/groups.ts:28`
- `org-chart.ts:29`

And:
- `lib/api-auth.ts:42-43`

**Step 1: In each file, add an explicit empty-array check before the fallback**

For every file listed, add a guard before the existing fallback line. Example for `forms/index.ts`:

```typescript
// After the appUsers query, before the fallback:
if (!appUsers || appUsers.length === 0) {
  return res.status(403).json({ error: 'No user profile found' });
}

const appUser = appUsers.find(u => u.role === 'Levelset Admin') || appUsers[0];
```

Apply the same pattern to all 7 files. For `lib/api-auth.ts`, use the same guard but the response is already handled by the existing `!appUser?.org_id` check — just add the explicit guard for clarity:

```typescript
if (!appUsers || appUsers.length === 0) {
  res.status(403).json({ error: 'No user profile found' });
  return null;
}

const appUser =
  appUsers.find((u) => u.role === 'Levelset Admin') || appUsers[0];
```

**Step 2: Verify the build passes**

Run: `pnpm --filter dashboard build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/dashboard/pages/api/forms/ apps/dashboard/pages/api/org-chart.ts apps/dashboard/lib/api-auth.ts
git commit -m "fix(security): add explicit null-appUser guards to API routes

All API routes that use the find-admin-or-first-user pattern now
explicitly reject requests when no app_users record exists, rather
than relying on the downstream org_id check."
```

---

## Task 4: Enable Row Level Security on core tenant tables

Defense-in-depth. Even if application logic fails, the database itself should prevent cross-org data access.

**Important:** `createServerSupabaseClient()` uses the **service role key** which bypasses RLS automatically. Only the browser client (anon key with user JWT) is affected by these policies.

**Files:**
- Create: `supabase/migrations/20260302_enable_rls_core_tables.sql`

**Step 1: Write the migration**

The migration enables RLS and creates policies for each core table. The pattern for each table:
1. Enable RLS
2. Create a policy that allows SELECT when the row's `org_id` matches the authenticated user's org via `app_users`
3. Levelset Admins (checked via `app_users.role`) bypass the org filter

```sql
-- Enable RLS on core tenant tables
-- Note: Service role key (used by API routes) bypasses RLS automatically.
-- These policies only affect browser-client queries using the anon key + user JWT.

-- Helper function: get the authenticated user's org_id from app_users
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM public.app_users
  WHERE auth_user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

-- Helper function: check if authenticated user is a Levelset Admin
CREATE OR REPLACE FUNCTION public.is_levelset_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_user_id = auth.uid()
    AND role = 'Levelset Admin'
  );
$$;

-- ============================================================
-- locations
-- ============================================================
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations in their org"
  ON public.locations FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ============================================================
-- employees
-- ============================================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees in their org"
  ON public.employees FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ============================================================
-- orgs
-- ============================================================
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own org"
  ON public.orgs FOR SELECT
  USING (
    public.is_levelset_admin()
    OR id = public.get_user_org_id()
  );

-- ============================================================
-- ratings
-- ============================================================
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings in their org"
  ON public.ratings FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ============================================================
-- infractions
-- ============================================================
ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view infractions in their org"
  ON public.infractions FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ============================================================
-- app_users
-- ============================================================
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view app_users in their org"
  ON public.app_users FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
    OR auth_user_id = auth.uid()  -- users can always read their own record
  );

-- ============================================================
-- shifts
-- ============================================================
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shifts in their org"
  ON public.shifts FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );

-- ============================================================
-- shift_assignments
-- ============================================================
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shift_assignments in their org"
  ON public.shift_assignments FOR SELECT
  USING (
    public.is_levelset_admin()
    OR org_id = public.get_user_org_id()
  );
```

**CRITICAL NOTE about INSERT/UPDATE/DELETE:** This migration only creates SELECT policies. When RLS is enabled, INSERT/UPDATE/DELETE are **denied by default** for the browser client unless explicit policies exist. This is the desired behavior — all writes go through API routes which use the service role key (bypasses RLS). If any client-side writes exist, they will break. Verify in Step 2.

**Step 2: Check for any client-side writes (INSERT/UPDATE/DELETE) on these tables**

Search the codebase for any direct browser-client mutations on these tables. If any exist, they need corresponding RLS policies or must be moved to API routes.

Run:
```bash
grep -rn "\.insert\|\.update\|\.delete\|\.upsert" apps/dashboard/components/ apps/dashboard/lib/providers/ apps/dashboard/lib/hooks/ | grep -v "node_modules" | grep -v "supabase-server"
```

Review the results. For any client-side writes to the 8 tables above, add corresponding INSERT/UPDATE/DELETE policies to the migration OR move the mutation to an API route.

**Step 3: Apply migration to the Supabase project**

Use the Supabase MCP tool `apply_migration` with project_id `pcplqsnilhrhupntibuv`.

**Step 4: Test that existing functionality works**

1. Log in as `andrew@levelset.io` (Levelset Admin) — verify all locations visible, all data accessible
2. Log in as a regular user — verify only their org's locations/data visible
3. Verify API routes still work (they use service role key, bypassing RLS)

**Step 5: Commit**

```bash
git add supabase/migrations/20260302_enable_rls_core_tables.sql
git commit -m "feat(security): enable RLS on core tenant tables

Adds Row Level Security policies to locations, employees, orgs,
ratings, infractions, app_users, shifts, and shift_assignments.
Policies scope browser-client reads to the user's org. Levelset
Admins and service role key bypass all policies."
```

---

## Task 5: Typecheck and build verification

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: Passes (or only pre-existing errors in login.tsx/_layout.tsx per MEMORY.md)

**Step 2: Run full dashboard build**

Run: `pnpm --filter dashboard build`
Expected: Build succeeds.

**Step 3: Manual smoke test**

1. Start dev server: `pnpm dev:dashboard`
2. Sign up a new test account with a fresh email
3. Verify: after email verification and login, the user is redirected to `/onboarding` — NOT the dashboard
4. Verify: the location selector modal does NOT appear with all locations
5. Log in as `andrew@levelset.io` — verify normal Levelset Admin access still works
6. Log in as a regular org user — verify they see only their org's locations and data

---

## Summary of all changes

| # | File | Change | Risk to existing users |
|---|------|--------|----------------------|
| 1 | `LocationContext.tsx:81` | Add null-appUser early return | None — all existing users have app_users records |
| 1 | `LocationContext.tsx:137-140` | Fix fallback condition to fail closed | None — only affects null/no-org cases |
| 2 | `AppProviders.tsx:45-48` | Redirect to /onboarding when no appUser | None — existing users all have org_id |
| 3 | 6 API routes + api-auth.ts | Add explicit empty-appUsers guard | None — all existing users have records |
| 4 | New migration | Enable RLS + SELECT policies on 8 tables | None — API routes use service role (bypass). Browser reads scoped to user's org (existing behavior) |
