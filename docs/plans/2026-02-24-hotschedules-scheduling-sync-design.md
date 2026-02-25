# HotSchedules Scheduling Sync — Design Document

**Date:** 2026-02-24
**Status:** Draft — Awaiting Approval

---

## Overview

Extend the existing HotSchedules employee sync system to also capture and sync scheduling data (shifts, jobs/roles, sales forecasts, benchmarks, time-off, and availability). The bookmarklet will be updated to run on the HS scheduling page and capture all available data. What gets applied to Levelset depends on org feature flags and user-selected toggles in a redesigned sync modal.

---

## HotSchedules API Reference (from HAR Analysis)

All data below was captured from a live HAR file for CFA Plainview [TX] FSU (store 05828, clientId `55001358`, groupId `559961474` "Lee Rutter CFA").

### Authentication

- **Session-based cookie auth**: `JSESSIONID=<session_id>` + `hs_user=MQ` + `Client-Pod=e8q7S2Q4x`
- **Header**: `X-Requested-With: XMLHttpRequest`
- **Cache buster**: All URLs append `?_=<timestamp>`
- **Base URL**: `https://app.hotschedules.com`

### HS Data Model Hierarchy

```
Company (263043 "Chick-Fil-A Custom LIVE")
  └── Group/Org (559961474 "Lee Rutter CFA")
        └── Client/Store (55001358 "CFA Plainview [TX] FSU (05828)")
              ├── Roles/Schedules (9): Leadership, FOH, BOH, Training, Other, etc.
              │     └── Jobs (135): FOH General, Cashier, Drive Thru, BOH General, Prep, etc.
              ├── Employees (302 active)
              │     ├── userJobs (employee <-> job with pay rates)
              │     ├── schedules (which roles they can work)
              │     ├── availability (weekly time slots)
              │     └── skillLevels (01, 02, 03)
              ├── Shifts (organized by week, 3-week window)
              │     └── Each: ownerId, jobId, roleId, date, time, duration, pay
              └── Forecasts
                    ├── Daily: Sales ($) + Transactions (count)
                    └── 15-min intervals: Sales + Transactions
```

### Core Scheduling Endpoints

#### 1. Bootstrap — `/hs/spring/scheduling/bootstrap`
Returns all config data for the scheduling UI on page load.

**Key fields:**
- `id` — clientId (store)
- `userId` — current user's employeeId
- `currentWeekStartDate` — e.g. `"2026-02-22"`
- `utcOffset` — minutes from UTC (e.g. `-360` for CST)
- `tz` — timezone string (e.g. `"America/Chicago"`)
- `scheduleMinuteInterval` — `15`
- `clientWorkWeekStart` — `6` (Saturday)
- `userJobs[]` — employee-to-job assignments with pay rates (662 items)
  - `{ employeeId, jobId, skillLevel, skillLevelId, payRate, primary }`
- `jobs[]` — job definitions (135 items)
  - `{ id, name, defaultScheduleId, externalRef, payRate, visible, disabled, shortName }`
- `skills[]` — skill levels: `[{ skillId, rank, name: "01"/"02"/"03" }]`
- `schedules[]` — role/schedule groups (9 items)
  - `{ id, name, disabled }` — e.g. "Back of House", "Front of House"
- `dayParts[]` — shift template definitions
- `clientSettings{}` — 62 feature flags

#### 2. Shifts — `GET /hs/spring/scheduling/shift/?start={ISO}&end={ISO}`
Returns all shifts for a date range (typically 3 weeks).

**Shift object schema:**
```json
{
  "id": -416763347,              // Unique shift ID
  "ownerId": 1931684597,         // Employee ID assigned
  "startDate": "2026-03-07",     // YYYY-MM-DD
  "startTime": "13:00",          // HH:MM 24h
  "duration": 30,                // Minutes (range: 30-720)
  "jobId": 1094373238,           // Job position ID
  "roleId": 1094373027,          // Role/schedule group ID
  "house": false,                // true = open/unassigned
  "scheduled": true,             // actively scheduled
  "regHours": 0.5,
  "ovtHours": 0,
  "regPay": 600,                 // CENTS
  "ovtPay": 0,                   // CENTS
  "totalCost": 600,              // CENTS
  "clientId": 55001358,
  "shiftNote": null,             // Free text
  "mbpBreaks": [],               // Meal/break planning
  "special": false,
  "offered": false
}
```

**Distribution in capture:** 939 local shifts + 20 shared-store shifts across 3 weeks.

#### 3. Posted Shifts — `GET /hs/spring/shifts/posted/?start={DATE}&end={DATE}`
Same schema as shifts, filtered to published/posted shifts only.

#### 4. Week Status — `GET /hs/spring/scheduling/week/{YYYY-MM-DD}/`
```json
{
  "weekStartDate": "2026-02-22",
  "forecastsExist": true,
  "statuses": [{
    "roleId": 1094373019,
    "status": 100,                // 100 = Published, 0 = Not Started
    "employeeId": 356100846       // Who published
  }]
}
```

#### 5. Employee List — `GET /hs/spring/client/employee/?addranksonhidepay=true`
302 employees with full schema:
```json
{
  "id": 9592969,
  "name": "Elizabeth Plasencio",
  "firstname": "Elizabeth",
  "lastname": "Plasencio",
  "displayName": "Elizabeth",
  "email": "lizzyplasencio97@gmail.com",
  "type": 0,
  "visible": true,
  "active": true,
  "homeClientId": 55001358,
  "birthDate": 1109570400000,     // Unix ms
  "hireDate": 1767993642687,      // Unix ms
  "hrId": "3812409",
  "rank": 90,
  "rankLabel": "Team Member",
  "salaried": false,
  "schedules": [1094373021, 1094373025],  // Role IDs
  "primaryJobId": 1094373221,
  "contactNumber": {
    "formatted": "(806) 221-1640"
  }
}
```

#### 6. Employee User Types — `GET /hs/spring/client/employee-user-types/`
Keyed by employeeId:
```json
{
  "9592969": [{
    "attrValue": "FullTimeHourly"  // FullTimeHourly, PartTimeHourly, etc.
  }]
}
```

#### 7. Employee Status — `GET /hs/spring/client/employee-status/`
```json
{ "employeeId": 9592969, "type": 1, "startDate": "2026-01-09" }
```

#### 8. Jobs — `GET /hs/spring/client/jobs/`
135 jobs. Key active jobs at this CFA:

| Job Name | Short | Schedule Group |
|----------|-------|---------------|
| Leadership | Lead | Leadership |
| Shift Leader | SL | Leadership |
| Team Leader | TL | Leadership |
| FOH General | FOH | Front of House |
| Cashier | Cash | Front of House |
| Dining Room Host | Host | Front of House |
| Drive Thru | DT | Front of House |
| Drive Thru Outside | DTO | Front of House |
| Drive Thru Order Taker | DTOT | Front of House |
| BOH General | BOH | Back of House |
| Boards | Bds | Back of House |
| Chicken | Ckn | Back of House |
| Prep | Prep | Back of House |

Job schema:
```json
{
  "id": 1094373036,
  "jobName": "Leadership",
  "shortName": "Lead",
  "payRate": 0,
  "defaultScheduleId": 1094373019,  // Links to role
  "disabled": false,
  "visible": false
}
```

#### 9. Roles — `GET /hs/spring/client/roles/`
9 roles: Leadership, Training, Marketing, Front of House, Back of House, Other, xxPrimary Jobs (disabled), Delivery, Beyond the Restaurant.

### Sales Forecasting Endpoints

#### 10. Forecast Config — `GET /hs/spring/forecast/config/`
```json
{
  "interval": 15,
  "clientWorkWeekStart": 6,        // Saturday
  "clientName": "CFA Plainview [TX] FSU (05828)",
  "rvcs": [{ "id": -2, "name": "All" }],
  "schedulesMap": { ... }          // Role schedule status
}
```

#### 11. Daily Forecast Summary — `GET /hs/spring/forecast/forecast-summary/{YYYY-MM-DD}`
```json
{
  "projectedVolume": [
    { "date": "2026-02-23", "volume": 846, "storeName": "Transactions", "storeType": 6 },
    { "date": "2026-02-23", "volume": 14076.47, "storeName": "Sales", "storeType": 0 },
    // ... per day, two entries (Sales + Transactions)
  ]
}
```
Sunday has $0 (CFA is closed).

#### 12. LP Forecast Metadata — `GET /hs/spring/forecast/lp-forecast/?date={YYYY-MM-DD}`
Returns forecast IDs needed for 15-minute data:
```json
[{ "forecastId": 1011375, "creationDate": "2026-02-24 03:56:49" }]
```

#### 13. 15-Minute Interval Forecast — `GET /hs/spring/forecast/lp-store-volume-data/?forecastId={id}`
1,389 records. Each:
```json
{
  "forecastId": 1011375,
  "dateTime": "2026-02-23T06:15:00.000",
  "storeVolume": 9.6708,          // Dollar amount
  "volumeTypeId": 0               // 0=Sales, 6=Transactions
}
```
Covers 11 operating days, ~06:15–22:00, in 15-min intervals.

#### 14. SLS Projected Total — `GET /hs/spring/forecast/sls-projected-total/?weekStartDate={DATE}`
Daily sales projections for the week:
```json
[
  { "dateOfBusiness": "2026-02-22", "amount": 0 },        // Sunday (closed)
  { "dateOfBusiness": "2026-02-23", "amount": 14076.4697 },
  { "dateOfBusiness": "2026-02-24", "amount": 12777.1904 },
  // ... through Saturday
]
```

#### 15. Benchmark Labor Hours — `GET /hs/spring/benchmark/sales?amount={sales}&date={DATE}`
Per-day labor hour targets by peer percentile:
```json
{
  "benchmarkLevels": [
    { "benchmarkLabel": "Top 10%", "benchmarkHours": 178.251 },
    { "benchmarkLabel": "Top 20%", "benchmarkHours": 182.139 },
    { "benchmarkLabel": "Top 33%", "benchmarkHours": 186.43 },
    { "benchmarkLabel": "Top 50%", "benchmarkHours": 191.604 }
  ]
}
```

### Time-Off & Availability Endpoints

#### 16. Time-Off Requests — `GET /hs/rest-session/timeoff/range/?start={ISO}&end={ISO}`
41 requests. Each:
```json
{
  "id": 18802396,
  "employeeId": 1499349476,
  "requestType": 0,
  "note": "Out of Town",
  "startDateTime": "2026-02-21T00:00:00.000-06:00",
  "endDateTime": "2026-02-22T00:00:00.000-06:00"
}
```

#### 17. Time-Off Status — `GET /hs/rest-session/timeoff/range/status/?start={ISO}&end={ISO}`
```json
{ "timeoffRangeId": 18761216, "status": "Approved" }
```

#### 18. Availability — `GET /hs/rest-session/availability-calendar/?minStatus=0&start={ISO}&end={ISO}`
76 records. Each:
```json
{
  "employeeId": 9592969,
  "approvalStatus": 1,
  "ranges": [{
    "startTime": "00:00",
    "endTime": "06:00",
    "weekDay": 1               // 1=Sun through 7=Sat
  }],
  "threshold": {
    "hoursInWeekMax": null,
    "daysInWeekMax": null
  }
}
```

### Other Useful Endpoints

#### 19. Shift Trades — `GET /hs/spring/shift-trades/sources?released=true`
20 released shifts. Each: `{ sourceId, ownerId, reason: "Personal", type: 1 }`

#### 20. Shared Clients — `GET /hs/spring/client/shared-clients`
3,339 other CFA locations for employee sharing.

#### 21. Store Config — `GET /hs/spring/my/clients`
```json
{
  "id": 55001358,
  "clientName": "CFA Plainview [TX] FSU (05828)",
  "externalRef": 5828,
  "workWeekStartId": 1,
  "timeZone": "US/Central",
  "avgWage": 1306               // Cents ($13.06/hr)
}
```

#### 22. Hierarchy — `GET /hs/spring/my/client/hierarchy-info`
```json
{
  "clientId": 55001358,
  "groupName": "Lee Rutter CFA",
  "companyName": "Chick-Fil-A Custom LIVE"
}
```

### Money & Time Conventions

- **Pay fields** (`regPay`, `ovtPay`, `totalCost`, `avgWage`): **cents**
- **Forecast volumes** (`storeVolume`, SLS projected `amount`): **dollars**
- **Timestamps** (`birthDate`, `hireDate`): Unix **milliseconds**
- **Shift duration**: **minutes**
- **Timezone**: `America/Chicago` (UTC-6)
- **Work week start**: Saturday (clientWorkWeekStart: 6)

---

## Existing Levelset Infrastructure

### Current Employee Sync Flow

```
User runs bookmarklet on HS staff page
  → Pastes employee JSON manually
  → POST /api/employees/sync-hotschedules
  → Analyze: new/modified/terminated (no DB writes)
  → Creates hs_sync_notifications record
  → Raw data uploaded to hs_script_updates storage bucket
  → SyncEmployeesModal polls for notification
  → User reviews changes (DataGrid with editable fields)
  → POST /api/employees/confirm-sync
  → Creates/updates/deactivates employees
```

### Existing Scheduling Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `schedules` | One per location/week | location_id, week_start, status (draft/published), total_hours, total_labor_cost |
| `shifts` | Individual shift slots | schedule_id, position_id, shift_area_id, shift_date, start_time, end_time, break_minutes, is_house_shift |
| `shift_assignments` | Employee→shift (1:1 max) | shift_id, employee_id, projected_cost |
| `setup_templates` | Position slot templates | org_id, name, zone (FOH/BOH), priority |
| `setup_template_slots` | Slot counts per 30-min increment | template_id, position_id, time_slot, slot_count |
| `setup_assignments` | Employee→position within shift | shift_id, employee_id, position_id, assignment_date, start/end time |
| `break_rules` | Org-level break policies | break_duration_minutes, trigger_hours |
| `scheduling_areas` | FOH/BOH/Administrative zones | org_id, name, display_order |
| `org_positions` | Positions with scheduling columns | position_type (standard/scheduling_only), area_id, scheduling_enabled |

### Feature Flag System

- **Table**: `org_features` with `(org_id, feature_key, enabled)` composite unique
- **Key**: `F.SCHEDULING = 'scheduling'`
- **Tier**: Pro
- **Check**: `useOrgFeatures().hasFeature(F.SCHEDULING)`
- **Admin bypass**: Levelset Admins see scheduling regardless

---

## Design: New HS Sync Flow

### Bookmarklet Changes

The bookmarklet will be updated to:
1. Run on the **HS scheduling page** (not the staff page)
2. Scrape the scheduling page DOM for all available data
3. Capture: employees, shifts, jobs, roles, forecasts, time-off, availability, benchmarks
4. Send **all captured data** to a single endpoint in one payload
5. Show loading/success/error indicators as before

**Data capture approach**: DOM scraping from the HS scheduling page. If HS changes their UI, we adjust the scraping logic. The user navigates to the scheduling page and runs the bookmarklet. Instructions will be updated accordingly.

### New Unified Sync Endpoint

`POST /api/employees/sync-hotschedules` will be extended (or a new endpoint created) to accept the expanded payload:

```typescript
{
  employees: HotSchedulesEmployee[],     // Already supported
  shifts?: HotSchedulesShift[],          // NEW
  jobs?: HotSchedulesJob[],              // NEW
  roles?: HotSchedulesRole[],            // NEW
  forecasts?: {                          // NEW
    daily?: HotSchedulesForecastDaily[],
    intervals?: HotSchedulesForecastInterval[],
    benchmarks?: HotSchedulesBenchmark[],
  },
  timeOff?: HotSchedulesTimeOff[],       // NEW
  availability?: HotSchedulesAvailability[], // NEW
  weekStartDate?: string,               // NEW — the week being viewed
  location_id?: string,
  org_id?: string,
}
```

**All data is always captured and stored** regardless of what the user chooses to apply. Raw data goes to `hs_script_updates` storage bucket for audit trail and future use.

### Redesigned Sync Modal

The `SyncEmployeesModal` will be redesigned as a multi-step flow:

#### Step 1: Sync Configuration
- Display **detected week** from the HS data (e.g. "Feb 22 – Feb 28, 2026") — user must confirm
- **Two toggles**:
  - **Roster Sync**: Always ON, disabled (cannot be turned off)
  - **Schedule Sync**: OFF by default, can be toggled ON
- Schedule toggle **only visible** when org has `F.SCHEDULING` feature flag enabled
- If org doesn't have scheduling feature, modal looks identical to current flow
- "Continue" button proceeds to Step 2

#### Step 2: Roster Review (existing flow, enhanced)
- Same DataGrid showing new/modified/terminated employees
- Same editable fields (role, FOH/BOH, availability)
- Same manual matching capability
- "Apply Roster Changes" button applies the roster sync
- If schedule toggle is OFF → Done
- If schedule toggle is ON → Proceed to Step 3

#### Step 3: Position Mapping (first sync only, or when new positions detected)
- Show all HS jobs that are **actually used in the schedule** for this week
- For each HS job, user selects which existing Levelset position it maps to (dropdown)
- Unmapped jobs → auto-create as `scheduling_only` positions
- This mapping is stored and reused for future syncs
- Skip this step if all positions are already mapped

#### Step 4: Schedule Review
- Show shifts grouped by **team member** (employee name as section header)
- Under each employee, show their shifts for the week:
  - Date, start time, end time, position, area (FOH/BOH)
  - Color-coded: 🟢 New, 🟡 Modified, 🔴 Removed
- Summary stats at top: X new shifts, Y modified, Z removed
- "Apply Schedule Changes" button overwrites Levelset scheduling data for the confirmed week only

### Data Flow

```
User on HS Scheduling Page → Runs Bookmarklet
  → Scrapes ALL data (employees, shifts, jobs, roles, forecasts, etc.)
  → POST /api/employees/sync-hotschedules (expanded payload)
  → Server: store raw data in hs_script_updates bucket (always)
  → Server: analyze employee changes (same as today)
  → Server: analyze shift changes (NEW — compare to existing Levelset shifts)
  → Server: create hs_sync_notifications with expanded sync_data
  → Modal polls, receives notification
  → Step 1: Config (confirm week, toggle schedule sync)
  → Step 2: Roster Review & Apply
  → Step 3: Position Mapping (if needed)
  → Step 4: Schedule Review & Apply
  → POST /api/employees/confirm-sync (roster — existing)
  → POST /api/scheduling/sync-confirm (scheduling — NEW)
```

### Schedule Sync Confirm Logic

When the user applies schedule changes (`POST /api/scheduling/sync-confirm`):

1. **Scope**: Only affects the confirmed week's date range
2. **Get/create schedule**: Find or create `schedules` record for location + week_start
3. **Clear existing shifts**: Delete all shifts + shift_assignments for this schedule (full overwrite for the week)
4. **Create new shifts**: For each HS shift in the confirmed week:
   - Map `ownerId` → Levelset employee via `hs_id`
   - Map `jobId` → Levelset position via stored mapping (or scheduling_only position)
   - Map `roleId` → scheduling area (FOH/BOH/Other)
   - Calculate `start_time`, `end_time` from `startTime` + `duration`
   - Set `is_house_shift = true` if HS shift `house === true`
   - Create shift record
   - Create shift_assignment record (if employee assigned)
   - Calculate `projected_cost` from employee's pay rate
5. **Update schedule totals**: Recalculate `total_hours` and `total_labor_cost`
6. **Set status**: Mark schedule as `'published'` (since it's published in HS)

### Position Mapping Storage

New table: `hs_position_mappings`
```sql
CREATE TABLE hs_position_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) NOT NULL,
  location_id UUID REFERENCES locations(id) NOT NULL,
  hs_job_id BIGINT NOT NULL,
  hs_job_name TEXT NOT NULL,
  hs_role_id BIGINT,
  hs_role_name TEXT,
  position_id UUID REFERENCES org_positions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, hs_job_id)
);
```

### Forecast Data Storage

For now, raw forecast data is stored in the `hs_script_updates` Supabase storage bucket alongside employee data. File naming:
- `schedule_{locationNumber}_{timestamp}.json` — shifts, jobs, roles
- `forecast_{locationNumber}_{timestamp}.json` — daily + 15-min interval data, benchmarks

Proper forecast tables will be designed when the forecast UI is built.

### HS Notification Schema Update

The `hs_sync_notifications.sync_data` JSONB column will be expanded:

```json
{
  "new_employees": [...],
  "modified_employees": [...],
  "terminated_employees": [...],
  "scheduling": {
    "week_start_date": "2026-02-22",
    "new_shifts": [...],
    "modified_shifts": [...],
    "removed_shifts": [...],
    "hs_jobs": [...],
    "hs_roles": [...],
    "position_mappings": [...]
  },
  "forecasts": {
    "daily": [...],
    "intervals": [...],
    "benchmarks": [...]
  },
  "time_off": [...],
  "availability": [...]
}
```

---

## HS Job → Levelset Position Mapping Rules

1. **Show only jobs used in the schedule**: Filter HS's 135 jobs down to only those that appear in the week's shift data
2. **User maps existing positions**: For each used HS job, present a dropdown of existing Levelset `org_positions`
3. **Auto-create scheduling-only positions**: Any HS job the user doesn't map to an existing position gets a new `org_position` created with `position_type = 'scheduling_only'`
4. **Mapping persistence**: Stored in `hs_position_mappings` table, reused on future syncs
5. **New job detection**: On subsequent syncs, if a new HS job appears in shifts that has no mapping, prompt the user to map it (Step 3 reappears)

---

## Future: HotSchedules Migration Tool

A separate migration tool will be built later to:
- Seed all time-off requests from HS
- Seed all employee availability calendars from HS
- Perform initial bulk data import

The current sync captures and stores this data raw but does not apply it. The migration tool will read from stored data and/or make a fresh capture.

---

## Key HS-to-Levelset Data Mapping

| HS Field | Levelset Table.Column | Notes |
|----------|----------------------|-------|
| shift.ownerId | shift_assignments.employee_id | Via hs_id match on employees |
| shift.jobId | shifts.position_id | Via hs_position_mappings |
| shift.roleId | shifts.shift_area_id | Map role → scheduling_area |
| shift.startDate | shifts.shift_date | Direct: YYYY-MM-DD |
| shift.startTime | shifts.start_time | Direct: HH:MM |
| shift.duration (mins) | shifts.end_time | Calculated: startTime + duration |
| shift.house | shifts.is_house_shift | Direct boolean |
| shift.shiftNote | shifts.notes | Direct string |
| shift.regPay (cents) | shift_assignments.projected_cost | Convert cents → dollars |
| shift.mbpBreaks | shifts.break_minutes | Sum break durations |
| employee.id | employees.hs_id | Already implemented |
| job.id | hs_position_mappings.hs_job_id | New mapping table |
| job.defaultScheduleId | Role → scheduling_area | Leadership→Leadership, FOH→FOH, BOH→BOH |

---

## Feature Flag Gating

| Scenario | Roster Toggle | Schedule Toggle | Behavior |
|----------|:---:|:---:|---|
| Org has scheduling feature | ✅ ON (disabled) | Toggle visible, OFF default | Full new flow |
| Org does NOT have scheduling | ✅ ON (disabled) | Hidden | Identical to current flow |
| Admin user, no scheduling feature | ✅ ON (disabled) | Hidden | Same as non-scheduling org |

**Data capture**: The bookmarklet always captures ALL data (employees + scheduling + forecasts) regardless of feature flags. The server always stores it all. Feature flags only affect what's shown in the modal and what can be applied.
