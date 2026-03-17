# Evaluations Page Design

> Status: FINAL — ready for implementation planning

## Overview

A new Evaluations page that serves as the centralized operational hub for ALL employee performance reviews — both recurring cadence-based evaluations and event-triggered certification reviews. Leaders configure recurring evaluation schedules tied to evaluation-type forms from Form Management, see who is due/overdue for reviews, and conduct evaluations directly from this page or the mobile app.

This mirrors the pattern established by Positional Excellence (ratings) and Discipline — Form Management defines the templates, this page is where they're operationally managed and conducted.

## Two Evaluation Sources

The Evaluations page surfaces items from two independent mechanisms:

### 1. Cadence-Based Evaluations (all orgs)

Recurring schedule rules define expectations (e.g., "All Trainers get a Quarterly Review"). Compliance status is **computed** by comparing rules against `form_submissions` history — no records are pre-generated.

- Schedule rules target roles with individual overrides (skip, defer, include)
- Each role can have multiple evaluation forms (e.g., Trainer Quarterly + Trainer Annual)
- Simple cadence presets: Monthly, Quarterly, Semi-Annual, Annual (calendar-aligned)

### 2. Event-Triggered Evaluations (certification module — Reece Howard only)

The certification state machine monitors positional rating averages and triggers evaluations when employees transition states (e.g., entering Pending or PIP status). These are stored as explicit `evaluation_requests` records.

- **Not tied to schedule rules** — completely separate mechanism
- Triggered by the existing certification cron (4th Thursday / 3rd Friday audit cycle)
- Surface on the Evaluations page alongside cadence-based items
- Gated by existing feature toggles (`enable_certified_status`, `enable_evaluations`, `enable_pip_logic`)

## Data Model

### Role ID Resolution

All `*_role_ids` columns (uuid arrays) reference `org_roles.id`. Since `employees.role` is a text column storing the role name, resolving which employees match a rule requires joining through `org_roles`:

```sql
-- Find employees matching a rule's target roles
SELECT e.* FROM employees e
JOIN org_roles r ON r.role_name = e.role AND r.org_id = e.org_id
WHERE r.id = ANY(rule.target_role_ids)
  AND e.org_id = :org_id;
```

PostgreSQL cannot enforce FK constraints on array columns — `target_role_ids` and `reviewer_role_ids` are application-enforced references only. Deletions of `org_roles` entries should check for usage in these tables.

### New Table: `evaluation_schedule_rules`

Defines recurring evaluation expectations per org. Used only for cadence-based evaluations. Rules are **org-wide** — they apply to all locations within the org. Location filtering happens at query time based on the employee's `location_id`.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| org_id | uuid FK → orgs | Tenant scope |
| form_template_id | uuid FK → form_templates | Links to `form_templates` (type: evaluation) |
| target_role_ids | uuid[] | Which `org_roles` this rule applies to (app-enforced, not DB FK) |
| reviewer_role_ids | uuid[] | Which `org_roles` can conduct this evaluation (app-enforced, not DB FK) |
| cadence | text | `'monthly'`, `'quarterly'`, `'semi_annual'`, `'annual'` |
| is_active | boolean | Enable/disable without deleting |
| created_by | uuid FK → app_users | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: `org_id = auth.jwt()->>'org_id'` (standard org-scoped policy).

### New Table: `evaluation_schedule_overrides`

Per-employee exceptions to cadence-based schedule rules. Each override is scoped to a specific cadence period.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| org_id | uuid FK → orgs | Tenant scope |
| rule_id | uuid FK → evaluation_schedule_rules | |
| employee_id | uuid FK → employees | The employee being overridden |
| override_type | text | `'skip'`, `'defer'`, `'include'` |
| period_start | date | Start of the cadence period this override applies to (e.g., 2026-01-01 for Q1) |
| defer_until | date | For defer type: new due date |
| reason | text | Optional note |
| created_by | uuid FK → app_users | |
| created_at | timestamptz | |

RLS: `org_id = auth.jwt()->>'org_id'`.

### New Table: `evaluation_requests`

Stores event-triggered evaluation items (from certifications or manual requests). These are explicit records, unlike cadence-based evaluations which are computed.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| org_id | uuid FK → orgs | Tenant scope |
| location_id | uuid FK → locations | Location scope |
| employee_id | uuid FK → employees | Employee to be evaluated |
| form_template_id | uuid FK → form_templates | Links to `form_templates` (type: evaluation) |
| trigger_source | text | `'certification_pending'`, `'certification_pip'`, `'manual'` |
| status | text | `'pending'`, `'completed'`, `'cancelled'` |
| triggered_at | timestamptz | When the request was created |
| completed_submission_id | uuid FK → form_submissions | Links to `form_submissions` when completed |
| created_by | uuid FK → app_users | (null if system-generated) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: `org_id = auth.jwt()->>'org_id'`.

### New Table: `certification_evaluation_rules`

Reece Howard-specific configuration mapping evaluation form templates to roles for certification-triggered reviews. Managed via a modal on the Roster page's certifications section. Fully self-contained — form-to-role mapping, reviewer roles, and trigger configuration all live here.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| org_id | uuid FK → orgs | Tenant scope |
| location_id | uuid FK → locations | Location scope |
| form_template_id | uuid FK → form_templates | Links to `form_templates` (type: evaluation) |
| target_role_ids | uuid[] | Which roles this certification evaluation applies to (app-enforced) |
| reviewer_role_ids | uuid[] | Which roles can conduct this certification evaluation (app-enforced) |
| trigger_on | text[] | `['certification_pending', 'certification_pip']` — which transitions trigger this form |
| is_active | boolean | Enable/disable without deleting |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: `org_id = auth.jwt()->>'org_id'`.

### Existing Table: `form_submissions`

Completed evaluations (from both sources) are stored as `form_submissions` with `form_type = 'evaluation'`. The `employee_id` field identifies who was evaluated, `submitted_by` identifies the reviewer. Submission lookups for computed status are scoped by `org_id` (not `location_id`) since rules are org-wide.

### Legacy Table: `evaluations`

**Read-only historical reference.** Stop writing new rows. The certification cron will be updated to write to `evaluation_requests` instead. Existing data preserved for historical context.

### Preserved Tables (no changes)

- **`certification_audit`** — keeps tracking certification state transitions (Not Certified, Pending, Certified, PIP). This is the state transition log, not an evaluation record.
- **`employees.certified_status`** — current certification state stays on the employee record.
- **`daily_position_averages`** — continues storing rolling-4 averages via pg_cron.
- **`rating_thresholds`** — configurable per location, used by certification logic.

## Computed Status Logic (Cadence-Based)

For each employee + schedule rule pairing, status is derived:

1. Query the most recent `form_submissions` matching the employee, template, and org
2. Compare `created_at` of most recent submission against the cadence interval
3. Derive status:
   - **Completed** — submission exists within current period
   - **Due** — no submission in current period, period is active
   - **Overdue** — no submission and past the period end date (no grace period — overdue immediately when period ends)
   - **Not yet due** — next review period hasn't started
   - **Skipped** — override with matching `period_start` exists for this period

Cadence periods (calendar-aligned, not configurable):
- Monthly: calendar month
- Quarterly: Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec
- Semi-annual: Jan-Jun, Jul-Dec
- Annual: calendar year

### Edge Cases

- **New employees / new rule targets**: An employee who joins mid-period (or whose role changes to match a rule mid-period) is immediately "Due" for the current period. Their first evaluation has no "last completed" date.
- **Role changes**: Status is computed based on the employee's **current** role. If an employee changes from Trainer to Director mid-quarter, they no longer appear under Trainer rules and begin appearing under Director rules. Past completed evaluations under the old role remain in history.
- **Deactivated form template**: If a `form_template` linked to an active rule is set to `is_active = false`, the rule's computed items show as "Due" / "Overdue" but the "Start Review" action is disabled with a tooltip explaining the form is inactive. The Settings tab shows a warning badge on affected rules.

### Performance: Server-Side Computation

The computed status query should be implemented as a single efficient SQL query joining `evaluation_schedule_rules`, `org_roles`, `employees`, and a lateral subquery on `form_submissions` for the latest submission per employee+template. This avoids N+1 queries. Example pattern:

```sql
SELECT e.id, e.full_name, e.role, r.id as rule_id, ft.name as form_name,
  fs.created_at as last_submission_at,
  -- compute status from cadence + last_submission_at + period boundaries
FROM evaluation_schedule_rules esr
JOIN org_roles orl ON orl.id = ANY(esr.target_role_ids) AND orl.org_id = esr.org_id
JOIN employees e ON e.role = orl.role_name AND e.org_id = esr.org_id AND e.active = true
JOIN form_templates ft ON ft.id = esr.form_template_id
LEFT JOIN LATERAL (
  SELECT fs.created_at FROM form_submissions fs
  WHERE fs.employee_id = e.id AND fs.template_id = ft.id AND fs.org_id = esr.org_id
  ORDER BY fs.created_at DESC LIMIT 1
) fs ON true
LEFT JOIN evaluation_schedule_overrides eso
  ON eso.rule_id = esr.id AND eso.employee_id = e.id AND eso.period_start = :current_period_start
WHERE esr.org_id = :org_id AND esr.is_active = true;
```

Status derivation happens in the API route (TypeScript), not in SQL, to keep the logic readable and testable.

## API Routes

### Evaluation Status (core data endpoint)

```
GET /api/evaluations/status?org_id=...&location_id=...
```
Returns the merged list of cadence-based computed items + event-triggered `evaluation_requests`. Scoped by org_id, optionally filtered by location_id.

Permission: `evaluations.view_evaluations` (returns only items the user can conduct) or `evaluations.manage_evaluations` (returns all items).

Response shape:
```typescript
interface EvaluationItem {
  id: string;                    // rule_id + employee_id (cadence) or request_id (event)
  source: 'scheduled' | 'certification_pending' | 'certification_pip' | 'manual';
  employee: { id: string; name: string; role: string; location_id: string; };
  evaluation: { template_id: string; name: string; };
  status: 'due' | 'overdue' | 'completed' | 'not_yet_due' | 'skipped';
  last_completed_at: string | null;
  last_submission_id: string | null;
  score?: { overall_percentage: number; sections: { name: string; percentage: number; }[]; };
  due_date: string;              // period end date (cadence) or triggered_at (event)
  can_conduct: boolean;          // whether current user's role is in reviewer_role_ids
}
```

### Schedule Rules CRUD (Settings tab)

```
GET    /api/evaluations/schedule-rules?org_id=...
POST   /api/evaluations/schedule-rules         { org_id, form_template_id, target_role_ids, reviewer_role_ids, cadence }
PATCH  /api/evaluations/schedule-rules         { id, ...partial fields }
DELETE /api/evaluations/schedule-rules         { id }
```
Permission: `evaluations.manage_evaluations` for all operations.

### Overrides (row action menu)

```
POST   /api/evaluations/overrides              { rule_id, employee_id, override_type, period_start, defer_until?, reason? }
DELETE /api/evaluations/overrides              { id }
```
Permission: `evaluations.manage_evaluations`.

### Evaluation Requests (event-triggered)

```
GET    /api/evaluations/requests?org_id=...&status=pending
PATCH  /api/evaluations/requests               { id, status, completed_submission_id? }
```
Permission: `evaluations.view_evaluations` for GET, `evaluations.conduct_evaluations` for PATCH.

### Certification Evaluation Rules (Roster modal)

```
GET    /api/evaluations/certification-rules?org_id=...&location_id=...
POST   /api/evaluations/certification-rules    { org_id, location_id, form_template_id, target_role_ids, reviewer_role_ids, trigger_on }
PATCH  /api/evaluations/certification-rules    { id, ...partial fields }
DELETE /api/evaluations/certification-rules    { id }
```
Permission: `evaluations.manage_evaluations`.

### Submission Score Summary

```
GET /api/evaluations/submission-score?submission_id=...
```
Returns the scoring breakdown (overall + per-section) for a completed evaluation. Used by the inline "View" action.

Permission: `evaluations.view_evaluations`.

## Page Layout

### URL: `/evaluations`

### Permission Model

| Permission | Sees |
|-----------|------|
| Has `evaluations.manage_evaluations` | Two sections: "My Evaluations" + "All Evaluations" + Settings tab |
| No `evaluations.manage_evaluations` | One section: "My Evaluations" only. No Settings tab |

### Tab 1: Evaluations (default)

#### Section: "My Evaluations"

Table of evaluations the current user is eligible to conduct. Combines items from both sources:

- **Cadence-based**: computed from schedule rules where the user's role is in `reviewer_role_ids`
- **Event-triggered**: `evaluation_requests` with `status = 'pending'` where the user's role is in the associated `certification_evaluation_rules.reviewer_role_ids`

| Column | Description |
|--------|-------------|
| Employee | Name of the employee to be reviewed |
| Role | Employee's current role |
| Evaluation | Name of the evaluation form |
| Source | "Scheduled" (cadence) or trigger label (e.g., "Certification — Pending") |
| Status | Due / Overdue / Completed (date) / Not yet due |
| Last Completed | Date of most recent submission, or "Never" |
| Action | "Start Review" button (for due/overdue/pending), "View" (for completed) |

**Sorted by due date ascending** — overdue first, then due soon, then event-triggered pending, then not yet due.

**"Start Review"** opens the evaluation form (rendered via RJSF from the form template schema) targeting that employee. The `employee_id` is passed as context to the form renderer — the employee name/role are displayed as a read-only header above the form, not as form fields. On submission, it creates a `form_submissions` record with `employee_id` and `submitted_by` set. For event-triggered items, it also updates the `evaluation_requests.status` to `'completed'` and sets `completed_submission_id`.

**"View" (completed evaluations)** — shows a score summary inline: overall percentage and per-section breakdown (section name + percentage). A "View Full Submission" button opens a large modal with the complete form submission details (all question responses) plus the scoring summary.

**Row action menu** (cadence-based items only) — supports individual overrides:
- **Skip** — skip this employee for the current period (with optional reason). Creates an `evaluation_schedule_overrides` record with `period_start` set to the current period's start date.
- **Defer** — push to a specific date via date picker.

#### Section: "All Evaluations" (manage permission only)

Same table structure but shows ALL employees across all active rules and pending requests, regardless of whether the current user can conduct them. Additional columns:

| Column | Description |
|--------|-------------|
| Reviewer | Who completed it (for completed), or eligible reviewer roles (for pending) |

Filterable by: role, evaluation form, status, source (scheduled/certification), location.

### Tab 2: Settings (manage permission only)

Configuration interface for cadence-based evaluation schedule rules only. Certification-triggered evaluations are configured on the Roster page.

#### Rules List

Each rule displayed as a card or row showing:
- Evaluation form name (linked to Form Management detail page)
- Target roles (role chips with colors)
- Cadence (Monthly / Quarterly / Semi-Annual / Annual)
- Reviewer roles (role chips)
- Active/inactive toggle
- Edit / Delete actions
- Warning badge if linked form template is inactive

#### Create/Edit Rule Dialog

Fields:
- **Evaluation Form** — dropdown of active evaluation-type `form_templates` for this org
- **Target Roles** — multi-select of `org_roles` (which employees get this evaluation)
- **Cadence** — select: Monthly, Quarterly, Semi-Annual, Annual
- **Reviewer Roles** — multi-select of `org_roles` (who can conduct this evaluation)

## Certification Module Changes

### What stays the same
- Certification state machine logic (`evaluate-certifications.ts`)
- Cron schedule (4th Thursday / 3rd Friday)
- `certification_audit` table
- `employees.certified_status` field
- `daily_position_averages` and `rating_thresholds`
- Feature toggles gating visibility
- Hardcoded Buda/West Buda location IDs
- Certification status column on Roster page

### What changes
- **Stop writing to `evaluations` table** — cron writes to `evaluation_requests` instead
- **New `certification_evaluation_rules` table** — maps evaluation form templates to roles and transition triggers for certification reviews
- **New Roster modal** — "Evaluation Rules" modal in the Roster page's certifications section where admins configure which evaluation forms apply to which roles, which roles can conduct them, and which certification transitions trigger them. This is fully self-contained in the certifications module.
- **Remove hardcoded `role = 'Team Member'` filter** — the cron currently hardcodes `.eq('role', 'Team Member')`. This must be replaced with a lookup against `certification_evaluation_rules.target_role_ids` to dynamically determine which roles are evaluated.
- **Evaluations UI moves off Roster** — the EvaluationsTable and PIPTable components on the Roster page are replaced by the new Evaluations page. The Roster keeps the `certified_status` column display and the new evaluation rules modal.
- **PIP visibility** — PIP employees surface on the Evaluations page as event-triggered items with `trigger_source = 'certification_pip'`. No separate PIP tab needed.
- **Bug fix** — status transitions are not happening correctly; employees not ending up in pending evaluations when they should. This must be investigated and fixed as part of the migration. Root cause analysis of the certification cron flow is required.

### Migration path
1. Create `certification_evaluation_rules` table and Roster modal for Reece Howard
2. Create/configure evaluation form templates for Reece Howard's certification reviews (role-specific)
3. Update `evaluate-certifications.ts` to write `evaluation_requests` instead of `evaluations`, using `certification_evaluation_rules` to determine which form template to use. Remove hardcoded `role = 'Team Member'` filter.
4. Fix the certification cron bug — trace why status transitions aren't producing pending evaluations
5. Migrate any active (non-completed) rows from `evaluations` to `evaluation_requests`
6. Remove EvaluationsTable and PIPTable from Roster page
7. Keep `evaluations` table read-only for historical reference

## Role Targeting

Role targeting for evaluation forms is managed in two places:
- **Cadence-based**: on the Evaluations page Settings tab via `evaluation_schedule_rules`
- **Certification-triggered**: on the Roster page via `certification_evaluation_rules`

The `applicable_roles` field in `form_templates.settings` is deprecated for evaluations — the above tables are the source of truth.

## Mobile App Integration

Leaders see "My Evaluations" in the mobile app — same computed list as the dashboard, combining both cadence-based and event-triggered items filtered to evaluations they can conduct. They can start a review directly from their phone.

## Permissions

New permission module and constants. Keys follow existing `module.sub_item` format:

```
Permission key strings:
  evaluations.view_evaluations      — see the evaluations page / "My Evaluations"
  evaluations.manage_evaluations    — see "All Evaluations" + Settings tab + overrides
  evaluations.conduct_evaluations   — actually start and submit a review

P constant names:
  P.EVAL_VIEW_EVALUATIONS
  P.EVAL_MANAGE_EVALUATIONS
  P.EVAL_CONDUCT_EVALUATIONS
```

Requires:
- New `permission_modules` row: `{ key: 'evaluations', name: 'Evaluations', ... }`
- Three new `permission_sub_items` rows for the above keys
- Seed migration to insert these

## i18n

All UI strings require both EN and ES translations. New keys go in the `common` namespace (`locales/{en,es}/common.json`) unless volume warrants a dedicated `evaluations` namespace. Key areas:
- Status labels: Due, Overdue, Completed, Not yet due, Skipped
- Source labels: Scheduled, Certification — Pending, Certification — PIP
- Column headers, button labels, dialog titles
- Settings tab labels and form field labels

## Style Alignment

- Follows standard dashboard page pattern: `MenuNavigation` > `contentWrapper` > tabs
- CSS Modules co-located with components
- Design tokens for all colors (`var(--ls-color-*)`)
- MUI v7 components (DataGrid Pro, Tabs, Dialog, Chip for role badges)
- Status chips: overdue (destructive), due (warning), completed (success), not yet due (muted)
- Source labels: "Scheduled" (muted), "Certification — Pending" (brand), "Certification — PIP" (warning)
- Score summary: section scores displayed as progress bars or percentage chips
- Full submission modal: large dialog with all form responses + scoring breakdown
- Consistent with Form Management page layout and Form Detail page patterns
