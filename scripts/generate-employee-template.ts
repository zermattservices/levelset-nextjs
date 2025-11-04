import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

/**
 * Generate a CSV template with all current employees
 * This makes it easy to fill in hire_date and payroll_name in a spreadsheet
 * 
 * Usage:
 * npx tsx scripts/generate-employee-template.ts [output.csv]
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTemplate(outputPath: string = 'employees-template.csv') {
  console.log('📥 Fetching all employees from Supabase...\n');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, hire_date, payroll_name, active')
    .eq('active', true)
    .order('full_name');

  if (error) {
    console.error('❌ Error fetching employees:', error);
    process.exit(1);
  }

  if (!employees || employees.length === 0) {
    console.error('❌ No employees found');
    process.exit(1);
  }

  console.log(`✅ Found ${employees.length} active employees\n`);

  // Generate CSV content
  const headers = 'id,full_name,first_name,last_name,hire_date,payroll_name';
  const rows = employees.map(emp => {
    return [
      emp.id,
      emp.full_name || '',
      emp.first_name || '',
      emp.last_name || '',
      emp.hire_date || '',
      emp.payroll_name || ''
    ].join(',');
  });

  const csvContent = [headers, ...rows].join('\n');

  // Write to file
  fs.writeFileSync(outputPath, csvContent, 'utf-8');

  console.log(`✨ Template generated: ${outputPath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Open ${outputPath} in Excel/Google Sheets`);
  console.log(`   2. Fill in the hire_date and payroll_name columns`);
  console.log(`   3. Save the file`);
  console.log(`   4. Run: npx tsx scripts/update-employees-from-csv.ts ${outputPath}`);
  console.log(`\n💡 Tip: You can also just update specific rows - leave others empty to skip them`);
}

const outputPath = process.argv[2] || 'employees-template.csv';

generateTemplate(outputPath).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

