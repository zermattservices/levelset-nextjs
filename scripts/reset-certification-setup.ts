/**
 * Reset certification setup
 * - Clear all certification_audit records
 * - Reset all Team Member employees to 'Not Certified'
 * - Then re-run initial setup
 * 
 * Run with: npx tsx scripts/reset-certification-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import type { Employee } from '../lib/supabase.types';
import { 
  allPositionsQualified,
  BUDA_LOCATION_IDS,
  CERTIFICATION_THRESHOLD,
} from '../lib/certification-utils';
import { 
  fetchEmployeePositionAverages,
} from '../lib/fetch-position-averages';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function resetAndSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔄 Resetting certification setup...\n');
  
  // Step 1: Delete all certification audit records
  console.log('1️⃣  Deleting all certification_audit records...');
  const { error: deleteAuditError } = await supabase
    .from('certification_audit')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
  
  if (deleteAuditError) {
    console.error('   ❌ Error deleting audits:', deleteAuditError);
  } else {
    console.log('   ✅ All audit records deleted');
  }
  
  // Step 2: Reset ALL employees to 'Not Certified' in Buda/West Buda locations
  console.log('\n2️⃣  Resetting all employees to Not Certified...');
  const { error: resetError } = await supabase
    .from('employees')
    .update({ certified_status: 'Not Certified' })
    .in('location_id', Object.values(BUDA_LOCATION_IDS));
  
  if (resetError) {
    console.error('   ❌ Error resetting employees:', resetError);
  } else {
    console.log('   ✅ All Team Member employees reset');
  }
  
  // Step 3: Run initial setup
  console.log('\n3️⃣  Running initial certification setup...\n');
  
  const today = new Date();
  const auditDate = today.toISOString().split('T')[0];
  
  const locationIds = Object.values(BUDA_LOCATION_IDS);
  let totalProcessed = 0;
  let totalCertified = 0;
  let totalNotCertified = 0;
  
  for (const locationId of locationIds) {
    console.log(`\n📍 Processing location: ${locationId}`);
    
    // Fetch active Team Member employees
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
    
    console.log(`   Found ${employees.length} active Team Member employees`);
    
    // Calculate position averages from ratings table
    console.log(`   📊 Calculating position averages from ratings (threshold: ${CERTIFICATION_THRESHOLD})...`);
    const positionAveragesData = await fetchEmployeePositionAverages(employees as Employee[], supabase);
    
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
      
      // Create initial audit record
      const { error: auditError } = await supabase
        .from('certification_audit')
        .insert({
          employee_id: employee.id,
          employee_name: employee.full_name,
          org_id: employee.org_id,
          location_id: locationId,
          audit_date: auditDate,
          status_before: 'Not Certified',
          status_after: newStatus,
          all_positions_qualified: allQualified,
          position_averages: positions,
          notes: `Initial certification setup (threshold: ${CERTIFICATION_THRESHOLD})`,
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
      
      const statusEmoji = newStatus === 'Certified' ? '✅' : '⚪';
      const positionCount = Object.keys(positions).length;
      const avgDisplay = Object.entries(positions)
        .map(([pos, avg]) => `${pos}: ${(avg as number).toFixed(2)}`)
        .join(', ');
      console.log(`   ${statusEmoji} ${employee.full_name}: ${newStatus} (${positionCount} positions: ${avgDisplay || 'none'})`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Reset & Setup Complete!');
  console.log('='.repeat(60));
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   ✅ Certified: ${totalCertified}`);
  console.log(`   ⚪ Not Certified: ${totalNotCertified}`);
  console.log(`   🎯 Threshold: ${CERTIFICATION_THRESHOLD}`);
  console.log('');
}

resetAndSetup()
  .then(() => {
    console.log('✨ Reset complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

