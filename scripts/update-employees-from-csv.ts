import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Update employees from a CSV file
 * 
 * CSV format (with header row):
 * id,hire_date,payroll_name
 * uuid-1,2024-01-15,John Doe
 * uuid-2,2024-02-20,Jane Smith
 * 
 * Or with full_name to auto-match:
 * full_name,hire_date,payroll_name
 * John Doe,2024-01-15,John Doe
 * Jane Smith,2024-02-20,Jane Smith
 * 
 * Usage:
 * NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=yyy npx tsx scripts/update-employees-from-csv.ts path/to/your.csv
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  // Parse a CSV line respecting quotes
  function parseLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Convert MM/DD/YYYY to YYYY-MM-DD
  function convertDate(dateStr: string): string | null {
    if (!dateStr || dateStr === 'NULL' || dateStr === '#N/A') return null;
    
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr; // Return as-is if format is unexpected
  }

  const headers = parseLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const record: any = {};
    
    headers.forEach((header, index) => {
      let value = values[index] || null;
      
      // Convert date format if this is a date field
      if (header === 'hire_date' && value) {
        value = convertDate(value);
      }
      
      record[header] = value === '' ? null : value;
    });
    
    records.push(record);
  }

  return records;
}

async function updateEmployees(csvPath: string) {
  console.log(`📂 Reading CSV from: ${csvPath}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);

  console.log(`📋 Found ${records.length} records in CSV\n`);

  let success = 0;
  let failed = 0;

  for (const record of records) {
    let employeeId = record.id;

    // If no ID provided, try to find by full_name
    if (!employeeId && record.full_name) {
      console.log(`🔍 Looking up employee: ${record.full_name}`);
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('full_name', record.full_name)
        .single();

      if (error || !data) {
        console.error(`❌ Could not find employee: ${record.full_name}`);
        failed++;
        continue;
      }

      employeeId = data.id;
    }

    if (!employeeId) {
      console.error(`❌ No ID or full_name provided for record:`, record);
      failed++;
      continue;
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (record.hire_date) updateData.hire_date = record.hire_date;
    if (record.payroll_name) updateData.payroll_name = record.payroll_name;

    const { error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', employeeId);

    if (error) {
      console.error(`❌ Failed to update ${employeeId}:`, error.message);
      failed++;
    } else {
      console.log(`✅ Updated ${record.full_name || employeeId}`);
      success++;
    }
  }

  console.log(`\n✨ Complete!`);
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
}

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('❌ Please provide a CSV file path');
  console.error('Usage: npx tsx scripts/update-employees-from-csv.ts path/to/your.csv');
  process.exit(1);
}

updateEmployees(csvPath).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

