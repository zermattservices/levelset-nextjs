# Evaluations Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralized Evaluations page with cadence-based schedule rules, event-triggered certification reviews, and a Settings tab — plus migrate the Reece Howard certification module to use the new system.

**Architecture:** Two independent evaluation sources merge into one page. Cadence-based evaluations are computed from schedule rules + form_submissions history (no pre-generated records). Event-triggered evaluations (from certification state machine) write explicit `evaluation_requests` records. Both surface in a unified "My Evaluations" / "All Evaluations" view. Configuration lives in two places: Settings tab for cadence rules (all orgs), Roster modal for certification rules (Reece Howard only).

**Tech Stack:** Next.js 14 Pages Router, MUI v7 (DataGrid Pro), CSS Modules, Supabase (Postgres), TypeScript (strict: false in dashboard)

**Spec:** `docs/superpowers/specs/2026-03-17-evaluations-page-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|----------------|
| `supabase/migrations/20260317_evaluations_page_tables.sql` | Create 4 new tables + RLS policies |
| `supabase/migrations/20260317_seed_evaluations_permissions.sql` | Seed permission module + sub-items |
| `apps/dashboard/pages/evaluations.tsx` | Thin page wrapper |
| `apps/dashboard/components/pages/EvaluationsPage.tsx` | Main page component (tabs, data fetching) |
| `apps/dashboard/components/pages/EvaluationsPage.module.css` | Page styles |
| `apps/dashboard/components/evaluations/MyEvaluationsTable.tsx` | "My Evaluations" DataGrid |
| `apps/dashboard/components/evaluations/AllEvaluationsTable.tsx` | "All Evaluations" DataGrid (manage perm) |
| `apps/dashboard/components/evaluations/EvaluationScoreSummary.tsx` | Inline score summary for completed evals |
| `apps/dashboard/components/evaluations/EvaluationSubmissionModal.tsx` | Full submission detail modal |
| `apps/dashboard/components/evaluations/ScheduleRulesList.tsx` | Settings tab: rules list |
| `apps/dashboard/components/evaluations/ScheduleRuleDialog.tsx` | Create/edit rule dialog |
| `apps/dashboard/components/evaluations/OverrideMenu.tsx` | Row action menu for skip/defer |
| `apps/dashboard/components/evaluations/CertificationRulesModal.tsx` | Roster modal for cert eval rules |
| `apps/dashboard/lib/evaluations/compute-status.ts` | Status computation logic (cadence-based) |
| `apps/dashboard/lib/evaluations/types.ts` | TypeScript interfaces |
| `apps/dashboard/pages/api/evaluations/status.ts` | Computed status API endpoint |
| `apps/dashboard/pages/api/evaluations/schedule-rules.ts` | Schedule rules CRUD |
| `apps/dashboard/pages/api/evaluations/overrides.ts` | Override create/delete |
| `apps/dashboard/pages/api/evaluations/requests.ts` | Event-triggered requests CRUD |
| `apps/dashboard/pages/api/evaluations/certification-rules.ts` | Certification rules CRUD |
| `apps/dashboard/pages/api/evaluations/submission-score.ts` | Score summary for a submission |

### Modified Files

| File | Change |
|------|--------|
| `apps/dashboard/lib/permissions/constants.ts` | Add EVALUATIONS module + 3 permission keys |
| `apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsx:81-86` | Enable Evaluations nav item with href + permission |
| `apps/dashboard/components/CodeComponents/RosterTable.tsx:125-153` | Remove Evaluations/PIP tabs, add cert rules modal trigger |
| `apps/dashboard/lib/evaluate-certifications.ts` | Write to `evaluation_requests` instead of `evaluations`, use `certification_evaluation_rules` for role lookup |
| `apps/dashboard/locales/en/common.json` | Add evaluation UI strings |
| `apps/dashboard/locales/es/common.json` | Add evaluation UI strings (Spanish) |

---

## Task 1: Database Tables & Permissions

### Task 1a: Create New Tables

**Files:**
- Create: `supabase/migrations/20260317_evaluations_page_tables.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Evaluation Schedule Rules (cadence-based, org-wide)
CREATE TABLE IF NOT EXISTS evaluation_schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  target_role_ids UUID[] NOT NULL DEFAULT '{}',
  reviewer_role_ids UUID[] NOT NULL DEFAULT '{}',
  cadence TEXT NOT NULL CHECK (cadence IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_schedule_rules_org ON evaluation_schedule_rules(org_id);

ALTER TABLE evaluation_schedule_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org rules" ON evaluation_schedule_rules
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on eval_schedule_rules" ON evaluation_schedule_rules
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Evaluation Schedule Overrides (per-employee exceptions)
CREATE TABLE IF NOT EXISTS evaluation_schedule_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES evaluation_schedule_rules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (override_type IN ('skip', 'defer', 'include')),
  period_start DATE NOT NULL,
  defer_until DATE,
  reason TEXT,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_overrides_rule ON evaluation_schedule_overrides(rule_id);
CREATE INDEX idx_eval_overrides_employee ON evaluation_schedule_overrides(employee_id);
CREATE UNIQUE INDEX idx_eval_overrides_unique ON evaluation_schedule_overrides(rule_id, employee_id, period_start);

ALTER TABLE evaluation_schedule_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org overrides" ON evaluation_schedule_overrides
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on eval_overrides" ON evaluation_schedule_overrides
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Evaluation Requests (event-triggered)
CREATE TABLE IF NOT EXISTS evaluation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  trigger_source TEXT NOT NULL CHECK (trigger_source IN ('certification_pending', 'certification_pip', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_submission_id UUID REFERENCES form_submissions(id),
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_eval_requests_org ON evaluation_requests(org_id);
CREATE INDEX idx_eval_requests_employee ON evaluation_requests(employee_id);
CREATE INDEX idx_eval_requests_status ON evaluation_requests(status);

ALTER TABLE evaluation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org requests" ON evaluation_requests
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on eval_requests" ON evaluation_requests
  FOR ALL USING (current_setting('role', true) = 'service_role');

-- Certification Evaluation Rules (Reece Howard specific)
CREATE TABLE IF NOT EXISTS certification_evaluation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  form_template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,
  target_role_ids UUID[] NOT NULL DEFAULT '{}',
  reviewer_role_ids UUID[] NOT NULL DEFAULT '{}',
  trigger_on TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cert_eval_rules_org ON certification_evaluation_rules(org_id);
CREATE INDEX idx_cert_eval_rules_location ON certification_evaluation_rules(location_id);

-- Performance index for evaluation status computation queries
CREATE INDEX idx_form_submissions_eval_lookup
ON form_submissions(org_id, template_id, employee_id, created_at DESC);

ALTER TABLE certification_evaluation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own org cert rules" ON certification_evaluation_rules
  FOR SELECT USING (org_id::text = (current_setting('request.jwt.claims', true)::json->>'org_id'));
CREATE POLICY "Service role full access on cert_eval_rules" ON certification_evaluation_rules
  FOR ALL USING (current_setting('role', true) = 'service_role');
```

- [ ] **Step 2: Apply the migration**

Run: `npx supabase db push` or apply via Supabase dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260317_evaluations_page_tables.sql
git commit -m "feat(evaluations): create evaluation_schedule_rules, overrides, requests, and certification_evaluation_rules tables"
```

### Task 1b: Seed Permissions

**Files:**
- Create: `supabase/migrations/20260317_seed_evaluations_permissions.sql`
- Modify: `apps/dashboard/lib/permissions/constants.ts`

- [ ] **Step 1: Add permission constants to `constants.ts`**

Add `EVALUATIONS` to `PERMISSION_MODULES` (after `AI_ASSISTANT` on line 22):

```typescript
EVALUATIONS: 'evaluations',
```

Add evaluation permission keys to `P` (after `AI_USE` on line 117):

```typescript
// Evaluations
EVAL_VIEW_EVALUATIONS: 'evaluations.view_evaluations',
EVAL_MANAGE_EVALUATIONS: 'evaluations.manage_evaluations',
EVAL_CONDUCT_EVALUATIONS: 'evaluations.conduct_evaluations',
```

Add module metadata to `MODULE_METADATA` (after AI_ASSISTANT entry around line 208):

```typescript
[PERMISSION_MODULES.EVALUATIONS]: {
  name: 'Evaluations',
  description: 'Performance evaluation scheduling and management',
  order: 16,
},
```

Add sub-item metadata to `SUB_ITEM_METADATA` (at the end, before the closing `}`):

```typescript
// Evaluations
[P.EVAL_VIEW_EVALUATIONS]: {
  name: 'View Evaluations',
  description: 'Access the evaluations page and view evaluations assigned to you',
  order: 1,
  module: PERMISSION_MODULES.EVALUATIONS,
},
[P.EVAL_MANAGE_EVALUATIONS]: {
  name: 'Manage Evaluations',
  description: 'View all evaluations across the organization, configure schedule rules, and manage overrides',
  order: 2,
  module: PERMISSION_MODULES.EVALUATIONS,
  dependsOn: P.EVAL_VIEW_EVALUATIONS,
},
[P.EVAL_CONDUCT_EVALUATIONS]: {
  name: 'Conduct Evaluations',
  description: 'Start and submit evaluation reviews for employees',
  order: 3,
  module: PERMISSION_MODULES.EVALUATIONS,
  dependsOn: P.EVAL_VIEW_EVALUATIONS,
},
```

- [ ] **Step 2: Write the seed migration**

```sql
-- Seed evaluations permission module and sub-items into existing profiles
DO $$
DECLARE
  v_module_id UUID;
  v_sub_view_id UUID;
  v_sub_manage_id UUID;
  v_sub_conduct_id UUID;
  v_profile RECORD;
BEGIN
  -- Insert module
  INSERT INTO permission_modules (key, name, description, display_order)
  VALUES ('evaluations', 'Evaluations', 'Performance evaluation scheduling and management', 16)
  ON CONFLICT (key) DO NOTHING
  RETURNING id INTO v_module_id;

  IF v_module_id IS NULL THEN
    SELECT id INTO v_module_id FROM permission_modules WHERE key = 'evaluations';
  END IF;

  -- Insert sub-items
  INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
  VALUES (v_module_id, 'view_evaluations', 'View Evaluations', 'Access the evaluations page and view evaluations assigned to you', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_view_id;
  IF v_sub_view_id IS NULL THEN
    SELECT id INTO v_sub_view_id FROM permission_sub_items WHERE module_id = v_module_id AND key = 'view_evaluations';
  END IF;

  INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
  VALUES (v_module_id, 'manage_evaluations', 'Manage Evaluations', 'View all evaluations, configure schedule rules, and manage overrides', 2)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_manage_id;
  IF v_sub_manage_id IS NULL THEN
    SELECT id INTO v_sub_manage_id FROM permission_sub_items WHERE module_id = v_module_id AND key = 'manage_evaluations';
  END IF;

  INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
  VALUES (v_module_id, 'conduct_evaluations', 'Conduct Evaluations', 'Start and submit evaluation reviews for employees', 3)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_sub_conduct_id;
  IF v_sub_conduct_id IS NULL THEN
    SELECT id INTO v_sub_conduct_id FROM permission_sub_items WHERE module_id = v_module_id AND key = 'conduct_evaluations';
  END IF;

  -- Grant all 3 permissions to system-default profiles at levels 0, 1, 2
  FOR v_profile IN
    SELECT id FROM permission_profiles
    WHERE is_system_default = true AND hierarchy_level IN (0, 1, 2)
  LOOP
    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_view_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;

    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_manage_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;

    INSERT INTO permission_profile_access (profile_id, sub_item_id, is_enabled)
    VALUES (v_profile.id, v_sub_conduct_id, true)
    ON CONFLICT (profile_id, sub_item_id) DO UPDATE SET is_enabled = true;
  END LOOP;
END $$;
```

- [ ] **Step 3: Apply the seed migration**

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260317_seed_evaluations_permissions.sql apps/dashboard/lib/permissions/constants.ts
git commit -m "feat(evaluations): add evaluations permission module with view, manage, and conduct permissions"
```

---

## Task 2: TypeScript Types & Status Computation

### Task 2a: Types

**Files:**
- Create: `apps/dashboard/lib/evaluations/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
export type EvaluationCadence = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
export type EvaluationSource = 'scheduled' | 'certification_pending' | 'certification_pip' | 'manual';
export type EvaluationStatus = 'due' | 'overdue' | 'completed' | 'not_yet_due' | 'skipped';
export type OverrideType = 'skip' | 'defer' | 'include';
export type RequestStatus = 'pending' | 'completed' | 'cancelled';

export interface ScheduleRule {
  id: string;
  org_id: string;
  form_template_id: string;
  target_role_ids: string[];
  reviewer_role_ids: string[];
  cadence: EvaluationCadence;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  form_template?: {
    id: string;
    name: string;
    name_es: string;
    is_active: boolean;
  };
}

export interface ScheduleOverride {
  id: string;
  org_id: string;
  rule_id: string;
  employee_id: string;
  override_type: OverrideType;
  period_start: string;
  defer_until: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EvaluationRequest {
  id: string;
  org_id: string;
  location_id: string;
  employee_id: string;
  form_template_id: string;
  trigger_source: EvaluationSource;
  status: RequestStatus;
  triggered_at: string;
  completed_submission_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificationEvaluationRule {
  id: string;
  org_id: string;
  location_id: string;
  form_template_id: string;
  target_role_ids: string[];
  reviewer_role_ids: string[];
  trigger_on: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  form_template?: {
    id: string;
    name: string;
    name_es: string;
    is_active: boolean;
  };
}

export interface EvaluationScoreSummary {
  overall_percentage: number;
  sections: { name: string; percentage: number }[];
}

export interface EvaluationItem {
  id: string;
  source: EvaluationSource;
  employee: {
    id: string;
    full_name: string;
    role: string;
    location_id: string;
  };
  evaluation: {
    template_id: string;
    name: string;
  };
  status: EvaluationStatus;
  last_completed_at: string | null;
  last_submission_id: string | null;
  score: EvaluationScoreSummary | null;
  due_date: string;
  can_conduct: boolean;
  // For overrides (cadence-based only)
  rule_id?: string;
  period_start?: string;
  // For event-triggered only
  request_id?: string;
}

export interface CadencePeriod {
  start: Date;
  end: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/lib/evaluations/types.ts
git commit -m "feat(evaluations): add TypeScript types for evaluation system"
```

### Task 2b: Status Computation Logic

**Files:**
- Create: `apps/dashboard/lib/evaluations/compute-status.ts`

- [ ] **Step 1: Write the compute-status module**

This module computes cadence period boundaries and evaluation status. It does NOT query the database — it operates on pre-fetched data.

```typescript
import type { EvaluationCadence, EvaluationStatus, CadencePeriod } from './types';

/**
 * Get the current cadence period boundaries for a given cadence type.
 * All periods are calendar-aligned.
 */
export function getCurrentPeriod(cadence: EvaluationCadence, referenceDate?: Date): CadencePeriod {
  const now = referenceDate ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (cadence) {
    case 'monthly':
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    case 'quarterly': {
      const qStart = Math.floor(month / 3) * 3;
      return {
        start: new Date(year, qStart, 1),
        end: new Date(year, qStart + 3, 0, 23, 59, 59, 999),
      };
    }
    case 'semi_annual': {
      const hStart = month < 6 ? 0 : 6;
      return {
        start: new Date(year, hStart, 1),
        end: new Date(year, hStart + 6, 0, 23, 59, 59, 999),
      };
    }
    case 'annual':
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
  }
}

/**
 * Get the period start date as ISO string for use in overrides.
 */
export function getPeriodStartISO(cadence: EvaluationCadence, referenceDate?: Date): string {
  const period = getCurrentPeriod(cadence, referenceDate);
  return period.start.toISOString().split('T')[0];
}

/**
 * Derive evaluation status from last submission date, cadence, overrides, and current date.
 *
 * Status logic:
 * - 'skipped': override_type is 'skip' for this period
 * - 'not_yet_due': override_type is 'defer' and defer_until is in the future, OR
 *                  the employee was already evaluated this period (completed)
 * - 'completed': submission exists within current period
 * - 'overdue': no submission and past the period end date
 * - 'due': no submission, currently within the active period
 */
export function computeStatus(
  cadence: EvaluationCadence,
  lastSubmissionAt: string | null,
  overrideType: string | null,
  deferUntil: string | null,
  now?: Date
): EvaluationStatus {
  if (overrideType === 'skip') return 'skipped';

  const currentDate = now ?? new Date();

  // Defer: if defer_until is in the future, the evaluation is not yet due
  if (overrideType === 'defer' && deferUntil) {
    const deferDate = new Date(deferUntil);
    if (currentDate < deferDate) return 'not_yet_due';
    // Past the defer date — fall through to normal due/overdue logic
  }

  const period = getCurrentPeriod(cadence, currentDate);

  if (lastSubmissionAt) {
    const submissionDate = new Date(lastSubmissionAt);
    if (submissionDate >= period.start && submissionDate <= period.end) {
      return 'completed';
    }
  }

  // Period is active — check if we're past the end
  if (currentDate > period.end) {
    return 'overdue';
  }

  // We're within the current period with no submission
  return 'due';
}

/**
 * Get a human-readable due date for display.
 * For cadence-based: end of the current period.
 * For event-triggered: the triggered_at date.
 */
export function getDueDate(cadence: EvaluationCadence, referenceDate?: Date): string {
  const period = getCurrentPeriod(cadence, referenceDate);
  return period.end.toISOString().split('T')[0];
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/lib/evaluations/compute-status.ts
git commit -m "feat(evaluations): add cadence period computation and status derivation logic"
```

---

## Task 3: API Routes

### Task 3a: Status Endpoint

**Files:**
- Create: `apps/dashboard/pages/api/evaluations/status.ts`

**Reference:** See `apps/dashboard/pages/api/forms/submissions.ts` for the API route pattern using `withPermissionAndContext`.

- [ ] **Step 1: Write the status API**

This is the core endpoint. It returns the merged list of cadence-based + event-triggered evaluation items.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { checkPermission } from '@/lib/permissions/service';
import { P } from '@/lib/permissions/constants';
import { computeStatus, getDueDate, getPeriodStartISO } from '@/lib/evaluations/compute-status';
import { calculateEvaluationScore } from '@/lib/forms/scoring';
import { jsonSchemaToFields } from '@/lib/forms/schema-builder';
import type { EvaluationItem, EvaluationCadence } from '@/lib/evaluations/types';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;
  const locationId = req.query.location_id as string | undefined;

  const canManage = context.isAdmin || await checkPermission(supabase, userId, orgId, P.EVAL_MANAGE_EVALUATIONS);

  // 1. Fetch the current user's role(s) for reviewer matching
  const { data: currentUser } = await supabase
    .from('app_users')
    .select('id, employee_id')
    .eq('id', userId)
    .single();

  let userRoleIds: string[] = [];
  if (currentUser?.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('role')
      .eq('id', currentUser.employee_id)
      .single();

    if (emp?.role) {
      const { data: roleRows } = await supabase
        .from('org_roles')
        .select('id')
        .eq('org_id', orgId)
        .eq('role_name', emp.role);
      userRoleIds = (roleRows ?? []).map((r: any) => r.id);
    }
  }

  // 2. Fetch active schedule rules with form template names (left join so deactivated templates still show)
  const { data: rules } = await supabase
    .from('evaluation_schedule_rules')
    .select('*, form_templates(id, name, name_es, is_active)')
    .eq('org_id', orgId)
    .eq('is_active', true);

  // 3. Fetch all active employees with their roles
  let employeeQuery = supabase
    .from('employees')
    .select('id, full_name, role, location_id, org_id')
    .eq('org_id', orgId)
    .eq('active', true);

  if (locationId) {
    employeeQuery = employeeQuery.eq('location_id', locationId);
  }
  const { data: employees } = await employeeQuery;

  // 4. Resolve role IDs to role names for matching
  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('id, role_name')
    .eq('org_id', orgId);

  const roleIdToName = new Map((orgRoles ?? []).map((r: any) => [r.id, r.role_name]));

  // 5. Batch-fetch overrides and submissions to avoid N+1 queries
  const ruleIds = (rules ?? []).map((r: any) => r.id);
  const allEmployeeIds = (employees ?? []).map((e: any) => e.id);

  // Fetch ALL overrides for active rules in one query
  const { data: allOverrides } = await supabase
    .from('evaluation_schedule_overrides')
    .select('rule_id, employee_id, override_type, defer_until, period_start')
    .in('rule_id', ruleIds.length > 0 ? ruleIds : ['__none__']);

  // Key: "ruleId_employeeId_periodStart" → override
  const allOverridesMap = new Map(
    (allOverrides ?? []).map((o: any) => [`${o.rule_id}_${o.employee_id}_${o.period_start}`, o])
  );

  // Fetch ALL latest submissions for all employees + templates in one query
  const templateIds = (rules ?? []).map((r: any) => r.form_template_id);
  const { data: allSubmissions } = await supabase
    .from('form_submissions')
    .select('employee_id, template_id, created_at, id, score')
    .eq('org_id', orgId)
    .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['__none__'])
    .in('template_id', templateIds.length > 0 ? templateIds : ['__none__'])
    .order('created_at', { ascending: false });

  // Key: "employeeId_templateId" → most recent submission
  const latestSubmissionMap = new Map<string, any>();
  for (const sub of (allSubmissions ?? [])) {
    const key = `${sub.employee_id}_${sub.template_id}`;
    if (!latestSubmissionMap.has(key)) {
      latestSubmissionMap.set(key, sub);
    }
  }

  // 6. For each rule, find matching employees and compute status
  const items: EvaluationItem[] = [];

  for (const rule of (rules ?? [])) {
    const targetRoleNames = (rule.target_role_ids ?? [])
      .map((id: string) => roleIdToName.get(id))
      .filter(Boolean);

    const matchingEmployees = (employees ?? []).filter(
      (e: any) => targetRoleNames.includes(e.role)
    );

    const canConduct = context.isAdmin || (rule.reviewer_role_ids ?? []).some(
      (id: string) => userRoleIds.includes(id)
    );

    // Skip if user can't manage and can't conduct
    if (!canManage && !canConduct) continue;

    const periodStart = getPeriodStartISO(rule.cadence as EvaluationCadence);

    for (const emp of matchingEmployees) {
      const overrideKey = `${rule.id}_${emp.id}_${periodStart}`;
      const override = allOverridesMap.get(overrideKey);
      const subKey = `${emp.id}_${rule.form_template_id}`;
      const latest = latestSubmissionMap.get(subKey);
      const status = computeStatus(
        rule.cadence as EvaluationCadence,
        latest?.created_at ?? null,
        override?.override_type ?? null,
        override?.defer_until ?? null
      );

      items.push({
        id: `${rule.id}_${emp.id}`,
        source: 'scheduled',
        employee: {
          id: emp.id,
          full_name: emp.full_name,
          role: emp.role,
          location_id: emp.location_id,
        },
        evaluation: {
          template_id: rule.form_template_id,
          name: rule.form_templates?.name ?? '',
        },
        status,
        last_completed_at: latest?.created_at ?? null,
        last_submission_id: latest?.id ?? null,
        score: latest?.score != null ? { overall_percentage: Number(latest.score), sections: [] } : null,
        due_date: getDueDate(rule.cadence as EvaluationCadence),
        can_conduct: canConduct,
        rule_id: rule.id,
        period_start: periodStart,
      });
    }
  }

  // 7. Fetch event-triggered evaluation requests (pending only + recently completed within 30 days)
  let requestQuery = supabase
    .from('evaluation_requests')
    .select('*, form_templates(id, name, name_es)')
    .eq('org_id', orgId);

  if (locationId) {
    requestQuery = requestQuery.eq('location_id', locationId);
  }

  // Only include pending requests and recently completed/cancelled ones
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  requestQuery = requestQuery.or(`status.eq.pending,and(status.neq.pending,updated_at.gte.${thirtyDaysAgo})`);

  const { data: requests } = await requestQuery;

  // Fetch certification rules for reviewer matching
  const { data: certRules } = await supabase
    .from('certification_evaluation_rules')
    .select('form_template_id, reviewer_role_ids')
    .eq('org_id', orgId)
    .eq('is_active', true);

  const certReviewerMap = new Map(
    (certRules ?? []).map((r: any) => [r.form_template_id, r.reviewer_role_ids ?? []])
  );

  for (const request of (requests ?? [])) {
    const reviewerRoleIds = certReviewerMap.get(request.form_template_id) ?? [];
    const canConduct = context.isAdmin || reviewerRoleIds.some(
      (id: string) => userRoleIds.includes(id)
    );

    if (!canManage && !canConduct) continue;

    // Fetch employee info
    const emp = (employees ?? []).find((e: any) => e.id === request.employee_id);
    if (!emp) continue;

    const status = request.status === 'completed' ? 'completed' as const
      : request.status === 'cancelled' ? 'skipped' as const
      : 'due' as const;

    items.push({
      id: request.id,
      source: request.trigger_source,
      employee: {
        id: emp.id,
        full_name: emp.full_name,
        role: emp.role,
        location_id: emp.location_id,
      },
      evaluation: {
        template_id: request.form_template_id,
        name: request.form_templates?.name ?? '',
      },
      status,
      last_completed_at: request.status === 'completed' ? request.updated_at : null,
      last_submission_id: request.completed_submission_id,
      score: null,
      due_date: request.triggered_at,
      can_conduct: canConduct,
      request_id: request.id,
    });
  }

  // 7. Sort: overdue first, then due, then pending, then not_yet_due, then completed
  const statusOrder: Record<string, number> = {
    overdue: 0, due: 1, not_yet_due: 2, completed: 3, skipped: 4,
  };
  items.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));

  return res.status(200).json({ items, canManage });
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/evaluations/status.ts
git commit -m "feat(evaluations): add /api/evaluations/status endpoint with computed cadence + event-triggered items"
```

### Task 3b: Schedule Rules CRUD

**Files:**
- Create: `apps/dashboard/pages/api/evaluations/schedule-rules.ts`

- [ ] **Step 1: Write the schedule rules API**

Supports GET (list), POST (create), PATCH (update), DELETE. All gated by `EVAL_MANAGE`.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('evaluation_schedule_rules')
      .select('*, form_templates!inner(id, name, name_es, is_active)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rules: data ?? [] });
  }

  if (req.method === 'POST') {
    const { form_template_id, target_role_ids, reviewer_role_ids, cadence } = req.body;
    if (!form_template_id || !target_role_ids?.length || !reviewer_role_ids?.length || !cadence) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('evaluation_schedule_rules')
      .insert({
        org_id: orgId,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        cadence,
        created_by: userId,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ rule: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing rule id' });

    // Only allow updating specific fields
    const allowed = ['target_role_ids', 'reviewer_role_ids', 'cadence', 'is_active', 'form_template_id'];
    const filtered: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('evaluation_schedule_rules')
      .update(filtered)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rule: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing rule id' });

    const { error } = await supabase
      .from('evaluation_schedule_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_MANAGE_EVALUATIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/evaluations/schedule-rules.ts
git commit -m "feat(evaluations): add /api/evaluations/schedule-rules CRUD endpoint"
```

### Task 3c: Overrides Endpoint

**Files:**
- Create: `apps/dashboard/pages/api/evaluations/overrides.ts`

- [ ] **Step 1: Write the overrides API**

POST (create override), DELETE (remove override). Gated by `EVAL_MANAGE`.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'POST') {
    const { rule_id, employee_id, override_type, period_start, defer_until, reason } = req.body;
    if (!rule_id || !employee_id || !override_type || !period_start) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('evaluation_schedule_overrides')
      .upsert({
        org_id: orgId,
        rule_id,
        employee_id,
        override_type,
        period_start,
        defer_until: defer_until ?? null,
        reason: reason ?? null,
        created_by: userId,
      }, { onConflict: 'rule_id,employee_id,period_start' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ override: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing override id' });

    const { error } = await supabase
      .from('evaluation_schedule_overrides')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_MANAGE_EVALUATIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/evaluations/overrides.ts
git commit -m "feat(evaluations): add /api/evaluations/overrides create/delete endpoint"
```

### Task 3d: Evaluation Requests Endpoint

**Files:**
- Create: `apps/dashboard/pages/api/evaluations/requests.ts`

- [ ] **Step 1: Write the requests API**

GET (list pending), PATCH (update status). GET gated by `EVAL_VIEW`, PATCH by `EVAL_CONDUCT`.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { checkPermission } from '@/lib/permissions/service';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const supabase = createServerSupabaseClient();
  const { orgId, userId } = context;

  if (req.method === 'GET') {
    const { status, location_id } = req.query;
    let query = supabase
      .from('evaluation_requests')
      .select('*, form_templates!inner(id, name, name_es)')
      .eq('org_id', orgId)
      .order('triggered_at', { ascending: false });

    if (status) query = query.eq('status', status as string);
    if (location_id) query = query.eq('location_id', location_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ requests: data ?? [] });
  }

  if (req.method === 'PATCH') {
    const canConduct = context.isAdmin || await checkPermission(supabase, userId, orgId, P.EVAL_CONDUCT_EVALUATIONS);
    if (!canConduct) return res.status(403).json({ error: 'Permission denied' });

    const { id, status, completed_submission_id } = req.body;
    if (!id || !status) return res.status(400).json({ error: 'Missing required fields' });

    const { data, error } = await supabase
      .from('evaluation_requests')
      .update({
        status,
        completed_submission_id: completed_submission_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ request: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/evaluations/requests.ts
git commit -m "feat(evaluations): add /api/evaluations/requests GET/PATCH endpoint"
```

### Task 3e: Certification Rules Endpoint

**Files:**
- Create: `apps/dashboard/pages/api/evaluations/certification-rules.ts`

- [ ] **Step 1: Write the certification rules API**

Full CRUD, gated by `EVAL_MANAGE`. Used by the Roster modal.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  const supabase = createServerSupabaseClient();
  const { orgId } = context;

  if (req.method === 'GET') {
    const { location_id } = req.query;
    let query = supabase
      .from('certification_evaluation_rules')
      .select('*, form_templates!inner(id, name, name_es, is_active)')
      .eq('org_id', orgId);

    if (location_id) query = query.eq('location_id', location_id as string);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rules: data ?? [] });
  }

  if (req.method === 'POST') {
    const { location_id, form_template_id, target_role_ids, reviewer_role_ids, trigger_on } = req.body;
    if (!location_id || !form_template_id || !target_role_ids?.length || !reviewer_role_ids?.length || !trigger_on?.length) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('certification_evaluation_rules')
      .insert({
        org_id: orgId,
        location_id,
        form_template_id,
        target_role_ids,
        reviewer_role_ids,
        trigger_on,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ rule: data });
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing rule id' });

    const allowed = ['form_template_id', 'target_role_ids', 'reviewer_role_ids', 'trigger_on', 'is_active'];
    const filtered: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowed) {
      if (updates[key] !== undefined) filtered[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('certification_evaluation_rules')
      .update(filtered)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rule: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing rule id' });

    const { error } = await supabase
      .from('certification_evaluation_rules')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withPermissionAndContext(P.EVAL_MANAGE_EVALUATIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/evaluations/certification-rules.ts
git commit -m "feat(evaluations): add /api/evaluations/certification-rules CRUD endpoint"
```

### Task 3f: Submission Score Endpoint

**Files:**
- Create: `apps/dashboard/pages/api/evaluations/submission-score.ts`

- [ ] **Step 1: Write the submission score API**

Returns scoring breakdown for a completed evaluation submission.

```typescript
import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, type AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { calculateEvaluationScore } from '@/lib/forms/scoring';
import { jsonSchemaToFields } from '@/lib/forms/schema-builder';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string; isAdmin?: boolean }
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { orgId } = context;
  const submissionId = req.query.submission_id as string;

  if (!submissionId) return res.status(400).json({ error: 'Missing submission_id' });

  const { data: submission, error } = await supabase
    .from('form_submissions')
    .select('*, form_templates!inner(id, name, schema, settings)')
    .eq('id', submissionId)
    .eq('org_id', orgId)
    .single();

  if (error || !submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  // Calculate score from schema + response data
  const fields = jsonSchemaToFields(submission.form_templates.schema);
  const score = calculateEvaluationScore(fields, submission.response_data);

  return res.status(200).json({
    score: {
      overall_percentage: score.overallPercentage,
      total_earned: score.totalEarned,
      total_max: score.totalMax,
      sections: score.sections.map((s: any) => ({
        name: s.sectionName,
        percentage: s.percentage,
        earned: s.earnedPoints,
        max: s.maxPoints,
      })),
    },
    submission_id: submissionId,
    employee_id: submission.employee_id,
    submitted_by: submission.submitted_by,
    created_at: submission.created_at,
  });
}

export default withPermissionAndContext(P.EVAL_VIEW_EVALUATIONS, handler);
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/evaluations/submission-score.ts
git commit -m "feat(evaluations): add /api/evaluations/submission-score endpoint"
```

---

## Task 4: Evaluations Page UI

### Task 4a: Page Wrapper & Main Component Shell

**Files:**
- Create: `apps/dashboard/pages/evaluations.tsx`
- Create: `apps/dashboard/components/pages/EvaluationsPage.tsx`
- Create: `apps/dashboard/components/pages/EvaluationsPage.module.css`

- [ ] **Step 1: Create the thin page wrapper**

Follow the pattern from `apps/dashboard/pages/form-management.tsx`:

```typescript
import * as React from 'react';
import { EvaluationsPage } from '@/components/pages/EvaluationsPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function EvaluationsPageWrapper() {
  return (
    <AppProviders>
      <EvaluationsPage />
    </AppProviders>
  );
}
export default EvaluationsPageWrapper;
```

- [ ] **Step 2: Create the CSS module**

Follow the pattern from `apps/dashboard/components/pages/FormManagementPage.module.css`:

```css
.root {
  min-height: 100vh;
  background: var(--ls-color-bg-page);
}

.contentWrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px;
}

.contentInner {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pageHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pageTitle {
  font-family: "Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 24px;
  font-weight: 700;
  color: var(--ls-color-text-primary);
  margin: 0;
}

.tabsContainer {
  border-bottom: 1px solid var(--ls-color-border);
}

.tabContent {
  padding-top: 24px;
}

.sectionTitle {
  font-family: "Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--ls-color-text-primary);
  margin: 0 0 16px 0;
}

.sectionsWrapper {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.loadingState {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 64px 0;
}

.emptyState {
  text-align: center;
  padding: 48px 24px;
  color: var(--ls-color-muted);
  font-family: "Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
}
```

- [ ] **Step 3: Create the main page component shell**

Follow `FormManagementPage.tsx` pattern. This component handles tabs, data fetching, and permission gating.

```typescript
import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Tab, Tabs, CircularProgress } from '@mui/material';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/lib/providers/LocationProvider';
import { usePermissions } from '@/lib/providers/PermissionsProvider';
import { P } from '@/lib/permissions/constants';
import { MyEvaluationsTable } from '@/components/evaluations/MyEvaluationsTable';
import { AllEvaluationsTable } from '@/components/evaluations/AllEvaluationsTable';
import { ScheduleRulesList } from '@/components/evaluations/ScheduleRulesList';
import type { EvaluationItem } from '@/lib/evaluations/types';
import styles from './EvaluationsPage.module.css';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

export function EvaluationsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationOrgId, selectedLocationId } = useLocationContext();
  const { has, loading: permissionsLoading } = usePermissions();

  const [activeTab, setActiveTab] = React.useState(0);
  const [items, setItems] = React.useState<EvaluationItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [canManage, setCanManage] = React.useState(false);

  const orgId = selectedLocationOrgId;

  // Redirect if not authed
  React.useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.push('/login');
    }
  }, [auth.loading, auth.user, router]);

  const canView = auth.role === 'Levelset Admin' || has(P.EVAL_VIEW_EVALUATIONS);
  const hasManage = auth.role === 'Levelset Admin' || has(P.EVAL_MANAGE_EVALUATIONS);

  const fetchStatus = React.useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ org_id: orgId });
      if (selectedLocationId) params.set('location_id', selectedLocationId);

      const res = await fetch(`/api/evaluations/status?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setCanManage(data.canManage ?? false);
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedLocationId]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (auth.loading || permissionsLoading) {
    return (
      <div className={styles.root}>
        <MenuNavigation />
        <div className={styles.loadingState}>
          <CircularProgress size={32} />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className={styles.root}>
        <MenuNavigation />
        <div className={styles.contentWrapper}>
          <div className={styles.emptyState}>You do not have permission to view evaluations.</div>
        </div>
      </div>
    );
  }

  const myItems = items.filter((i) => i.can_conduct);
  const allItems = items;

  return (
    <div className={styles.root}>
      <Head>
        <title>Evaluations | Levelset</title>
      </Head>
      <MenuNavigation />
      <div className={styles.contentWrapper}>
        <div className={styles.contentInner}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Evaluations</h1>
          </div>

          <div className={styles.tabsContainer}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{
                '& .MuiTab-root': {
                  fontFamily,
                  fontSize: 14,
                  fontWeight: 500,
                  textTransform: 'none',
                  color: 'var(--ls-color-muted)',
                  '&.Mui-selected': { color: 'var(--ls-color-text-primary)' },
                },
                '& .MuiTabs-indicator': { backgroundColor: 'var(--ls-color-brand-base)' },
              }}
            >
              <Tab label="Evaluations" />
              {hasManage && <Tab label="Settings" />}
            </Tabs>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 0 && (
              <div className={styles.sectionsWrapper}>
                <div>
                  <h2 className={styles.sectionTitle}>My Evaluations</h2>
                  <MyEvaluationsTable
                    items={myItems}
                    loading={loading}
                    onRefresh={fetchStatus}
                    canManage={canManage}
                  />
                </div>
                {hasManage && (
                  <div>
                    <h2 className={styles.sectionTitle}>All Evaluations</h2>
                    <AllEvaluationsTable
                      items={allItems}
                      loading={loading}
                      onRefresh={fetchStatus}
                    />
                  </div>
                )}
              </div>
            )}
            {activeTab === 1 && hasManage && (
              <ScheduleRulesList orgId={orgId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/pages/evaluations.tsx apps/dashboard/components/pages/EvaluationsPage.tsx apps/dashboard/components/pages/EvaluationsPage.module.css
git commit -m "feat(evaluations): add evaluations page shell with tabs and data fetching"
```

### Task 4b: MyEvaluationsTable Component

**Files:**
- Create: `apps/dashboard/components/evaluations/MyEvaluationsTable.tsx`

- [ ] **Step 1: Create the My Evaluations table**

Uses DataGrid Pro. Columns: Employee, Role, Evaluation, Source, Status, Last Completed, Action. Includes row action menu for overrides.

This is a DataGrid Pro component following the pattern from `EvaluationsTable.tsx`. Key differences:
- Uses `EvaluationItem` type instead of `EvaluationRow`
- Status is computed (chip with color), not a dropdown
- Source column with styled labels
- Action column with "Start Review" / "View" buttons
- Row action menu for skip/defer overrides on cadence-based items

**Implementation notes for the agent:**
- Reference `apps/dashboard/components/CodeComponents/EvaluationsTable.tsx` for DataGrid Pro styling patterns (column definitions, `sx` prop, font family)
- Use `Chip` from MUI for status badges: overdue = `var(--ls-color-destructive-soft)`, due = `var(--ls-color-warning-soft)`, completed = `var(--ls-color-success-soft)`, not_yet_due/skipped = `var(--ls-color-muted-soft)`
- **"Start Review"** opens an inline dialog/modal that renders the form via RJSF (using the form template's `schema` and `ui_schema`). The employee is shown as a read-only header (name + role). On submission, POST to `/api/forms/submissions` with `{ template_id, employee_id, form_type: 'evaluation', response_data, org_id, location_id }`. For event-triggered items, also PATCH `/api/evaluations/requests` to mark completed. After submission, call `onRefresh()`.
- "View" button triggers `EvaluationScoreSummary` inline expand or popover
- Import `OverrideMenu` for the row action menu on cadence-based items (only for `source === 'scheduled'`)
- Pass `deferUntil` through to the status display — deferred items show the defer date

The component should accept props: `items: EvaluationItem[]`, `loading: boolean`, `onRefresh: () => void`, `canManage: boolean`.

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/components/evaluations/MyEvaluationsTable.tsx
git commit -m "feat(evaluations): add MyEvaluationsTable component with status chips and actions"
```

### Task 4c: AllEvaluationsTable Component

**Files:**
- Create: `apps/dashboard/components/evaluations/AllEvaluationsTable.tsx`

- [ ] **Step 1: Create the All Evaluations table**

Same as `MyEvaluationsTable` but with an additional "Reviewer" column and filters for role, evaluation form, status, source, location. Accept props: `items: EvaluationItem[]`, `loading: boolean`, `onRefresh: () => void`.

Filters should be implemented as MUI `Select` dropdowns above the DataGrid, following the pattern from `FormManagementToolbar` in the form management page.

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/components/evaluations/AllEvaluationsTable.tsx
git commit -m "feat(evaluations): add AllEvaluationsTable component with filters and reviewer column"
```

### Task 4d: Score Summary & Submission Modal

**Files:**
- Create: `apps/dashboard/components/evaluations/EvaluationScoreSummary.tsx`
- Create: `apps/dashboard/components/evaluations/EvaluationSubmissionModal.tsx`

- [ ] **Step 1: Create the score summary component**

Inline component shown when clicking "View" on a completed evaluation. Shows overall percentage and per-section breakdown. Fetches from `/api/evaluations/submission-score?submission_id=...`.

Display: overall percentage as a large number with a circular progress indicator, sections as a list with name + percentage bar using `LinearProgress` from MUI. A "View Full Submission" button at the bottom.

- [ ] **Step 2: Create the submission modal**

Large MUI `Dialog` (`maxWidth="md"`, `fullWidth`) showing:
- Header: employee name, evaluation form name, date, reviewer
- Score summary (reuse `EvaluationScoreSummary` display)
- Full form responses rendered as a read-only list of question + answer pairs

Reference `apps/dashboard/components/forms/dialogStyles.ts` for dialog styling (`dialogPaperSx`, `dialogTitleSx`, etc.).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/evaluations/EvaluationScoreSummary.tsx apps/dashboard/components/evaluations/EvaluationSubmissionModal.tsx
git commit -m "feat(evaluations): add score summary component and full submission modal"
```

### Task 4e: Override Menu

**Files:**
- Create: `apps/dashboard/components/evaluations/OverrideMenu.tsx`

- [ ] **Step 1: Create the override action menu**

MUI `Menu` component triggered by an IconButton (MoreVert) on cadence-based evaluation rows. Options:
- **Skip this period** — calls `POST /api/evaluations/overrides` with `override_type: 'skip'` and current `period_start`
- **Defer** — opens a DatePicker dialog, then calls `POST /api/evaluations/overrides` with `override_type: 'defer'` and selected `defer_until`

Both options include an optional `reason` text field.

After creating an override, call `onRefresh()` to reload the table.

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/components/evaluations/OverrideMenu.tsx
git commit -m "feat(evaluations): add override action menu for skip/defer on cadence-based items"
```

---

## Task 5: Settings Tab — Schedule Rules

### Task 5a: Schedule Rules List

**Files:**
- Create: `apps/dashboard/components/evaluations/ScheduleRulesList.tsx`
- Create: `apps/dashboard/components/evaluations/ScheduleRuleDialog.tsx`

- [ ] **Step 1: Create the rules list component**

Fetches rules from `/api/evaluations/schedule-rules`. Displays each rule as a card/row showing:
- Form template name (link to `/form-management/[id]`)
- Target roles as colored `Chip` components (fetch `org_roles` to resolve IDs to names + colors, use `getRoleColor` from `apps/dashboard/lib/role-utils.ts`)
- Cadence label
- Reviewer roles as colored chips
- Active/inactive `Switch`
- Edit / Delete `IconButton`s
- Warning badge if linked form template `is_active === false`

"Create Rule" button at top opens `ScheduleRuleDialog`.

Props: `orgId: string`.

- [ ] **Step 2: Create the rule dialog**

MUI `Dialog` for creating/editing a schedule rule. Fields:
- **Evaluation Form**: `Select` dropdown of active evaluation-type `form_templates` for this org (fetch from `/api/forms?org_id=...&form_type=evaluation`)
- **Target Roles**: Multi-select with `Checkbox` items from `org_roles` (use role chips with colors)
- **Cadence**: `Select` with options: Monthly, Quarterly, Semi-Annual, Annual
- **Reviewer Roles**: Multi-select with `Checkbox` items from `org_roles`

On save, POST/PATCH to `/api/evaluations/schedule-rules`.

Reference `apps/dashboard/components/forms/dialogStyles.ts` for styling. Reference `apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.tsx` for the role selection pattern with colored chips.

Props: `open: boolean`, `onClose: () => void`, `onSaved: () => void`, `orgId: string`, `rule?: ScheduleRule` (null for create, populated for edit).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/evaluations/ScheduleRulesList.tsx apps/dashboard/components/evaluations/ScheduleRuleDialog.tsx
git commit -m "feat(evaluations): add schedule rules list and create/edit dialog for settings tab"
```

---

## Task 6: Navigation & i18n

### Task 6a: Enable Navigation Item

**Files:**
- Modify: `apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsx:81-86`

- [ ] **Step 1: Update the Evaluations nav item**

Change the disabled Evaluations item (lines 81-86) to:

```typescript
{
  label: 'Evaluations',
  description: 'Schedule performance reviews',
  href: '/evaluations',
  icon: <CalendarCheck size={22} strokeWidth={1.5} />,
  requiredPermission: P.EVAL_VIEW_EVALUATIONS,
},
```

Ensure `P` is imported from `@/lib/permissions/constants` at the top of the file (check if it already is, add if not).

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsx
git commit -m "feat(evaluations): enable evaluations navigation item with permission gate"
```

### Task 6b: i18n Strings

**Files:**
- Modify: `apps/dashboard/locales/en/common.json`
- Modify: `apps/dashboard/locales/es/common.json`

- [ ] **Step 1: Add English evaluation strings**

Add to `en/common.json`:

```json
"evaluations": {
  "pageTitle": "Evaluations",
  "myEvaluations": "My Evaluations",
  "allEvaluations": "All Evaluations",
  "settings": "Settings",
  "statusDue": "Due",
  "statusOverdue": "Overdue",
  "statusCompleted": "Completed",
  "statusNotYetDue": "Not yet due",
  "statusSkipped": "Skipped",
  "sourceScheduled": "Scheduled",
  "sourceCertPending": "Certification — Pending",
  "sourceCertPip": "Certification — PIP",
  "sourceManual": "Manual",
  "startReview": "Start Review",
  "viewScore": "View",
  "viewFullSubmission": "View Full Submission",
  "employee": "Employee",
  "role": "Role",
  "evaluation": "Evaluation",
  "source": "Source",
  "status": "Status",
  "lastCompleted": "Last Completed",
  "action": "Action",
  "reviewer": "Reviewer",
  "never": "Never",
  "createRule": "Create Rule",
  "editRule": "Edit Rule",
  "deleteRule": "Delete Rule",
  "evaluationForm": "Evaluation Form",
  "targetRoles": "Target Roles",
  "cadence": "Cadence",
  "reviewerRoles": "Reviewer Roles",
  "monthly": "Monthly",
  "quarterly": "Quarterly",
  "semiAnnual": "Semi-Annual",
  "annual": "Annual",
  "skipPeriod": "Skip this period",
  "defer": "Defer",
  "reason": "Reason (optional)",
  "noEvaluations": "No evaluations to display",
  "noPermission": "You do not have permission to view evaluations.",
  "overallScore": "Overall Score",
  "formInactive": "Form inactive"
}
```

- [ ] **Step 2: Add Spanish evaluation strings**

Add the same structure to `es/common.json` with Spanish translations.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/locales/en/common.json apps/dashboard/locales/es/common.json
git commit -m "feat(evaluations): add EN and ES i18n strings for evaluations page"
```

---

## Task 7: Certification Module Migration

### Task 7a: Certification Rules Modal on Roster

**Files:**
- Create: `apps/dashboard/components/evaluations/CertificationRulesModal.tsx`
- Modify: `apps/dashboard/components/CodeComponents/RosterTable.tsx`

- [ ] **Step 1: Create the certification rules modal**

MUI `Dialog` for managing `certification_evaluation_rules`. Fetches and displays rules for the current location. Allows create/edit/delete.

Fields per rule:
- **Evaluation Form**: dropdown of evaluation-type `form_templates`
- **Target Roles**: multi-select of `org_roles` with colored chips
- **Reviewer Roles**: multi-select of `org_roles` with colored chips
- **Trigger On**: checkbox group: "Certification — Pending", "Certification — PIP"
- **Active**: switch

CRUD via `/api/evaluations/certification-rules`.

Props: `open: boolean`, `onClose: () => void`, `locationId: string`, `orgId: string`.

- [ ] **Step 2: Remove Evaluations/PIP tabs from RosterTable, add cert rules button**

In `apps/dashboard/components/CodeComponents/RosterTable.tsx`:

1. Remove the conditional `StyledTab` for "Pending Evaluations" (lines 130-150) and "PIP" (lines 151-153)
2. Remove the `EvaluationsTable` and `PIPTable` imports and their tab content renders
3. Add a button/icon in the certifications section (near the certified_status column or in the toolbar when `enable_evaluations` is true) that opens `CertificationRulesModal`

Keep the `enable_certified_status` feature toggle for the status column — only the evaluation tabs move off.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/evaluations/CertificationRulesModal.tsx apps/dashboard/components/CodeComponents/RosterTable.tsx
git commit -m "feat(evaluations): add certification rules modal to roster, remove evaluations/PIP tabs"
```

### Task 7b: Update Certification Cron

**Files:**
- Modify: `apps/dashboard/lib/evaluate-certifications.ts`

- [ ] **Step 1: Update evaluation creation to use `evaluation_requests`**

Find the section that inserts into the `evaluations` table (around lines 410-443) and replace it with an insert into `evaluation_requests`:

1. Before creating the evaluation, look up the `certification_evaluation_rules` for the employee's location and matching role:

```typescript
// Fetch certification rules for this location
const { data: certRules } = await supabase
  .from('certification_evaluation_rules')
  .select('*')
  .eq('location_id', locationId)
  .eq('is_active', true)
  .contains('trigger_on', [triggerType]); // 'certification_pending' or 'certification_pip'

// Find rules matching the employee's role
const matchingRules = (certRules ?? []).filter((rule) => {
  // Resolve role IDs to role names
  // Match against employee's role
});
```

2. For each matching rule, insert into `evaluation_requests`:

```typescript
await supabase.from('evaluation_requests').insert({
  org_id: orgId,
  location_id: locationId,
  employee_id: employeeId,
  form_template_id: rule.form_template_id,
  trigger_source: triggerType,
  status: 'pending',
  triggered_at: new Date().toISOString(),
});
```

3. Remove the hardcoded `.eq('role', 'Team Member')` filter (around line 336) and replace with a dynamic lookup using `certification_evaluation_rules.target_role_ids`.

- [ ] **Step 2: Investigate and fix the status transition bug**

The certification cron is not correctly transitioning employees to Pending status and creating evaluations. Debug steps:

1. Check cron logs at `/api/cron/evaluate-certifications` — is the cron firing on audit days?
2. Trace `runMonthlyEvaluation()` in `evaluate-certifications.ts` — is it finding eligible employees?
3. Check `daily_position_averages` — are rolling-4 averages being stored for the Buda locations?
4. Check the state machine logic — are threshold comparisons correct (`>= greenThreshold` for Pending transition)?
5. Check if the `certification_audit` records are being created even when evaluations are not

This debugging is exploratory — the agent should trace the full flow and identify the specific failure point.

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/lib/evaluate-certifications.ts
git commit -m "feat(evaluations): migrate certification cron to write evaluation_requests, fix status transition bug"
```

### Task 7c: Migrate Active Legacy Records

**Files:**
- Create: `scripts/migrate-legacy-evaluations.ts`

- [ ] **Step 1: Write a migration script**

Script that:
1. Fetches all rows from `evaluations` where `status IN ('Planned', 'Scheduled')` (active, non-completed)
2. For each, looks up matching `certification_evaluation_rules` to find the form template
3. Inserts into `evaluation_requests` with appropriate `trigger_source` based on `state_before` ('Pending' → 'certification_pending', 'PIP' → 'certification_pip')
4. Logs the migration results

Run via: `npx tsx scripts/migrate-legacy-evaluations.ts`

Note: This requires `certification_evaluation_rules` to be configured first (Task 7a).

- [ ] **Step 2: Commit**

```bash
git add scripts/migrate-legacy-evaluations.ts
git commit -m "feat(evaluations): add script to migrate active legacy evaluations to evaluation_requests"
```

---

## Task 8: Verification & Cleanup

### Task 8a: Build Verification

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: No new errors introduced.

- [ ] **Step 2: Run build**

```bash
pnpm --filter dashboard build
```

Expected: Successful build.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: No new lint errors.

### Task 8b: Manual Testing Checklist

- [ ] Navigate to `/evaluations` — page loads with "My Evaluations" section
- [ ] With manage permission: see "All Evaluations" section and "Settings" tab
- [ ] Without manage permission: only see "My Evaluations"
- [ ] Settings tab: create a schedule rule with form, roles, cadence, reviewer roles
- [ ] Settings tab: edit and delete a rule
- [ ] Evaluations tab: see computed status (due/overdue/completed/not_yet_due) for employees matching rules
- [ ] Click "View" on a completed evaluation — see score summary
- [ ] Click "View Full Submission" — see full modal with responses
- [ ] Row action menu: skip an employee for current period — status changes to "Skipped"
- [ ] Row action menu: defer an employee — override created
- [ ] Navigation: Evaluations link visible in HR submenu with correct permission gating
- [ ] Roster page: Evaluations and PIP tabs removed, certification rules modal accessible
- [ ] i18n: switch to Spanish, verify labels are translated

### Task 8c: Final Commit

- [ ] **Step 1: Stage and commit any remaining changes**

Stage only the files modified during this task (do NOT use `git add -A`):

```bash
git status
# Review unstaged files, then add specific files:
git add <specific-changed-files>
git commit -m "feat(evaluations): complete evaluations page with schedule rules, certification integration, and scoring"
```
