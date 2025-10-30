# CFA Buda Pay Calculator Implementation Guide

## 🎯 Overview

This system automatically calculates employee pay based on their role, FOH/BOH designation, availability status, and certification for **CFA Buda** and **CFA West Buda** locations only.

---

## ✅ Implementation Complete!

### **What Was Built:**

1. ✅ Database columns: `availability` and `calculated_pay`
2. ✅ Pay calculation logic based on 2025 pay chart
3. ✅ RosterTable UI with new columns
4. ✅ API endpoint updates for automatic recalculation
5. ✅ TypeScript types updated

---

## 🚀 Setup Required (2 Steps)

### **Step 1: Run Database Migration**

Go to your Supabase SQL Editor:
https://supabase.com/dashboard/project/pcplqsnilhrhupntibuv/sql

Run this SQL:

```sql
-- Add availability column with enum type
DO $$ BEGIN
  CREATE TYPE availability_type AS ENUM ('Limited', 'Available');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS availability availability_type DEFAULT 'Available';

-- Add calculated_pay column
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS calculated_pay NUMERIC(5,2);

-- Add comment for documentation
COMMENT ON COLUMN employees.availability IS 'Employee availability status - affects pay calculation for Team Members and Trainers';
COMMENT ON COLUMN employees.calculated_pay IS 'Auto-calculated hourly pay based on role, FOH/BOH, availability, and certification status';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_employees_availability ON employees(availability);
CREATE INDEX IF NOT EXISTS idx_employees_calculated_pay ON employees(calculated_pay);
```

### **Step 2: Update Location IDs**

Edit `/lib/pay-calculator.ts` and update the location IDs for CFA Buda locations:

```typescript
export const CFA_BUDA_LOCATION_IDS = [
  '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd', // CFA Buda - UPDATE THIS
  'your-cfa-west-buda-location-id-here',  // CFA West Buda - ADD THIS
];
```

**To find location IDs:**
1. Check your database: `SELECT id, name FROM locations;`
2. Or check in your Supabase dashboard

---

## 📊 Pay Structure (2025)

### Team Member & New Hire
| Type | Availability | Starting | Certified |
|------|-------------|----------|-----------|
| Service (FOH) | Limited | $11 | $13 |
| Service (FOH) | Available | $15 | $17 |
| Production (BOH) | Limited | $14 | $15 |
| Production (BOH) | Available | $16 | $18 |

**Note:** If both FOH & BOH are checked, uses BOH rates (higher pay)

### Trainer
| Availability | Starting | Certified |
|-------------|----------|-----------|
| Limited | $14 | $15 |
| Available | $19 | $20 |

**Note:** Ignores FOH/BOH designation

### Leadership (Always "Available")
| Role | Starting | Certified |
|------|----------|-----------|
| Team Leader | $21 | $25 |
| Director | $27 | $30 |
| Executive | $32 | $36 |

**Note:** Ignores availability and FOH/BOH designation

---

## 💡 How It Works

### **Automatic Pay Calculation**

When any of these fields change, `calculated_pay` updates automatically:
- ✅ `role` (New Hire, Team Member, Trainer, etc.)
- ✅ `is_certified` (checkbox)
- ✅ `availability` (Limited or Available)
- ✅ `is_foh` (checkbox)
- ✅ `is_boh` (checkbox)

### **User Interface**

The RosterTable now shows:

| Name | Role | **Availability** | Certified | FOH | BOH | **Calculated Pay** | Actions |
|------|------|------------------|-----------|-----|-----|-------------------|---------|
| John Doe | Team Member | Available ▼ | ☑ | ☑ | ☐ | $17.00/hr | ⋮ |

- **Availability:** Dropdown with "Available" and "Limited" options
- **Calculated Pay:** Auto-displays hourly rate (read-only)

---

## 🧪 Testing Scenarios

Test these scenarios after setup:

### **Scenario 1: Team Member FOH**
- Role: Team Member
- FOH: ✓
- BOH: ☐
- Availability: Available
- Certified: ☐
- **Expected Pay:** $15.00/hr

### **Scenario 2: Team Member FOH Certified**
- Same as above but Certified: ✓
- **Expected Pay:** $17.00/hr

### **Scenario 3: Team Member BOH**
- Role: Team Member
- FOH: ☐
- BOH: ✓
- Availability: Available
- Certified: ☐
- **Expected Pay:** $16.00/hr

### **Scenario 4: Team Member Both (uses BOH)**
- Role: Team Member
- FOH: ✓
- BOH: ✓
- Availability: Available
- Certified: ☐
- **Expected Pay:** $16.00/hr (BOH rate)

### **Scenario 5: Limited Availability**
- Role: Team Member
- FOH: ✓
- BOH: ☐
- Availability: Limited
- Certified: ☐
- **Expected Pay:** $11.00/hr

### **Scenario 6: Trainer**
- Role: Trainer
- FOH: ✓ (ignored)
- BOH: ☐ (ignored)
- Availability: Available
- Certified: ☐
- **Expected Pay:** $19.00/hr

### **Scenario 7: Team Leader**
- Role: Team Lead
- Availability: Limited (ignored - always treated as Available)
- Certified: ☐
- **Expected Pay:** $21.00/hr

### **Scenario 8: Director Certified**
- Role: Director
- Certified: ✓
- **Expected Pay:** $30.00/hr

---

## 📁 Files Modified/Created

### New Files:
- `lib/pay-calculator.ts` - Pay calculation logic
- `supabase/migrations/20241030_add_availability_and_calculated_pay.sql` - Database migration
- `CFA_BUDA_PAY_CALCULATOR_GUIDE.md` - This guide

### Modified Files:
- `lib/supabase.types.ts` - Added `AvailabilityType` and new fields to `Employee`
- `components/CodeComponents/RosterTable.tsx` - Added availability dropdown and calculated_pay column
- `pages/api/employees.ts` - Added automatic pay calculation on updates

---

## 🔧 Troubleshooting

### Pay not calculating?
1. Check that location ID is in `CFA_BUDA_LOCATION_IDS` array
2. Verify database migration ran successfully
3. Check browser console for API errors

### Pay seems wrong?
1. Verify FOH/BOH checkboxes (both checked = BOH rate)
2. Check availability setting (Limited vs Available)
3. Verify certification status
4. Compare against pay chart above

### Columns not showing?
1. Clear browser cache and reload
2. Check for JavaScript errors in console
3. Verify dev server is running with latest code

---

## 📞 Support

- **Pay Chart Reference:** See attached image in project
- **Database Schema:** `/supabase/migrations/20241030_add_availability_and_calculated_pay.sql`
- **Calculation Logic:** `/lib/pay-calculator.ts`

---

## 🎯 Quick Start Checklist

- [ ] Run SQL migration in Supabase
- [ ] Update location IDs in `/lib/pay-calculator.ts`
- [ ] Restart dev server: `npm run dev`
- [ ] Test with a sample employee
- [ ] Verify pay calculation matches chart

**That's it! The system is ready to use.** 🚀

