# Employee Update Guide

This guide helps you efficiently update `hire_date` and `payroll_name` for your **93 employees**.

## 🎯 Current Status

- ✅ Schema verified: Both columns exist in database
- ✅ Total employees: **93**
- ✅ TypeScript types updated
- ⚠️ All `hire_date` and `payroll_name` fields are currently `null`

## 🚀 Four Ways to Update (Choose What Works Best)

---

### **Option 1: CSV/Spreadsheet Method** ⭐ RECOMMENDED

**Best for:** Most users - easy, visual, and safe

#### Step 1: Generate a template with all your employees
```bash
npx tsx scripts/generate-employee-template.ts employees.csv
```

This creates a CSV file with all your employees pre-filled:
```csv
id,full_name,first_name,last_name,hire_date,payroll_name
1899dbd9-...,Alex Rodriguez,Alex,Rodriguez,,
...
```

#### Step 2: Open in Excel/Google Sheets and fill in the data
- Open `employees.csv` in Excel or Google Sheets
- Fill in the `hire_date` column (format: `YYYY-MM-DD`, e.g., `2024-01-15`)
- Fill in the `payroll_name` column (e.g., `Alex Rodriguez`)
- Save the file (keep it as CSV)

#### Step 3: Upload the data back to Supabase
```bash
npx tsx scripts/update-employees-from-csv.ts employees.csv
```

**That's it!** The script will update all employees and show you the results.

---

### **Option 2: Direct SQL in Supabase** 

**Best for:** Quick updates or if you already have SQL

#### Step 1: Open your Supabase SQL Editor
Go to: https://supabase.com/dashboard/project/pcplqsnilhrhupntibuv/sql

#### Step 2: Use the SQL template
See `scripts/update-employees.sql` for examples. Here's a quick one:

```sql
-- Update one employee
UPDATE employees 
SET 
  hire_date = '2024-01-15',
  payroll_name = 'John Doe',
  updated_at = NOW()
WHERE full_name = 'John Doe';

-- Or update many at once
UPDATE employees 
SET 
  hire_date = CASE 
    WHEN full_name = 'John Doe' THEN '2024-01-15'
    WHEN full_name = 'Jane Smith' THEN '2024-02-20'
    -- add more...
  END,
  payroll_name = CASE 
    WHEN full_name = 'John Doe' THEN 'John Doe'
    WHEN full_name = 'Jane Smith' THEN 'Jane Smith'
    -- add more...
  END,
  updated_at = NOW()
WHERE full_name IN ('John Doe', 'Jane Smith');
```

#### Step 3: Verify the updates
```sql
SELECT id, full_name, hire_date, payroll_name 
FROM employees 
WHERE active = true
ORDER BY full_name;
```

---

### **Option 3: API Endpoint (Programmatic)**

**Best for:** Integrations, automation, or bulk operations

#### Endpoint Details
- **URL:** `http://localhost:3000/api/bulk-update-employees`
- **Method:** POST
- **Body:**
```json
{
  "updates": [
    {
      "id": "1899dbd9-302d-4906-8982-3ee5077fc010",
      "hire_date": "2024-01-15",
      "payroll_name": "Alex Rodriguez"
    },
    {
      "id": "another-uuid",
      "hire_date": "2024-02-20",
      "payroll_name": "Jane Smith"
    }
  ]
}
```

#### Example using cURL:
```bash
curl -X POST http://localhost:3000/api/bulk-update-employees \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "id": "employee-uuid",
        "hire_date": "2024-01-15",
        "payroll_name": "John Doe"
      }
    ]
  }'
```

#### Example using JavaScript/TypeScript:
```typescript
const response = await fetch('/api/bulk-update-employees', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    updates: [
      {
        id: 'employee-uuid',
        hire_date: '2024-01-15',
        payroll_name: 'John Doe'
      }
    ]
  })
});

const result = await response.json();
console.log(result); // { success: 1, failed: 0, errors: [] }
```

---

### **Option 4: Quick Default Values**

**Best for:** Setting default values quickly

If you just want to set `payroll_name` to match `full_name` for everyone:

```sql
-- Run this in Supabase SQL Editor
UPDATE employees 
SET 
  payroll_name = full_name,
  updated_at = NOW()
WHERE payroll_name IS NULL;
```

---

## 📊 Check Your Progress

### Via API
Visit: `http://localhost:3000/api/check-schema`

### Via SQL
```sql
SELECT 
  COUNT(*) as total_employees,
  COUNT(hire_date) as have_hire_date,
  COUNT(payroll_name) as have_payroll_name,
  COUNT(*) - COUNT(hire_date) as missing_hire_date,
  COUNT(*) - COUNT(payroll_name) as missing_payroll_name
FROM employees
WHERE active = true;
```

---

## 🎯 Recommended Workflow

**For most users, we recommend Option 1 (CSV Method):**

1. Generate template: `npx tsx scripts/generate-employee-template.ts employees.csv`
2. Fill it out in Excel/Sheets (easy to see all employees at once)
3. Upload: `npx tsx scripts/update-employees-from-csv.ts employees.csv`
4. Verify: Check your Supabase table or visit the API endpoint

**Benefits:**
- ✅ Visual and easy to work with
- ✅ Can share with team members to fill out
- ✅ Safe - you can review before uploading
- ✅ Keeps a record of your data

---

## 📝 Date Format

When entering dates, use: `YYYY-MM-DD` format
- ✅ Good: `2024-01-15`, `2023-12-31`
- ❌ Bad: `01/15/2024`, `15-Jan-2024`, `January 15, 2024`

---

## 🆘 Troubleshooting

**"Employee not found"**
- Make sure the `id` or `full_name` matches exactly (case-sensitive)

**"Invalid date format"**
- Use `YYYY-MM-DD` format (e.g., `2024-01-15`)

**"Missing credentials"**
- Make sure your `.env.local` file exists with Supabase credentials
- Restart dev server: `npm run dev`

**Need to undo changes?**
```sql
-- Reset all hire_date and payroll_name to NULL
UPDATE employees SET hire_date = NULL, payroll_name = NULL;
```

---

## 📞 Support

If you run into issues:
1. Check the Supabase logs in your dashboard
2. Check the console output for error messages
3. Verify your `.env.local` has correct credentials
4. Make sure dev server is running: `npm run dev`

