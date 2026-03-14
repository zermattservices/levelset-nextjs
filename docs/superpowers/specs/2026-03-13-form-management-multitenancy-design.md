# Form Management Multi-Tenancy Fix

## Problem

All form management pages and API routes resolve `org_id` from the authenticated user's JWT (via `appUser.org_id`), not from the selected location context. This causes:

1. **Cross-org data leakage**: When a Levelset Admin impersonates/selects a different org's location, forms from the admin's own org are shown instead of the selected org's forms.
2. **Admin-only access**: All write operations are gated on `role === 'Levelset Admin'` instead of using the permission system. Non-admin users see a "Coming Soon" screen.
3. **No feature flag enforcement**: The `F.FORM_MANAGEMENT` feature flag exists but is not checked on the page or API routes.

## Correct Pattern (already used elsewhere)

**RosterPage / employees API** use:
- Frontend: `useLocationContext().selectedLocationOrgId` for org scoping
- API: `withPermissionAndContext(P.SOME_PERM, handler)` which resolves `org_id` from request body/query/header, falls back to `location_id` lookup
- Levelset Admin bypasses permission checks but still sees the selected org's data

## Design

### Frontend Changes

#### FormManagementPage.tsx

**Current (broken)**:
```typescript
const auth = useAuth();
// Line 101: if (!auth.isLoaded || !auth.authUser || !auth.appUser || auth.role !== 'Levelset Admin') return;
// Line 189: const isLevelsetAdmin = auth.role === 'Levelset Admin';
// Line 222: {!isLevelsetAdmin ? <ComingSoon /> : <AdminView />}
```

**Fix**:
1. Import `useLocationContext` and `usePermissions` (with `P`)
2. Get `selectedLocationOrgId` from location context
3. Replace `auth.role !== 'Levelset Admin'` guard with `!has(P.FM_VIEW_FORMS)` (after permissions load)
4. Pass `org_id` as query param to all `/api/forms/*` fetch calls: `fetch('/api/forms?org_id=${orgId}', ...)`
5. Remove "Coming Soon" block; show permission-denied message if `!has(P.FM_VIEW_FORMS)`
6. Gate create/import/duplicate/archive actions on `has(P.FM_CREATE_FORMS)` / `has(P.FM_DELETE_FORMS)` respectively
7. Re-fetch data when `selectedLocationOrgId` changes

#### FormDetailPage.tsx

Same pattern: replace `useAuth()` org resolution with `useLocationContext().selectedLocationOrgId`, pass `org_id` to API calls, use permission checks for edit/delete actions.

### API Route Changes

All 5 form API routes use identical broken auth:

```typescript
const appUser = appUsers.find(u => u.role === 'Levelset Admin') || appUsers[0];
const orgId = appUser.org_id;
```

**Fix each route** to accept `org_id` from request context using the same resolution pattern as `withPermissionAndContext`:

1. `org_id` from `req.query.org_id` or `req.body.org_id` or `req.headers['x-org-id']`
2. Fallback: resolve from `location_id` if provided
3. Final fallback: `appUser.org_id` (backward compat)

#### Affected routes and their permission mapping:

| Route | Method | Current Gate | New Permission |
|-------|--------|-------------|----------------|
| `/api/forms` | GET | authenticated | `P.FM_VIEW_FORMS` |
| `/api/forms` | POST | Levelset Admin | `P.FM_CREATE_FORMS` |
| `/api/forms/[id]` | GET | authenticated | `P.FM_VIEW_FORMS` |
| `/api/forms/[id]` | PATCH | Levelset Admin | `P.FM_EDIT_FORMS` |
| `/api/forms/[id]` | DELETE | Levelset Admin | `P.FM_DELETE_FORMS` |
| `/api/forms/groups` | GET | authenticated | `P.FM_VIEW_FORMS` |
| `/api/forms/groups` | POST | Levelset Admin | `P.FM_CREATE_FORMS` |
| `/api/forms/submissions` | GET | authenticated | `P.FM_VIEW_SUBMISSIONS` |
| `/api/forms/submissions` | POST | authenticated + per-type | keep existing per-type checks |
| `/api/forms/import` | POST | Levelset Admin | `P.FM_CREATE_FORMS` |
| `/api/forms/submissions/[id]` | GET/PATCH | authenticated | `P.FM_VIEW_SUBMISSIONS` / `P.FM_MANAGE_SUBMISSIONS` |

**Implementation approach**: Wrap each route handler with `withPermission()` or `withPermissionAndContext()`. The middleware handles JWT decode, org resolution, admin bypass, and permission check. This replaces the manual `supabase.auth.getUser()` + `appUsers.find()` pattern in each route.

For routes that need the resolved `orgId` in the handler (all of them), use `withPermissionAndContext()` which passes `{ userId, orgId }` to the handler.

### Permission Seeding

The `P.FM_*` constants already exist in `constants.ts`:
- `FM_VIEW_FORMS`, `FM_CREATE_FORMS`, `FM_EDIT_FORMS`, `FM_DELETE_FORMS`
- `FM_VIEW_SUBMISSIONS`, `FM_MANAGE_SUBMISSIONS`

The seed script (`scripts/seed-permission-modules.ts`) reads from constants dynamically, so running it will populate the `permission_modules` and `permission_sub_items` tables.

**Action needed**: Run `npx tsx scripts/seed-permission-modules.ts` to seed the form management permissions, then `npx tsx scripts/seed-default-profiles.ts` to add them to default profiles.

### Data State

- Director Evaluation and Team Member Eval: already moved to Reece Howard's org (done)
- Closing Checklist: stays on Levelset org (intentional)
- No migration needed; this is a code-only fix

## Files to Modify

| File | Change |
|------|--------|
| `components/pages/FormManagementPage.tsx` | Use location context, permissions, pass org_id |
| `components/pages/FormDetailPage.tsx` | Use location context, permissions, pass org_id |
| `pages/api/forms/index.ts` | Use `withPermissionAndContext`, accept org_id from request |
| `pages/api/forms/[id].ts` | Use `withPermissionAndContext`, accept org_id from request |
| `pages/api/forms/groups.ts` | Use `withPermissionAndContext`, accept org_id from request |
| `pages/api/forms/submissions.ts` | Use `withPermissionAndContext` for GET, keep existing POST logic |
| `pages/api/forms/import.ts` | Use `withPermissionAndContext`, accept org_id from request |
| `pages/api/forms/submissions/[id].ts` | Use `withPermissionAndContext`, accept org_id from request |

## Already Correct (no changes needed)

- `pages/api/forms/widget-data.ts` — already accepts `org_id` from `req.query`
- `pages/api/forms/submission-documents.ts` — already uses JWT decode + permission checks
- `pages/api/forms/connectors.ts` — system-level data, no org scoping needed

## Deployment Notes

- Dashboard frontend and API routes deploy atomically on Vercel, so no coordination issue between frontend sending `org_id` and API expecting it.
- The `withPermissionAndContext` middleware reads JWT from `Authorization: Bearer` header — same header the frontend already sends. No change needed to how tokens are sent, only adding `org_id` query params.
- `pages/api/forms/template-by-slug.ts` is called by the mobile app which does NOT send `org_id`. This route must keep the `appUser.org_id` fallback to avoid breaking mobile. Wrap with middleware but preserve fallback.

## Feature Flag

The `F.FORM_MANAGEMENT` flag exists in `OrgFeaturesProvider.tsx`. `hasFeature()` already returns `true` for Levelset Admin, so the check is simply: `if (!hasFeature(F.FORM_MANAGEMENT))` — no separate admin check needed.

## Out of Scope

- Submissions POST route already has proper per-type permission checks (PE_SUBMIT_RATINGS, DISC_SUBMIT_INFRACTIONS) — no changes needed there beyond org resolution
- No new DB migration needed
- No changes to mobile/PWA form routes (but `template-by-slug.ts` keeps backward-compat fallback)
