# Positional Excellence Ratings Component Guide

## Overview

The Positional Ratings Table component displays employee performance ratings data from Supabase, replacing the Google Sheets + Apps Script implementation with a fully integrated React/TypeScript solution.

---

## Features

### Three Tab Views:

1. **Overview Tab** - All employees with ratings across all positions
   - Shows average per position (last 4 ratings)
   - Expandable rows show last 4 individual ratings
   - FOH/BOH toggle

2. **Employee Ratings Tab** - Position-specific detailed view
   - Shows Big 5 rating breakdown for selected position
   - Second sticky header with position-specific criteria labels
   - Expandable rows show last 4 ratings for that position
   - FOH/BOH toggle + Position dropdown

3. **Leadership View Tab** - Leaders who give ratings
   - Shows ratings given by each leader across positions
   - Based on last 10 ratings given
   - Expandable rows show last 10 rating entries
   - FOH/BOH toggle

---

## Setup Required

### Step 1: Run Database Migration

In Supabase SQL Editor, run:
`supabase/migrations/20241030_add_position_big5_labels.sql`

### Step 2: Populate Big 5 Labels

The Big 5 rating criteria are position-specific (e.g., iPOS has different criteria than Host).

**Option A: Use Interactive Script**
```bash
npx tsx scripts/generate-big5-labels-sql.ts
```
Follow prompts to enter labels from your Google Sheet row 2 for each position tab.

**Option B: Manual SQL**
Copy labels from Google Sheet row 2 for each position, then:

```sql
INSERT INTO position_big5_labels (org_id, location_id, position, label_1, label_2, label_3, label_4, label_5)
VALUES (
  '54b9864f-9df9-4a15-a209-7b99e1c274f4',  -- org_id
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd',  -- CFA Buda location_id
  'iPOS',
  'Speed',       -- Replace with actual labels from sheet
  'Accuracy',
  'Friendliness',
  'Upselling',
  'Cleanliness'
);
```

Repeat for all positions and both locations (Buda + West Buda).

---

## Component Usage

### In Plasmic or React Page:

```typescript
import { PositionalRatingsTable } from '@/components/CodeComponents/PositionalRatingsTable';

<PositionalRatingsTable
  orgId="54b9864f-9df9-4a15-a209-7b99e1c274f4"
  locationId="67e00fb2-29f5-41ce-9c1c-93e2f7f392dd"
  defaultTab="overview"
  defaultArea="FOH"
  logoUrl="https://your-logo-url.png"
  density="comfortable"
/>
```

### Props:

- `orgId` - Organization ID
- `locationId` - Location ID (CFA Buda or West Buda)
- `defaultTab` - Initial tab: 'overview' | 'employees' | 'leadership'
- `defaultArea` - Initial area: 'FOH' | 'BOH'
- `logoUrl` - Optional logo URL to display
- `density` - 'comfortable' | 'compact'
- `className` - Optional CSS class

---

## Data Structure

### Ratings Table Schema:
```
id, employee_id, rater_user_id, position, 
rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg,
created_at, org_id, location_id
```

### Calculation Logic:

**Averages:**
- Employee ratings: Last 4 ratings per position
- Leader ratings: Last 10 ratings given
- Overall average: Average of position averages

**Counts:**
- Rolling 90-day window
- Filters: `WHERE created_at >= NOW() - INTERVAL '90 days'`

**Color Coding:**
- Green: rating ≥ 2.75 (Crushing It)
- Yellow: rating 1.75-2.74 (On the Rise)
- Red: rating 1.0-1.74 (Not Yet)

---

## Position Lists

### FOH Positions:
- iPOS
- Host | Anfitrión
- OMD
- Runner
- Bagging | Embolsado
- Drinks 1/3 | Bebidas 1/3
- Drinks 2 | Bebidas 2
- 3H Week FOH
- Trainer FOH
- FOH Team Lead

### BOH Positions:
- Breader | Empanizar
- Secondary | Secundario
- Fries | Papas
- Primary | Primario
- Machines | Maquinas
- Prep
- 3H Week BOH
- Trainer BOH
- BOH Team Lead

---

## API Endpoints

### GET /api/ratings
Fetch aggregated rating data

**Query Params:**
- `tab`: 'overview' | 'position' | 'leadership'
- `org_id`: Organization ID
- `location_id`: Location ID
- `area`: 'FOH' | 'BOH'
- `position`: Required if tab='position'

**Returns:**
```json
{
  "success": true,
  "tab": "overview",
  "area": "FOH",
  "data": [ /* EmployeeRatingAggregate[] */ ]
}
```

### GET /api/position-labels
Fetch Big 5 labels or positions list

**For labels:**
`?org_id=xxx&location_id=xxx&position=iPOS`

**For positions list:**
`?org_id=xxx&location_id=xxx&area=FOH`

### POST /api/position-labels
Create/update Big 5 labels

**Body:**
```json
{
  "org_id": "xxx",
  "location_id": "xxx",
  "position": "iPOS",
  "label_1": "Speed",
  "label_2": "Accuracy",
  "label_3": "Friendliness",
  "label_4": "Upselling",
  "label_5": "Cleanliness"
}
```

---

## Files Created

### Database:
- `supabase/migrations/20241030_add_position_big5_labels.sql`

### Types:
- `lib/supabase.types.ts` - Added Rating, PositionBig5Labels, aggregates

### Data Layer:
- `lib/ratings-data.ts` - Aggregation functions and queries

### API:
- `pages/api/ratings.ts` - Main ratings API
- `pages/api/position-labels.ts` - Labels API

### Components:
- `components/CodeComponents/PositionalRatingsTable.tsx` - Main component

### Scripts:
- `scripts/generate-big5-labels-sql.ts` - Interactive label setup

---

## Comparison to Google Sheets Implementation

| Feature | Google Sheets | Supabase Version |
|---------|--------------|------------------|
| Data Source | Google Form → Sheet | Direct to Supabase |
| Calculations | Sheet formulas (FILTER, AVERAGE, etc.) | TypeScript functions |
| Real-time | Manual refresh | Auto-refresh on data change |
| Expandable Rows | ✅ | ✅ |
| Color Coding | ✅ Green/Yellow/Red | ✅ Same colors |
| Big 5 Labels | Row 2 in each tab | Database table |
| Last 4 ratings | ✅ | ✅ |
| Last 10 (leaders) | ✅ | ✅ |
| 90-day rolling count | ✅ | ✅ |
| FOH/BOH toggle | ✅ | ✅ Reuses existing component |
| Position dropdown | Buttons | MUI Select dropdown |
| Styling | Custom CSS | MUI + Styled Components |

---

## Troubleshooting

**No data showing?**
1. Check that ratings table has data for the org/location
2. Verify employee_id and rater_user_id exist in employees table
3. Check browser console for API errors

**Big 5 labels not showing?**
1. Run the migration SQL
2. Populate labels using the script or manual INSERT
3. Verify labels exist: `SELECT * FROM position_big5_labels;`

**Colors not showing?**
1. Check that rating_avg is calculated in ratings table
2. Verify values are between 1.0-3.0
3. Check browser console for styling errors

**Position dropdown empty?**
1. Verify ratings exist for that area (FOH/BOH)
2. Check position names match exactly
3. Fallback to hard-coded position list if API fails

---

## Next Steps

1. ✅ Run database migration
2. ✅ Populate Big 5 labels for all positions
3. ✅ Add component to your PEA page
4. ✅ Test all three tabs
5. ✅ Verify expandable rows work
6. ✅ Check color coding matches expectations

---

## Support

- **Database Schema:** `/supabase/migrations/20241030_add_position_big5_labels.sql`
- **Data Logic:** `/lib/ratings-data.ts`
- **Component Code:** `/components/CodeComponents/PositionalRatingsTable.tsx`
- **Existing Ratings:** 644 records in database

