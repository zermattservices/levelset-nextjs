import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

interface ParsedRow {
  employee_name: string;
  rater_name: string;
  created_at: string;
  position: string;
}

const CSV_PATH = path.join(process.cwd(), 'updated_ratings.csv');
const BATCH_SIZE = 200;

function parseCSV(content: string): ParsedRow[] {
  const [headerLine, ...lines] = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    if (values.length < 11) continue;
    const [uniqueId, tmName, leaderName, timestamp, position] = values;
    const [datePart, timePart] = timestamp.split(' ');
    if (!datePart || !timePart) continue;
    const [month, day, year] = datePart.split('/');
    const [hourStr, minuteStr] = timePart.split(':');
    const fullYear = year.length === 2 ? `20${year}` : year;
    const iso = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hourStr.padStart(2, '0')}:${minuteStr.padStart(2, '0')}:00`;
    const normalized = new Date(iso);
    normalized.setSeconds(0, 0);
    rows.push({
      employee_name: tmName,
      rater_name: leaderName,
      created_at: normalized.toISOString(),
      position: position.split('|')[0].trim(),
    });
  }
  return rows;
}

async function main() {
  console.log('Loading CSV...');
  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csv);
  console.log(`Parsed ${rows.length} rows`);

  console.log('Fetching employee mappings...');
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, full_name');
  if (empError || !employees) {
    console.error('Unable to fetch employees', empError);
    process.exit(1);
  }

  const nameToId = new Map<string, string>();
  for (const emp of employees) {
    if (emp.full_name) {
      nameToId.set(emp.full_name, emp.id);
    }
  }

  const deleteIds: string[] = [];
  const missingNames = new Set<string>();

  for (const row of rows) {
    const employeeId = nameToId.get(row.employee_name);
    const raterId = nameToId.get(row.rater_name);
    if (!employeeId) {
      missingNames.add(`TM:${row.employee_name}`);
      continue;
    }
    if (!raterId) {
      missingNames.add(`Leader:${row.rater_name}`);
      continue;
    }

    const { data: matches, error } = await supabase
      .from('ratings')
      .select('id, created_at, employee_id, rater_user_id, position')
      .eq('employee_id', employeeId)
      .eq('rater_user_id', raterId)
      .eq('position', row.position)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching matches', error);
      continue;
    }

    const isoTarget = row.created_at;
    const potential = (matches || []).filter((m) => {
      const candidate = new Date(m.created_at);
      const target = new Date(isoTarget);
      const diff = Math.abs(candidate.getTime() - target.getTime());
      return diff <= 90 * 1000;
    });

    if (potential.length > 0) {
      for (const match of potential) {
        deleteIds.push(match.id);
      }
    }
  }

  console.log(`Collected ${deleteIds.length} rating IDs to delete.`);

  if (deleteIds.length === 0) {
    console.log('No matching ratings found to delete.');
  } else {
    for (let i = 0; i < deleteIds.length; i += BATCH_SIZE) {
      const batch = deleteIds.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('ratings').delete().in('id', batch);
      if (error) {
        console.error('Failed to delete batch', i / BATCH_SIZE + 1, error);
        process.exit(1);
      }
      console.log(`Deleted batch ${i / BATCH_SIZE + 1} (${Math.min(i + batch.length, deleteIds.length)}/${deleteIds.length})`);
    }
  }

  if (missingNames.size) {
    const listPath = path.join(process.cwd(), 'missing_rating_names.txt');
    fs.writeFileSync(listPath, Array.from(missingNames).sort().join('\n'), 'utf-8');
    console.log(`Saved ${missingNames.size} missing name entries to ${listPath}`);
  }

  console.log('Duplicate cleanup complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
