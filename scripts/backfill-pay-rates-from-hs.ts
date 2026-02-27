/**
 * Backfill pay rates from HotSchedules storage files.
 *
 * Reads the most recent schedule_*.json from Supabase storage,
 * extracts bootstrap.userJobs pay data, and applies it to employees
 * matched by hs_id.
 *
 * HS payRate values are in DOLLARS (e.g. 9 = $9/hr, 22 = $22/hr).
 *
 * Usage: npx tsx scripts/backfill-pay-rates-from-hs.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SALARY_THRESHOLD_DOLLARS = 100; // $100/hr — anything above treated as salary

async function main() {
  // Find the most recent schedule storage file
  const { data: files, error: listError } = await supabase
    .storage
    .from('hs_script_updates')
    .list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (listError) {
    console.error('Error listing storage files:', listError);
    return;
  }

  const scheduleFiles = (files || []).filter(f => f.name.startsWith('schedule_'));
  console.log(`Found ${scheduleFiles.length} schedule files`);

  if (scheduleFiles.length === 0) {
    console.log('No schedule files found. Nothing to do.');
    return;
  }

  // Process each unique location (take latest file per location number)
  const processed = new Set<string>();

  for (const file of scheduleFiles) {
    // Extract location number from filename: schedule_05828_20260226_045017.json
    const match = file.name.match(/^schedule_(\d+)_/);
    if (!match) continue;
    const locationNumber = match[1];

    if (processed.has(locationNumber)) continue;
    processed.add(locationNumber);

    console.log(`\nProcessing location ${locationNumber} from ${file.name}...`);

    // Download the file
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('hs_script_updates')
      .download(file.name);

    if (downloadError || !fileData) {
      console.error(`  Error downloading ${file.name}:`, downloadError);
      continue;
    }

    const text = await fileData.text();
    const json = JSON.parse(text);

    const userJobs = json.bootstrap?.userJobs;
    if (!userJobs || userJobs.length === 0) {
      console.log('  No userJobs in bootstrap data');
      continue;
    }

    console.log(`  Found ${userJobs.length} userJobs entries`);

    // Build pay rate map: hs_employee_id -> rate in dollars
    const bestRate = new Map<number, number>();
    const primaryRate = new Map<number, number>();

    for (const uj of userJobs) {
      if (!uj.employeeId || !uj.payRate) continue;
      if (uj.primary) primaryRate.set(uj.employeeId, uj.payRate);
      const current = bestRate.get(uj.employeeId) || 0;
      if (uj.payRate > current) bestRate.set(uj.employeeId, uj.payRate);
    }

    console.log(`  Pay rates found for ${bestRate.size} employees`);

    // Find location by location_number
    const { data: locations } = await supabase
      .from('locations')
      .select('id, name, org_id')
      .eq('location_number', locationNumber)
      .limit(1);

    if (!locations || locations.length === 0) {
      console.log(`  No location found with location_number=${locationNumber}`);
      continue;
    }

    const location = locations[0];
    console.log(`  Location: ${location.name} (${location.id})`);

    // Fetch employees with hs_id
    const { data: employees } = await supabase
      .from('employees')
      .select('id, hs_id, full_name, actual_pay, actual_pay_type')
      .eq('location_id', location.id)
      .eq('active', true)
      .not('hs_id', 'is', null);

    if (!employees || employees.length === 0) {
      console.log('  No employees with hs_id found');
      continue;
    }

    let updated = 0;
    let skipped = 0;

    for (const emp of employees) {
      if (!emp.hs_id) continue;

      const hsEmpId = Number(emp.hs_id);
      const highest = bestRate.get(hsEmpId);
      if (!highest) {
        skipped++;
        continue;
      }

      // HS payRate is already in dollars
      const rateDollars = primaryRate.get(hsEmpId) ?? highest;

      if (rateDollars > SALARY_THRESHOLD_DOLLARS) {
        const { error } = await supabase
          .from('employees')
          .update({
            actual_pay: null,
            actual_pay_type: 'salary',
            actual_pay_annual: rateDollars,
          })
          .eq('id', emp.id);

        if (error) {
          console.error(`  Error updating ${emp.full_name}:`, error);
        } else {
          console.log(`  ${emp.full_name}: salary $${rateDollars}/yr`);
          updated++;
        }
      } else {
        const { error } = await supabase
          .from('employees')
          .update({
            actual_pay: rateDollars,
            actual_pay_type: 'hourly',
            actual_pay_annual: null,
          })
          .eq('id', emp.id);

        if (error) {
          console.error(`  Error updating ${emp.full_name}:`, error);
        } else {
          console.log(`  ${emp.full_name}: $${rateDollars}/hr`);
          updated++;
        }
      }
    }

    console.log(`  Updated: ${updated}, Skipped (no HS pay data): ${skipped}`);
  }

  // Also update the notification sync_data to use correct pay_rates format
  console.log('\nUpdating notification sync_data with corrected pay_rates...');

  const { data: notifications } = await supabase
    .from('hs_sync_notifications')
    .select('id, sync_data, location_id')
    .order('created_at', { ascending: false })
    .limit(20);

  const notifProcessed = new Set<string>();
  for (const notif of notifications || []) {
    if (notifProcessed.has(notif.location_id)) continue;
    notifProcessed.add(notif.location_id);

    const sd = notif.sync_data as any;
    // Update even if pay_rates exists — fix old rate_cents format
    if (sd.pay_rates && sd.pay_rates[Object.keys(sd.pay_rates)[0]]?.rate !== undefined) {
      console.log(`  Notification ${notif.id} already has corrected pay_rates, skipping`);
      continue;
    }

    // Find matching schedule file for this location
    const { data: loc } = await supabase
      .from('locations')
      .select('location_number')
      .eq('id', notif.location_id)
      .single();

    if (!loc?.location_number) continue;

    const matchingFile = scheduleFiles.find(f => f.name.includes(`_${loc.location_number}_`));
    if (!matchingFile) continue;

    const { data: fd } = await supabase.storage.from('hs_script_updates').download(matchingFile.name);
    if (!fd) continue;

    const json = JSON.parse(await fd.text());
    const userJobs = json.bootstrap?.userJobs;
    if (!userJobs?.length) continue;

    const payRates: Record<string, { rate: number; type: string }> = {};
    const best = new Map<number, number>();
    const primary = new Map<number, number>();
    for (const uj of userJobs) {
      if (!uj.employeeId || !uj.payRate) continue;
      if (uj.primary) primary.set(uj.employeeId, uj.payRate);
      const cur = best.get(uj.employeeId) || 0;
      if (uj.payRate > cur) best.set(uj.employeeId, uj.payRate);
    }
    for (const [id, h] of Array.from(best.entries())) {
      const r = primary.get(id) ?? h;
      payRates[String(id)] = { rate: r, type: r > SALARY_THRESHOLD_DOLLARS ? 'salary' : 'hourly' };
    }

    await supabase
      .from('hs_sync_notifications')
      .update({ sync_data: { ...sd, pay_rates: payRates } })
      .eq('id', notif.id);

    console.log(`  Updated notification ${notif.id} with ${Object.keys(payRates).length} pay rates`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
