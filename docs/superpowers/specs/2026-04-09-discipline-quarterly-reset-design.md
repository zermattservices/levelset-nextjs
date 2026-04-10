# Discipline Quarterly Reset

## Summary

Add a configurable "Points Reset Period" setting per org that controls whether discipline points are calculated using a rolling 90-day window (current behavior) or a quarterly calendar reset (Q1 Jan-Mar, Q2 Apr-Jun, Q3 Jul-Sep, Q4 Oct-Dec). The setting is org-level and takes effect immediately when changed.

## Motivation

Buda/West Buda locations need discipline points to reset at fixed quarterly boundaries rather than rolling off after 90 days. Other orgs should retain the current rolling 90-day behavior. This is a filter change — point values, infraction types, and action thresholds are unchanged.

## Database

### New table: `org_discipline_config`

```sql
create table org_discipline_config (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  points_reset_mode text not null default 'rolling_90'
    check (points_reset_mode in ('rolling_90', 'quarterly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);
```

One row per org. If no row exists, default to `'rolling_90'` (backward compatible — no migration of existing orgs needed).

## Shared Helper

### `lib/discipline-utils.ts`

```typescript
/**
 * Get the cutoff date for discipline point calculations based on org config.
 * - 'rolling_90': 90 days ago from today
 * - 'quarterly': start of current calendar quarter
 * Returns an ISO date string (YYYY-MM-DD).
 */
export async function getDisciplineCutoffDate(
  supabase: SupabaseClient,
  orgId: string
): Promise<string>

/**
 * Synchronous version for client-side use when the mode is already known.
 */
export function calculateCutoffDate(mode: 'rolling_90' | 'quarterly'): string
```

Quarter boundaries:
- Q1: January 1
- Q2: April 1
- Q3: July 1
- Q4: October 1

## Files to Update

### Server-side point calculations (5 files)

Each of these currently hardcodes `const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)`. Replace with a call to `getDisciplineCutoffDate(supabase, orgId)`.

1. **`lib/discipline-recommendations.ts:53`** — Fetches infractions for recommendation engine. Already has `orgId` in scope.

2. **`pages/api/employees/points.ts:33`** — Returns 90-day points for a single employee. Needs to look up org_id from the employee record (already fetched) to get the config.

3. **`pages/api/reporting/discipline-data.ts:81`** — Returns all employee points for the discipline dashboard. Already has `location_id` in scope; derive `org_id` from it.

4. **`pages/api/reporting/discipline-report.ts:139`** — Full discipline report per employee. Already has `location_id`.

5. **`components/CodeComponents/DisciplineTable.tsx:234`** — Client-side filter. This component fetches infraction data and filters by date client-side. Two options:
   - **Recommended:** Have the `discipline-data` API include `points_reset_mode` in its response. The component uses `calculateCutoffDate(mode)` to filter client-side with the correct mode.
   - Alternative: Move the filtering server-side entirely. More invasive, not necessary for this change.

### API response change

`GET /api/reporting/discipline-data` response adds:
```json
{
  "activeEmployees": [...],
  "inactiveEmployees": [...],
  "points_reset_mode": "rolling_90" | "quarterly"
}
```

`DisciplineTable.tsx` reads this and passes the mode to `calculateCutoffDate()`.

### Settings UI

**Location:** `components/OrgSettings/DisciplineActionsTab.tsx` — add a "Points Reset Period" control above the existing disciplinary actions header.

**UI:** Radio group or segmented button with two options:
- "Rolling 90 Days" (default) — Points drop off 90 days after each infraction
- "Quarterly" — Points reset at the start of each quarter (Jan, Apr, Jul, Oct)

**API for saving:** Add a new API route `pages/api/org-settings/discipline-config.ts` with:
- `GET` — fetch current config for org
- `POST` — upsert config (intent: `update_reset_mode`)

**Permission:** Reuse `DISC_MANAGE_ACTIONS` since this directly affects how action thresholds are evaluated.

## Migration Path

- No data migration needed. The new table starts empty.
- Orgs without a row default to `'rolling_90'` (current behavior).
- To enable quarterly for Buda/West Buda, either use the new UI toggle or insert a row directly.

## Scope Exclusions

- No changes to mobile/PWA infraction submission endpoints (they submit infractions, not calculate points).
- No changes to the `infraction-detail` native API (it currently shows all-time points — that's a separate issue).
- No changes to infraction rubrics or action thresholds.
- The "Notifications" tab remains a coming-soon placeholder.
