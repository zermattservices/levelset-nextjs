# ✅ Positional Ratings Component - Quick Start

## 🎉 What's Been Created

Your new **Positional Ratings** component is ready! It's a comprehensive data grid showing all ratings in one table with advanced features.

**File:** `components/CodeComponents/PositionalRatings.tsx`

---

## 🚀 Next Steps (Required)

### Step 1: Install MUI X Data Grid Pro

```bash
npm install @mui/x-data-grid-pro @mui/x-license-pro
```

### Step 2: Add Your License Key

1. Get your MUI X Pro license key from: https://mui.com/store/account/
2. Add it to `.env.local`:

```bash
# .env.local
NEXT_PUBLIC_MUI_X_LICENSE_KEY=your_license_key_here
```

### Step 3: Initialize License

Add this to the TOP of `pages/_app.tsx` (before the component):

```typescript
import { LicenseInfo } from '@mui/x-license-pro';

// Initialize MUI X Pro license
if (process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY) {
  LicenseInfo.setLicenseKey(process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY);
}
```

### Step 4: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

---

## ✨ Component Features

### Data Grid Capabilities

✅ **Sorting** - Click column headers to sort  
✅ **Filtering** - Global search + column-specific filters  
✅ **Grouping** - Drag columns to group area (Date, Employee, Role, Leader, Position)  
✅ **Pagination** - 25, 50, 100, 250 options  
✅ **Export** - CSV/Excel export built-in  
✅ **Delete** - Red trash icon with confirmation modal  

### Columns (Left to Right)

1. Date (3/30/25 3:48 PM format)
2. Employee
3. Employee Role
4. Leader
5. Position (FOH/BOH suffix removed)
6. Criteria 1 (hover for Big 5 label tooltip)
7. Criteria 2 (hover for Big 5 label tooltip)
8. Criteria 3 (hover for Big 5 label tooltip)
9. Criteria 4 (hover for Big 5 label tooltip)
10. Criteria 5 (hover for Big 5 label tooltip)
11. Overall (color-coded)
12. Delete icon

### Color Coding

- 🟢 **Green** (≥2.75) - Excellent
- 🟡 **Yellow** (1.75-2.74) - Good
- 🔴 **Red** (≥1.0) - Needs Improvement

### Filters

- **Date Range:** MTD, QTD, Last 30 Days, Last 90 Days
- **FOH/BOH:** Checkboxes (both checked by default)
- **Search:** Global search bar across all fields
- **Column Filters:** Click filter icon in each column header

---

## 🎨 Use in Plasmic

The component is already registered! Find it as **"Positional Ratings"** in Plasmic Studio.

### Props

| Prop | Default | Description |
|------|---------|-------------|
| `orgId` | 54b9864f-... | Organization ID |
| `locationId` | 67e00fb2-... | Location ID |
| `width` | "100%" | Component width |
| `maxWidth` | "100%" | Max width |
| `density` | "comfortable" | Row spacing |

---

## 🗑️ Delete Functionality

**Modal shows:**
- Employee name
- Leader name
- Position
- Date submitted
- Overall rating (color-coded chip)

**Buttons:**
- Cancel (gray) - Closes modal
- Delete (red) - Permanently deletes from database

---

## ✅ Also Completed

1. **Reduced spacing** on name columns in Positional Ratings Table (left padding)
2. **Loading overlay** instead of full table reload (no more height changes)
3. **Position name cleanup** - FOH/BOH suffixes removed everywhere

---

## 📚 Full Documentation

See `MUI_X_PRO_SETUP.md` for:
- Detailed setup instructions
- Troubleshooting guide
- Feature documentation
- API reference

---

## ⚠️ Important Notes

1. **MUI X Pro License Required** - The free version doesn't have grouping
2. **Restart Dev Server** - After adding env variable
3. **Not Committed to Git Yet** - Ready for you to review and push
4. **Directors Only** - Assume only directors will access this page

---

## 🐛 Troubleshooting

### "Missing license key" warning?
- Check `.env.local` has `NEXT_PUBLIC_MUI_X_LICENSE_KEY`
- Restart dev server
- Verify license initialization in `_app.tsx`

### Grouping not working?
- License must be active
- Drag column headers to the top grouping area
- Only Date, Employee, Role, Leader, Position are groupable

### Component not loading?
- Run: `npm list @mui/x-data-grid-pro`
- Check console for errors
- Verify Supabase connection

---

## 🚀 Ready to Push?

When you're ready:

```bash
git push origin preview
```

All changes are committed locally with a detailed commit message.

---

**Need help?** Check `MUI_X_PRO_SETUP.md` or the component code in:  
`components/CodeComponents/PositionalRatings.tsx`

