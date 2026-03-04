# Employee Overview Tab Design

**Date**: 2026-03-04
**Status**: Approved

## Summary

Add two new tabs to the Employee Modal: **Overview** (consolidated employee dashboard) and **Schedule** (stub). The Overview tab aggregates OE scores, positional ratings, discipline data, and placeholder sections for evaluations and pathway into a single at-a-glance view.

## Tab Layout

New tab order (6 tabs total):

| # | Tab | Status |
|---|-----|--------|
| 1 | **Overview** | NEW — consolidated employee dashboard |
| 2 | Pathway | Existing stub |
| 3 | Positional Excellence | Existing (implemented) |
| 4 | Evaluations | Existing stub |
| 5 | Discipline | Existing (implemented) |
| 6 | **Schedule** | NEW — stub |

The `initialTab` prop on `EmployeeModal` should support `"overview"` and `"schedule"` values. Default tab changes from `"pe"` to `"overview"`.

## Overview Tab Sections

### 1. Operational Excellence

- Large overall OE score (0-100), color-coded
- Each pillar displayed as a compact row: pillar name, score, period-over-period change
- Period: trailing 90 days (matching OE page default)
- Data source: existing `/api/operational-excellence` endpoint with employee-level data
- Color coding: matches OE page conventions (red < 40, yellow 40-60, green 60-80, dark green > 80)

### 2. Positional Ratings (Last 4 Averages)

- One row per position the employee has been rated in
- Shows rolling last-4 average for each position
- Data source: reuse logic from `lib/fetch-position-averages.ts` (same as certification system)
- Color coding: green >= 2.75, yellow 2.0-2.74, red < 2.0 (matching rating threshold conventions)
- Shows total rating count per position

### 3. Discipline Summary

- Current discipline points displayed against max threshold (visual progress bar)
- Max threshold = highest `points_threshold` from `disc_actions_rubric` for the org
- Count of infractions in last 90 days
- Count of disciplinary actions in last 90 days
- Most recent infraction: date + type as quick reference
- Data source: same queries used by existing Discipline tab

### 4. Evaluations (Stub)

- "Coming soon" placeholder
- Future: evaluation history, next scheduled evaluation, certification status (for orgs with certifications enabled)

### 5. Pathway (Stub)

- "Coming soon" placeholder
- Future: pathway progress, completed modules

## Schedule Tab (Stub)

- "Coming soon" placeholder
- Future: employee schedule view

## Data Fetching

The Overview tab needs data from multiple sources. To keep it simple and avoid new API routes:

1. **OE data**: Call existing `/api/operational-excellence?location_id=X` and filter to the specific employee from the `employees` array in the response
2. **Position averages**: New lightweight fetch using the existing `fetch-position-averages.ts` logic, either via a small API endpoint or by adapting the existing ratings query
3. **Discipline data**: Reuse the same Supabase queries already in the Discipline tab (infractions + disc_actions + disc_actions_rubric for max threshold)

## Insufficient Data Handling

- If employee has no ratings in the period: OE section shows "No ratings in this period"
- If employee has no infractions: Discipline section shows clean state ("No infractions")
- Position averages with < 4 ratings show the available average with "(X of 4 ratings)" indicator

## Future: Employee Health Index

This Overview tab is designed to eventually support a composite Employee Health Index (EHI). The planned formula:

```
EHI = (OE_score x 0.75) + (Discipline_score x 0.25)

Where:
  Discipline_score = 100 x max(0, 1 - current_points / max_threshold)
```

This can be added as a top-level score card on the Overview tab once the underlying sections prove valuable. Additional components (evaluations, pathway, certification) can be incorporated into the formula later.

## Files to Modify/Create

| File | Action |
|------|--------|
| `components/CodeComponents/EmployeeModal.tsx` | Add Overview + Schedule tabs, update tab order, add `initialTab` values |
| `components/CodeComponents/EmployeeOverviewTab.tsx` | NEW — Overview tab content component |
| `components/CodeComponents/EmployeeOverviewTab.module.css` | NEW — Styles |
| Callers of EmployeeModal | Update any hardcoded `initialTab` values if needed |
