/**
 * Reset Demo User Auth
 * 
 * Deletes the existing auth user for john.smith.demo@levelset.io
 * and creates a new one with password 123456
 * 
 * Run with: npx tsx scripts/reset-demo-user.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_EMAIL = 'john.smith.demo@levelset.io';
const DEMO_PASSWORD = '123456';

async function resetDemoUser() {
  console.log('Resetting demo user auth...\n');

  try {
    // 1. Find the app_user record
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, auth_user_id, email, first_name, last_name')
      .eq('email', DEMO_EMAIL)
      .single();

    if (appUserError || !appUser) {
      console.error('Could not find app_user:', appUserError);
      process.exit(1);
    }

    console.log(`Found app_user: ${appUser.first_name} ${appUser.last_name}`);
    console.log(`  app_user_id: ${appUser.id}`);
    console.log(`  current auth_user_id: ${appUser.auth_user_id}`);

    // 2. Delete the existing auth user if it exists
    if (appUser.auth_user_id) {
      console.log('\nDeleting existing auth user...');
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        appUser.auth_user_id
      );

      if (deleteError) {
        console.error('Error deleting auth user:', deleteError);
        // Continue anyway - the user might not exist
      } else {
        console.log('  ✓ Deleted existing auth user');
      }
    }

    // 3. Create a new auth user
    console.log('\nCreating new auth user...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true, // Auto-confirm the email
    });

    if (createError || !newUser.user) {
      console.error('Error creating auth user:', createError);
      process.exit(1);
    }

    console.log(`  ✓ Created new auth user: ${newUser.user.id}`);

    // 4. Update the app_user to link to the new auth user
    console.log('\nUpdating app_user with new auth_user_id...');
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ auth_user_id: newUser.user.id })
      .eq('id', appUser.id);

    if (updateError) {
      console.error('Error updating app_user:', updateError);
      process.exit(1);
    }

    console.log('  ✓ Updated app_user');

    console.log('\n✅ Demo user reset successfully!');
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${DEMO_EMAIL}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetDemoUser();
