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
  getBundleUrlForLocation,
} from '../lib/fetch-position-averages';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
  let totalCertified = 0;
  let totalNotCertified = 0;
  
  for (const locationId of locationIds) {
    console.log(`\n📍 Processing location: ${locationId}`);
    
    // Fetch active employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .eq('location_id', locationId)
      .eq('active', true);
    
    if (employeesError || !employees) {
      console.error(`   ❌ Error fetching employees:`, employeesError);
      continue;
    }
    
    console.log(`   Found ${employees.length} active employees`);
    
    // Get bundle URL for this location
    const bundleUrl = getBundleUrlForLocation(locationId);
    if (!bundleUrl) {
      console.error(`   ❌ No bundle URL found for location ${locationId}`);
      continue;
    }
    
    // Fetch position averages from Google Sheets
    console.log(`   📊 Fetching position averages from Google Sheets...`);
    const positionAveragesData = await fetchEmployeePositionAverages(bundleUrl, employees as Employee[]);
    
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
      
      const newStatus = allQualified ? 'Certified' : 'Not Certified';
      
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
      if (newStatus === 'Certified') {
        totalCertified++;
      } else {
        totalNotCertified++;
      }
      
      // Show progress for each employee
      const statusEmoji = newStatus === 'Certified' ? '✅' : '⚪';
      const positionCount = Object.keys(positions).length;
      console.log(`   ${statusEmoji} ${employee.full_name}: ${newStatus} (${positionCount} positions)`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Initial Setup Complete!');
  console.log('='.repeat(60));
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   ✅ Certified: ${totalCertified}`);
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
