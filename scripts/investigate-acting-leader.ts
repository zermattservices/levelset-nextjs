import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function investigate() {
  console.log('🔍 Investigating acting_leader issue...\n');
  console.log('='.repeat(60) + '\n');

  // Check the problematic user ID from the error
  const problematicUserId = '246e70e9-0abb-4197-830d-461da920d9c4';
  
  console.log(`📋 Checking user ID: ${problematicUserId}\n`);

  // Check if it's in app_users
  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('*')
    .eq('id', problematicUserId)
    .maybeSingle();

  if (appUserError) {
    console.error('❌ Error fetching app_user:', appUserError);
  } else if (appUser) {
    console.log('✅ Found in app_users:');
    console.log(`   ID: ${appUser.id}`);
    console.log(`   Email: ${appUser.email}`);
    console.log(`   Employee ID: ${appUser.employee_id || 'NULL'}`);
    console.log(`   Auth User ID: ${appUser.auth_user_id}`);
    console.log('');

    // Check if employee_id exists in employees table
    if (appUser.employee_id) {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', appUser.employee_id)
        .maybeSingle();

      if (employeeError) {
        console.error('❌ Error fetching employee:', employeeError);
      } else if (employee) {
        console.log('✅ Found corresponding employee:');
        console.log(`   ID: ${employee.id}`);
        console.log(`   Name: ${employee.full_name || employee.first_name} ${employee.last_name || ''}`);
        console.log(`   Role: ${employee.role}`);
      } else {
        console.log('❌ No employee found with ID:', appUser.employee_id);
      }
    } else {
      console.log('⚠️  app_user has no employee_id - this is the problem!');
    }
  } else {
    console.log('❌ Not found in app_users, checking auth.users...');
    
    // Check if it's an auth_user_id
    const { data: appUserByAuth, error: authError } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', problematicUserId)
      .maybeSingle();

    if (authError) {
      console.error('❌ Error fetching by auth_user_id:', authError);
    } else if (appUserByAuth) {
      console.log('✅ Found in app_users by auth_user_id:');
      console.log(`   App User ID: ${appUserByAuth.id}`);
      console.log(`   Employee ID: ${appUserByAuth.employee_id || 'NULL'}`);
      console.log('');
      
      if (appUserByAuth.employee_id) {
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', appUserByAuth.employee_id)
          .maybeSingle();

        if (employee) {
          console.log('✅ Found corresponding employee:');
          console.log(`   ID: ${employee.id}`);
          console.log(`   Name: ${employee.full_name || employee.first_name} ${employee.last_name || ''}`);
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Checking disc_actions table structure...\n');

  // Check recent disc_actions to see what acting_leader values are being used
  const { data: recentActions, error: actionsError } = await supabase
    .from('disc_actions')
    .select('id, acting_leader, employee_id, action_date')
    .order('action_date', { ascending: false })
    .limit(5);

  if (actionsError) {
    console.error('❌ Error fetching disc_actions:', actionsError);
  } else if (recentActions) {
    console.log(`Found ${recentActions.length} recent actions:\n`);
    for (const action of recentActions) {
      console.log(`  Action ID: ${action.id}`);
      console.log(`  Acting Leader: ${action.acting_leader}`);
      console.log(`  Employee ID: ${action.employee_id}`);
      console.log(`  Date: ${action.action_date}`);
      
      // Check if acting_leader exists in employees
      const { data: leaderEmployee, error: leaderError } = await supabase
        .from('employees')
        .select('id, full_name, role')
        .eq('id', action.acting_leader)
        .maybeSingle();

      if (leaderError) {
        console.log(`  ❌ Error checking leader: ${leaderError.message}`);
      } else if (leaderEmployee) {
        console.log(`  ✅ Leader found in employees: ${leaderEmployee.full_name}`);
      } else {
        console.log(`  ❌ Leader NOT found in employees!`);
      }
      console.log('');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Solution:');
  console.log('The acting_leader field must reference employees.id, not app_users.id.');
  console.log('When recording an action, use app_users.employee_id instead of app_users.id.\n');
}

investigate().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

