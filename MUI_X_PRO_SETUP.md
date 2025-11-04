# MUI X Data Grid Pro Setup Guide

## Overview
The **Positional Ratings** component uses MUI X Data Grid Pro, which provides advanced features like:
- Row grouping (drag columns to group)
- Advanced filtering
- Column visibility controls
- Export to CSV/Excel
- Professional data grid UI

## Installation Steps

### 1. Install MUI X Data Grid Pro Package

Run this command in your project root:

```bash
npm install @mui/x-data-grid-pro
```

### 2. Get Your License Key

1. Go to your MUI X Pro account: https://mui.com/store/account/
2. Navigate to "Licenses" section
3. Copy your **MUI X Data Grid Pro** license key

It will look something like:
```
1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### 3. Add License Key to Environment Variables

Add your license key to `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_MUI_X_LICENSE_KEY=your_license_key_here
```

**Important:** 
- Use `NEXT_PUBLIC_` prefix for client-side access
- Don't commit this file to git (it's already in `.gitignore`)

### 4. Initialize License in Your App

Add the license initialization to `pages/_app.tsx`:

```typescript
// pages/_app.tsx
import { LicenseInfo } from '@mui/x-license-pro';

// Initialize MUI X Pro license
if (process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY) {
  LicenseInfo.setLicenseKey(process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY);
}

// ... rest of your _app.tsx
```

### 5. Verify Installation

After setup, the Positional Ratings component should work without any license warnings in the console.

---

## Positional Ratings Component Features

### Data Grid Capabilities

**Sorting:**
- Click any column header to sort
- Click again to reverse sort
- Multi-column sorting supported

**Filtering:**
- Global search bar (searches across all fields)
- Column-specific filters (click filter icon in column header)
- Date range presets: MTD, QTD, Last 30 Days, Last 90 Days

**Grouping:**
- Drag column headers to the grouping panel at the top
- Groupable columns: Date, Employee, Role, Leader, Position
- Groups collapse/expand
- Multiple levels of grouping supported

**Pagination:**
- Options: 25, 50, 100, 250 rows per page
- Page navigation controls at bottom

### Component Props (Plasmic)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orgId` | string | (required) | Organization ID for filtering |
| `locationId` | string | (required) | Location ID for filtering |
| `width` | string | "100%" | Component width |
| `maxWidth` | string | "100%" | Maximum component width |
| `density` | choice | "comfortable" | Row spacing: comfortable, compact, or standard |

### Columns

1. **Date** - Rating submission date/time (format: 3/30/25 3:48 PM)
2. **Employee** - Employee who was rated
3. **Employee Role** - Team Member, Director, etc.
4. **Leader** - Person who gave the rating
5. **Position** - Position being rated (FOH/BOH suffix removed)
6. **Criteria 1-5** - Individual rating scores
   - Color-coded: Green (≥2.75), Yellow (1.75-2.74), Red (≥1.0)
   - Hover tooltip shows position-specific Big 5 label
7. **Overall** - Average of all criteria
8. **Delete Icon** - Red trash can to delete rating

### Delete Functionality

**Confirmation Modal:**
- Shows rating details before deletion
- Displays: Employee, Leader, Position, Date, Overall Rating
- Two buttons: Cancel (gray) and Delete (red)
- Removes rating from database on confirm

---

## Troubleshooting

### License Warning in Console

If you see:
```
MUI X: Missing license key. See https://mui.com/x/introduction/licensing/
```

**Solution:**
1. Verify `NEXT_PUBLIC_MUI_X_LICENSE_KEY` is in `.env.local`
2. Restart your dev server (`npm run dev`)
3. Check that license initialization is in `_app.tsx`

### Component Not Loading

**Check:**
1. MUI X Data Grid Pro package installed: `npm list @mui/x-data-grid-pro`
2. License key is valid and not expired
3. Environment variable is set correctly

### Grouping Not Working

**Requirements:**
- License must be active (free version doesn't have grouping)
- Drag column headers to the grouping area at the top of the grid
- Only certain columns are groupable (Date, Employee, Role, Leader, Position)

---

## Support

**MUI X Pro Documentation:** https://mui.com/x/react-data-grid/
**License Management:** https://mui.com/store/account/
**API Reference:** https://mui.com/x/api/data-grid/data-grid-pro/

---

## Development Notes

**Component Location:**
`components/CodeComponents/PositionalRatings.tsx`

**Plasmic Registration:**
`plasmic-init.ts` (already registered)

**Dependencies:**
- `@mui/x-data-grid-pro` - Main data grid component
- `@mui/material` - UI components (Button, Dialog, etc.)
- Supabase - Database queries
- Position Big 5 Labels - Tooltips for criteria columns

**API Endpoints Used:**
- `/api/position-labels` - Fetches Big 5 labels for tooltips
- Supabase `ratings` table - Direct queries for data
- Supabase `employees` table - JOINs for names and roles

