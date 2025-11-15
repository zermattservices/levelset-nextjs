# Disciplinary Recommendations Setup Guide

## Overview
The disciplinary recommendations system automatically identifies employees who need disciplinary action based on their point totals and the thresholds defined in `disc_actions_rubric`.

## 🚨 Issues Fixed

### 1. **RLS Policy Errors (403 Forbidden)**
The original RLS policies were too restrictive. You need to apply the fixed policies.

### 2. **Empty Recommendations Table**
The `recommended_disc_actions` table needs to be populated either:
- Automatically via database triggers (recommended)
- Manually via script (temporary solution)

### 3. **UI Issues**
- ✅ Collapsed by default
- ✅ Smooth animations
- ✅ DatePicker errors fixed

## 📋 Supabase Setup Steps

### Step 1: Add Foreign Key for org_id

Open **Supabase SQL Editor** and run the contents of:
`supabase/migrations/20251105_add_org_foreign_key.sql`

This adds a foreign key constraint from `org_id` to the `orgs` table.

### Step 2: Fix UNIQUE Constraint

Open **Supabase SQL Editor** and run the contents of:
`supabase/migrations/20251105_fix_unique_constraint.sql`

This prevents duplicate recommendations by enforcing uniqueness on pending recommendations.

### Step 3: Apply RLS Policy Fix

Open **Supabase SQL Editor** and run:

```sql
-- File: supabase/migrations/20251105_fix_recommended_disc_actions_rls.sql

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view recommendations for their org/location" ON recommended_disc_actions;
DROP POLICY IF EXISTS "Users can insert recommendations" ON recommended_disc_actions;
DROP POLICY IF EXISTS "Users can update recommendations for their org/location" ON recommended_disc_actions;
DROP POLICY IF EXISTS "Users can delete recommendations for their org/location" ON recommended_disc_actions;

-- Create permissive policies for authenticated users
CREATE POLICY "Authenticated users can view recommendations"
  ON recommended_disc_actions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert recommendations"
  ON recommended_disc_actions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update recommendations"
  ON recommended_disc_actions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete recommendations"
  ON recommended_disc_actions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Service role can do everything"
  ON recommended_disc_actions FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Step 4: Create Automatic Recommendation Generation

Open **Supabase SQL Editor** and run the entire contents of:
`supabase/migrations/20251105_create_recommendation_trigger.sql`

This creates:
- `generate_disciplinary_recommendations(org_id, location_id)` function
- `refresh_recommendations_for_employee(employee_id, org_id, location_id)` function
- Triggers on `infractions` and `disc_actions` tables to auto-refresh recommendations

### Step 5: Generate Initial Recommendations

**Option A: Using Supabase SQL Editor (Recommended)**
```sql
-- Replace with your actual org_id and location_id
SELECT generate_disciplinary_recommendations(
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd'::UUID,  -- Your org_id
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd'::UUID   -- Your location_id
);
```

**Option B: Using CLI Script**
```bash
cd /Users/andrewdyar/levelset-nextjs
npx tsx scripts/populate-recommendations.ts <org_id> <location_id>
```

## 🎯 How It Works

### Automatic Updates
Once triggers are installed, recommendations will automatically:
1. **Generate** when a new infraction is added
2. **Update** when infraction points change
3. **Remove** when a disciplinary action is recorded
4. **Clear** when employee points drop below threshold

### Manual Updates
Call the function anytime:
```sql
SELECT generate_disciplinary_recommendations('<org_id>', '<location_id>');
```

## 🔧 Component Usage in Plasmic

### Add to Discipline Page:
1. Open Plasmic Studio → Discipline page
2. Add `RecommendedActions` component **above** DisciplineTable
3. Set props:
   - `orgId` → from user session data
   - `locationId` → from user session data
   - `currentUser` → from user session (full employee object)
   - `maxWidth` → "1200px" (default)
   - `width` → "100%" (default)

### Features:
- **Collapsed by default** - shows comma-separated employee names
- **Click to expand** - shows full recommendation cards
- **Dismiss button** - marks recommendation as dismissed
- **Record Action button** - opens modal to record the action, then opens employee modal
- **Auto-refreshes** - after actions are recorded or dismissed

## 🐛 Troubleshooting

### "Row-level security policy violation"
- Run Step 1 (RLS Policy Fix) in Supabase SQL Editor
- Verify you're authenticated

### "No recommendations showing"
- Run Step 3 to populate initial recommendations
- Check if employees have points >= any threshold
- Verify thresholds exist in `disc_actions_rubric`

### "Recommendations not updating automatically"
- Run Step 2 to create triggers
- Verify triggers are installed: `SELECT * FROM pg_trigger WHERE tgname LIKE '%recommendation%';`

## 📊 Database Schema

### recommended_disc_actions
- `id` - Primary key
- `employee_id` - Foreign key to employees
- `org_id` - Organization ID
- `location_id` - Foreign key to locations
- `recommended_action_id` - Foreign key to disc_actions_rubric
- `recommended_action` - Text of the recommended action
- `points_when_recommended` - Points at time of recommendation
- `created_at` - When recommendation was created
- `action_taken` - 'dismissed', 'action_recorded', or NULL
- `action_taken_at` - When action was taken
- `action_taken_by` - User who took action
- `disc_action_id` - Foreign key to disc_actions (if action was recorded)

## ✅ Verification

After setup, verify with:
```bash
npx tsx scripts/verify-discipline-schema.ts
```

Should show all tables including `recommended_disc_actions` as accessible.

