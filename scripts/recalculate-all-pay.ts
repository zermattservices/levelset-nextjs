import { createClient } from '@supabase/supabase-js';
import { calculatePay, shouldCalculatePay, CFA_BUDA_LOCATION_IDS } from '../lib/pay-calculator';
import type { Employee } from '../lib/supabase.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function recalculateAllPay() {
  console.log('🚀 Starting pay recalculation for CFA Buda locations...\n');
  console.log('📍 Target locations:');
  CFA_BUDA_LOCATION_IDS.forEach(id => console.log(`   - ${id}`));
  console.log('');

  // Fetch all employees from CFA Buda locations
  const { data: employees, error } = await supabase
    .from('employees')
    .select('*')
    .in('location_id', CFA_BUDA_LOCATION_IDS);

  if (error) {
    console.error('❌ Error fetching employees:', error);
    process.exit(1);
  }

  if (!employees || employees.length === 0) {
    console.log('⚠️  No employees found in CFA Buda locations');
    process.exit(0);
  }

  console.log(`📋 Found ${employees.length} employees to process\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const employee of employees) {
    const calculatedPay = calculatePay(employee as Employee);
    
    if (calculatedPay === null) {
      console.log(`⚠️  ${employee.full_name || employee.id}: Unable to calculate pay (role: ${employee.role})`);
      skipped++;
      continue;
    }

    // Update the employee with calculated pay
    const { error: updateError } = await supabase
      .from('employees')
      .update({ 
        calculated_pay: calculatedPay,
        updated_at: new Date().toISOString()
      })
      .eq('id', employee.id);

    if (updateError) {
      console.error(`❌ ${employee.full_name || employee.id}: Failed to update - ${updateError.message}`);
      errors++;
    } else {
      const details = [
        employee.role,
        employee.is_certified ? 'Certified' : 'Not Certified',
        employee.availability || 'Available',
      ];
      
      if (employee.role?.toLowerCase() === 'team member' || employee.role?.toLowerCase() === 'new hire') {
        if (employee.is_boh) {
          details.push('BOH');
        } else if (employee.is_foh) {
          details.push('FOH');
        }
      }
      
      console.log(`✅ ${employee.full_name || employee.id}: $${calculatedPay.toFixed(2)}/hr (${details.join(', ')})`);
      updated++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Pay recalculation complete!');
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(60));
}

recalculateAllPay().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

