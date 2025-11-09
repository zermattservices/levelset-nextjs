/**
 * Initial setup script for certification status
 * 
 * This script:
 * 1. Fetches all active employees in Buda and West Buda locations
 * 2. Gets their current position averages from Google Sheets
 * 3. Sets certified_status to 'Certified' if all positions >= 2.85, otherwise 'Not Certified'
 * 4. Creates initial audit records
 * 
 * Run with: npx tsx scripts/initial-certification-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Employee } from '../lib/supabase.types';
import {
  allPositionsQualified,
  BUDA_LOCATION_IDS,
} from '../lib/certification-utils';
import {
  fetchEmployeePositionAverages,
} from '../lib/fetch-position-averages';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

type QualifiedStatus = 'Certified' | 'Pending';

const QUALIFIED_STATUS_OPTIONS: Record<string, QualifiedStatus> = {
  certified: 'Certified',
  pending: 'Pending',
};

const qualifiedStatusArg = process.argv.find((arg) =>
  arg.toLowerCase().startsWith('--qualified-status=')
);

let targetQualifiedStatus: QualifiedStatus = 'Certified';
if (qualifiedStatusArg) {
  const rawValue = qualifiedStatusArg.split('=')[1]?.trim().toLowerCase();
  if (rawValue && QUALIFIED_STATUS_OPTIONS[rawValue]) {
    targetQualifiedStatus = QUALIFIED_STATUS_OPTIONS[rawValue];
  } else {
    console.warn(
      `⚠️  Unknown --qualified-status value "${rawValue}". Falling back to '${targetQualifiedStatus}'.`
    );
    console.warn('   Valid options: certified, pending');
  }
}

console.log(
  `⚙️  Qualified employees will be set to '${targetQualifiedStatus}'. (Override with --qualified-status=pending)`
);

const ACTIVE_EVALUATION_STATUSES = ['Planned', 'Scheduled'];

function addMonths(date: Date, months: number): Date {
  const clone = new Date(date);
  clone.setMonth(clone.getMonth() + months);
  return clone;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long' });
}

async function ensurePendingEvaluation(
  supabase: any,
  employee: Employee,
  auditDate: Date
) {
  try {
    const { data: existing, error: existingError } = await supabase
      .from('evaluations')
      .select('id')
      .eq('employee_id', employee.id)
      .in('status', ACTIVE_EVALUATION_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error(`   ❌ Error checking existing evaluation for ${employee.full_name}:`, existingError);
      return;
    }

    if (existing) {
      return;
    }

    const evaluationMonthDate = addMonths(auditDate, 1);
    const monthLabel = formatMonthLabel(evaluationMonthDate);

    const { error: insertError } = await supabase.from('evaluations').insert({
      employee_id: employee.id,
      employee_name: employee.full_name,
      location_id: employee.location_id,
      org_id: employee.org_id,
      leader_id: null,
      leader_name: null,
      evaluation_date: null,
      month: monthLabel,
      role: employee.role,
      status: 'Planned',
      rating_status: true,
      state_before: 'Pending',
      state_after: null,
      notes: null,
    });

    if (insertError) {
      console.error(`   ❌ Error creating evaluation for ${employee.full_name}:`, insertError);
    } else {
      console.log(`   🗓️  Created evaluation (month: ${monthLabel}) for ${employee.full_name}`);
    }
  } catch (error) {
    console.error(`   ❌ Unexpected error creating evaluation for ${employee.full_name}:`, error);
  }
}

async function runInitialSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  console.log('🚀 Starting initial certification setup...\n');
  
  const today = new Date();
  const auditDate = today.toISOString().split('T')[0];
  
  // Process both Buda and West Buda locations
  const locationIds = Object.values(BUDA_LOCATION_IDS);
  let totalProcessed = 0;
  let totalQualified = 0;
  let totalNotCertified = 0;
  
  for (const locationId of locationIds) {
    console.log(`\n📍 Processing location: ${locationId}`);
    
    // Fetch active Team Member employees (certification only applies to Team Members)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locationId)
      .eq('active', true)
      .eq('role', 'Team Member');
    
    if (employeesError || !employees) {
      console.error(`   ❌ Error fetching employees:`, employeesError);
      continue;
    }
    
    console.log(`   Found ${employees.length} active employees`);
    
    // Calculate position averages from ratings table
    console.log(`   📊 Calculating position averages from ratings...`);
    const positionAveragesData = await fetchEmployeePositionAverages(employees as Employee[], supabase);
    
    // Create a map for quick lookup
    const averagesMap = new Map();
    positionAveragesData.forEach(avg => {
      averagesMap.set(avg.employeeId, avg);
    });
    
    // Process each employee
    for (const employee of employees as Employee[]) {
      const positions = averagesMap.get(employee.id)?.positions || {};
      const hasPositions = Object.keys(positions).length > 0;
      const allQualified = hasPositions && allPositionsQualified(positions);
      
      const newStatus = allQualified ? targetQualifiedStatus : 'Not Certified';
      
      // Update employee status
      const { error: updateError } = await supabase
        .from('employees')
        .update({ certified_status: newStatus })
        .eq('id', employee.id);
      
      if (updateError) {
        console.error(`   ❌ Error updating ${employee.full_name}:`, updateError);
        continue;
      }
      
      // Get org_id and location_id for audit record
      const orgId = employee.org_id;
      
      // Create initial audit record
      const { error: auditError } = await supabase
        .from('certification_audit')
        .insert({
          employee_id: employee.id,
          employee_name: employee.full_name,
          org_id: orgId,
          location_id: locationId,
          audit_date: auditDate,
          status_before: 'Not Certified', // Initial setup, so "before" is assumed Not Certified
          status_after: newStatus,
          all_positions_qualified: allQualified,
          position_averages: positions,
          notes: 'Initial certification setup',
        });
      
      if (auditError) {
        console.error(`   ❌ Error creating audit record for ${employee.full_name}:`, auditError);
      }
      
      totalProcessed++;
      if (newStatus === targetQualifiedStatus) {
        totalQualified++;
      } else {
        totalNotCertified++;
      }

      if (newStatus === 'Pending') {
        await ensurePendingEvaluation(supabase, employee, today);
      }
      
      // Show progress for each employee
      const statusEmoji = newStatus === targetQualifiedStatus ? '✅' : '⚪';
      const positionCount = Object.keys(positions).length;
      console.log(`   ${statusEmoji} ${employee.full_name}: ${newStatus} (${positionCount} positions)`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Initial Setup Complete!');
  console.log('='.repeat(60));
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   ✅ ${targetQualifiedStatus}: ${totalQualified}`);
  console.log(`   ⚪ Not Certified: ${totalNotCertified}`);
  console.log('');
}

// Run the script
runInitialSetup()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
