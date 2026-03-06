# Approvals Page Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the approvals page with two tabs (Requests and Shift Swaps), add list/calendar views for requests, implement denial reason workflow with lookup table, and add request detail modals.

**Architecture:** Replace the current Pending/History tab structure with a Requests tab (time off + availability, with list/weekly/monthly calendar views) and a Shift Swaps tab (swaps + house pickups, list only). Add an `approval_denial_reasons` lookup table for org-configurable denial reasons. Request detail modals show overlapping request counts and denial reason selection.

**Tech Stack:** Next.js Pages Router, React, MUI v7, CSS Modules, Supabase, CSS Grid (same pattern as ScheduleGrid)

**Important:** "Giveaway" shift trade type is NOT a real feature. Exclude it from all UI. The Shift Swaps tab only shows `swap` and `house_pickup` types.

---

## Phase 1: Database Schema

### Task 1: Create denial reasons table and update request tables

**Files:**
- Create: `supabase/migrations/20260303_approval_denial_reasons.sql`

**Step 1: Write the migration**

```sql
-- Migration: Approval Denial Reasons
-- Adds configurable denial reasons per org and links them to request tables.

-- ============================================================================
-- 1. Denial Reasons lookup table
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_denial_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('time_off', 'availability', 'shift_swap')),
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_denial_reasons_org_type ON approval_denial_reasons(org_id, request_type);

-- ============================================================================
-- 2. Add denial_reason_id and denial_message to request tables
-- ============================================================================
ALTER TABLE time_off_requests
  ADD COLUMN IF NOT EXISTS denial_reason_id UUID REFERENCES approval_denial_reasons(id),
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

ALTER TABLE availability_change_requests
  ADD COLUMN IF NOT EXISTS denial_reason_id UUID REFERENCES approval_denial_reasons(id),
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

ALTER TABLE shift_trade_requests
  ADD COLUMN IF NOT EXISTS denial_reason_id UUID REFERENCES approval_denial_reasons(id),
  ADD COLUMN IF NOT EXISTS denial_message TEXT;

-- ============================================================================
-- 3. Seed default denial reasons for all existing orgs
-- ============================================================================

-- Time Off reasons
INSERT INTO approval_denial_reasons (org_id, request_type, label, display_order)
SELECT o.id, 'time_off', r.label, r.display_order
FROM orgs o
CROSS JOIN (VALUES
  ('Low staff', 1),
  ('Full on requests', 2),
  ('Other', 3)
) AS r(label, display_order)
ON CONFLICT DO NOTHING;

-- Availability reasons
INSERT INTO approval_denial_reasons (org_id, request_type, label, display_order)
SELECT o.id, 'availability', r.label, r.display_order
FROM orgs o
CROSS JOIN (VALUES
  ('Doesn''t fit business needs', 1),
  ('Probationary Period', 2),
  ('Other', 3)
) AS r(label, display_order)
ON CONFLICT DO NOTHING;

-- Shift Swap reasons
INSERT INTO approval_denial_reasons (org_id, request_type, label, display_order)
SELECT o.id, 'shift_swap', r.label, r.display_order
FROM orgs o
CROSS JOIN (VALUES
  ('Proficiency mismatch', 1),
  ('Would cause excessive overtime', 2),
  ('Other', 3)
) AS r(label, display_order)
ON CONFLICT DO NOTHING;
```

**Step 2: Apply the migration**

Run: `supabase db push` or apply via Supabase dashboard.

**Step 3: Regenerate types**

Run: `pnpm db:gen-types`

**Step 4: Commit**

```bash
git add supabase/migrations/20260303_approval_denial_reasons.sql packages/shared/src/types/supabase.ts
git commit -m "feat(db): add approval_denial_reasons table and link to request tables"
```

---

## Phase 2: TypeScript Types

### Task 2: Add new types to scheduling.types.ts

**Files:**
- Modify: `apps/dashboard/lib/scheduling.types.ts`

**Step 1: Add types after the existing `PendingCounts` interface**

Add at end of the approval types section:

```typescript
// ── Denial Reason Types ─────────────────────────────────────────────

export type DenialReasonRequestType = 'time_off' | 'availability' | 'shift_swap';

export interface DenialReason {
  id: string;
  org_id: string;
  request_type: DenialReasonRequestType;
  label: string;
  display_order: number;
  is_active: boolean;
}

// ── Approvals Page View Types ───────────────────────────────────────

export type ApprovalsTab = 'requests' | 'shift_swaps';
export type RequestsViewMode = 'list' | 'weekly' | 'monthly';
export type RequestTypeFilter = 'time_off' | 'availability';
export type RequestStatusFilter = 'pending' | 'approved' | 'denied';
```

**Step 2: Update TimeOffRequest, AvailabilityChangeRequest, ShiftTradeRequest interfaces**

Add to each interface:

```typescript
denial_reason_id?: string | null;
denial_message?: string | null;
denial_reason?: DenialReason;
```

**Step 3: Commit**

```bash
git add apps/dashboard/lib/scheduling.types.ts
git commit -m "feat(types): add denial reason and approvals view types"
```

---

## Phase 3: API Updates

### Task 3: Create denial reasons API endpoint

**Files:**
- Create: `apps/dashboard/pages/api/scheduling/denial-reasons.ts`

**Step 1: Create the endpoint**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  { orgId }: { userId: string; orgId: string }
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();
  const { request_type } = req.query;

  let query = supabase
    .from('approval_denial_reasons')
    .select('id, request_type, label, display_order, is_active')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (request_type && typeof request_type === 'string') {
    query = query.eq('request_type', request_type);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(data ?? []);
}

export default function apiHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(204).end();
  }
  return withPermissionAndContext(P.SCHED_MANAGE_APPROVALS, handler)(req, res);
}
```

**Step 2: Commit**

```bash
git add apps/dashboard/pages/api/scheduling/denial-reasons.ts
git commit -m "feat(api): add denial reasons endpoint"
```

### Task 4: Update approvals API — enhanced GET with date range and multi-status filter

**Files:**
- Modify: `apps/dashboard/pages/api/scheduling/approvals.ts`

**Step 1: Rewrite the GET handler**

Replace the GET block in the handler. The new GET supports:
- `status` — comma-separated list: `pending,approved,denied` (default: `pending`)
- `type` — comma-separated: `time_off,availability,shift_trade` (default: `all`)
- `start_date` / `end_date` — ISO date strings for calendar date range filtering
- `location_id` — required

Key changes:
- Parse `status` as array: `const statuses = (status as string).split(',');`
- Parse `type` as array: `const types = (type as string).split(',');`
- For time off with date range: `.gte('start_datetime', startDate).lte('start_datetime', endDate + 'T23:59:59Z')` — this finds requests that START within the range (their end may extend beyond)
- Actually, to properly find overlapping requests: `.lte('start_datetime', endDate + 'T23:59:59Z').gte('end_datetime', startDate + 'T00:00:00Z')` — this finds any request that overlaps the visible range
- For shift trades, filter `type NOT IN ('giveaway')` always (exclude giveaways from all responses)
- Use `.in('status', statuses)` for multi-status filtering
- Include `denial_reason:approval_denial_reasons(id, label)` in select joins

**Step 2: Commit**

```bash
git add apps/dashboard/pages/api/scheduling/approvals.ts
git commit -m "feat(api): enhanced GET with date range, multi-status, denial reason joins"
```

### Task 5: Update approvals API — deny intents require reason_id

**Files:**
- Modify: `apps/dashboard/pages/api/scheduling/approvals.ts`

**Step 1: Update all deny intents**

For `deny_shift_trade`, `deny_time_off`, `deny_availability`:
- Extract `denial_reason_id` and `denial_message` from `req.body`
- Validate `denial_reason_id` is provided: `if (!denial_reason_id) return res.status(400).json({ error: 'denial_reason_id is required' });`
- Include in the update: `denial_reason_id, denial_message: denial_message || null`

**Step 2: Commit**

```bash
git add apps/dashboard/pages/api/scheduling/approvals.ts
git commit -m "feat(api): require denial_reason_id on deny intents"
```

### Task 6: Add overlapping requests query endpoint

**Files:**
- Create: `apps/dashboard/pages/api/scheduling/overlapping-requests.ts`

This endpoint returns the count and list of other time off requests that overlap a given date range for the same location. Used by the time off detail modal.

**Step 1: Create the endpoint**

```typescript
// GET /api/scheduling/overlapping-requests?location_id=X&start=ISO&end=ISO&exclude_id=UUID
// Returns: { count: number, requests: { id, employee_name, status, start_datetime, end_datetime }[] }
```

Query logic:
```sql
SELECT tor.id, e.full_name as employee_name, tor.status, tor.start_datetime, tor.end_datetime
FROM time_off_requests tor
JOIN employees e ON e.id = tor.employee_id
WHERE tor.location_id = $location_id
  AND tor.org_id = $orgId
  AND tor.id != $exclude_id
  AND tor.status IN ('pending', 'approved')
  AND tor.start_datetime < $end
  AND tor.end_datetime > $start
ORDER BY tor.start_datetime ASC
```

Permission: `P.SCHED_MANAGE_APPROVALS`

**Step 2: Commit**

```bash
git add apps/dashboard/pages/api/scheduling/overlapping-requests.ts
git commit -m "feat(api): add overlapping time off requests endpoint"
```

---

## Phase 4: Shared Components

### Task 7: Create DateNavigation component

**Files:**
- Create: `apps/dashboard/components/scheduling/DateNavigation.tsx`
- Create: `apps/dashboard/components/scheduling/DateNavigation.module.css`

Reusable date navigation with prev/next arrows + label + Today button. Same visual style as ScheduleToolbar nav section.

**Props:**
```typescript
interface DateNavigationProps {
  mode: 'week' | 'month';
  /** Sunday of the current week (week mode) or 1st of month (month mode) */
  currentDate: Date;
  onNavigate: (dir: -1 | 1) => void;
  onGoToToday: () => void;
}
```

**Rendering:**
- Week mode label: `formatWeekLabel(sunday)` — reuse the same format function from ScheduleToolbar: "Mar 3 – 9, 2026"
- Month mode label: "March 2026"
- Left chevron, label, right chevron, "Today" button
- Copy CSS from ScheduleToolbar's `.navSection`, `.navArrow`, `.dateLabel`, `.todayBtn` into `DateNavigation.module.css`

**Step 1: Create component and CSS module**
**Step 2: Commit**

```bash
git add apps/dashboard/components/scheduling/DateNavigation.tsx apps/dashboard/components/scheduling/DateNavigation.module.css
git commit -m "feat(ui): add reusable DateNavigation component"
```

### Task 8: Create ApprovalsToolbar component

**Files:**
- Create: `apps/dashboard/components/scheduling/ApprovalsToolbar.tsx`
- Create: `apps/dashboard/components/scheduling/ApprovalsToolbar.module.css`

Sub-toolbar for the Requests tab containing: view toggle (List | Weekly | Monthly), type filter chips, status filter chips, and date navigation (visible when in calendar view).

**Props:**
```typescript
interface ApprovalsToolbarProps {
  viewMode: RequestsViewMode;
  onViewModeChange: (mode: RequestsViewMode) => void;
  typeFilters: RequestTypeFilter[];
  onTypeFiltersChange: (types: RequestTypeFilter[]) => void;
  statusFilters: RequestStatusFilter[];
  onStatusFiltersChange: (statuses: RequestStatusFilter[]) => void;
  // Date nav (visible for weekly/monthly)
  calendarMode: 'week' | 'month';
  currentDate: Date;
  onNavigate: (dir: -1 | 1) => void;
  onGoToToday: () => void;
}
```

**Layout:** Single row, flex, matching ScheduleToolbar visual style:
- Left: DateNavigation (hidden in list view)
- Center: View toggle group (List | Weekly | Monthly) using `.toggleGroup` / `.toggleBtn` / `.toggleActive` pattern from ScheduleToolbar
- Right: Filter chips — Type (Time Off, Availability) + Status (Pending, Approved, Denied) as toggle buttons. When in weekly/monthly view, the "Availability" type filter chip is greyed out/disabled with a tooltip "Availability requests cannot be displayed on calendar".

**CSS:** Reuse the toggle group pattern from `ScheduleToolbar.module.css` — `.toggleGroup`, `.toggleBtn`, `.toggleActive` styles.

**Step 1: Create component and CSS**
**Step 2: Commit**

```bash
git add apps/dashboard/components/scheduling/ApprovalsToolbar.tsx apps/dashboard/components/scheduling/ApprovalsToolbar.module.css
git commit -m "feat(ui): add ApprovalsToolbar with view/type/status filters"
```

### Task 9: Create DenyReasonDialog component

**Files:**
- Create: `apps/dashboard/components/scheduling/DenyReasonDialog.tsx`
- Create: `apps/dashboard/components/scheduling/DenyReasonDialog.module.css`

Modal dialog for selecting a denial reason when denying any request type. Fetches denial reasons from the API.

**Props:**
```typescript
interface DenyReasonDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reasonId: string, message: string | null) => void;
  requestType: DenialReasonRequestType; // 'time_off' | 'availability' | 'shift_swap'
  orgId: string;
  getAccessToken: () => Promise<string | null>;
}
```

**UI:**
- MUI Dialog with title "Deny Request"
- Radio group listing denial reasons (fetched from `GET /api/scheduling/denial-reasons?request_type=X`)
- Multiline TextField below for optional message (label: "Message to employee (optional)", placeholder: "Explain why this request was denied...")
- Cancel and "Deny" buttons in footer. "Deny" is destructive-colored and disabled until a reason is selected.

**Step 1: Create component and CSS**
**Step 2: Commit**

```bash
git add apps/dashboard/components/scheduling/DenyReasonDialog.tsx apps/dashboard/components/scheduling/DenyReasonDialog.module.css
git commit -m "feat(ui): add DenyReasonDialog with reason selection and message"
```

### Task 10: Create RequestDetailModal component

**Files:**
- Create: `apps/dashboard/components/scheduling/RequestDetailModal.tsx`
- Create: `apps/dashboard/components/scheduling/RequestDetailModal.module.css`

Modal that shows full request details + approve/deny actions. Renders differently based on request type.

**Props:**
```typescript
interface RequestDetailModalProps {
  open: boolean;
  onClose: () => void;
  request: ApprovalItem | null; // { kind, data } union
  locationId: string;
  orgId: string;
  onAction: (intent: string, id: string, extra?: { denial_reason_id?: string; denial_message?: string }) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}
```

**Time Off Modal Content:**
- Employee name, date range (formatted), paid status, employee note
- **Overlapping Requests Section**: Fetches from `GET /api/scheduling/overlapping-requests`. Displays: "X other requests during this period" with a list showing employee name, status badge (pending/approved), and date range for each.
- Approve (green) and Deny (red) buttons at bottom
- Clicking Deny opens DenyReasonDialog

**Availability Modal Content:**
- Employee name, effective date, permanent/temporary status
- Day-of-week grid showing requested availability (same layout as current AvailabilityCard)
- Employee notes
- Approve/Deny buttons → Deny opens DenyReasonDialog

**Shift Swap Modal Content:**
- Type label (Swap or House Pickup)
- Source employee + shift details
- Target employee + shift details (for swaps)
- Notes
- Approve/Deny buttons → Deny opens DenyReasonDialog

**Step 1: Create component and CSS**
**Step 2: Commit**

```bash
git add apps/dashboard/components/scheduling/RequestDetailModal.tsx apps/dashboard/components/scheduling/RequestDetailModal.module.css
git commit -m "feat(ui): add RequestDetailModal with overlapping requests and deny flow"
```

---

## Phase 5: Refactor ApprovalsPage — Tab Structure + List Views

### Task 11: Rewrite ApprovalsPage with new tab structure

**Files:**
- Modify: `apps/dashboard/components/pages/ApprovalsPage.tsx`
- Modify: `apps/dashboard/components/pages/ApprovalsPage.module.css`

**Step 1: Restructure the main component**

Replace the entire component. New structure:

```
ApprovalsPage
├── MenuNavigation
├── Header ("Approvals")
├── Top-level Tabs: "Requests" | "Shift Swaps"
├── If tab === 'requests':
│   ├── ApprovalsToolbar (view toggle, filters, date nav)
│   ├── If viewMode === 'list': <RequestsList />
│   ├── If viewMode === 'weekly': <RequestsWeeklyCalendar />
│   └── If viewMode === 'monthly': <RequestsMonthlyCalendar />
└── If tab === 'shift_swaps':
    ├── Simple filter bar (status: Pending | Approved | Denied)
    └── <ShiftSwapsList />
```

**State:**
```typescript
// Top-level
const [tab, setTab] = useState<ApprovalsTab>('requests');

// Requests tab
const [viewMode, setViewMode] = useState<RequestsViewMode>('list');
const [typeFilters, setTypeFilters] = useState<RequestTypeFilter[]>(['time_off', 'availability']);
const [statusFilters, setStatusFilters] = useState<RequestStatusFilter[]>(['pending']);

// Calendar state
const [weekStart, setWeekStart] = useState<Date>(() => getSunday(new Date()));
const [monthStart, setMonthStart] = useState<Date>(() => getFirstOfMonth(new Date()));

// Shift Swaps tab
const [swapStatusFilter, setSwapStatusFilter] = useState<RequestStatusFilter[]>(['pending']);

// Shared
const [selectedRequest, setSelectedRequest] = useState<ApprovalItem | null>(null);
const [modalOpen, setModalOpen] = useState(false);
```

**Data fetching:**
- Single `fetchData` callback that passes filters to the API
- When `viewMode` changes to a calendar view, automatically:
  - Disable 'availability' from typeFilters (add both 'pending' and 'approved' to statusFilters)
  - Set `statusFilters` to `['pending', 'approved']`
- When switching back to list view, restore defaults: typeFilters `['time_off', 'availability']`, statusFilters `['pending']`
- For calendar views, include `start_date` and `end_date` in API call based on visible date range

**Default filter behavior:**
- List view: type = [time_off, availability], status = [pending]
- Weekly/Monthly view: type = [time_off] (availability disabled), status = [pending, approved]
- Shift Swaps tab: status = [pending]

**Step 2: Update CSS module**

Keep all existing card styles. Add new styles for:
- `.topTabs` — top-level tab bar (Requests / Shift Swaps)
- `.subToolbar` — wrapper for ApprovalsToolbar
- Adjust `.content` to be full-width when in calendar view (remove max-width constraint)

**Step 3: Commit**

```bash
git add apps/dashboard/components/pages/ApprovalsPage.tsx apps/dashboard/components/pages/ApprovalsPage.module.css
git commit -m "feat(approvals): restructure page with Requests/Shift Swaps tabs and filter state"
```

### Task 12: Implement RequestsList sub-component

**Files:**
- Modify: `apps/dashboard/components/pages/ApprovalsPage.tsx` (or extract to separate file)

Inline sub-component within ApprovalsPage that renders the card list for the Requests tab. Reuses the existing TimeOffCard and AvailabilityCard components (already in the file) with these changes:

- Cards are clickable — `onClick` opens RequestDetailModal
- Inline Approve/Deny buttons remain on cards for pending items
- Clicking inline Deny opens DenyReasonDialog directly (don't need to open modal first)
- Add `cursor: pointer` to `.card` CSS
- Sort: pending items first (oldest `created_at` first), then approved/denied by `reviewed_at` DESC

**Step 1: Update card components to be clickable and wire to modal**
**Step 2: Commit**

```bash
git add apps/dashboard/components/pages/ApprovalsPage.tsx
git commit -m "feat(approvals): clickable request cards opening detail modal"
```

### Task 13: Implement ShiftSwapsList sub-component

**Files:**
- Modify: `apps/dashboard/components/pages/ApprovalsPage.tsx`

Renders shift swap cards (same ShiftTradeCard pattern) for **swap** and **house_pickup** types only. Never show giveaway type.

- Filter API response to exclude `type === 'giveaway'` on both client and server
- Cards clickable → open RequestDetailModal
- Inline Approve/Deny on pending cards
- Simple status filter bar above the list (Pending | Approved | Denied toggle chips)

**Step 1: Implement with giveaway exclusion**
**Step 2: Commit**

```bash
git add apps/dashboard/components/pages/ApprovalsPage.tsx
git commit -m "feat(approvals): shift swaps list excluding giveaways"
```

---

## Phase 6: Weekly Calendar View

### Task 14: Create RequestsWeeklyCalendar component

**Files:**
- Create: `apps/dashboard/components/scheduling/RequestsWeeklyCalendar.tsx`
- Create: `apps/dashboard/components/scheduling/RequestsWeeklyCalendar.module.css`

CSS Grid layout matching ScheduleGrid's week view: `grid-template-columns: 200px repeat(7, 1fr)`.

**Props:**
```typescript
interface RequestsWeeklyCalendarProps {
  weekStart: Date; // Sunday
  timeOffRequests: TimeOffRequest[];
  employees: { id: string; full_name: string }[];
  onRequestClick: (request: ApprovalItem) => void;
}
```

**Data preparation:**
- Fetch all employees for the location (from existing employees API or inline Supabase call)
- Build a map: `employeeId → TimeOffRequest[]`
- Sort employees:
  1. Employees with pending requests (oldest `created_at` first)
  2. Employees with approved requests (alphabetical)
  3. Remaining employees (alphabetical)

**Grid rendering:**

```
Header row:  [corner cell] [Sun 3/3] [Mon 3/4] [Tue 3/5] ... [Sat 3/8]
Employee 1:  [name + meta] [bar─────────────────] [      ] [      ]
Employee 2:  [name       ] [      ] [   bar   ] [      ] [      ]
...
```

**Row labels (left column):**
- Employee full_name (`.empName` style from ScheduleGrid)
- Sticky left, 200px width

**Header cells:**
- Day name abbreviation + date number
- Today column gets `.todayHeader` highlight
- Past dates get `.pastCol` class with reduced opacity

**Time off bars:**
- Rendered as absolutely-positioned divs spanning across day columns
- For a request spanning Mon-Wed: the bar starts at the left edge of Mon's column and ends at the right edge of Wed's column
- Use `grid-column: start / end` on a bar element overlaying the cells, OR calculate pixel positions
- **Recommended approach:** Each employee row is a sub-grid or relative container. Bars are positioned using `grid-column` spanning the correct day columns.

**Bar styling by status:**
```css
.barPending {
  background: var(--ls-color-warning-soft);
  border: 1px solid var(--ls-color-warning-base);
  border-left: 3px solid var(--ls-color-warning-base);
  color: #92400e;
}
.barApproved {
  background: var(--ls-color-success-soft);
  border: 1px solid var(--ls-color-success-base);
  border-left: 3px solid var(--ls-color-success-base);
  color: var(--ls-color-success-soft-foreground);
}
.barPast {
  opacity: 0.45;
}
```

**Bar content:** Employee-irrelevant since it's in their row. Show: time range (e.g., "All day" or "9 AM – 5 PM"), and if there's a note, show truncated note text.

**Handling multi-day spans crossing week boundaries:**
- If `start_datetime` is before `weekStart`, clamp the bar to start at Sunday
- If `end_datetime` is after Saturday, clamp the bar to end at Saturday
- Use `Math.max(startDay, 0)` and `Math.min(endDay, 6)` for grid column indices

**Click:** Clicking a bar calls `onRequestClick` with the time off request wrapped as `{ kind: 'time_off', data: request }`.

**Empty rows:** Employees with no requests show empty cells (no bar).

**Step 1: Create component with grid layout, employee sorting, and bar rendering**
**Step 2: Create CSS module with bar styling and past-date dimming**
**Step 3: Commit**

```bash
git add apps/dashboard/components/scheduling/RequestsWeeklyCalendar.tsx apps/dashboard/components/scheduling/RequestsWeeklyCalendar.module.css
git commit -m "feat(approvals): weekly calendar view with time off bars"
```

### Task 15: Wire weekly calendar into ApprovalsPage

**Files:**
- Modify: `apps/dashboard/components/pages/ApprovalsPage.tsx`

**Step 1: Add employee fetching**

When in weekly or monthly view, fetch the employee list for the location:
```typescript
const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([]);

// Fetch employees when location changes
useEffect(() => {
  if (!orgId || !selectedLocationId) return;
  const fetchEmployees = async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/employees?org_id=${orgId}&location_id=${selectedLocationId}&fields=id,full_name&active=true`, { headers });
    if (res.ok) {
      const data = await res.json();
      setEmployees(data);
    }
  };
  fetchEmployees();
}, [orgId, selectedLocationId, getAccessToken]);
```

Note: Check if an employees API endpoint already exists that returns a simple list. If not, use a direct Supabase query via `createSupabaseClient()`.

**Step 2: Add date range to fetchData for calendar views**

When viewMode is 'weekly', compute start/end from `weekStart`:
```typescript
const startDate = formatDate(weekStart); // YYYY-MM-DD
const endDate = formatDate(addDays(weekStart, 6));
params.set('start_date', startDate);
params.set('end_date', endDate);
```

**Step 3: Render RequestsWeeklyCalendar when viewMode === 'weekly'**
**Step 4: Commit**

```bash
git add apps/dashboard/components/pages/ApprovalsPage.tsx
git commit -m "feat(approvals): wire weekly calendar view with employee data"
```

---

## Phase 7: Monthly Calendar View

### Task 16: Create RequestsMonthlyCalendar component

**Files:**
- Create: `apps/dashboard/components/scheduling/RequestsMonthlyCalendar.tsx`
- Create: `apps/dashboard/components/scheduling/RequestsMonthlyCalendar.module.css`

Traditional month grid: rows = weeks, columns = 7 days (Sun-Sat).

**Props:**
```typescript
interface RequestsMonthlyCalendarProps {
  monthStart: Date; // 1st of the month
  timeOffRequests: TimeOffRequest[];
  onRequestClick: (request: ApprovalItem) => void;
  onDayClick?: (date: Date) => void;
}
```

**Grid layout:**
```css
.monthGrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--ls-color-muted-soft);
  border-radius: 8px;
  overflow: hidden;
}
```

**Day cells:**
- Each cell shows the date number at top
- Below: small colored chips for each time off request that overlaps that day
- Chip shows employee name (truncated) with status-colored background
- Max 3 chips visible; if more, show "+N more" link
- Past dates: dimmed background
- Today: subtle highlight
- Days outside current month: very dimmed

**Chip styling:**
```css
.chipPending {
  background: var(--ls-color-warning-soft);
  color: #92400e;
  border-left: 2px solid var(--ls-color-warning-base);
}
.chipApproved {
  background: var(--ls-color-success-soft);
  color: var(--ls-color-success-soft-foreground);
  border-left: 2px solid var(--ls-color-success-base);
}
```

**Click:** Clicking a chip calls `onRequestClick`. Clicking "+N more" or the day itself could show a popover listing all requests for that day (optional — can be a follow-up).

**Date range for API:** First visible Sunday to last visible Saturday of the month grid (may include days from adjacent months).

**Step 1: Create component and CSS**
**Step 2: Wire into ApprovalsPage (similar to weekly — compute month date range for API)**
**Step 3: Commit**

```bash
git add apps/dashboard/components/scheduling/RequestsMonthlyCalendar.tsx apps/dashboard/components/scheduling/RequestsMonthlyCalendar.module.css apps/dashboard/components/pages/ApprovalsPage.tsx
git commit -m "feat(approvals): monthly calendar view with request chips"
```

---

## Phase 8: Final Wiring and Polish

### Task 17: Wire RequestDetailModal and DenyReasonDialog into ApprovalsPage

**Files:**
- Modify: `apps/dashboard/components/pages/ApprovalsPage.tsx`

**Step 1: Add modal state and handlers**

```typescript
const [selectedRequest, setSelectedRequest] = useState<ApprovalItem | null>(null);
const [modalOpen, setModalOpen] = useState(false);
const [denyDialogOpen, setDenyDialogOpen] = useState(false);
const [denyTarget, setDenyTarget] = useState<{ intent: string; id: string } | null>(null);
```

**Step 2: Wire card clicks to open modal**

All cards and calendar bars call:
```typescript
const handleRequestClick = (item: ApprovalItem) => {
  setSelectedRequest(item);
  setModalOpen(true);
};
```

**Step 3: Wire approve/deny from modal**

Modal's `onAction` calls the existing `handleAction` function, extended to accept denial reason params:
```typescript
const handleAction = async (intent: string, id: string, extra?: { denial_reason_id?: string; denial_message?: string }) => {
  // ... existing code plus include extra in POST body
};
```

**Step 4: Wire inline deny buttons to DenyReasonDialog**

Inline "Deny" buttons on cards open DenyReasonDialog directly (set `denyTarget` and `denyDialogOpen`).

**Step 5: Commit**

```bash
git add apps/dashboard/components/pages/ApprovalsPage.tsx
git commit -m "feat(approvals): wire modals and deny reason flow"
```

### Task 18: Update pending-count API to exclude giveaways

**Files:**
- Modify: `apps/dashboard/pages/api/scheduling/pending-count.ts`

**Step 1: Add giveaway exclusion to shift trades query**

```typescript
const tradesQuery = supabase
  .from('shift_trade_requests')
  .select('id', { count: 'exact', head: true })
  .eq('org_id', orgId)
  .in('status', ['open', 'pending_approval'])
  .neq('type', 'giveaway');  // Add this line
```

**Step 2: Commit**

```bash
git add apps/dashboard/pages/api/scheduling/pending-count.ts
git commit -m "fix(api): exclude giveaway trades from pending count"
```

### Task 19: Typecheck and final verification

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: No new errors

**Step 2: Run build**

Run: `pnpm --filter dashboard build`
Expected: Build succeeds

**Step 3: Manual verification**

- Navigate to /approvals with Plainview (05828) location selected
- Verify Requests tab shows 10 time off requests in History (approved status)
- Switch to weekly calendar — verify bars render on correct days
- Switch to monthly calendar — verify chips appear
- Verify filters work (toggle status, type)
- Verify clicking a card opens the detail modal
- Verify deny flow shows reasons and requires selection
- Switch to Shift Swaps tab — verify empty state (no swap data exists yet)
- Verify no giveaway items appear anywhere

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: typecheck and build fixes for approvals redesign"
```

---

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `supabase/migrations/20260303_approval_denial_reasons.sql` | DB migration for denial reasons |
| `apps/dashboard/pages/api/scheduling/denial-reasons.ts` | GET denial reasons by type |
| `apps/dashboard/pages/api/scheduling/overlapping-requests.ts` | GET overlapping time off for modal |
| `apps/dashboard/components/scheduling/DateNavigation.tsx` | Reusable week/month date navigation |
| `apps/dashboard/components/scheduling/DateNavigation.module.css` | DateNavigation styles |
| `apps/dashboard/components/scheduling/ApprovalsToolbar.tsx` | View toggle + type/status filters |
| `apps/dashboard/components/scheduling/ApprovalsToolbar.module.css` | ApprovalsToolbar styles |
| `apps/dashboard/components/scheduling/DenyReasonDialog.tsx` | Denial reason selection dialog |
| `apps/dashboard/components/scheduling/DenyReasonDialog.module.css` | DenyReasonDialog styles |
| `apps/dashboard/components/scheduling/RequestDetailModal.tsx` | Request detail + actions modal |
| `apps/dashboard/components/scheduling/RequestDetailModal.module.css` | RequestDetailModal styles |
| `apps/dashboard/components/scheduling/RequestsWeeklyCalendar.tsx` | Weekly grid calendar view |
| `apps/dashboard/components/scheduling/RequestsWeeklyCalendar.module.css` | Weekly calendar styles |
| `apps/dashboard/components/scheduling/RequestsMonthlyCalendar.tsx` | Monthly grid calendar view |
| `apps/dashboard/components/scheduling/RequestsMonthlyCalendar.module.css` | Monthly calendar styles |

### Modified Files
| File | Changes |
|------|---------|
| `apps/dashboard/lib/scheduling.types.ts` | Add DenialReason, view types, denial fields on request interfaces |
| `apps/dashboard/pages/api/scheduling/approvals.ts` | Enhanced GET with date range/multi-status, deny requires reason_id, exclude giveaways |
| `apps/dashboard/pages/api/scheduling/pending-count.ts` | Exclude giveaways from count |
| `apps/dashboard/components/pages/ApprovalsPage.tsx` | Full rewrite — new tabs, views, filters, modal wiring |
| `apps/dashboard/components/pages/ApprovalsPage.module.css` | New styles for tabs, calendar containers, clickable cards |
