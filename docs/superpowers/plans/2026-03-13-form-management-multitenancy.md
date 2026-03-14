# Form Management Multi-Tenancy Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix form management to scope data by the selected location's org (not the user's JWT org) and replace admin-only role gates with granular permissions.

**Architecture:** Replace manual `supabase.auth.getUser()` + `appUsers.find(admin)` auth in all form API routes with `withPermissionAndContext()` middleware. On the frontend, replace `useAuth().org_id` with `useLocationContext().selectedLocationOrgId` and `usePermissions().has()` for access gating.

**Tech Stack:** Next.js Pages Router, Supabase, existing permission middleware (`withPermissionAndContext`), existing providers (`LocationContext`, `PermissionsProvider`, `OrgFeaturesProvider`)

**Spec:** `docs/superpowers/specs/2026-03-13-form-management-multitenancy-design.md`

---

## File Structure

| File | Responsibility | Change Type |
|------|---------------|-------------|
| `pages/api/forms/index.ts` | List/create form templates | Rewrite auth to use middleware |
| `pages/api/forms/[id].ts` | Get/update/delete single template | Rewrite auth to use middleware |
| `pages/api/forms/groups.ts` | List/create form groups | Rewrite auth to use middleware |
| `pages/api/forms/submissions.ts` | List submissions (GET), create submission (POST) | Rewrite GET auth; POST keeps existing per-type checks but fixes org resolution |
| `pages/api/forms/submissions/[id].ts` | Get/update single submission | Rewrite auth to use middleware |
| `pages/api/forms/import.ts` | AI form import | Rewrite auth to use middleware |
| `pages/api/forms/template-by-slug.ts` | Lookup template by slug (mobile app) | Fix org resolution with backward-compat fallback |
| `components/pages/FormManagementPage.tsx` | Form management list page | Use location context, permissions, feature flag |
| `components/pages/FormDetailPage.tsx` | Form detail/editor page | Use location context, permissions |

---

## Chunk 1: API Route Migration

### Task 1: Migrate `/api/forms/index.ts`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/index.ts`

- [ ] **Step 1: Rewrite the route to use `withPermissionAndContext`**

Replace the entire file content. The key changes:
- Remove manual `supabase.auth.getUser()` + `appUsers.find()` auth block (lines 5–38)
- Import `withPermissionAndContext` and `P` from permissions
- GET uses `P.FM_VIEW_FORMS`, POST uses `P.FM_CREATE_FORMS`
- Since GET and POST need different permissions, handle inside a single wrapper with the lowest permission (VIEW) and check CREATE inside POST

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'GET') {
    const { group_id, form_type, is_active } = req.query;

    let query = supabase
      .from('form_templates')
      .select('*, form_groups!inner(name, slug, is_system)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (group_id) {
      query = query.eq('group_id', group_id as string);
    }
    if (form_type) {
      query = query.eq('form_type', form_type as string);
    }
    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data: templates, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const transformed = (templates || []).map((t: any) => ({
      ...t,
      group: t.form_groups,
      form_groups: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    // POST requires create permission (middleware only checked view)
    const hasCreate = await checkPermission(supabase, userId, orgId, P.FM_CREATE_FORMS);
    if (!hasCreate) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { intent } = req.body;

    if (intent === 'create_template') {
      const { name, name_es, description, description_es, group_id, form_type } = req.body;

      if (!name || !group_id || !form_type) {
        return res.status(400).json({ error: 'Name, group_id, and form_type are required' });
      }

      const validTypes = ['rating', 'discipline', 'evaluation', 'custom'];
      if (!validTypes.includes(form_type)) {
        return res.status(400).json({ error: 'Invalid form_type' });
      }

      // Verify group belongs to this org
      const { data: group } = await supabase
        .from('form_groups')
        .select('id, org_id, slug')
        .eq('id', group_id)
        .eq('org_id', orgId)
        .single();

      if (!group) {
        return res.status(404).json({ error: 'Form group not found' });
      }

      // Validate form_type matches system group slug
      const slugToType: Record<string, string> = {
        positional_excellence: 'rating',
        discipline: 'discipline',
        evaluations: 'evaluation',
      };
      const expectedType = slugToType[group.slug];
      if (expectedType && form_type !== expectedType) {
        return res.status(400).json({
          error: `The "${group.slug}" group requires form type "${expectedType}"`,
        });
      }

      const slug = await generateUniqueSlug(supabase, orgId, name);

      // Look up the app_user id for created_by
      const { data: appUser } = await supabase
        .from('app_users')
        .select('id')
        .eq('auth_user_id', userId)
        .eq('org_id', orgId)
        .maybeSingle();

      const { data: template, error } = await supabase
        .from('form_templates')
        .insert({
          org_id: orgId,
          group_id,
          name,
          name_es: name_es || null,
          slug,
          description: description || null,
          description_es: description_es || null,
          form_type,
          schema: {},
          ui_schema: {},
          settings: {},
          is_active: true,
          is_system: false,
          created_by: appUser?.id || null,
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json(template);
    }

    return res.status(400).json({ error: 'Invalid intent' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.FM_VIEW_FORMS, handler);
```

- [ ] **Step 2: Verify the route compiles**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard exec tsc --noEmit --pretty 2>&1 | head -30`

Check for errors in `pages/api/forms/index.ts`. Fix any type issues.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/pages/api/forms/index.ts
git commit -m "fix(api): migrate /api/forms to withPermissionAndContext for multi-tenancy"
```

---

### Task 2: Migrate `/api/forms/[id].ts`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/[id].ts`

- [ ] **Step 1: Rewrite the route to use `withPermissionAndContext`**

Same pattern as Task 1. Key differences:
- GET uses `P.FM_VIEW_FORMS` (via middleware)
- PATCH checks `P.FM_EDIT_FORMS` inside handler
- DELETE checks `P.FM_DELETE_FORMS` inside handler
- The `appUser.id` for `created_by` is no longer available — we need to look it up from `userId` + `orgId`

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateUniqueSlug } from '@/lib/forms/slugify';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Template ID is required' });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const lookupField = isUuid ? 'id' : 'slug';

  if (req.method === 'GET') {
    const { data: template, error } = await supabase
      .from('form_templates')
      .select('*, form_groups!inner(id, name, slug, is_system)')
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const transformed = {
      ...template,
      group: template.form_groups,
      form_groups: undefined,
    };

    return res.status(200).json(transformed);
  }

  if (req.method === 'PATCH') {
    const hasEdit = await checkPermission(supabase, userId, orgId, P.FM_EDIT_FORMS);
    if (!hasEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const {
      name,
      name_es,
      description,
      description_es,
      group_id,
      is_active,
      schema,
      ui_schema,
      settings,
    } = req.body;

    // Check if this is a system template — only allow is_active changes
    const { data: existingTemplate } = await supabase
      .from('form_templates')
      .select('is_system')
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .single();

    if (existingTemplate?.is_system) {
      const hasStructuralChanges =
        name !== undefined ||
        name_es !== undefined ||
        description !== undefined ||
        description_es !== undefined ||
        group_id !== undefined ||
        schema !== undefined ||
        ui_schema !== undefined ||
        settings !== undefined;

      if (hasStructuralChanges) {
        return res.status(403).json({ error: 'System form structure cannot be modified. Only active status can be changed.' });
      }
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (name !== undefined) updates.name = name;
    if (name_es !== undefined) updates.name_es = name_es;
    if (description !== undefined) updates.description = description;
    if (description_es !== undefined) updates.description_es = description_es;
    if (group_id !== undefined) updates.group_id = group_id;
    if (is_active !== undefined) updates.is_active = is_active;
    if (schema !== undefined) updates.schema = schema;
    if (ui_schema !== undefined) updates.ui_schema = ui_schema;
    if (settings !== undefined) updates.settings = settings;

    if (name !== undefined) {
      let templateId = id;
      if (!isUuid) {
        const { data: found } = await supabase
          .from('form_templates')
          .select('id')
          .eq('slug', id)
          .eq('org_id', orgId)
          .single();
        if (found) templateId = found.id;
      }
      updates.slug = await generateUniqueSlug(supabase, orgId, name, templateId);
    }

    const { data: template, error } = await supabase
      .from('form_templates')
      .update(updates)
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(template);
  }

  if (req.method === 'DELETE') {
    const hasDelete = await checkPermission(supabase, userId, orgId, P.FM_DELETE_FORMS);
    if (!hasDelete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { data: existing } = await supabase
      .from('form_templates')
      .select('is_system')
      .eq(lookupField, id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (existing.is_system) {
      return res.status(403).json({ error: 'System templates cannot be deleted' });
    }

    const { error } = await supabase
      .from('form_templates')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq(lookupField, id)
      .eq('org_id', orgId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.FM_VIEW_FORMS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/[id].ts
git commit -m "fix(api): migrate /api/forms/[id] to withPermissionAndContext"
```

---

### Task 3: Migrate `/api/forms/groups.ts`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/groups.ts`

- [ ] **Step 1: Rewrite the route**

Same pattern. GET uses `P.FM_VIEW_FORMS` (via middleware), POST checks `P.FM_CREATE_FORMS` inside.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'GET') {
    const { data: groups, error } = await supabase
      .from('form_groups')
      .select('*, form_templates(count)')
      .eq('org_id', orgId)
      .order('display_order', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const transformed = (groups || []).map((g: any) => ({
      ...g,
      template_count: g.form_templates?.[0]?.count || 0,
      form_templates: undefined,
    }));

    return res.status(200).json(transformed);
  }

  if (req.method === 'POST') {
    const hasCreate = await checkPermission(supabase, userId, orgId, P.FM_CREATE_FORMS);
    if (!hasCreate) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { name, name_es, description, description_es, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');

    const { data: existing } = await supabase
      .from('form_groups')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({ error: 'A group with this name already exists' });
    }

    const { data: maxOrder } = await supabase
      .from('form_groups')
      .select('display_order')
      .eq('org_id', orgId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const { data: group, error } = await supabase
      .from('form_groups')
      .insert({
        org_id: orgId,
        name,
        name_es: name_es || null,
        description: description || null,
        description_es: description_es || null,
        slug,
        is_system: false,
        icon: icon || null,
        display_order: (maxOrder?.display_order || 0) + 1,
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(group);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.FM_VIEW_FORMS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/groups.ts
git commit -m "fix(api): migrate /api/forms/groups to withPermissionAndContext"
```

---

### Task 4: Migrate `/api/forms/submissions.ts`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/submissions.ts`

- [ ] **Step 1: Rewrite the route**

This is the most complex route. Key decisions:
- GET: Wrap with `P.FM_VIEW_SUBMISSIONS` via middleware
- POST: Needs `appUser.id` for `submitted_by` — look it up from `userId` + `orgId`. Keep existing per-type permission checks (PE_SUBMIT_RATINGS, DISC_SUBMIT_INFRACTIONS). The middleware permission check for POST should be `P.FM_VIEW_SUBMISSIONS` (same as GET — the view-level is the base, and per-type checks gate submission)

Replace **only the auth block** (lines 1–42) with the middleware wrapper, and update `orgId` / `appUser` references to use `context.orgId` and a looked-up `appUser`. Keep the rest of the logic (lines 44–420) intact.

The auth block to remove:
```typescript
// Lines 9-42: The supabase.auth.getUser() + appUsers.find() block
```

Replace the file's `export default` and auth section. The handler body (GET and POST logic) stays the same, just replace `orgId` with `context.orgId` and look up `appUser` from `userId`.

The implementation is too long to include inline. The key transformation is:

1. Add imports: `withPermissionAndContext`, `AuthenticatedRequest`, `P`, `checkPermission`
2. Change function signature to `async function handler(req: AuthenticatedRequest, res: NextApiResponse, context: { userId: string; orgId: string })`
3. Remove lines 9-42 (manual auth)
4. Add at top of handler: `const { orgId, userId } = context;`
5. For POST, look up `appUser`: `const { data: appUser } = await supabase.from('app_users').select('id, role, full_name').eq('auth_user_id', userId).eq('org_id', orgId).maybeSingle();`
6. Keep all existing POST logic (dual-write, per-type permission checks) using the looked-up `appUser`
7. Export: `export default withPermissionAndContext(P.FM_VIEW_SUBMISSIONS, handler);`

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/submissions.ts
git commit -m "fix(api): migrate /api/forms/submissions to withPermissionAndContext"
```

---

### Task 5: Migrate `/api/forms/submissions/[id].ts`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/submissions/[id].ts`

- [ ] **Step 1: Rewrite the route**

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Submission ID is required' });
  }

  if (req.method === 'GET') {
    const { data: submission, error } = await supabase
      .from('form_submissions')
      .select('*, form_templates!inner(id, name, name_es, form_type, ui_schema)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    let submittedByName = null;
    let employeeName = null;

    if (submission.submitted_by) {
      const { data: submitter } = await supabase
        .from('app_users')
        .select('full_name')
        .eq('id', submission.submitted_by)
        .single();
      submittedByName = submitter?.full_name || null;
    }

    if (submission.employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('full_name')
        .eq('id', submission.employee_id)
        .single();
      employeeName = employee?.full_name || null;
    }

    const transformed = {
      ...submission,
      template: submission.form_templates
        ? {
            id: (submission.form_templates as any).id,
            name: (submission.form_templates as any).name,
            name_es: (submission.form_templates as any).name_es,
            form_type: (submission.form_templates as any).form_type,
            ui_schema: (submission.form_templates as any).ui_schema,
          }
        : null,
      form_templates: undefined,
      submitted_by_name: submittedByName,
      employee_name: employeeName,
    };

    return res.status(200).json(transformed);
  }

  if (req.method === 'PATCH') {
    const hasManage = await checkPermission(supabase, userId, orgId, P.FM_MANAGE_SUBMISSIONS);
    if (!hasManage) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const { status } = req.body;

    const validStatuses = ['submitted', 'deleted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "submitted" or "deleted"' });
    }

    const { data: existing } = await supabase
      .from('form_submissions')
      .select('status')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const { data: updated, error } = await supabase
      .from('form_submissions')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(updated);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.FM_VIEW_SUBMISSIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/submissions/[id].ts
git commit -m "fix(api): migrate /api/forms/submissions/[id] to withPermissionAndContext"
```

---

### Task 6: Migrate `/api/forms/import.ts`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/import.ts`

- [ ] **Step 1: Rewrite the auth section**

Same pattern. Replace lines 1-71 (imports + auth block). Wrap with `P.FM_CREATE_FORMS`. Key change:
- Remove `supabase.auth.getUser()` + `appUsers.find()` block
- Use `context.orgId` and `context.userId`
- Look up `appUser.id` for `created_by` field

Keep the `export const config` for body size limit — it must remain as a named export alongside the default export.

The function signature changes to:
```typescript
async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
)
```

And the export becomes:
```typescript
export default withPermissionAndContext(P.FM_CREATE_FORMS, handler);
```

Inside the handler, replace `orgId` references with `context.orgId`, and look up `appUser.id`:
```typescript
const { data: appUser } = await supabase
  .from('app_users')
  .select('id')
  .eq('auth_user_id', userId)
  .eq('org_id', orgId)
  .maybeSingle();
```

Use `appUser?.id || null` for `created_by`.

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/import.ts
git commit -m "fix(api): migrate /api/forms/import to withPermissionAndContext"
```

---

### Task 7: Fix `/api/forms/template-by-slug.ts` org resolution

**Files:**
- Modify: `apps/dashboard/pages/api/forms/template-by-slug.ts`

- [ ] **Step 1: Add org_id from request with fallback**

This route is used by the mobile app which does NOT send `org_id`. Keep backward compatibility.

Replace the org resolution section (lines 42-53) to check for `org_id` in query params first, then fall back to appUser lookup:

```typescript
// After JWT decode (line 37), add org_id resolution:
let orgId = req.query.org_id as string | undefined;

if (!orgId) {
  // Fallback for mobile app: resolve from user's app_user record
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id')
    .eq('auth_user_id', payload.sub)
    .order('created_at');

  if (!appUsers || appUsers.length === 0 || !appUsers[0].org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  orgId = appUsers[0].org_id;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/template-by-slug.ts
git commit -m "fix(api): add org_id query param support to template-by-slug with mobile fallback"
```

---

## Chunk 2: Frontend Migration

### Task 8: Migrate `FormManagementPage.tsx`

**Files:**
- Modify: `apps/dashboard/components/pages/FormManagementPage.tsx`

- [ ] **Step 1: Add imports and hooks**

Add these imports at the top (after existing imports):
```typescript
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { usePermissions } from '@/lib/providers/PermissionsProvider';
import { P } from '@/lib/permissions/constants';
import { useOrgFeatures, F } from '@/lib/providers/OrgFeaturesProvider';
```

Inside the component, after `const auth = useAuth();`, add:
```typescript
const { selectedLocationOrgId } = useLocationContext();
const { has, loading: permissionsLoading } = usePermissions();
const { hasFeature } = useOrgFeatures();
```

- [ ] **Step 2: Replace the data fetch guard and add org_id to API calls**

Replace line 101:
```typescript
// OLD:
if (!auth.isLoaded || !auth.authUser || !auth.appUser || auth.role !== 'Levelset Admin') return;
```
with:
```typescript
if (!auth.isLoaded || !auth.authUser || !auth.appUser || permissionsLoading) return;
if (!has(P.FM_VIEW_FORMS)) return;
```

In the `fetchData` callback, add `org_id` to API calls. Replace the fetch URLs:
```typescript
// OLD:
fetch('/api/forms/groups', { headers }),
fetch('/api/forms', { headers }),

// NEW:
fetch(`/api/forms/groups?org_id=${selectedLocationOrgId}`, { headers }),
fetch(`/api/forms?org_id=${selectedLocationOrgId}`, { headers }),
```

Add `selectedLocationOrgId` to the `fetchData` dependency array and the `useEffect` guard:
```typescript
React.useEffect(() => {
  if (!auth.isLoaded || !auth.authUser || !auth.appUser || permissionsLoading || !selectedLocationOrgId) return;
  if (!has(P.FM_VIEW_FORMS)) return;
  fetchData();
}, [auth.isLoaded, auth.authUser, auth.appUser, permissionsLoading, selectedLocationOrgId, has, fetchData]);
```

Also update `fetchSubmissions` to include `org_id`:
```typescript
const res = await fetch(`/api/forms/submissions?org_id=${selectedLocationOrgId}`, { headers });
```

And the submissions effect guard:
```typescript
if (activeTab === 1 && has(P.FM_VIEW_SUBMISSIONS)) {
```

- [ ] **Step 3: Add org_id to all mutation API calls**

In `handleDuplicateTemplate`, add `org_id` to the POST body:
```typescript
body: JSON.stringify({
  intent: 'create_template',
  name: `${template.name} (Copy)`,
  description: template.description,
  group_id: template.group_id,
  form_type: template.form_type,
  org_id: selectedLocationOrgId,
}),
```

In `handleArchiveTemplate`, add `org_id` as query param:
```typescript
const res = await fetch(`/api/forms/${template.id}?org_id=${selectedLocationOrgId}`, {
```

- [ ] **Step 4: Replace admin-only UI gating with permission checks**

Replace the `isLevelsetAdmin` variable and the "Coming Soon" conditional:

```typescript
// OLD (line 189):
const isLevelsetAdmin = auth.role === 'Levelset Admin';

// NEW:
const canViewForms = has(P.FM_VIEW_FORMS);
const canCreateForms = has(P.FM_CREATE_FORMS);
const canDeleteForms = has(P.FM_DELETE_FORMS);
```

Replace the main content conditional (line 222):
```typescript
// OLD:
{!isLevelsetAdmin ? (
  <div className={sty.comingSoonContainer}>...Coming Soon...</div>
) : (

// NEW:
{!canViewForms || !hasFeature(F.FORM_MANAGEMENT) ? (
  <div className={sty.comingSoonContainer}>
    <DescriptionOutlinedIcon className={sty.comingSoonIcon} />
    <h2 className={sty.comingSoonTitle}>Form Management</h2>
    <p className={sty.comingSoonDescription}>
      {!hasFeature(F.FORM_MANAGEMENT)
        ? 'This feature is not available for your organization.'
        : 'You do not have permission to manage forms.'}
    </p>
  </div>
) : (
```

Remove the "Coming Soon" badge (`<span className={sty.comingSoonBadge}>Coming Soon</span>`).

In `FormManagementToolbar`, conditionally hide create buttons:
```typescript
<FormManagementToolbar
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
  activeTypeFilter={typeFilter}
  onTypeFilterChange={setTypeFilter}
  onCreateForm={canCreateForms ? () => setCreateFormOpen(true) : undefined}
  onCreateGroup={canCreateForms ? () => setCreateGroupOpen(true) : undefined}
  onImportForm={canCreateForms ? () => setImportFormOpen(true) : undefined}
/>
```

Update the submissions tab guard:
```typescript
if (activeTab === 1 && has(P.FM_VIEW_SUBMISSIONS)) {
```

- [ ] **Step 5: Pass `org_id` to dialog components**

The `CreateFormDialog`, `CreateGroupDialog`, and `ImportFormDialog` components make their own API calls. They need `org_id`. Add it as a prop:

```typescript
<CreateFormDialog
  open={createFormOpen}
  onClose={() => setCreateFormOpen(false)}
  onCreated={() => {
    setSnackbar({ open: true, message: 'Form created', severity: 'success' });
    fetchData();
  }}
  groups={groups}
  getAccessToken={getAccessToken}
  orgId={selectedLocationOrgId}
/>

<CreateGroupDialog
  open={createGroupOpen}
  onClose={() => setCreateGroupOpen(false)}
  onCreated={() => {
    setSnackbar({ open: true, message: 'Group created', severity: 'success' });
    fetchData();
  }}
  getAccessToken={getAccessToken}
  orgId={selectedLocationOrgId}
/>

<ImportFormDialog
  open={importFormOpen}
  onClose={() => setImportFormOpen(false)}
  onImported={(slug) => {
    setImportFormOpen(false);
    setSnackbar({ open: true, message: 'Form imported successfully', severity: 'success' });
    router.push(`/form-management/${slug}`);
  }}
  groups={groups}
  getAccessToken={getAccessToken}
  orgId={selectedLocationOrgId}
/>
```

Then update each dialog component to accept `orgId?: string` prop and include it in their API calls as `org_id` in the request body. Check the dialog files:
- `components/forms/CreateFormDialog.tsx` — add `org_id: orgId` to POST body
- `components/forms/CreateGroupDialog.tsx` — add `org_id: orgId` to POST body
- `components/forms/ImportFormDialog.tsx` — add `org_id: orgId` to POST body

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/components/pages/FormManagementPage.tsx
git add apps/dashboard/components/forms/CreateFormDialog.tsx
git add apps/dashboard/components/forms/CreateGroupDialog.tsx
git add apps/dashboard/components/forms/ImportFormDialog.tsx
git commit -m "fix(forms): scope FormManagementPage to selected org with permission checks"
```

---

### Task 9: Migrate `FormDetailPage.tsx`

**Files:**
- Modify: `apps/dashboard/components/pages/FormDetailPage.tsx`

- [ ] **Step 1: Add imports and hooks**

Add imports:
```typescript
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { usePermissions } from '@/lib/providers/PermissionsProvider';
import { P } from '@/lib/permissions/constants';
```

Inside the component, after `const auth = useAuth();`:
```typescript
const { selectedLocationOrgId } = useLocationContext();
const { has, loading: permissionsLoading } = usePermissions();
```

- [ ] **Step 2: Replace admin-only redirect with permission check**

Replace lines 69-73:
```typescript
// OLD:
React.useEffect(() => {
  if (auth.isLoaded && auth.authUser && auth.appUser && auth.role !== 'Levelset Admin') {
    router.push('/form-management');
  }
}, [auth.isLoaded, auth.authUser, auth.appUser, auth.role, router]);

// NEW:
React.useEffect(() => {
  if (auth.isLoaded && auth.authUser && !permissionsLoading && !has(P.FM_VIEW_FORMS)) {
    router.push('/form-management');
  }
}, [auth.isLoaded, auth.authUser, permissionsLoading, has, router]);
```

- [ ] **Step 3: Add `org_id` to all API calls**

In the `fetchData` function (inside the useEffect), add `org_id` to URLs:
```typescript
const [templateRes, groupsRes] = await Promise.all([
  fetch(`/api/forms/${formId}?org_id=${selectedLocationOrgId}`, { headers }),
  fetch(`/api/forms/groups?org_id=${selectedLocationOrgId}`, { headers }),
]);
```

In `fetchSubmissions`:
```typescript
const res = await fetch(`/api/forms/submissions?template_id=${template.id}&org_id=${selectedLocationOrgId}`, { headers });
```

In `handleSaveSettings`:
```typescript
const res = await fetch(`/api/forms/${template.id}?org_id=${selectedLocationOrgId}`, {
```

In `handleSaveSchema`:
```typescript
const res = await fetch(`/api/forms/${template.id}?org_id=${selectedLocationOrgId}`, {
```

In `handleSaveEvaluationSettings`:
```typescript
const res = await fetch(`/api/forms/${template.id}?org_id=${selectedLocationOrgId}`, {
```

In `handleDelete`:
```typescript
const res = await fetch(`/api/forms/${template.id}?org_id=${selectedLocationOrgId}`, {
```

- [ ] **Step 4: Reset data fetch ref when org changes**

The `dataFetchedRef` prevents re-fetches, but we need it to reset when the org changes:
```typescript
React.useEffect(() => {
  dataFetchedRef.current = false;
}, [selectedLocationOrgId]);
```

Add this effect before the main data fetch effect.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/components/pages/FormDetailPage.tsx
git commit -m "fix(forms): scope FormDetailPage to selected org with permission checks"
```

---

## Chunk 3: Verification & Seeding

### Task 10: Type-check and verify

- [ ] **Step 1: Run type-check**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm typecheck 2>&1 | tail -20`

Fix any TypeScript errors. Common issues:
- `AuthenticatedRequest` type may need query params
- Dialog components may not accept `orgId` prop yet (need to check their interfaces)
- `has` function signature

- [ ] **Step 2: Run build**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard build 2>&1 | tail -20`

Fix any build errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors from multi-tenancy migration"
```

### Task 11: Seed permissions

- [ ] **Step 1: Run permission seed scripts**

```bash
cd /Users/andrewdyar/levelset-nextjs
npx tsx scripts/seed-permission-modules.ts
npx tsx scripts/seed-default-profiles.ts
```

Verify the output shows the form_management module and sub-items were created/updated.

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "chore: seed form management permissions"
```
