# Certification Status System

## Overview

The Certification Status System is an automated employee certification tracking system that evaluates employees based on their rolling-4 positional rating averages. The system automatically transitions employees through certification states based on monthly PEA Audit Day assessments.

**Locations:** Only applies to Buda and West Buda locations.
**Roles:** Only applies to employees with the "Team Member" role. Trainers and Leadership are excluded from certification tracking.

## Certification States

### 1. Not Certified (Default)
- **Badge:** Clear background with Levelset green (#31664a) border and text
- **Description:** Default state for all new employees or those who don't meet certification requirements
- **Criteria:**
  - Employee is new or hasn't achieved qualification requirements
  - One or more position averages below **2.75**
  - Failed the 3rd-Friday pre-check while Pending (evaluation cancelled)
  - Completed PIP without meeting the threshold (PIP → Not Certified)

### 2. Pending
- **Badge:** Yellow background (#fef3c7) with amber text (#d97706)
- **Description:** Employee has met qualification requirements and is awaiting formal evaluation
- **Criteria:**
  - All position averages ≥ **2.75** on the **4th-Thursday** audit
  - Awaiting formal evaluation during the following month
- **Transition:** Manually changed to "Certified" after evaluation is completed

### 3. Certified
- **Badge:** Levelset green background (#31664a) with white text
- **Description:** Employee has passed evaluation and meets all certification requirements
- **Criteria:**
  - Successfully completed evaluation while in Pending status
  - Must maintain all position averages ≥ 2.75 to stay certified
- **Monitoring:**
  - 4th-Thursday audit immediately moves a sub-2.75 Certified team member to **PIP**
  - PIP outcome is determined on the next month's 4th-Thursday audit

### 4. PIP (Performance Improvement Plan)
- **Badge:** Red background (#dc2626) with white text
- **Description:** Employee has fallen below certification standards and is on a performance improvement plan
- **Criteria:**
  - Was Certified but had position averages below 2.75 for two consecutive months
- **Exit Conditions:**
  - Improves all positions to ≥ 2.75 by next PEA Audit Day → Returns to Certified
  - Doesn't improve by next PEA Audit Day → Moves to Not Certified

## State Transition Flow

```
Not Certified --(4th Thursday ≥ 2.75)--> Pending --(manual evaluation)--> Certified
       ^                                   |
       |                                   | (3rd Friday < 2.75)
       +-----------<-----------------------+

Certified --(4th Thursday < 2.75)--> PIP --(next 4th Thursday < 2.75)--> Not Certified
                                \--(next 4th Thursday ≥ 2.75)--> Certified
```

**Note:** Only Team Members with the "Team Member" role are evaluated. Trainers and Leadership positions are excluded from the certification system.

## Evaluation Cadence

- **Full Week Definition:** Weeks run **Monday → Saturday** (Sundays are ignored).
- **3rd-Friday Pending Check:** On the **Friday of the 3rd full week**, only Pending team members are checked. If any position average falls below **2.75**, they immediately return to **Not Certified** and their evaluation is cancelled.
- **4th-Thursday Audit:** On the **Thursday of the 4th full week**, all Team Members are evaluated:
  - Not Certified team members at ≥2.75 move to **Pending** (next month's evaluation is planned).
  - Certified team members <2.75 move straight to **PIP**.
  - PIP outcomes are determined (≥2.75 → Certified, otherwise Not Certified).

These automated checks are triggered by the cron endpoint on their respective days.

## Pay Calculation

**Certification Impact on Pay:**
- **Certified** and **PIP** statuses: Qualify for certified pay rates
- **Not Certified** and **Pending** statuses: Receive starting pay rates

This is handled in `lib/pay-calculator.ts` via the `isCertifiedForPay()` function.

## Manual Overrides

Users can manually change any employee's certification status via the dropdown in RosterTable:
- Manual changes do NOT trigger automated state transitions
- Manual changes do NOT affect the automation logic on the next PEA Audit Day
- Use manual overrides for special cases, corrections, or immediate status changes

## Implementation Files

### Database
- **Migration:** `supabase/migrations/20251106_certification_status.sql`
  - Converts `is_certified` (boolean) to `certified_status` (text enum)
  - Creates `certification_audit` table for history tracking
  - Indexes for performance
  - RLS policies for security
- **Migration:** `supabase/migrations/20251108_create_evaluations_table.sql`
  - Creates `evaluations` table for planned evaluations
  - Tracks assigned leader, month, status, rating status, notes
  - Foreign keys to `employees`, `locations`, and `orgs`

### Backend Logic
- **Utilities:** `lib/certification-utils.ts`
  - PEA Audit Day calculation
  - Helper functions for certification checks
  
- **Position Averages:** `lib/fetch-position-averages.ts`
  - Fetches employee rating data from Google Sheets bundles
  - Parses FOH and BOH position averages
  
- **Evaluation Logic:** `lib/evaluate-certifications.ts`
  - Core state machine implementation for 3rd-Friday and 4th-Thursday runs
  - Creates audit records and evaluation entries
  
- **Pay Calculator:** `lib/pay-calculator.ts`
  - Updated to use `certified_status` instead of `is_certified`
  - `isCertifiedForPay()` function determines pay qualification

### Frontend
- **RosterTable Tabs:** `components/CodeComponents/RosterTable.tsx`
  - Tabbed layout for Employees and Evaluations views
  - Employees tab retains roster management
  - Evaluations tab renders `EvaluationsTable`
- **EvaluationsTable:** `components/CodeComponents/EvaluationsTable.tsx`
  - MUI DataGridPro table for scheduling and tracking evaluations

### API Endpoints
- **Employees API:** `pages/api/employees.ts`
  - Handles certification status updates
  - Backward compatible with legacy `is_certified` field
- **Evaluations API:** `pages/api/evaluations.ts`
  - Lists evaluations for a location/org
  - Supports inline updates (leader assignment, date, status, notes)
  
- **Cron Job:** `pages/api/cron/evaluate-certifications.ts`
  - Automated evaluation on PEA Audit Days
  - Protected by `CRON_SECRET` environment variable
  - Scheduled via `vercel.json`

### Scripts
- **Initial Setup:** `scripts/initial-certification-setup.ts`
  - One-time script to set initial certification statuses
  - Run with: `npx tsx scripts/initial-certification-setup.ts`

## Evaluations Workflow

1. **Planning:** When a Team Member moves from Not Certified → Pending on the 4th-Thursday audit, an evaluation row is created for the following month (`status = Planned`, `rating_status = true`).
2. **Pre-Check:** The 3rd-Friday job validates Pending team members. Anyone dropping below 2.75 is returned to Not Certified and their evaluation is marked `Cancelled`.
3. **Scheduling:** Setting an `evaluation_date` (via UI) automatically moves the row to `Scheduled`. Leaders can be assigned directly in the table.
4. **Completion:** Status can be updated to `Completed` (after evaluation) or `Cancelled` (manual override). `rating_status` can be toggled to reflect current averages.

## Setup Instructions

### 1. Run Database Migration

```sql
-- Run the migration in Supabase SQL Editor
-- File: supabase/migrations/20251106_certification_status.sql
```

### 2. Set Environment Variables

Add to `.env.local`:
```env
NEXT_PUBLIC_BUDA_LOCATION_ID=your-buda-location-id
NEXT_PUBLIC_WEST_BUDA_LOCATION_ID=your-west-buda-location-id
CRON_SECRET=your-secure-cron-secret
```

### 3. Run Initial Setup Script

```bash
npx tsx scripts/initial-certification-setup.ts
```

This will:
- Fetch all active Team Member employees in Buda/West Buda
- Calculate their rolling-4 position averages from the ratings table
- Set `certified_status` to 'Certified' if all positions ≥ 2.75, otherwise 'Not Certified'
- Create initial audit records

**Important:** The rating_avg calculation was fixed in migration `20251106_fix_rating_avg_decimal.sql` to use decimal precision instead of rounding down. Make sure this migration is run before the initial setup.

### 4. Configure Vercel Cron Job

The cron job is defined in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/evaluate-certifications",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

**Schedule:** Every Monday at 8:00 AM UTC

**Authentication:** Requires `Authorization: Bearer {CRON_SECRET}` header

### 5. Deploy to Vercel

```bash
git add -A
git commit -m "feat: Implement certification status system"
git push origin main
```

## Testing

### Manual Testing Checklist

1. **UI Testing**
   - [ ] RosterTable shows certification status pills with correct colors
   - [ ] Dropdown opens and allows status changes
   - [ ] Manual status changes update in database
   - [ ] Status changes trigger pay recalculation

2. **State Transitions**
   - [ ] Not Certified → Pending (4th-Thursday audit ≥2.75)
   - [ ] Pending → Certified (manual change)
   - [ ] Pending → Not Certified (3rd-Friday check <2.75)
   - [ ] Certified → PIP (4th-Thursday audit <2.75)
   - [ ] PIP → Certified (next 4th-Thursday ≥2.75)
   - [ ] PIP → Not Certified (next 4th-Thursday <2.75)

3. **PEA Audit Day Calculation**
   - [ ] Verify `getPEAAuditDay()` returns correct Monday for various months
   - [ ] Test edge cases (short months, different years)

4. **Pay Calculation**
   - [ ] Certified employees get certified pay rates
   - [ ] PIP employees get certified pay rates
   - [ ] Not Certified employees get starting pay rates
   - [ ] Pending employees get starting pay rates

### Automated Testing

Run the cron job manually:
```bash
curl -X POST https://your-domain.vercel.app/api/cron/evaluate-certifications \
  -H "Authorization: Bearer your-cron-secret"
```

Expected response:
```json
{
  "success": true,
  "message": "Evaluated N employees. M status changes.",
  "evaluatedCount": N,
  "statusChanges": [...],
  "timestamp": "2025-11-06T12:00:00.000Z"
}
```

## Monitoring & Maintenance

### Audit History

All certification status changes are logged in the `certification_audit` table:
- Date of evaluation
- Status before/after
- Position averages snapshot
- Whether all positions were qualified
- Notes

Query audit history:
```sql
SELECT *
FROM certification_audit
WHERE employee_id = 'employee-uuid'
ORDER BY audit_date DESC;
```

### Common Queries

**Find employees in Pending status:**
```sql
SELECT full_name, certified_status
FROM employees
WHERE certified_status = 'Pending'
  AND active = true
ORDER BY full_name;
```

**Find employees on PIP:**
```sql
SELECT full_name, certified_status
FROM employees
WHERE certified_status = 'PIP'
  AND active = true
ORDER BY full_name;
```

**View recent status changes:**
```sql
SELECT 
  e.full_name,
  ca.status_before,
  ca.status_after,
  ca.audit_date,
  ca.notes
FROM certification_audit ca
JOIN employees e ON e.id = ca.employee_id
WHERE ca.audit_date >= CURRENT_DATE - INTERVAL '30 days'
  AND ca.status_before != ca.status_after
ORDER BY ca.audit_date DESC;
```

## Troubleshooting

### Issue: Cron job not running

**Check:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check Vercel cron logs in dashboard
3. Manually trigger the endpoint to test
4. Verify `vercel.json` is in the project root

### Issue: Position averages not found

**Check:**
1. Verify Google Sheets bundle URL is accessible
2. Check employee names match exactly between database and sheets
3. Verify bundle has FOH and BOH tabs
4. Check network connectivity to Google Cloud Storage

### Issue: Status not updating

**Check:**
1. Verify employee is in Buda or West Buda location
2. Check audit history for recent evaluations
3. Verify position averages meet threshold
4. Check for manual overrides that may have been applied

## Future Enhancements

- [ ] Dashboard for viewing certification status across all employees
- [ ] Email notifications when status changes
- [ ] Evaluation workflow for Pending → Certified transition
- [ ] Detailed analytics on certification trends
- [ ] Export certification reports

## Support

For questions or issues, contact the development team.

