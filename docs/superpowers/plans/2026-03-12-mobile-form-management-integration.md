# Mobile Form Management Integration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewire mobile app form submissions (ratings + infractions) to go through the form management system (`/api/forms/submissions`) which dual-writes to both `form_submissions` and legacy domain tables, while keeping the mobile UI and PWA routes completely untouched.

**Architecture:** Mobile forms currently submit directly to `/api/native/forms/ratings` and `/api/native/forms/infractions`, which only write to legacy tables. The form management system at `/api/forms/submissions` already implements dual-write logic using `settings.field_mappings` to bridge form field IDs to database columns. We will: (1) add permission checks to the submissions endpoint, (2) add a form-submission-aware file upload endpoint that writes to `infraction_documents`, (3) create a mobile helper that fetches system templates and maps form data to field IDs, (4) rewire both form components to submit through the form management endpoint.

**Tech Stack:** Next.js API routes, Supabase, React Native (Expo), TypeScript

**Constraints:**
- PWA routes (`/api/mobile/[token]/`) are live in production and MUST NOT be modified
- Mobile form UI stays identical — this is purely a submission plumbing change
- Data-fetching endpoints (`positional-data`, `position-labels`, `infraction-data`) stay unchanged
- File uploads must continue writing to `infraction_documents` table for compliance/export
- Permission checks (`PE_SUBMIT_RATINGS`, `DISC_SUBMIT_INFRACTIONS`) must be enforced per form_type

---

## File Structure

### Dashboard API (modified)
| File | Action | Purpose |
|------|--------|---------|
| `apps/dashboard/pages/api/forms/submissions.ts` | Modify | Add `withPermissionAndContext` middleware with form_type-based permission routing |
| `apps/dashboard/pages/api/forms/submission-documents.ts` | Create | New endpoint for uploading files linked to form submissions, writes to `infraction_documents` |
| `apps/dashboard/pages/api/forms/template-by-slug.ts` | Create | Lightweight endpoint to fetch a system template by org + slug (mobile needs template_id + field_mappings) |

### Mobile API layer (modified)
| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/src/lib/api.ts` | Modify | Add `fetchSystemTemplate()`, update `submitRatingsAuth()` and `submitInfractionAuth()` to submit via form management, update `uploadInfractionDocumentAuth()` to use new endpoint |
| `apps/mobile/src/lib/form-mapping.ts` | Create | Helper to invert `field_mappings` and build `response_data` from form values |

### Mobile form components (modified)
| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/src/components/forms/PositionalRatingsForm.tsx` | Modify | Fetch system template on load, pass template_id through submit flow |
| `apps/mobile/src/components/forms/DisciplineInfractionForm.tsx` | Modify | Fetch system template on load, pass template_id through submit flow, update file upload to use submission-based endpoint |

---

## Chunk 1: Backend — Permission-Protected Submissions Endpoint

### Task 1: Add permission middleware to `/api/forms/submissions`

**Files:**
- Modify: `apps/dashboard/pages/api/forms/submissions.ts`

The current endpoint authenticates via JWT but has no permission checks. We need to add `form_type`-based permission enforcement. The challenge is that `form_type` comes from the template (looked up by `template_id`), so we need to resolve it before checking permissions.

Since `withPermissionAndContext` wraps the entire handler and needs a single permission key upfront, but we need to vary the permission by `form_type`, we'll use `withPermission` with a dynamic approach: look up the template first, then check the appropriate permission.

- [ ] **Step 1: Read the current submissions endpoint to understand the auth flow**

The current endpoint (lines 12-17) does its own JWT auth via `supabase.auth.getUser()`. We need to replace this with the `withPermissionAndContext` pattern, but since the permission depends on `form_type` (which requires a template lookup), we'll use a two-phase approach:
1. Decode JWT and resolve user/org (reusing the middleware's `decodeJwt` pattern)
2. Look up the template to get `form_type`
3. Check the appropriate permission

- [ ] **Step 2: Refactor the POST handler to include permission checks**

Keep the existing `supabase.auth.getUser()` auth flow (lines 12-39) — it works and the `user.id` it returns is the auth user ID needed by `checkPermission`. Add permission checks AFTER the template lookup (line 141) inside the POST handler.

```typescript
// At the top of the file, add imports:
import { checkPermission } from '@/lib/permissions/service';
import { P } from '@/lib/permissions/constants';
import { validateLocationAccess } from '@/lib/native-auth';

// Inside the POST handler, after template lookup (line 141) and before
// the evaluation scoring block:
// Add permission check based on form_type for system forms
if (template.form_type === 'rating' || template.form_type === 'discipline') {
  const locationId = location_id || req.body?.location_id;
  if (!locationId) {
    return res.status(400).json({ error: 'location_id is required for system form submissions' });
  }

  // Validate location access (user.id here is auth_user_id from getUser())
  const location = await validateLocationAccess(user.id, orgId, locationId);
  if (!location) {
    return res.status(403).json({ error: 'No access to this location' });
  }

  // Levelset Admin bypasses permission checks (already resolved above at line 33)
  const isAdmin = appUser.role === 'Levelset Admin';
  if (!isAdmin) {
    const permissionKey = template.form_type === 'rating'
      ? P.PE_SUBMIT_RATINGS
      : P.DISC_SUBMIT_INFRACTIONS;

    const hasPermission = await checkPermission(supabase, user.id, orgId, permissionKey);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }
  }
}
```

Note: `appUser.role` is already resolved at line 33 (`appUsers.find(u => u.role === 'Levelset Admin')`), so we reuse that for the admin check rather than doing a separate query.

- [ ] **Step 3: Verify the existing dual-write logic handles the field_mappings correctly**

Read through lines 219-384 of `submissions.ts` and verify:
- Rating dual-write extracts `employee_id`, `leader_id`, `position`, `ratings[0..4]`, `notes` from `response_data` using `field_mappings`
- Infraction dual-write extracts `employee_id`, `leader_id`, `infraction_id`, `infraction_date`, `acknowledged`, `notes`, `team_member_signature`, `leader_signature`
- Both store the legacy table ID back in `metadata` (`rating_id`, `infraction_id`)

No changes needed here — just verification that the existing logic works.

- [ ] **Step 4: Test the permission check manually**

Start dashboard dev server. Use curl to test:
```bash
# Should return 403 without proper permissions
curl -X POST http://localhost:3000/api/forms/submissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "<test-template-id>", "location_id": "<test-loc>", "response_data": {}}'

# Should succeed with Levelset Admin token
curl -X POST http://localhost:3000/api/forms/submissions \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"template_id": "<test-template-id>", "location_id": "<test-loc>", "response_data": {}}'
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/pages/api/forms/submissions.ts
git commit -m "feat(forms): add permission checks to form submissions endpoint

Route PE_SUBMIT_RATINGS for rating forms and DISC_SUBMIT_INFRACTIONS
for discipline forms. Validates location access for system form types.
Levelset Admin bypasses all checks."
```

---

### Task 2: Create template-by-slug endpoint

**Files:**
- Create: `apps/dashboard/pages/api/forms/template-by-slug.ts`

Mobile needs to fetch the system template for the current org to get `template_id` and `settings.field_mappings`. This is a lightweight GET endpoint.

- [ ] **Step 1: Create the endpoint**

```typescript
// apps/dashboard/pages/api/forms/template-by-slug.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.query;
  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'slug is required' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createServerSupabaseClient();

  // Decode JWT to get user ID
  const parts = token.split('.');
  if (parts.length !== 3) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!payload.sub) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Look up user's org
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id')
    .eq('auth_user_id', payload.sub)
    .order('created_at');

  if (!appUsers || appUsers.length === 0 || !appUsers[0].org_id) {
    return res.status(403).json({ error: 'No organization found' });
  }

  const orgId = appUsers[0].org_id;

  // Fetch template by slug + org
  const { data: template, error } = await supabase
    .from('form_templates')
    .select('id, name, name_es, slug, form_type, schema, ui_schema, settings, is_system')
    .eq('org_id', orgId)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Cache for 5 minutes (templates rarely change)
  res.setHeader('Cache-Control', 'private, s-maxage=300, stale-while-revalidate=600');

  return res.status(200).json(template);
}
```

- [ ] **Step 2: Verify it works**

```bash
curl http://localhost:3000/api/forms/template-by-slug?slug=positional-excellence-rating \
  -H "Authorization: Bearer <token>"
```

Expected: Returns the template with `id`, `settings.field_mappings`, `schema`, etc.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/pages/api/forms/template-by-slug.ts
git commit -m "feat(forms): add template-by-slug endpoint for mobile template fetching"
```

---

### Task 3: Create submission-documents endpoint

**Files:**
- Create: `apps/dashboard/pages/api/forms/submission-documents.ts`

This endpoint accepts file uploads linked to a `form_submission_id`, resolves the `infraction_id` from the submission's metadata, and writes to the existing `infraction_documents` table using the same storage structure.

- [ ] **Step 1: Create the endpoint**

```typescript
// apps/dashboard/pages/api/forms/submission-documents.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { P } from '@/lib/permissions/constants';
import { checkPermission } from '@/lib/permissions/service';
import { validateLocationAccess } from '@/lib/native-auth';

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES_PER_SUBMISSION = 5;

function decodeJwt(token: string): { sub: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (!payload.sub) return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const decoded = decodeJwt(token);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  const supabase = createServerSupabaseClient();

  // Parse multipart form
  const form = new IncomingForm({ maxFileSize: MAX_FILE_SIZE });
  const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });

  const submissionId = Array.isArray(fields.submission_id)
    ? fields.submission_id[0]
    : fields.submission_id;
  const locationId = Array.isArray(fields.location_id)
    ? fields.location_id[0]
    : fields.location_id;

  if (!submissionId || !locationId) {
    return res.status(400).json({ error: 'submission_id and location_id are required' });
  }

  // Look up user's org
  const { data: appUsers } = await supabase
    .from('app_users')
    .select('id, org_id, role')
    .eq('auth_user_id', decoded.sub)
    .order('created_at');

  if (!appUsers || appUsers.length === 0) {
    return res.status(403).json({ error: 'No user profile found' });
  }

  const appUser = appUsers.find((u: any) => u.role === 'Levelset Admin') || appUsers[0];
  const orgId = appUser.org_id;

  if (!orgId) return res.status(403).json({ error: 'No organization found' });

  // Validate location access
  const location = await validateLocationAccess(decoded.sub, orgId, locationId);
  if (!location) return res.status(403).json({ error: 'No access to this location' });

  // Permission check
  const isAdmin = appUser.role === 'Levelset Admin';
  if (!isAdmin) {
    const hasPerm = await checkPermission(supabase, decoded.sub, orgId, P.DISC_SUBMIT_INFRACTIONS);
    if (!hasPerm) return res.status(403).json({ error: 'Permission denied' });
  }

  // Fetch the form submission and get infraction_id from metadata
  const { data: submission, error: subError } = await supabase
    .from('form_submissions')
    .select('id, metadata, org_id')
    .eq('id', submissionId)
    .eq('org_id', orgId)
    .single();

  if (subError || !submission) {
    return res.status(404).json({ error: 'Form submission not found' });
  }

  const infractionId = submission.metadata?.infraction_id;
  if (!infractionId) {
    // Dual-write may not have completed yet or may have failed.
    // Return 409 so the mobile client can retry after a short delay.
    return res.status(409).json({ error: 'Infraction not yet linked — dual-write may still be in progress. Retry shortly.' });
  }

  // Verify infraction exists
  const { data: infraction } = await supabase
    .from('infractions')
    .select('id')
    .eq('id', infractionId)
    .eq('org_id', orgId)
    .single();

  if (!infraction) {
    return res.status(404).json({ error: 'Linked infraction not found' });
  }

  // Check document count limit
  const { count: existingCount } = await supabase
    .from('infraction_documents')
    .select('id', { count: 'exact', head: true })
    .eq('infraction_id', infractionId);

  if ((existingCount ?? 0) >= MAX_FILES_PER_SUBMISSION) {
    return res.status(400).json({ error: 'Maximum document limit reached' });
  }

  // Get the uploaded file
  const fileArray = files.file;
  const uploadedFile = Array.isArray(fileArray) ? fileArray[0] : fileArray;
  if (!uploadedFile) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Validate MIME type
  const mimeType = uploadedFile.mimetype || '';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: `File type not allowed: ${mimeType}` });
  }

  // Upload to Supabase Storage
  const fileName = uploadedFile.originalFilename || 'document';
  const storagePath = `${orgId}/${infractionId}/${Date.now()}_${fileName}`;
  const fileBuffer = fs.readFileSync(uploadedFile.filepath);

  const { error: uploadError } = await supabase.storage
    .from('infraction-documents')
    .upload(storagePath, fileBuffer, { contentType: mimeType });

  if (uploadError) {
    return res.status(500).json({ error: 'Failed to upload file' });
  }

  // Insert document record (same table as existing infraction documents)
  const { data: doc, error: docError } = await supabase
    .from('infraction_documents')
    .insert({
      infraction_id: infractionId,
      org_id: orgId,
      location_id: locationId,
      file_path: storagePath,
      file_name: fileName,
      file_type: mimeType,
      file_size: uploadedFile.size || 0,
      uploaded_by: decoded.sub,
    })
    .select('id, file_name')
    .single();

  if (docError) {
    return res.status(500).json({ error: 'Failed to save document record' });
  }

  return res.status(201).json({ id: doc.id, file_name: doc.file_name });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/submission-documents.ts
git commit -m "feat(forms): add submission-documents endpoint for form-submission-linked file uploads

Resolves infraction_id from form_submission metadata and writes to
existing infraction_documents table. Same storage structure, MIME
validation, and file limits as the native endpoint."
```

---

## Chunk 2: Mobile — Template Fetching and Field Mapping

### Task 4: Create form-mapping helper

**Files:**
- Create: `apps/mobile/src/lib/form-mapping.ts`

This helper takes a template's `settings.field_mappings` and builds `response_data` keyed by field IDs from the mobile form's semantic values.

- [ ] **Step 1: Create the form-mapping module**

```typescript
// apps/mobile/src/lib/form-mapping.ts

/**
 * Form Mapping Utilities
 *
 * Converts mobile form data (semantic keys) into form management
 * response_data (field IDs) using a template's settings.field_mappings.
 */

export interface FieldMappings {
  leader_id?: string;
  employee_id?: string;
  position?: string;
  ratings?: string[];  // Array of 5 field IDs for rating_1..rating_5
  notes?: string;
  infraction_id?: string;
  infraction_date?: string;
  acknowledged?: string;
  team_member_signature?: string;
  leader_signature?: string;
}

export interface SystemTemplate {
  id: string;
  name: string;
  name_es: string | null;
  slug: string;
  form_type: string;
  schema: Record<string, any>;
  ui_schema: Record<string, any>;
  settings: {
    field_mappings: FieldMappings;
  };
  is_system: boolean;
}

/**
 * Build response_data for a rating form submission.
 * Maps semantic rating form values to field IDs from field_mappings.
 */
export function buildRatingResponseData(
  mappings: FieldMappings,
  data: {
    leaderId: string;
    employeeId: string;
    position: string;
    ratings: number[];
    notes: string | null;
  }
): Record<string, any> {
  const responseData: Record<string, any> = {};

  if (mappings.leader_id) {
    responseData[mappings.leader_id] = data.leaderId;
  }
  if (mappings.employee_id) {
    responseData[mappings.employee_id] = data.employeeId;
  }
  if (mappings.position) {
    responseData[mappings.position] = data.position;
  }
  if (mappings.ratings && Array.isArray(mappings.ratings)) {
    for (let i = 0; i < mappings.ratings.length; i++) {
      responseData[mappings.ratings[i]] = data.ratings[i] ?? 0;
    }
  }
  if (mappings.notes && data.notes) {
    responseData[mappings.notes] = data.notes;
  }

  return responseData;
}

/**
 * Build response_data for an infraction form submission.
 * Maps semantic infraction form values to field IDs from field_mappings.
 */
export function buildInfractionResponseData(
  mappings: FieldMappings,
  data: {
    leaderId: string;
    employeeId: string;
    infractionId: string;
    infractionDate: string;
    acknowledged: boolean;
    notes: string | null;
    teamMemberSignature: string | null;
    leaderSignature: string;
  }
): Record<string, any> {
  const responseData: Record<string, any> = {};

  if (mappings.employee_id) {
    responseData[mappings.employee_id] = data.employeeId;
  }
  if (mappings.leader_id) {
    responseData[mappings.leader_id] = data.leaderId;
  }
  if (mappings.infraction_id) {
    responseData[mappings.infraction_id] = data.infractionId;
  }
  if (mappings.infraction_date) {
    responseData[mappings.infraction_date] = data.infractionDate;
  }
  if (mappings.acknowledged) {
    responseData[mappings.acknowledged] = data.acknowledged;
  }
  if (mappings.notes && data.notes) {
    responseData[mappings.notes] = data.notes;
  }
  if (mappings.team_member_signature && data.teamMemberSignature) {
    responseData[mappings.team_member_signature] = data.teamMemberSignature;
  }
  if (mappings.leader_signature) {
    responseData[mappings.leader_signature] = data.leaderSignature;
  }

  return responseData;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/lib/form-mapping.ts
git commit -m "feat(mobile): add form-mapping helper for template field ID resolution"
```

---

### Task 5: Add template fetching and form management submission to api.ts

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

Add a `fetchSystemTemplate()` function, update `submitRatingsAuth()` and `submitInfractionAuth()` to submit via `/api/forms/submissions`, and update `uploadInfractionDocumentAuth()` to use the new submission-documents endpoint.

- [ ] **Step 1: Add the SystemTemplate type import and fetchSystemTemplate function**

Add after the existing imports at the top of the file (after line 6):

```typescript
import {
  buildRatingResponseData,
  buildInfractionResponseData,
  type SystemTemplate,
  type FieldMappings,
} from './form-mapping';
```

Add the template cache and fetch function after the existing cache utilities (after line 865):

```typescript
// =============================================================================
// System Template Cache (longer TTL - templates rarely change)
// =============================================================================

const TEMPLATE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch a system form template by slug for the current user's org.
 * Cached for 10 minutes since templates rarely change.
 */
export async function fetchSystemTemplate(
  accessToken: string,
  slug: string
): Promise<SystemTemplate> {
  const cacheKey = `system-template:${slug}`;
  const cached = getCached<SystemTemplate>(cacheKey);

  // Use a longer TTL for templates
  const entry = cache.get(cacheKey);
  if (cached && entry && Date.now() - entry.timestamp <= TEMPLATE_CACHE_TTL) {
    return cached;
  }

  const url = `${API_BASE_URL}/api/forms/template-by-slug?slug=${encodeURIComponent(slug)}`;
  const response = await fetch(url, { headers: authHeaders(accessToken) });
  const data = await handleResponse<SystemTemplate>(response);
  setCache(cacheKey, data);
  return data;
}
```

- [ ] **Step 2: Add the form management submission response type**

Add near the existing `SubmissionResult` interface (after line 129):

```typescript
export interface FormSubmissionResult {
  id: string;
  org_id: string;
  location_id: string | null;
  template_id: string;
  form_type: string;
  employee_id: string | null;
  response_data: Record<string, any>;
  schema_snapshot: Record<string, any>;
  score: number | null;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
}
```

- [ ] **Step 3: Rewrite submitRatingsAuth to use form management**

Replace the current `submitRatingsAuth` function (lines 321-335):

```typescript
/**
 * Submit positional ratings via form management system (authenticated).
 * Fetches the system template, maps form data to field IDs, and submits
 * to /api/forms/submissions which dual-writes to both form_submissions
 * and the legacy ratings table.
 */
export async function submitRatingsAuth(
  accessToken: string,
  locationId: string,
  data: RatingsSubmission
): Promise<SubmissionResult> {
  // Fetch the system template to get template_id and field_mappings
  const template = await fetchSystemTemplate(accessToken, 'positional-excellence-rating');
  const mappings = template.settings?.field_mappings;

  if (!mappings) {
    throw new ApiError('Rating template is missing field mappings', 500);
  }

  // Build response_data keyed by field IDs
  const responseData = buildRatingResponseData(mappings, {
    leaderId: data.leaderId,
    employeeId: data.employeeId,
    position: data.position,
    ratings: data.ratings,
    notes: data.notes ?? null,
  });

  // Submit to form management endpoint
  const response = await fetch(
    `${API_BASE_URL}/api/forms/submissions`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        template_id: template.id,
        location_id: locationId,
        employee_id: data.employeeId,
        response_data: responseData,
      }),
    }
  );

  const result = await handleResponse<FormSubmissionResult>(response);

  // Map back to SubmissionResult shape expected by form components
  return {
    success: true,
    employeeName: undefined, // Component already has this from local state
  };
}
```

- [ ] **Step 4: Rewrite submitInfractionAuth to use form management**

Replace the current `submitInfractionAuth` function (lines 352-366):

```typescript
/**
 * Submit a discipline infraction via form management system (authenticated).
 * Fetches the system template, maps form data to field IDs, and submits
 * to /api/forms/submissions which dual-writes to both form_submissions
 * and the legacy infractions table.
 */
export async function submitInfractionAuth(
  accessToken: string,
  locationId: string,
  data: InfractionSubmission
): Promise<SubmissionResult> {
  // Fetch the system template to get template_id and field_mappings
  const template = await fetchSystemTemplate(accessToken, 'discipline-infraction');
  const mappings = template.settings?.field_mappings;

  if (!mappings) {
    throw new ApiError('Infraction template is missing field mappings', 500);
  }

  // Build response_data keyed by field IDs
  const responseData = buildInfractionResponseData(mappings, {
    leaderId: data.leaderId,
    employeeId: data.employeeId,
    infractionId: data.infractionId,
    infractionDate: data.infractionDate,
    acknowledged: data.acknowledged,
    notes: data.notes ?? null,
    teamMemberSignature: data.teamMemberSignature ?? null,
    leaderSignature: data.leaderSignature,
  });

  // Submit to form management endpoint
  const response = await fetch(
    `${API_BASE_URL}/api/forms/submissions`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        template_id: template.id,
        location_id: locationId,
        employee_id: data.employeeId,
        response_data: responseData,
      }),
    }
  );

  const result = await handleResponse<FormSubmissionResult>(response);

  // Extract infraction details from metadata for the submission summary
  return {
    success: true,
    infractionId: result.metadata?.infraction_id || undefined,
    // Points and action come from the infraction rubric lookup in the dual-write
  };
}
```

- [ ] **Step 5: Update uploadInfractionDocumentAuth to use submission-documents endpoint**

Replace the current `uploadInfractionDocumentAuth` function (lines 371-397):

```typescript
/**
 * Upload a document attachment for an infraction via form submission.
 * Uses the form-management submission-documents endpoint which resolves
 * the infraction_id from the form submission's metadata.
 */
export async function uploadInfractionDocumentAuth(
  accessToken: string,
  locationId: string,
  submissionOrInfractionId: string,
  file: { uri: string; name: string; type: string },
  options?: { isSubmissionId?: boolean }
): Promise<{ id: string; file_name: string }> {
  const formData = new FormData();
  formData.append('location_id', locationId);
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  // If this is a form submission ID, use the new endpoint
  if (options?.isSubmissionId) {
    formData.append('submission_id', submissionOrInfractionId);
    const response = await fetch(
      `${API_BASE_URL}/api/forms/submission-documents`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );
    return handleResponse<{ id: string; file_name: string }>(response);
  }

  // Fallback: direct infraction_id (backward compatibility)
  formData.append('infraction_id', submissionOrInfractionId);
  const response = await fetch(
    `${API_BASE_URL}/api/native/forms/infraction-documents`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    }
  );
  return handleResponse<{ id: string; file_name: string }>(response);
}
```

- [ ] **Step 6: Add fetchSystemTemplate and FormSubmissionResult to the default export**

Update the default export object (around line 1105) to include:

```typescript
  // Form management API
  fetchSystemTemplate,
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/lib/api.ts
git commit -m "feat(mobile): rewire submission functions to use form management endpoint

submitRatingsAuth and submitInfractionAuth now fetch system templates,
map form data to field IDs via field_mappings, and POST to
/api/forms/submissions. uploadInfractionDocumentAuth supports both
submission-based and direct infraction-based upload paths."
```

---

## Chunk 3: Mobile — Update Form Components

### Task 6: Update PositionalRatingsForm submission flow

**Files:**
- Modify: `apps/mobile/src/components/forms/PositionalRatingsForm.tsx`

The form UI stays identical. The only change is that `submitRatingsAuth` now internally routes through the form management system. Since we rewired `submitRatingsAuth` in Task 5, the form component's `handleSubmit` function already calls the right thing — **no changes needed to the component itself**.

- [ ] **Step 1: Verify the form component doesn't need changes**

Read `PositionalRatingsForm.tsx` lines 286-338. The `handleSubmit` calls `submitRatingsAuth(accessToken, locationId, { leaderId, employeeId, position, ratings, notes })`. This matches the updated function signature exactly.

The `SubmissionResult` return type is still compatible — the component only checks for errors (catch block) and doesn't use specific fields from the result.

- [ ] **Step 2: Test the ratings form end-to-end**

1. Open the mobile app on your phone
2. Navigate to the positional ratings form
3. Fill out leader, employee, position, all 5 ratings, optional notes
4. Submit
5. Verify in Supabase:
   - A new row exists in `form_submissions` with `form_type='rating'`
   - The `response_data` contains field IDs as keys with the correct values
   - The `metadata` contains `rating_id` pointing to a row in the `ratings` table
   - The `ratings` table has the correct `rating_1`..`rating_5`, `employee_id`, `rater_user_id`, `position`

---

### Task 7: Update DisciplineInfractionForm submission flow

**Files:**
- Modify: `apps/mobile/src/components/forms/DisciplineInfractionForm.tsx`

The form UI stays identical. The `submitInfractionAuth` function was already rewired. The only change needed is updating the file upload call to use the submission-based endpoint.

- [ ] **Step 1: Update the file upload to use submission ID**

In `DisciplineInfractionForm.tsx`, find the `handleSubmit` function (line 319). The current flow:
1. Calls `submitInfractionAuth()` → gets `result.infractionId`
2. Uploads files using `uploadInfractionDocumentAuth(accessToken, locationId, result.infractionId, file)`

After the rewire, `submitInfractionAuth` returns `result.infractionId` from `metadata.infraction_id`. However, we also need the `form_submission.id` for the new upload endpoint. Update the `SubmissionResult` type and `submitInfractionAuth` to also return the submission ID.

First, update `SubmissionResult` in `api.ts` to include `submissionId`:

```typescript
export interface SubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
  action?: string;
  points?: number;
  employeeName?: string;
  infractionId?: string;
  submissionId?: string;  // Form management submission ID
}
```

Then update the `submitInfractionAuth` return to include `submissionId`:

```typescript
  return {
    success: true,
    infractionId: result.metadata?.infraction_id || undefined,
    submissionId: result.id,
  };
```

- [ ] **Step 2: Update the file upload calls in the component**

In `DisciplineInfractionForm.tsx`, update the file upload block (lines 340-348):

```typescript
      // Upload attached files if any
      if (result?.submissionId && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            await uploadInfractionDocumentAuth(
              accessToken,
              locationId,
              result.submissionId,
              file,
              { isSubmissionId: true }
            );
          } catch (err) {
            console.warn("[DisciplineInfractionForm] File upload failed:", err);
            // Don't fail the whole submission
          }
        }
      }
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/forms/DisciplineInfractionForm.tsx apps/mobile/src/lib/api.ts
git commit -m "feat(mobile): update infraction form to upload documents via form submission ID

File uploads now go through /api/forms/submission-documents which
resolves the infraction_id from the form submission metadata."
```

- [ ] **Step 4: Test the infraction form end-to-end**

1. Open the mobile app on your phone
2. Navigate to the discipline infraction form
3. Fill out all fields including signatures
4. Attach 1-2 files (photo + PDF)
5. Submit
6. Verify in Supabase:
   - A new row in `form_submissions` with `form_type='discipline'`
   - `response_data` contains field IDs with correct values (including signature base64)
   - `metadata` contains `infraction_id`
   - `infractions` table has the correct row with all fields
   - `infraction_documents` table has the uploaded file(s) linked to the `infraction_id`
   - Storage bucket has the files at `{org_id}/{infraction_id}/{timestamp}_{filename}`

---

## Chunk 4: Verification and Cleanup

### Task 8: Verify system templates are seeded

**Files:**
- Reference: `scripts/seed-form-groups.ts`, `scripts/seed-system-form-templates.ts`

Before testing, ensure the system templates exist for your test organization.

- [ ] **Step 1: Check if templates exist**

```bash
# From repo root
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('form_templates').select('id, name, slug, form_type, is_system, settings').eq('is_system', true).then(({ data }) => console.log(JSON.stringify(data, null, 2)));
"
```

- [ ] **Step 2: If templates are missing, seed them**

```bash
npx tsx scripts/seed-form-groups.ts
npx tsx scripts/seed-system-form-templates.ts
```

- [ ] **Step 3: Verify template slugs match what mobile expects**

The mobile code uses these slugs:
- `positional-excellence-rating` (for ratings)
- `discipline-infraction` (for infractions)

Verify these match the seeded templates. If the slugs differ, update the slug constants in the mobile `submitRatingsAuth` and `submitInfractionAuth` functions accordingly.

---

### Task 9: Full integration test

- [ ] **Step 1: Test rating submission with a non-admin user**

Use a test account that has `PE_SUBMIT_RATINGS` permission but is NOT a Levelset Admin. Submit a rating via the mobile app. Verify:
- Submission succeeds
- `form_submissions` row created
- `ratings` row created (dual-write)
- Both match expected values

- [ ] **Step 2: Test rating submission with a user WITHOUT permission**

Use a test account that does NOT have `PE_SUBMIT_RATINGS`. Attempt to submit. Verify:
- Returns 403 "Permission denied"
- No rows created in either table

- [ ] **Step 3: Test infraction submission with file uploads**

Submit an infraction with 2 file attachments. Verify:
- `form_submissions` row created with `form_type='discipline'`
- `infractions` row created (dual-write)
- `metadata.infraction_id` populated
- Both files in `infraction_documents` linked to the `infraction_id`
- Files accessible in Supabase Storage

- [ ] **Step 4: Verify PWA still works independently**

If you have access to a PWA test environment, submit a rating and infraction through it. Verify the PWA routes are completely unaffected — writes only to legacy tables, no form_submissions involvement.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address integration test findings"
```

---

## Summary of Changes

| Area | What Changes | What Stays the Same |
|------|-------------|-------------------|
| `/api/forms/submissions` | Permission checks added for rating/discipline form types | GET handler, dual-write logic, evaluation scoring |
| `/api/forms/template-by-slug` | New endpoint | N/A |
| `/api/forms/submission-documents` | New endpoint | Writes to existing `infraction_documents` table |
| `apps/mobile/src/lib/api.ts` | `submitRatingsAuth`, `submitInfractionAuth`, `uploadInfractionDocumentAuth` rewired | All data-fetching functions, PWA functions, cache utilities |
| `apps/mobile/src/lib/form-mapping.ts` | New helper | N/A |
| Mobile form components | Infraction file upload uses submission ID | All UI, validation, data loading, user interactions |
| PWA routes (`/api/mobile/[token]/`) | **Nothing** | Everything — these are production-locked |
| Data-fetching endpoints | **Nothing** | `positional-data`, `position-labels`, `infraction-data` |

---

## Important Notes

### Template Re-Seeding Warning

The `seed-system-form-templates.ts` script generates new field IDs on every run (using `Date.now()` + `Math.random()`). If re-seeded, existing field IDs change, which means:
- Any mobile client with a cached template would submit with stale field IDs
- The dual-write would fail silently (fields not found in `response_data`)

**Rule:** Do NOT re-seed system templates in production without coordinating a cache invalidation strategy. If template schema changes are needed, update the existing template's schema/settings in place rather than re-running the seed script.

### File Upload Retry on Dual-Write Timing

The `submission-documents` endpoint returns 409 if `metadata.infraction_id` is not yet populated (dual-write may still be completing). The mobile upload function should handle this gracefully — a short delay and retry (1-2 attempts) is acceptable since the dual-write runs synchronously in the same request. In practice the `infraction_id` will always be present in the response from `/api/forms/submissions` since the dual-write completes before the response is sent. The 409 is a safety net for edge cases.

### Shared `decodeJwt` Utility

The plan duplicates `decodeJwt` in `submission-documents.ts`. During implementation, consider importing from `lib/permissions/middleware.ts` instead — but note it's not currently exported. If refactoring, export it from there. If not, the duplication is acceptable for now.
