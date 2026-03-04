# Employee Overview Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Overview tab (consolidated employee dashboard) and a Schedule tab (stub) to the Employee Modal.

**Architecture:** The Overview tab is a new component (`EmployeeOverviewTab`) rendered inside the existing `EmployeeModal`. It fetches OE data from the existing `/api/operational-excellence` endpoint, position averages via direct Supabase queries (reusing `fetch-position-averages.ts` logic), and discipline data using the same query patterns already in `EmployeeModal`. No new API routes are needed.

**Tech Stack:** React, MUI v7, Recharts (already in dashboard), Supabase client, CSS Modules, design tokens.

---

### Task 1: Update EmployeeModal Tab Types and Layout

**Files:**
- Modify: `apps/dashboard/components/CodeComponents/EmployeeModal.tsx`

**Step 1: Update the `initialTab` type to include new tabs**

In `EmployeeModal.tsx`, update the type union at line 37 and the default at line 294:

```typescript
// Line 37: Update type
initialTab?: "overview" | "pathway" | "pe" | "evaluations" | "discipline" | "schedule";

// Line 294: Change default from "discipline" to "overview"
initialTab = "overview",
```

**Step 2: Add the new tabs to the Tabs component**

At lines 1117-1121, add Overview before Pathway and Schedule after Discipline:

```typescript
<Tab label="Overview" value="overview" />
<Tab label="Pathway" value="pathway" />
<Tab label="Positional Excellence" value="pe" />
<Tab label="Evaluations" value="evaluations" />
<Tab label="Discipline" value="discipline" />
<Tab label="Schedule" value="schedule" />
```

**Step 3: Add tab content rendering**

At lines 1126-1129, add rendering for the new tabs:

```typescript
{currentTab === "overview" && renderOverviewTab()}
{currentTab === "pathway" && renderPathwayTab()}
{currentTab === "pe" && renderPETab()}
{currentTab === "evaluations" && renderEvaluationsTab()}
{currentTab === "discipline" && renderDisciplineTab()}
{currentTab === "schedule" && renderScheduleTab()}
```

**Step 4: Add renderScheduleTab function**

Add near the other render functions (after `renderEvaluationsTab` around line 1021):

```typescript
const renderScheduleTab = () => {
  return (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <Typography sx={{ fontFamily: "Satoshi", fontSize: "14px", color: "var(--ls-color-text-caption)" }}>
        Coming soon!
      </Typography>
    </Box>
  );
};
```

**Step 5: Add renderOverviewTab function**

Add a placeholder that will be replaced in Task 3:

```typescript
const renderOverviewTab = () => {
  if (!employee) return null;
  return (
    <EmployeeOverviewTab
      employee={employee}
      locationId={locationId}
    />
  );
};
```

Add the import at the top of the file:

```typescript
import { EmployeeOverviewTab } from "./EmployeeOverviewTab";
```

**Step 6: Update DrawerTabContainer for consistency**

In `apps/dashboard/components/CodeComponents/DrawerTabContainer.tsx`, update the `initialTab` type at line 16 to match:

```typescript
initialTab?: "overview" | "pathway" | "pe" | "evaluations" | "discipline" | "schedule";
```

**Step 7: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: May fail until EmployeeOverviewTab component exists (Task 2 creates it).

**Step 8: Commit**

```bash
git add apps/dashboard/components/CodeComponents/EmployeeModal.tsx apps/dashboard/components/CodeComponents/DrawerTabContainer.tsx
git commit -m "feat: add Overview and Schedule tabs to EmployeeModal"
```

---

### Task 2: Create EmployeeOverviewTab Component Skeleton

**Files:**
- Create: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx`
- Create: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.module.css`

**Step 1: Create CSS Module**

Create `EmployeeOverviewTab.module.css` with the base layout styles:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
  background-color: var(--ls-color-bg-container);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sectionTitle {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--ls-color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card {
  border: 1px solid var(--ls-color-muted-border);
  border-radius: 12px;
  padding: 16px;
  background-color: var(--ls-color-bg-container);
}

.cardRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.cardRow + .cardRow {
  border-top: 1px solid var(--ls-color-muted-border);
}

.scoreCircle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-family: "Satoshi", sans-serif;
  font-size: 24px;
  font-weight: 700;
}

.pillarsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}

.pillarCard {
  border: 1px solid var(--ls-color-muted-border);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pillarName {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--ls-color-text-caption);
}

.pillarScore {
  font-family: "Satoshi", sans-serif;
  font-size: 20px;
  font-weight: 700;
}

.changeIndicator {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.changePositive {
  color: var(--ls-color-success-base);
}

.changeNegative {
  color: var(--ls-color-destructive-base);
}

.changeNeutral {
  color: var(--ls-color-text-caption);
}

.progressBar {
  height: 8px;
  border-radius: 4px;
  background-color: var(--ls-color-muted-soft);
  overflow: hidden;
}

.progressFill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.positionRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
}

.positionRow + .positionRow {
  border-top: 1px solid var(--ls-color-muted-border);
}

.positionName {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--ls-color-text-secondary);
}

.positionAvg {
  font-family: "Satoshi", sans-serif;
  font-size: 16px;
  font-weight: 700;
  min-width: 40px;
  text-align: right;
}

.ratingCount {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-text-caption);
  margin-left: 8px;
}

.stubMessage {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  color: var(--ls-color-text-caption);
  text-align: center;
  padding: 24px 16px;
}

.twoColumn {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.statValue {
  font-family: "Satoshi", sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--ls-color-text-primary);
}

.statLabel {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-text-caption);
}

.recentItem {
  font-family: "Satoshi", sans-serif;
  font-size: 13px;
  color: var(--ls-color-text-secondary);
}

.recentDate {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-text-caption);
}

.noData {
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  color: var(--ls-color-text-caption);
  padding: 16px;
  text-align: center;
}
```

**Step 2: Create the component skeleton with all sections as stubs**

Create `EmployeeOverviewTab.tsx`:

```typescript
"use client";

import * as React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee } from "@/lib/supabase.types";
import styles from "./EmployeeOverviewTab.module.css";

export interface EmployeeOverviewTabProps {
  employee: Employee;
  locationId: string;
}

export function EmployeeOverviewTab({ employee, locationId }: EmployeeOverviewTabProps) {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Placeholder — will be replaced with real data fetching
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [employee.id, locationId]);

  if (loading) {
    return (
      <Box className={styles.container}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
      </Box>
    );
  }

  return (
    <Box className={styles.container}>
      {/* Section 1: Operational Excellence */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Operational Excellence</Typography>
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 2: Positional Ratings */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Positional Ratings</Typography>
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 3: Discipline */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Discipline</Typography>
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 4: Evaluations (stub) */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Evaluations</Typography>
        <Box className={styles.stubMessage}>Coming soon!</Box>
      </Box>

      {/* Section 5: Pathway (stub) */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Pathway</Typography>
        <Box className={styles.stubMessage}>Coming soon!</Box>
      </Box>
    </Box>
  );
}
```

**Step 3: Verify typecheck and build pass**

Run: `pnpm typecheck && pnpm --filter dashboard build`
Expected: PASS — skeleton component satisfies the import from Task 1.

**Step 4: Commit**

```bash
git add apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx apps/dashboard/components/CodeComponents/EmployeeOverviewTab.module.css
git commit -m "feat: add EmployeeOverviewTab skeleton component"
```

---

### Task 3: Implement OE Section

**Files:**
- Modify: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx`

**Context:** The existing `/api/operational-excellence` API returns an `employees` array where each entry has `{ employeeId, name, overallScore, priorOverallScore, change, pillarScores, priorPillarScores, positions, ratingCount }`. The API also returns a `pillars` array with `{ id, name, weight, displayOrder, score }`. We call this API, find our employee in the array, and display their OE data.

Pillar colors are defined in `OperationalExcellencePage.tsx` by `displayOrder`:
```
1: '#12b76a' (green), 2: '#f59e0b' (amber), 3: '#8b5cf6' (purple), 4: '#3b82f6' (blue), 5: '#ec4899' (pink)
```

**Step 1: Add OE state and fetch logic**

Replace the placeholder loading state with real data fetching. Add state variables and a `fetchOEData` function that calls `/api/operational-excellence` with the location_id and a 90-day trailing window, then filters the `employees` array for the matching `employeeId`.

Key details:
- Start date: 90 days ago from today (`new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)`)
- End date: today
- Find employee by matching `employeeId === employee.id`
- Store: the employee's OE data + the pillars array (for names/colors/weights)

**Step 2: Render the OE section**

Replace the OE placeholder with:
- A large overall score in a colored circle (use `scoreCircle` CSS class)
- Color logic: score < 40 = `var(--ls-color-destructive-base)`, 40-60 = `var(--ls-color-warning-base)`, 60-80 = `var(--ls-color-success-base)`, 80+ = `var(--ls-color-brand-base)`
- Period-over-period change indicator next to the score
- A grid of pillar cards (using `pillarsGrid` + `pillarCard` classes), each showing pillar name, score, and change vs prior period
- Pillar card left border colored by pillar (using the `PILLAR_COLORS` map by `displayOrder`)
- If employee not found in OE data: show "No ratings in this period" message

**Step 3: Verify typecheck passes**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx
git commit -m "feat: implement OE section in EmployeeOverviewTab"
```

---

### Task 4: Implement Positional Ratings Section

**Files:**
- Modify: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx`

**Context:** Position averages use the same logic as certification (`lib/fetch-position-averages.ts`). The function `getEmployeePositionAverages` returns `{ employeeId, employeeName, positions: Record<string, number> }` where the number is the rolling last-4 average (on 1-3 scale). However, this function requires an `Employee` object and a Supabase client. Since we're in a component, we'll query directly.

The query pattern: fetch all ratings for this employee from `ratings` table, group by `position` field, take the last 4 per position, and average their `rating_avg` column.

**Step 1: Add position averages fetch logic**

Add a function `fetchPositionAverages` that:
1. Queries `ratings` table: `select('position, position_id, rating_avg, created_at').eq('employee_id', employee.id).order('created_at', { ascending: false })`
2. Groups results by `position` (string)
3. For each position, takes the last 4 ratings and averages their `rating_avg`
4. Also counts total ratings per position
5. Store in state as `Array<{ position: string; average: number; count: number }>`

**Step 2: Render the positional ratings section**

Replace the placeholder with:
- A card containing rows (using `positionRow` class), one per position
- Each row: position name (left), colored average score (right), rating count badge
- Color logic for the average: `>= 2.75` = `var(--ls-color-success-base)`, `2.0-2.74` = `var(--ls-color-warning-base)`, `< 2.0` = `var(--ls-color-destructive-base)`
- If count < 4, show "(X of 4 ratings)" indicator using `ratingCount` class
- If no positions: show "No ratings found" message

**Step 3: Verify typecheck passes**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx
git commit -m "feat: implement positional ratings section in EmployeeOverviewTab"
```

---

### Task 5: Implement Discipline Summary Section

**Files:**
- Modify: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx`

**Context:** Discipline data uses the same query patterns as `EmployeeModal.fetchEmployeeData()`. We need:
1. Infractions from last 90 days (sum points)
2. Disc actions from last 90 days (count)
3. Max threshold from `disc_actions_rubric` (org-level first, fallback to location-level)

The location's `org_id` is needed for the rubric query. Fetch it from the `locations` table.

**Step 1: Add discipline data fetch logic**

Add a function `fetchDisciplineData` that:
1. Gets `org_id` from `locations` table: `.select('org_id').eq('id', locationId).single()`
2. Fetches infractions (last 90 days): `.from('infractions').select('id, points, infraction_date, infraction').eq('employee_id', employee.id).eq('location_id', locationId).gte('infraction_date', ninetyDaysAgo).order('infraction_date', { ascending: false })`
3. Fetches disc_actions count (last 90 days): `.from('disc_actions').select('id').eq('employee_id', employee.id).eq('location_id', locationId).gte('action_date', ninetyDaysAgo)`
4. Fetches `disc_actions_rubric` for the org (org-level, `location_id IS NULL`), sorted by `points_threshold` ascending. If empty, falls back to location-level.
5. Calculates: `totalPoints = infractions.reduce((sum, inf) => sum + (inf.points || 0), 0)`
6. Gets `maxThreshold = sortedRubric[sortedRubric.length - 1]?.points_threshold || 100`
7. Gets most recent infraction from the array (first item since sorted desc)

Store all in state.

**Step 2: Render the discipline section**

Replace the placeholder with:
- Two-column stat layout (using `twoColumn` class):
  - Left: Total points as large number (colored by severity) + "/ {maxThreshold}" label
  - Right: Infraction count + Disciplinary action count
- A progress bar showing `totalPoints / maxThreshold` (clamped at 100%)
  - Bar color: green when < 33% of max, yellow 33-66%, red > 66%
- Most recent infraction shown below: type + date (using `recentItem` and `recentDate` classes)
- If zero infractions: show clean state "No infractions in the last 90 days" with a green checkmark or clean styling

**Step 3: Verify typecheck passes**

Run: `pnpm typecheck`

**Step 4: Commit**

```bash
git add apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx
git commit -m "feat: implement discipline summary section in EmployeeOverviewTab"
```

---

### Task 6: Consolidate Data Fetching and Polish

**Files:**
- Modify: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx`
- Modify: `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.module.css`

**Step 1: Consolidate into a single useEffect**

Combine all three data fetches (OE, position averages, discipline) into a single `useEffect` that runs on `[employee.id, locationId]`. Use `Promise.all` for the Supabase queries (position averages + discipline) since they're independent. The OE fetch is a separate `fetch()` call that can run in parallel.

Set `loading = true` at start, `loading = false` when all three resolve. Handle errors gracefully — if one section fails, still show the others.

**Step 2: Add loading skeleton**

Update the loading state to show section-specific skeletons:
- OE section: circle skeleton + grid of small card skeletons
- Position ratings: list item skeletons
- Discipline: two-column stat skeletons + bar skeleton

**Step 3: Polish visual consistency**

Review the component against the existing EmployeeModal styling patterns:
- Ensure all Typography uses `fontFamily: "Satoshi"`
- Ensure all colors use CSS variables (no hardcoded hex except pillar colors which match OE page)
- Ensure border radii match (12px for cards, consistent with modal)
- Add subtle section dividers between sections (optional, but matches the card-heavy style)

**Step 4: Verify typecheck and build pass**

Run: `pnpm typecheck && pnpm --filter dashboard build`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx apps/dashboard/components/CodeComponents/EmployeeOverviewTab.module.css
git commit -m "feat: consolidate data fetching and polish EmployeeOverviewTab"
```

---

### Task 7: Final Verification

**Files:**
- All modified files from Tasks 1-6

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS with no new errors.

**Step 2: Run production build**

Run: `pnpm --filter dashboard build`
Expected: PASS — this matches what CI runs on PRs.

**Step 3: Verify callers of EmployeeModal**

Check that existing `initialTab` values still work. These callers already set specific tabs and should not need changes:
- `RosterTable.tsx` (line 1699): `initialTab="pe"` — still valid
- `OperationalExcellencePage.tsx` (line 1143): `initialTab="pe"` — still valid
- `DisciplineTable.tsx` (line 639): `initialTab="discipline"` — still valid
- `PELeaderboard.tsx` (line 708): `initialTab="pe"` — still valid
- `RecommendedActions.tsx` (line 984): `initialTab="discipline"` — still valid
- `PositionalRatings.tsx` (line 2943): `initialTab="pe"` — still valid

No callers need updating since the default changed to `"overview"` and all explicit values are still in the type union.

**Step 4: Commit if any fixes were needed**

Only commit if fixes were required. Otherwise, skip.

---

## Reference: Key File Paths

| File | Purpose |
|------|---------|
| `apps/dashboard/components/CodeComponents/EmployeeModal.tsx` | Main modal — add tabs + import OverviewTab |
| `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.tsx` | NEW — Overview tab content |
| `apps/dashboard/components/CodeComponents/EmployeeOverviewTab.module.css` | NEW — Styles |
| `apps/dashboard/components/CodeComponents/DrawerTabContainer.tsx` | Update initialTab type for consistency |
| `apps/dashboard/pages/api/operational-excellence.ts` | Existing API — called by OE section |
| `apps/dashboard/lib/fetch-position-averages.ts` | Reference for position avg calculation logic |
| `apps/dashboard/components/pages/OperationalExcellencePage.tsx` | Reference for pillar colors, chart patterns |

## Reference: Design Tokens for Colors

```
--ls-color-brand-base          Brand green (scores 80+)
--ls-color-success-base        Green (good)
--ls-color-warning-base        Yellow/amber (caution)
--ls-color-destructive-base    Red (bad)
--ls-color-text-primary        Main text
--ls-color-text-secondary      Section labels
--ls-color-text-caption        Muted/helper text
--ls-color-muted-border        Borders
--ls-color-muted-soft          Light backgrounds
--ls-color-bg-container        Card/container backgrounds
```
